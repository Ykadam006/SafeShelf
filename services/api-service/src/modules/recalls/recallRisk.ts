// Risk tier shown in UI badges (red / amber / green).
export type RecallRiskLevel = "LOW" | "MEDIUM" | "HIGH";

// Map FDA classification text to a risk tier.
//   Class I   → HIGH   (immediate health hazard)
//   Class II  → MEDIUM (temporary or reversible)
//   Class III → LOW    (unlikely to cause harm)
//   Anything else / missing → MEDIUM as a safe default.
// Note: order matters because "Class III" contains the substring "Class I".
export function calculateRiskLevel(
  classification: string | null | undefined,
): RecallRiskLevel {
  const text = classification?.trim() ?? "";

  if (/\bclass\s+iii\b/i.test(text)) return "LOW";
  if (/\bclass\s+ii\b/i.test(text)) return "MEDIUM";
  if (/\bclass\s+i\b/i.test(text)) return "HIGH";

  return "MEDIUM";
}
