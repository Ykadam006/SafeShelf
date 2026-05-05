import type { LucideIcon } from "lucide-react";

// KPI tile used on the dashboard: label, big number, optional hint and icon.
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="ss-card relative overflow-hidden p-5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-emerald-500 before:to-teal-500">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="mt-2 text-[1.75rem] font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs leading-snug text-slate-500">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-700/15">
            <Icon className="size-6" strokeWidth={1.6} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
