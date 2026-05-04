import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  CalendarClock,
  Package,
  Shield,
} from "lucide-react";

import { apiGet, normalizeApiError } from "../api/http";
import { AlertStatusBadge, RiskBadge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { useScopeUser } from "../context/ScopeUserContext";
import type { DashboardSummary } from "../types";
import { formatDateShort } from "../utils/display";

export function Dashboard() {
  const { scopeUserId, loadingUsers, users } = useScopeUser();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeReady = Boolean(!loadingUsers && scopeUserId);

  const load = useCallback(async () => {
    if (!scopeUserId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<DashboardSummary>("/dashboard/summary", {
        userId: scopeUserId,
      });
      setSummary(data);
    } catch (e) {
      setError(normalizeApiError(e).message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [scopeUserId]);

  useEffect(() => {
    if (!scopeReady) return;
    void load();
  }, [scopeReady, load]);

  const refreshedLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  }, [summary]);

  const maxCategoryItems = useMemo(() => {
    if (!summary) return 0;
    return Math.max(1, ...summary.itemsByCategory.map((c) => c.itemCount));
  }, [summary]);

  if (loadingUsers) {
    return <Loading label="Loading household context…" />;
  }

  if (!loadingUsers && users.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <EmptyState
          icon={ClipboardList}
          title="No users available"
          description="Seed the api-service (`npm run prisma:seed`) so demo users exist for dashboard metrics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Admin-style overview — pantry totals, recalls, expiry pressure, and the latest screenings for your selected demo household."
        actions={
          <button
            type="button"
            disabled={loading || !scopeReady}
            onClick={() => void load()}
            className="ss-btn-secondary whitespace-nowrap"
          >
            Refresh data
          </button>
        }
      />

      <div className="ss-card flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm text-slate-600 md:gap-6">
        <span className="flex items-center gap-2 font-medium">
          <CalendarClock className="size-4 text-emerald-600" />
          Session clock · {refreshedLabel}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
          KPI scope · selected user
        </span>
      </div>

      {error ? (
        <div role="alert" className="ss-card border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-950">
          {error}
        </div>
      ) : null}

      {!scopeReady ? (
        <Loading label="Preparing scoped metrics…" />
      ) : loading && summary === null ? (
        <Loading label="Loading dashboard metrics…" />
      ) : summary === null ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load dashboard"
          description="The API responded unexpectedly. Retry or verify api-service connectivity."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Total pantry items"
              value={String(summary.totalPantryItems)}
              hint="SKUs attributed to this user"
              icon={Package}
            />
            <StatCard
              label="Active alerts"
              value={String(summary.activeAlerts)}
              hint="New + reviewed statuses"
              icon={Shield}
            />
            <StatCard
              label="High‑risk alerts"
              value={String(summary.highRiskAlerts)}
              hint="Risk tier flagged as HIGH"
              icon={AlertTriangle}
            />
            <StatCard
              label="Expiring soon"
              value={String(summary.expiringSoonItems)}
              hint="Within the next ~14 UTC days"
              icon={ClipboardList}
            />
            <StatCard
              label="Recent recall checks"
              value={String(summary.recentRecallChecks.length)}
              hint="Last pantry screenings (≤ 15)"
              icon={Activity}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <section className="ss-card xl:col-span-5">
              <div className="ss-card-header bg-slate-50/70">
                <h2 className="text-[15px] font-bold text-slate-900">
                  Items by category
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Distribution of stocked SKUs inside each taxonomy bucket.
                </p>
              </div>
              <div className="p-5">
                {summary.itemsByCategory.length === 0 ? (
                  <EmptyState title="Nothing catalogued" description="Add pantry items via the Pantry Items flow." />
                ) : (
                  <ul className="space-y-5">
                    {summary.itemsByCategory.map((cat) => {
                      const widthPct = Math.round(
                        (cat.itemCount / maxCategoryItems) * 100,
                      );
                      return (
                        <li key={cat.categoryId}>
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span>{cat.categoryName}</span>
                            <span className="tabular-nums text-slate-600">
                              {cat.itemCount}
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width]"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="ss-card xl:col-span-7">
              <div className="ss-card-header bg-slate-50/70">
                <h2 className="text-[15px] font-bold text-slate-900">
                  Latest recall alerts
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Most recently ingested recalls with pantry SKU context.
                </p>
              </div>
              <div className="p-5">
                {summary.latestAlerts.length === 0 ? (
                  <EmptyState
                    title="No recall alerts found"
                    description="Check pantry items against FDA recalls to populate actionable alerts."
                  />
                ) : (
                  <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto pr-1 scrollbar-thin-subtle">
                    {summary.latestAlerts.map((alert) => (
                      <li key={alert.id} className="py-4 first:pt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <RiskBadge level={alert.riskLevel} />
                          <AlertStatusBadge status={alert.alertStatus} />
                          <span className="text-[11px] font-medium tabular-nums uppercase tracking-wide text-slate-400">
                            {formatDateShort(alert.createdAt)}
                          </span>
                        </div>
                        <p className="mt-3 text-[15px] font-semibold text-slate-900">
                          {alert.pantryItem?.name ?? "Pantry SKU"}
                          <span className="ml-2 text-xs font-medium text-slate-500">
                            · {alert.pantryItem?.category?.name}
                          </span>
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                          {alert.recall?.reasonForRecall ??
                            alert.recall?.productDescription ??
                            "Recall detail attached — open Alerts for workflow tools."}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <section className="ss-table-shell">
            <div className="ss-card-header bg-slate-50/70">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">
                  Recent recall checks
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Audit trail of SKU-level FDA searches performed from Pantry Items.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Checked</th>
                    <th>SKU</th>
                    <th>Query</th>
                    <th className="text-right whitespace-nowrap">Matches</th>
                    <th>API status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentRecallChecks.length === 0 ? (
                    <tr>
                      <td
                        className="py-12 text-center text-sm text-slate-600"
                        colSpan={5}
                      >
                        Nothing logged yet — use “Check recall” on pantry rows.
                      </td>
                    </tr>
                  ) : (
                    summary.recentRecallChecks.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap text-xs text-slate-500 tabular-nums">
                          {formatDateShort(row.checkedAt)}
                        </td>
                        <td className="font-semibold text-slate-900">
                          {row.pantryItem.name}
                        </td>
                        <td className="max-w-xs truncate text-xs text-slate-600">
                          {row.searchQuery}
                        </td>
                        <td className="text-right font-semibold tabular-nums">
                          {row.matchesFound}
                        </td>
                        <td className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-700">
                            {row.externalApiStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
