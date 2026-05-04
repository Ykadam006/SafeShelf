import { useCallback, useEffect, useState } from "react";
import { Package, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { apiDelete, apiGet, apiPostJson, normalizeApiError } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useScopeUser } from "../context/ScopeUserContext";
import type { PantryItemDto } from "../types";
import { formatDateDay } from "../utils/display";

type CheckSnack = {
  id: string;
  message: string;
  variant: "success" | "error";
};

export function PantryItems() {
  const { scopeUserId, loadingUsers, users } = useScopeUser();
  const [items, setItems] = useState<PantryItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [snacks, setSnacks] = useState<CheckSnack[]>([]);

  const dismissSnack = useCallback((id: string) => {
    setSnacks((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const pushSnack = useCallback((message: string, variant: "success" | "error") => {
    const id = crypto.randomUUID();
    setSnacks((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => dismissSnack(id), 9500);
  }, [dismissSnack]);

  const loadItems = useCallback(async () => {
    if (!scopeUserId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await apiGet<PantryItemDto[]>("/pantry-items", {
        userId: scopeUserId,
      });
      setItems(rows);
    } catch (e) {
      setError(normalizeApiError(e).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scopeUserId]);

  useEffect(() => {
    if (!loadingUsers && scopeUserId) void loadItems();
  }, [loadItems, loadingUsers, scopeUserId]);

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this pantry item?")) return;
    try {
      setBusyId(id);
      await apiDelete(`/pantry-items/${id}`);
      await loadItems();
    } catch (e) {
      pushSnack(normalizeApiError(e).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function checkRecall(id: string) {
    try {
      setBusyId(id);
      const res = await apiPostJson<{
        matchesFound: number;
        alertsCreated: number;
      }>(`/pantry-items/${id}/check-recall`, {});
      pushSnack(
        [
          "Recall check completed.",
          `Matches surfaced: ${res.matchesFound}`,
          `Alerts recorded: ${res.alertsCreated}`,
        ].join(" "),
        "success",
      );
      await loadItems();
    } catch (e) {
      pushSnack(normalizeApiError(e).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loadingUsers || (!scopeUserId && users.length > 0)) {
    return <Loading label="Connecting to pantry…" />;
  }

  if (!loadingUsers && users.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <EmptyState
          icon={Package}
          title="No users seeded"
          description="Create users via the Users tab or prisma seed before opening pantry data."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pantry items"
        subtitle="Operational view of SKU rows for the scoped demo household — quick recall checks plus delete actions."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadItems()}
              className="ss-btn-secondary"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link to="/pantry/new" className="ss-btn-primary">
              Add item
            </Link>
          </div>
        }
      />

      {snacks.length > 0 ? (
        <div className="space-y-3">
          {snacks.map((s) => (
            <div
              key={s.id}
              role="status"
              className={`ss-card flex items-start justify-between gap-4 px-5 py-4 text-sm ${
                s.variant === "success"
                  ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
                  : "border-red-200 bg-red-50 text-red-950"
              }`}
            >
              <span className="leading-relaxed">{s.message}</span>
              <button
                type="button"
                className="text-xs font-bold uppercase tracking-wide text-slate-600 underline underline-offset-2 hover:text-slate-900"
                onClick={() => dismissSnack(s.id)}
              >
                Close
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="ss-card border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-950">
          {error}
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <Loading label="Loading pantry rows…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No pantry items yet"
          description="Add inventory manually or rerun prisma seed to preload curated demo SKUs."
        >
          <Link to="/pantry/new" className="ss-btn-primary text-xs">
            Add your first SKU
          </Link>
        </EmptyState>
      ) : (
        <div className="ss-table-shell">
          <div className="overflow-x-auto">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th className="whitespace-nowrap text-right">Qty</th>
                  <th className="whitespace-nowrap">Expiration date</th>
                  <th>Storage</th>
                  <th className="text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold text-slate-900">{row.name}</td>
                    <td className="text-sm text-slate-600">
                      {row.brand ?? "—"}
                    </td>
                    <td className="text-sm font-medium text-slate-700">
                      {row.category.name}
                    </td>
                    <td className="text-right tabular-nums font-semibold">
                      {row.quantity}
                    </td>
                    <td className="whitespace-nowrap text-sm tabular-nums text-slate-600">
                      {formatDateDay(row.expirationDate)}
                    </td>
                    <td className="max-w-[12rem] text-sm leading-snug text-slate-600">
                      {row.storageLocation ?? "—"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void checkRecall(row.id)}
                          className="ss-btn-quiet border border-emerald-200 bg-emerald-50/80 !px-3 !py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                        >
                          Check recall
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void deleteItem(row.id)}
                          className="ss-btn-quiet !p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          aria-label={`Delete ${row.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
