import axios from "axios";

import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

/** Base URL provided by FDA openFDA (Food Enforcement). */
export const OPENFDA_ENFORCEMENT_URL =
  "https://api.fda.gov/food/enforcement.json";

export interface NormalizedRecall {
  eventId: string;
  productDescription: string | null;
  recallingFirm: string | null;
  reasonForRecall: string | null;
  classification: string | null;
  status: string | null;
  distributionPattern: string | null;
  recallInitiationDate: string | null;
}

interface OpenFdaEnforcementHit {
  event_id?: string;
  recall_number?: string;
  product_description?: string;
  recalling_firm?: string;
  reason_for_recall?: string;
  classification?: string;
  status?: string;
  distribution_pattern?: string;
  recall_initiation_date?: string;
}

interface OpenFdaResponse {
  meta?: unknown;
  results?: OpenFdaEnforcementHit[];
  error?: { code?: string; message?: string };
}

/** Strip characters that can break lucene-ish phrase queries passed to openFDA. */
function sanitizePhraseQuery(raw: string): string {
  return raw.replace(/["\\\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

function formatRecallDate(raw?: string): string | null {
  if (!raw) return null;
  if (raw.length === 8 && /^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

function normalize(hit: OpenFdaEnforcementHit): NormalizedRecall {
  const primary = `${hit.event_id ?? ""}`.trim();
  const secondary = `${hit.recall_number ?? ""}`.trim();

  return {
    eventId: primary.length > 0 ? primary : secondary,
    productDescription: hit.product_description ?? null,
    recallingFirm: hit.recalling_firm ?? null,
    reasonForRecall: hit.reason_for_recall ?? null,
    classification: hit.classification ?? null,
    status: hit.status ?? null,
    distributionPattern: hit.distribution_pattern ?? null,
    recallInitiationDate: formatRecallDate(hit.recall_initiation_date),
  };
}

/** Search recalls by FDA `product_description` field (quoted phrase-style match). */
export async function searchRecallsByProductDescription(
  phrase: string,
): Promise<{ recalls: NormalizedRecall[] }> {
  const cleaned = sanitizePhraseQuery(phrase);
  if (!cleaned) {
    return { recalls: [] };
  }

  const searchExpression = `product_description:"${cleaned}"`;

  const params: Record<string, string | number> = {
    search: searchExpression,
    limit: 50,
  };

  if (env.OPENFDA_API_KEY) {
    params.api_key = env.OPENFDA_API_KEY;
  }

  try {
    const response = await axios.get<OpenFdaResponse>(
      OPENFDA_ENFORCEMENT_URL,
      {
        params,
        timeout: 25_000,
        validateStatus: (status) =>
          status === 200 || status === 404 || status === 429 || status === 400,
      },
    );

    if (response.status === 429) {
      throw ApiError.tooManyRequests(
        "OpenFDA rate limit exceeded. Try again shortly or configure OPENFDA_API_KEY.",
      );
    }

    if (response.status === 400) {
      logger.warn(
        `OpenFDA rejected recall search syntax (phrase="${cleaned}" code="${response.data?.error?.code}")`,
      );
      throw ApiError.badRequest(
        "OpenFDA rejected that search. Try shortening or simplifying the product text.",
      );
    }

    if (response.status === 404) {
      // Typical NO_MATCHES response from FDA when no recalls match `search`.
      if (response.data?.results && Array.isArray(response.data.results)) {
        return {
          recalls: response.data.results.map(normalize),
        };
      }

      logger.info(
        `OpenFDA returned zero recalls (phrase="${cleaned}" code="${response.data?.error?.code}")`,
      );

      return { recalls: [] };
    }

    if (response.status !== 200) {
      throw ApiError.badGateway(`Unexpected OpenFDA status ${response.status}`);
    }

    const rows = Array.isArray(response.data?.results)
      ? response.data.results!
      : [];

    logger.debug(`OpenFDA recall search succeeded (${rows.length}) for phrase="${cleaned}"`);

    return { recalls: rows.map(normalize) };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;

      // Some clients treat empty bodies as Axios errors despite validateStatus tweaks.
      if (status === 404) {
        return { recalls: [] };
      }

      logger.error(
        `OpenFDA request failed: ${err.message} (phrase="${cleaned}" status=${String(status)})`,
      );

      throw ApiError.badGateway("Unable to reach OpenFDA enforcement API.");
    }

    logger.error(
      err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err)),
    );
    throw ApiError.badGateway("Unable to fetch recall data.");
  }
}
