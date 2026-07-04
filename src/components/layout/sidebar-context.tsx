"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const Ctx = createContext<SidebarCtx>({ collapsed: false, toggle: () => {}, mobileOpen: false, setMobileOpen: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggle() {
    setCollapsed(c => {
      localStorage.setItem("sidebar-collapsed", String(!c));
      return !c;
    });
  }

  return <Ctx.Provider value={{ collapsed, toggle, mobileOpen, setMobileOpen }}>{children}</Ctx.Provider>;
}

export const useSidebar = () => useContext(Ctx);
