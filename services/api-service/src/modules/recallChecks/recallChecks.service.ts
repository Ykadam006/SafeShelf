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

// Stored on every RecallCheck row to record whether the upstream call worked.
export const EXTERNAL_STATUS = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

// Build the phrase sent to openFDA from a pantry item's name + brand.
// Avoids "Jif Jif" style duplicates that produce zero-match queries.
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

// Translate an openFDA hit into the columns we persist on the `recalls` table.
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

// Run one pantry item against openFDA via recall-service.
// Side effects: writes a RecallCheck audit row, upserts each FDA recall,
// and creates a RecallAlert for any new (pantryItem, recall) pair.
export async function runPantryRecallCheck(
  pantryItemId: string,
): Promise<PantryRecallCheckOutcome> {
  const pantryItem = await getPantryItemById(pantryItemId);
  const searchQuery = buildPantryRecallSearchPhrase(pantryItem);

  // Try the upstream call; null result means the recall service failed.
  let upstream:
    | Awaited<ReturnType<typeof invokeRecallMicroserviceSearch>>
    | null = null;

  try {
    upstream = await invokeRecallMicroserviceSearch(searchQuery);
  } catch {
    upstream = null;
  }

  // Failure path: still record the attempt so the user sees the audit trail.
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

  // Success path: persist audit + recalls + alerts inside one transaction so
  // a partial failure can never leave orphaned records.
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

      // Upsert keeps the recalls table in sync with the latest openFDA snapshot.
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

      // Skip if we've already alerted on this pair (DB has a unique index too).
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

// Audit log for a single pantry item: every check that ever ran against it.
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

// Sweep every pantry item belonging to a user; aggregates per-item outcomes.
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
