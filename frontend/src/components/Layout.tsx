import { useLayoutEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setMenuOpen(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((prev) => !prev)}
      />
      <div className="flex items-stretch pt-[4.875rem]">
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <main className="min-h-[calc(100vh-4.875rem)] flex-1 bg-gradient-to-br from-slate-50 via-white to-emerald-50/35 px-4 py-8 md:px-8 lg:px-12">
          <div className="mx-auto max-w-[100rem]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
