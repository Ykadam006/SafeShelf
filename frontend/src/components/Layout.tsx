import { useLayoutEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

// App shell: fixed top navbar, fixed left sidebar, scrollable main content.
export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on first paint when the viewport is already desktop-wide.
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
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {/* Padding accounts for the fixed navbar (top) and sidebar (left on md+). */}
      <main className="min-h-[calc(100vh-4.875rem)] bg-gradient-to-br from-slate-50 via-white to-emerald-50/35 px-4 pb-8 pt-[5.875rem] md:pl-[18rem] md:pr-8 lg:pl-[19rem] lg:pr-12">
        <div className="mx-auto max-w-[100rem]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
