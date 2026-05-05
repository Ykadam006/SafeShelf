import axios from "axios";

import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

// FDA Food Enforcement endpoint.
export const OPENFDA_ENFORCEMENT_URL =
  "https://api.fda.gov/food/enforcement.json";

// What we hand back to api-service for each FDA hit (camelCase, ISO date, nullable).
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

// Raw shape returned by openFDA (snake_case, optional fields).
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

// Strip characters that would break openFDA's Lucene-style phrase syntax.
function sanitizePhraseQuery(raw: string): string {
  return raw.replace(/["\\\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

// Convert openFDA's compact YYYYMMDD date strings to ISO YYYY-MM-DD.
function formatRecallDate(raw?: string): string | null {
  if (!raw) return null;
  if (raw.length === 8 && /^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

// Map a single openFDA hit to our normalized shape.
function normalize(hit: OpenFdaEnforcementHit): NormalizedRecall {
  // openFDA sometimes ships only `recall_number` for older rows.
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

// Search openFDA by `product_description` and translate failures into ApiErrors.
export async function searchRecallsByProductDescription(
  phrase: string,
): Promise<{ recalls: NormalizedRecall[] }> {
  const cleaned = sanitizePhraseQuery(phrase);
  if (!cleaned) {
    return { recalls: [] };
  }

  // Lucene-style phrase match against the product description field.
  const searchExpression = `product_description:"${cleaned}"`;

  const params: Record<string, string | number> = {
    search: searchExpression,
    limit: 50,
  };

  // Optional API key raises rate limits when configured.
  if (env.OPENFDA_API_KEY) {
    params.api_key = env.OPENFDA_API_KEY;
  }

  try {
    // Accept 200/404/429/400 as "expected" and handle each below.
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

    // openFDA returns 404 to mean "no matches"; surface that as an empty list.
    if (response.status === 404) {
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

      // Some clients raise on empty 404 bodies even with our validateStatus tweak.
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
