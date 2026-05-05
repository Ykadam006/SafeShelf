import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Dashed placeholder card shown when a list/table has no data yet.
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="ss-card flex flex-col items-center justify-center border border-dashed border-slate-200 bg-white/80 px-8 py-16 text-center backdrop-blur-[1px]">
      {Icon ? (
        <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-700 shadow-inner shadow-emerald-900/10">
          <Icon className="size-7" strokeWidth={1.75} />
        </span>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-8 flex flex-wrap justify-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
