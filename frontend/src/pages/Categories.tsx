import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  apiDelete,
  apiGet,
  apiPatchJson,
  apiPostJson,
  normalizeApiError,
} from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import type { CategoryDto } from "../types";

export function Categories() {
  const [rows, setRows] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<CategoryDto[]>("/categories");
      setRows(data);
    } catch (e) {
      setRows([]);
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function startEdit(cat: CategoryDto) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiPostJson<CategoryDto>("/categories", {
        name: newName.trim(),
        ...(newDescription.trim() === ""
          ? {}
          : { description: newDescription.trim() }),
      });
      setNewName("");
      setNewDescription("");
      await reload();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setCreating(false);
    }
  }

  async function saveCategory(id: string) {
    const payload: Record<string, unknown> = {};
    payload.name = editName.trim();
    if (payload.name === "") {
      setError("Name cannot be blank.");
      return;
    }
    payload.description =
      editDescription.trim() === "" ? null : editDescription.trim();

    setBusyId(id);
    setError(null);
    try {
      await apiPatchJson<CategoryDto>(`/categories/${id}`, payload);
      cancelEdit();
      await reload();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  async function destroy(id: string) {
    if (!window.confirm("Delete this category if no pantry items rely on it?")) {
      return;
    }
    setBusyId(id);
    try {
      await apiDelete(`/categories/${id}`);
      await reload();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Categories"
        subtitle="Pantry taxonomy buckets mirrored from `/categories` — counts reflect linked SKUs."
        actions={
          <button
            type="button"
            disabled={loading}
            onClick={() => void reload()}
            className="ss-btn-secondary whitespace-nowrap"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="ss-card border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-950"
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={createCategory}
        className="ss-card grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end"
      >
        <div className="space-y-3 md:flex md:flex-wrap md:gap-4">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </label>
            <input
              disabled={creating}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. Baking"
              required
            />
          </div>
          <div className="min-w-[260px] flex-1 space-y-1 md:flex-[2]">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description (optional)
            </label>
            <input
              disabled={creating}
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Short purpose / guidance"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="ss-btn-primary flex w-full justify-center md:h-[42px] md:w-auto md:self-end"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="size-4" /> Add category
          </span>
        </button>
      </form>

      {loading && rows.length === 0 ? (
        <Loading label="Hydrating taxonomy…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Layers} title="No categories yet" description="Create your first taxonomy bucket." />
      ) : (
        <div className="ss-table-shell">
          <div className="overflow-x-auto">
            <table className="ss-table">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 whitespace-nowrap">SKU count</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((cat) =>
                  editingId === cat.id ? (
                    <tr key={cat.id} className="bg-emerald-50/40 align-top">
                      <td className="px-5 py-3">
                        <input
                          disabled={busyId === cat.id}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded-lg border border-white bg-white px-3 py-1.5 text-sm shadow-inner"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          disabled={busyId === cat.id}
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          className="w-full rounded-lg border border-white bg-white px-3 py-1.5 text-sm shadow-inner"
                          placeholder="Optional"
                        />
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-slate-500">
                        {cat.pantryItemCount}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === cat.id}
                            onClick={cancelEdit}
                            className="inline-flex rounded-lg border border-transparent p-2 text-slate-600 hover:bg-white"
                          >
                            <X className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === cat.id}
                            onClick={() => void saveCategory(cat.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            <Save className="size-3.5" /> Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={cat.id} className="align-top">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {cat.name}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {cat.description ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-500">
                        {cat.pantryItemCount}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === cat.id}
                            onClick={() => startEdit(cat)}
                            aria-label={`Edit category ${cat.name}`}
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === cat.id}
                            onClick={() => void destroy(cat.id)}
                            aria-label={`Delete category ${cat.name}`}
                            className="rounded-lg border border-transparent p-2 text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
