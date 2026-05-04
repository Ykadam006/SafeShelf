import type { RecallCheck } from "@prisma/client";
import { RiskLevel } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getPantryItemById } from "../pantryItems/pantryItems.service";
import type { PantryItemWithRelations } from "../pantryItems/pantryItems.service";
import { calculateRiskLevel } from "../recalls/recallRisk";
import {
  invokeRecallMicroserviceSearch,
  normalizeUpstreamRecall,
} from "../recalls/recalls.service";
import type { RecallMicroserviceRow, RecallResultDto } from "../recalls/recalls.service";

export const EXTERNAL_STATUS = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export function buildPantryRecallSearchPhrase(item: {
  name: string;
  brand: string | null;
}): string {
  const n = item.name.trim();
  const b = item.brand?.trim() ?? "";
  if (b.length === 0) return n;

  const nLower = n.toLowerCase();
  const bLower = b.toLowerCase();

  if (nLower === bLower) return n;
  if (nLower.includes(bLower)) return n;
  if (bLower.includes(nLower)) return b;

  return `${b} ${n}`.trim();
}

function mapRecallToUpsert(
  hit: RecallMicroserviceRow & { eventKey: string },
) {
  const descCandidate = hit.productDescription?.trim();
  const productDescription =
    descCandidate && descCandidate.length > 0
      ? descCandidate
      : "Product description unavailable";

  return {
    openfdaEventId: hit.eventKey,
    productDescription,
    recallingFirm: hit.recallingFirm ?? null,
    reasonForRecall: hit.reasonForRecall ?? null,
    classification: hit.classification ?? null,
    status: hit.status ?? null,
    distributionPattern: hit.distributionPattern ?? null,
    recallInitiationDate: hit.recallInitiationDate ?? null,
  };
}

export type PantryRecallCheckOutcome = {
  pantryItem: PantryItemWithRelations;
  recallCheck: RecallCheck;
  matchesFound: number;
  alertsCreated: number;
  recallResults: RecallResultDto[];
};

export async function runPantryRecallCheck(
  pantryItemId: string,
): Promise<PantryRecallCheckOutcome> {
  const pantryItem = await getPantryItemById(pantryItemId);
  const searchQuery = buildPantryRecallSearchPhrase(pantryItem);

  let upstream:
    | Awaited<ReturnType<typeof invokeRecallMicroserviceSearch>>
    | null = null;

  try {
    upstream = await invokeRecallMicroserviceSearch(searchQuery);
  } catch {
    upstream = null;
  }

  if (upstream === null) {
    const check = await prisma.recallCheck.create({
      data: {
        pantryItemId,
        searchQuery,
        matchesFound: 0,
        externalApiStatus: EXTERNAL_STATUS.FAILED,
      },
    });
    return {
      pantryItem,
      recallCheck: check,
      matchesFound: 0,
      alertsCreated: 0,
      recallResults: [],
    };
  }

  const recallsRaw = upstream.recalls ?? [];
  const matchesFound =
    typeof upstream.count === "number" ? upstream.count : recallsRaw.length;

  return prisma.$transaction(async (tx) => {
    const check = await tx.recallCheck.create({
      data: {
        pantryItemId,
        searchQuery,
        matchesFound,
        externalApiStatus: EXTERNAL_STATUS.SUCCESS,
      },
    });

    let alertsCreated = 0;
    const recallResults: RecallResultDto[] = [];
    const { userId } = pantryItem;

    for (const row of recallsRaw) {
      const eventKey = String(row.eventId ?? "").trim();
      if (!eventKey) continue;

      const normalizedPayload: RecallMicroserviceRow = {
        ...row,
        eventId: eventKey,
      };

      recallResults.push(normalizeUpstreamRecall(normalizedPayload));

      const upsertPayload = mapRecallToUpsert({
        ...normalizedPayload,
        eventKey,
      });

      const recallRecord = await tx.recall.upsert({
        where: { openfdaEventId: eventKey },
        create: upsertPayload,
        update: {
          productDescription: upsertPayload.productDescription,
          recallingFirm: upsertPayload.recallingFirm,
          reasonForRecall: upsertPayload.reasonForRecall,
          classification: upsertPayload.classification,
          status: upsertPayload.status,
          distributionPattern: upsertPayload.distributionPattern,
          recallInitiationDate: upsertPayload.recallInitiationDate,
        },
      });

      const risk = calculateRiskLevel(recallRecord.classification) as RiskLevel;

      const existingAlert = await tx.recallAlert.findFirst({
        where: {
          pantryItemId,
          recallId: recallRecord.id,
        },
        select: { id: true },
      });

      if (existingAlert === null) {
        await tx.recallAlert.create({
          data: {
            userId,
            pantryItemId,
            recallId: recallRecord.id,
            riskLevel: risk,
            matchScore: 1,
          },
        });
        alertsCreated += 1;
      }
    }

    return {
      pantryItem,
      recallCheck: check,
      matchesFound,
      alertsCreated,
      recallResults,
    };
  });
}

export async function listRecallChecksForPantryItem(
  pantryItemId: string,
): Promise<RecallCheck[]> {
  const exists = await prisma.pantryItem.findUnique({
    where: { id: pantryItemId },
    select: { id: true },
  });

  if (exists === null) {
    throw ApiError.notFound("Pantry item not found.");
  }

  return prisma.recallCheck.findMany({
    where: { pantryItemId },
    orderBy: { checkedAt: "desc" },
  });
}

export type BulkRecallCheckSummary = {
  totalItemsChecked: number;
  totalMatchesFound: number;
  totalAlertsCreated: number;
};

export async function runBulkRecallChecksForUser(
  userId: string,
): Promise<BulkRecallCheckSummary> {
  const exists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (exists === null) {
    throw ApiError.notFound("User not found.");
  }

  const pantryRows = await prisma.pantryItem.findMany({
    where: { userId },
    select: { id: true },
  });

  let totalMatchesFound = 0;
  let totalAlertsCreated = 0;

  for (const row of pantryRows) {
    const outcome = await runPantryRecallCheck(row.id);
    totalMatchesFound += outcome.matchesFound;
    totalAlertsCreated += outcome.alertsCreated;
  }

  return {
    totalItemsChecked: pantryRows.length,
    totalMatchesFound,
    totalAlertsCreated,
  };
}
