import { Leaf, Menu, RefreshCw, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useScopeUser } from "../context/ScopeUserContext";

export function Navbar({
  menuOpen,
  onMenuToggle,
}: {
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const {
    users,
    scopeUserId,
    setScopeUserId,
    loadingUsers,
    usersError,
    refreshUsers,
  } = useScopeUser();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
      <div className="flex min-h-[4.5rem] md:min-h-[4.75rem] items-center gap-3 px-4 py-3 md:gap-4 md:px-6 md:py-3">
        <button
          type="button"
          className="-ml-1 inline-flex shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={onMenuToggle}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link
          to="/"
          className="flex min-w-0 shrink items-center gap-3 rounded-xl pr-2 transition-colors hover:bg-slate-50/80 md:gap-4"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-900/15">
            <Leaf className="size-[1.35rem]" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 text-left leading-tight">
            <p className="truncate text-[1.0625rem] font-bold tracking-tight text-slate-900 md:text-xl">
              SafeShelf
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 md:text-xs md:normal-case md:tracking-normal md:text-slate-600">
              <span className="md:hidden">Smart recall & pantry tracker</span>
              <span className="hidden md:inline">
                Smart Food Recall &amp; Pantry Tracker
              </span>
            </p>
          </div>
        </Link>

        <div className="ml-auto hidden h-9 w-px shrink-0 bg-slate-200 md:block lg:h-11" />

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 lg:flex-nowrap">
          <label htmlFor="scope-user" className="hidden text-[11px] font-semibold text-slate-500 lg:inline">
            Demo&nbsp;user
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-xs xl:max-w-sm">
            <select
              id="scope-user"
              disabled={loadingUsers || users.length === 0}
              value={scopeUserId ?? ""}
              onChange={(e) => {
                const next = e.target.value;
                if (next !== "") setScopeUserId(next);
              }}
              className="ss-btn-secondary min-h-[2.5rem] min-w-0 flex-1 truncate !py-1.5 pl-3 pr-2 text-left text-xs focus:border-emerald-500 focus:!ring-emerald-500 md:text-sm"
            >
              {loadingUsers ? (
                <option value="">Loading users…</option>
              ) : users.length === 0 ? (
                <option value="">No users — run seed</option>
              ) : (
                users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => void refreshUsers()}
              disabled={loadingUsers}
              aria-label="Refresh users"
              className="ss-btn-secondary size-10 shrink-0 !p-0"
            >
              <RefreshCw
                className={`size-4 ${loadingUsers ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {usersError ? (
            <p
              title={usersError}
              className="max-w-[180px] truncate text-[11px] font-medium text-red-700 xl:max-w-xs"
            >
              {usersError}
            </p>
          ) : null}

          <span className="hidden shrink-0 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900 xl:inline-block">
            Demo workspace
          </span>
        </div>
      </div>
    </header>
  );
}
