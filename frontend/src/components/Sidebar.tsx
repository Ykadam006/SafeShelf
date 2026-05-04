import {
  LayoutDashboard,
  Layers,
  Package,
  PackagePlus,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pantry", label: "Pantry Items", icon: Package },
  { to: "/pantry/new", label: "Add Item", icon: PackagePlus },
  { to: "/categories", label: "Categories", icon: Layers },
  { to: "/alerts", label: "Recall Alerts", icon: ShieldAlert },
  { to: "/recall-search", label: "FDA Recall Search", icon: Search },
  { to: "/users", label: "Users", icon: Users },
];

export function Sidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <aside
        className={[
          "scrollbar-thin-subtle fixed inset-y-0 left-0 z-40 w-[17rem] shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900 pt-[4.875rem] text-slate-300 shadow-[4px_0_24px_rgba(15,23,42,0.12)] transition-transform md:static md:z-30 md:min-h-[calc(100vh-4.875rem)] md:bg-slate-900 md:pt-0 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <nav className="flex flex-col gap-1 px-3 py-4 md:flex-1 md:py-5">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Navigate
          </p>
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "border-l-[3px] border-emerald-400 bg-slate-800/90 pl-[9px] text-white shadow-inner"
                          : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`size-[18px] shrink-0 ${isActive ? "text-emerald-400" : "text-slate-500"}`}
                          aria-hidden
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
          onClick={onNavigate}
        />
      ) : null}
    </>
  );
}
