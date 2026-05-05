import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert, Trash2 } from "lucide-react";

import {
  apiDelete,
  apiGet,
  apiPatchJson,
  normalizeApiError,
} from "../api/http";
import { AlertStatusBadge, RiskBadge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useScopeUser } from "../context/ScopeUserContext";
import type { AlertStatus, RecallAlertDto } from "../types";
import { formatDateShort } from "../utils/display";

// Statuses available in the per-row dropdown.
const STATUSES: AlertStatus[] = [
  "NEW",
  "REVIEWED",
  "DISMISSED",
  "RESOLVED",
];

// Small chip rendering the FDA classification text inside the table.
function ClassificationChip({
  classification,
}: {
  classification: string | null | undefined;
}) {
  if (!classification) {
    return <span className="text-sm font-medium text-slate-400">—</span>;
  }
  return (
    <span className="inline-flex max-w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-semibold leading-snug text-slate-800">
      {classification}
    </span>
  );
}

// Recall alerts inbox. Lets the user move alerts through their lifecycle.
export function RecallAlerts() {
  const { scopeUserId, loadingUsers, users } = useScopeUser();
  const [alerts, setAlerts] = useState<RecallAlertDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-row "draft" status so users can pick a value before pressing Save.
  const [draft, setDraft] = useState<Record<string, AlertStatus>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Reset the per-row draft map whenever fresh data arrives.
  const hydrateDraft = useCallback((rows: RecallAlertDto[]) => {
    const next: Record<string, AlertStatus> = {};
    rows.forEach((row) => {
      next[row.id] = row.alertStatus;
    });
    setDraft(next);
  }, []);

  // Fetch alerts for the current user.
  const load = useCallback(async () => {
    if (!scopeUserId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await apiGet<RecallAlertDto[]>("/alerts", {
        userId: scopeUserId,
      });
      hydrateDraft(rows);
      setAlerts(rows);
    } catch (e) {
      setAlerts([]);
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [hydrateDraft, scopeUserId]);

  useEffect(() => {
    if (!loadingUsers && scopeUserId) void load();
  }, [load, loadingUsers, scopeUserId]);

  // PATCH the alert status for a row.
  async function persistStatus(id: string) {
    const nextStatus = draft[id];
    if (!nextStatus) return;
    setBusyId(id);
    setError(null);
    try {
      await apiPatchJson<RecallAlertDto>(`/alerts/${id}`, {
        alertStatus: nextStatus,
      });
      await load();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  // DELETE an alert outright.
  async function destroy(id: string) {
    if (!window.confirm("Remove this recall alert record?")) return;
    setBusyId(id);
    try {
      await apiDelete(`/alerts/${id}`);
      await load();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  if (loadingUsers || (!scopeUserId && users.length > 0)) {
    return <Loading label="Preparing alert workspace…" />;
  }

  if (!loadingUsers && users.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <EmptyState
          icon={ShieldAlert}
          title="Missing users directory"
          description="Seed prisma before viewing recall safeguards."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recall alerts"
        subtitle="FDA-linked findings tied to SKUs — review classification, escalate risk tiers, or close noisy signals."
        actions={
          <button
            type="button"
            disabled={loading || !scopeUserId}
            className="ss-btn-secondary"
            onClick={() => void load()}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh list
          </button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="ss-card border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-950"
        >
          {error}
        </div>
      ) : null}

      {!scopeUserId ? (
        <Loading label="Selecting household…" />
      ) : loading && alerts.length === 0 ? (
        <Loading label="Loading recall safeguards…" />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No recall alerts found"
          description="Use “Check recall” on pantry rows to synthesize actionable alerts whenever FDA postings align with stocked goods."
        />
      ) : (
        <div className="ss-table-shell">
          <div className="overflow-x-auto">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>Pantry item</th>
                  <th className="min-w-[11rem]">Recall reason</th>
                  <th className="whitespace-nowrap">FDA classification</th>
                  <th className="whitespace-nowrap">Risk level</th>
                  <th className="whitespace-nowrap">Alert status</th>
                  <th className="text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const draftStatus = draft[alert.id] ?? alert.alertStatus;
                  return (
                    <tr key={alert.id}>
                      <td>
                        <p className="font-semibold text-slate-900">
                          {alert.pantryItem.name}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          {alert.pantryItem.category.name}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400">
                          Logged {formatDateShort(alert.createdAt)}
                        </p>
                      </td>
                      <td>
                        <p className="font-semibold leading-snug text-slate-900">
                          {alert.recall.reasonForRecall ??
                            "Reason not summarized — see FDA detail."}
                        </p>
                        {alert.recall.productDescription ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {alert.recall.productDescription}
                          </p>
                        ) : null}
                      </td>
                      <td>
                        <ClassificationChip
                          classification={alert.recall.classification}
                        />
                      </td>
                      <td>
                        <RiskBadge level={alert.riskLevel} />
                      </td>
                      <td>
                        <div className="flex flex-col gap-2">
                          <AlertStatusBadge status={draftStatus} />
                          {/* Indicates the dropdown was changed but not saved yet. */}
                          {draftStatus !== alert.alertStatus ? (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600">
                              Unsaved draft
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                          <select
                            disabled={busyId === alert.id}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-800 shadow-inner disabled:opacity-60"
                            value={draftStatus}
                            onChange={(event) =>
                              setDraft((prev) => ({
                                ...prev,
                                [alert.id]: event.target.value as AlertStatus,
                              }))
                            }
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              busyId === alert.id ||
                              draftStatus === alert.alertStatus
                            }
                            onClick={() => void persistStatus(alert.id)}
                            className="ss-btn-primary whitespace-nowrap !px-3 !py-2 text-[11px] uppercase tracking-wide disabled:bg-emerald-200"
                          >
                            Save status
                          </button>
                          <button
                            type="button"
                            disabled={busyId === alert.id}
                            onClick={() => void destroy(alert.id)}
                            className="ss-btn-quiet rounded-xl border border-red-100 bg-red-50 !p-2 text-red-800 hover:bg-red-100 disabled:opacity-60"
                            aria-label="Delete recall alert"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
