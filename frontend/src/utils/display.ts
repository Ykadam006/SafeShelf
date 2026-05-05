// ISO timestamp → "May 4, 2026, 3:14 PM" (or em-dash when missing/invalid).
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ISO timestamp → "May 4, 2026" (date only, no time).
export function formatDateDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}
