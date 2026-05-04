import axios from "axios";
import { z } from "zod";

import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import type { RecallRiskLevel } from "./recallRisk";
import { calculateRiskLevel } from "./recallRisk";

export interface RecallMicroserviceRow {
  eventId: string;
  productDescription: string | null;
  recallingFirm: string | null;
  reasonForRecall: string | null;
  classification: string | null;
  status: string | null;
  distributionPattern: string | null;
  recallInitiationDate: string | null;
}

interface UpstreamSearchResponse {
  ok?: boolean;
  query?: string;
  count?: number;
  recalls?: RecallMicroserviceRow[];
  message?: string;
  /** Supplemental narration from recall-service `data.info` when present. */
  info?: string;
}

/** API-normalized recall for our frontend (risk derived from upstream classification). */
export interface RecallResultDto extends RecallMicroserviceRow {
  riskLevel: RecallRiskLevel;
}

/** Normalized persisted recall (+ internal id when stored in Postgres). */
export interface StoredRecallResultDto extends RecallResultDto {
  source: "database";
  id: string;
  createdAt: Date;
}

function recallServiceBase(): string {
  return env.RECALL_SERVICE_URL.replace(/\/+$/, "");
}

export function normalizeUpstreamRecall(hit: RecallMicroserviceRow): RecallResultDto {
  return {
    ...hit,
    riskLevel: calculateRiskLevel(hit.classification),
  };
}

/** Supports legacy flat payloads and `{ success, message, data }` responses from recall-service. */
function parseRecallMicroserviceSearchPayload(
  data: unknown,
  fallbackQuery: string,
): UpstreamSearchResponse {
  if (typeof data !== "object" || data === null) {
    throw ApiError.badGateway("Recall search returned an unexpected payload.");
  }
  const o = data as Record<string, unknown>;

  if (o.success === true) {
    const inner = o.data;
    if (typeof inner !== "object" || inner === null || Array.isArray(inner)) {
      throw ApiError.badGateway("Recall search response missing data envelope.");
    }
    const d = inner as Record<string, unknown>;
    if (!Array.isArray(d.recalls)) {
      throw ApiError.badGateway(
        "Recall search payload did not include a recalls array.",
      );
    }

    const recalls = d.recalls as RecallMicroserviceRow[];
    const query = typeof d.query === "string" ? d.query : fallbackQuery;
    const count =
      typeof d.count === "number" ? d.count : recalls.length;
    const infoField = typeof d.info === "string" ? d.info : undefined;

    return {
      ok: true,
      query,
      count,
      recalls,
      info: infoField,
    };
  }

  if (!Array.isArray(o.recalls)) {
    throw ApiError.badGateway(
      "Recall search payload did not include a recalls array.",
    );
  }
  const recalls = o.recalls as RecallMicroserviceRow[];
  return {
    ok: typeof o.ok === "boolean" ? o.ok : true,
    query: typeof o.query === "string" ? o.query : fallbackQuery,
    count: typeof o.count === "number" ? o.count : recalls.length,
    recalls,
    info: typeof o.info === "string" ? o.info : undefined,
    message: typeof o.message === "string" ? o.message : undefined,
  };
}

export async function invokeRecallMicroserviceSearch(
  query: string,
): Promise<UpstreamSearchResponse> {
  const url = `${recallServiceBase()}/api/recalls/search`;

  try {
    const response = await axios.get(url, {
      params: { query },
      timeout: 30_000,
      validateStatus: (status) => status >= 200 && status < 600,
    });

    const dataUnknown: unknown = response.data;

    if (response.status === 429) {
      throw ApiError.tooManyRequests(
        "Recall search service returned rate-limit errors. Retry later.",
      );
    }

    if (response.status === 400) {
      let clientMsg = "Invalid recall search parameters.";
      if (
        typeof dataUnknown === "object" &&
        dataUnknown !== null &&
        "message" in dataUnknown &&
        typeof (dataUnknown as { message?: unknown }).message === "string"
      ) {
        clientMsg = (dataUnknown as { message: string }).message;
      }
      throw ApiError.badRequest(clientMsg);
    }

    if (response.status >= 500) {
      throw ApiError.badGateway(
        "Recall search service is returning errors. Try again shortly.",
      );
    }

    if (response.status !== 200) {
      throw ApiError.badGateway(
        `Recall search service responded with unexpected status (${response.status}).`,
      );
    }

    return parseRecallMicroserviceSearchPayload(dataUnknown, query);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED") {
        throw ApiError.badGateway(
          "Recall search service timed out. Verify recall-service availability.",
        );
      }
      if (!err.response) {
        throw ApiError.badGateway(
          "Recall search service is unreachable. Start recall-service or check RECALL_SERVICE_URL.",
        );
      }
      if (err.response.status === 429) {
        throw ApiError.tooManyRequests(
          "Recall search provider rate-limited the request.",
        );
      }
      throw ApiError.badGateway(
        "Unable to communicate with recall search service.",
      );
    }
    throw ApiError.badGateway("Unexpected recall search failure.");
  }
}

export async function proxyRecallSearch(productQuery: string): Promise<{
  source: "recall-service";
  query: string;
  count: number;
  recalls: RecallResultDto[];
  upstreamMessage?: string;
  info?: string;
}> {
  const payload = await invokeRecallMicroserviceSearch(productQuery);

  const recallsRaw = payload.recalls ?? [];
  const query =
    typeof payload.query === "string" ? payload.query : productQuery;
  const count =
    typeof payload.count === "number" ? payload.count : recallsRaw.length;

  return {
    source: "recall-service",
    query,
    count,
    recalls: recallsRaw.map((row) =>
      normalizeUpstreamRecall({
        ...row,
        eventId: String(row.eventId ?? ""),
      }),
    ),
    ...(payload.message !== undefined &&
      payload.message !== "" && {
        upstreamMessage: payload.message,
      }),
    ...(payload.info !== undefined &&
      payload.info !== "" && {
        info: payload.info,
      }),
  };
}

/** Database lookup by internal UUID primary key OR FDA `openfdaEventId`. */
export async function loadStoredRecall(
  lookup: string,
): Promise<StoredRecallResultDto | null> {
  const trimmed = lookup.trim();

  const isUuidLookup = z.string().uuid().safeParse(trimmed).success;

  const row = await prisma.recall.findUnique({
    where: isUuidLookup
      ? { id: trimmed }
      : { openfdaEventId: trimmed },
    select: {
      id: true,
      openfdaEventId: true,
      productDescription: true,
      recallingFirm: true,
      reasonForRecall: true,
      classification: true,
      status: true,
      distributionPattern: true,
      recallInitiationDate: true,
      createdAt: true,
    },
  });

  if (row === null) return null;

  const baseRecall: RecallResultDto = {
    eventId: row.openfdaEventId,
    productDescription: row.productDescription,
    recallingFirm: row.recallingFirm ?? null,
    reasonForRecall: row.reasonForRecall ?? null,
    classification: row.classification ?? null,
    status: row.status ?? null,
    distributionPattern: row.distributionPattern ?? null,
    recallInitiationDate: row.recallInitiationDate ?? null,
    riskLevel: calculateRiskLevel(row.classification),
  };

  return {
    source: "database",
    id: row.id,
    ...baseRecall,
    createdAt: row.createdAt,
  };
}
