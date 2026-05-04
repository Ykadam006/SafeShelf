import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2, UserPlus } from "lucide-react";

import { apiDelete, apiGet, apiPostJson, normalizeApiError } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useScopeUser } from "../context/ScopeUserContext";
import type { UserDto, UserRole } from "../types";
import { formatDateShort } from "../utils/display";

export function Users() {
  const { refreshUsers } = useScopeUser();
  const [rows, setRows] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("USER");

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<UserDto[]>("/users");
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiPostJson<UserDto>("/users", {
        name: name.trim(),
        email: email.trim(),
        role,
      });
      setName("");
      setEmail("");
      setRole("USER");
      await reload();
      void refreshUsers();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setCreating(false);
    }
  }

  async function destroy(id: string) {
    const target = rows.find((u) => u.id === id);
    if (
      target?.email?.toLowerCase() === "demo@safeshelf.com" &&
      !window.confirm(
        "This is the seeded demo@safeshelf.com user. Delete anyway?",
      )
    ) {
      return;
    }
    if (!window.confirm(`Delete ${target?.name ?? "this user"}?`)) return;
    setBusyId(id);
    try {
      await apiDelete(`/users/${id}`);
      await reload();
      void refreshUsers();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Users"
        subtitle="Demo identities from seed data plus any ad-hoc users you create — mirrored from `/users`."
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
        className="ss-card grid gap-4 p-5 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end"
        onSubmit={(event) => void submit(event)}
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Display name *
          </label>
          <input
            className={`${inputCls} bg-white`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email *
          </label>
          <input
            className={`${inputCls} bg-white`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Role
          </label>
          <select
            disabled={creating}
            className={`${inputCls} bg-white`}
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="ss-btn-primary flex min-h-[42px] justify-center self-end"
        >
          <UserPlus className="size-4" />
          Add user
        </button>
      </form>

      {loading && rows.length === 0 ? (
        <Loading label="Loading directory…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No identities yet"
          description="Seed prisma or invite users above."
        />
      ) : (
        <div className="ss-table-shell">
          <div className="overflow-x-auto">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th className="whitespace-nowrap">Role</th>
                  <th className="whitespace-nowrap">Joined</th>
                  <th className="whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((user) => (
                  <tr key={user.id} className="align-middle">
                    <td className="font-semibold text-slate-900">
                      {user.name}
                    </td>
                    <td className="text-sm text-slate-600">{user.email}</td>
                    <td>
                      <span
                        className={
                          user.role === "ADMIN"
                            ? "inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800"
                            : "inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                        }
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {formatDateShort(user.createdAt)}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        aria-label={`Delete ${user.email}`}
                        onClick={() => void destroy(user.id)}
                        className="ss-btn-quiet p-2 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
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
