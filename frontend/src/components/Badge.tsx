import type { AlertStatus } from "../types";
import {
  alertStatusBadgeClass,
  riskBadgeClass,
} from "../utils/badges";

// Shared pill style used by both badges.
const chip =
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

// Coloured pill for FDA risk tier (HIGH / MEDIUM / LOW).
export function RiskBadge({ level }: { level: string }) {
  return (
    <span className={`${chip} ${riskBadgeClass(level)}`}>{level}</span>
  );
}

// Coloured pill for alert lifecycle status with a friendly label.
export function AlertStatusBadge({
  status,
}: {
  status: AlertStatus | string;
}) {
  const key = String(status).toUpperCase();
  const label =
    key === "NEW"
      ? "New"
      : key === "REVIEWED"
        ? "Reviewed"
        : key === "DISMISSED"
          ? "Dismissed"
          : key === "RESOLVED"
            ? "Resolved"
            : key;

  return (
    <span className={`${chip} ${alertStatusBadgeClass(key)}`}>
      {label}
    </span>
  );
}
