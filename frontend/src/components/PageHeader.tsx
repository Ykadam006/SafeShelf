import type { ReactNode } from "react";

// Title + subtitle + optional action buttons rendered above each page.
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
