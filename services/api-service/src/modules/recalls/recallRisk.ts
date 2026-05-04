/**
 * Approximate FDA enforcement risk tiers for coursework UI.
 *
 * Classification strings from openFDA/free text are loosely matched because
 * external data is not standardized (spelling, prefixes, casing).
 */

export type RecallRiskLevel = "LOW" | "MEDIUM" | "HIGH";

/** Map FDA-ish class tiers to UX risk badges. Defaults to MEDIUM when unknown. */
export function calculateRiskLevel(
  classification: string | null | undefined,
): RecallRiskLevel {
  const text = classification?.trim() ?? "";

  // Order matters: Class III contains "III" avoiding overlap with II / I prefixes.
  if (/\bclass\s+iii\b/i.test(text)) return "LOW";
  if (/\bclass\s+ii\b/i.test(text)) return "MEDIUM";
  if (/\bclass\s+i\b/i.test(text)) return "HIGH";

  return "MEDIUM";
}
