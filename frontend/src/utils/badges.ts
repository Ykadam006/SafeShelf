// Tailwind classes for risk and alert-status pills used across the app.

// Red / amber / green pill matching FDA risk tier.
export function riskBadgeClass(level: string): string {
  const key = level?.toUpperCase() ?? "";
  if (key === "HIGH") {
    return "bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20";
  }
  if (key === "MEDIUM") {
    return "bg-orange-100 text-orange-950 ring-1 ring-inset ring-orange-400/35";
  }
  if (key === "LOW") {
    return "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-600/25";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/15";
}

// Pill for alert lifecycle: NEW → REVIEWED → DISMISSED / RESOLVED.
export function alertStatusBadgeClass(status: string): string {
  const key = status?.toUpperCase() ?? "";
  if (key === "NEW") {
    return "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20";
  }
  if (key === "REVIEWED") {
    return "bg-violet-100 text-violet-900 ring-1 ring-inset ring-violet-500/25";
  }
  if (key === "DISMISSED") {
    return "bg-slate-200 text-slate-700 ring-1 ring-inset ring-slate-400/35";
  }
  if (key === "RESOLVED") {
    return "bg-green-100 text-green-900 ring-1 ring-inset ring-green-700/25";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/15";
}
