"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";

function Inner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 transition-[padding] duration-200"
        style={{ paddingLeft: collapsed ? 56 : 192 }}
      >
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Inner>{children}</Inner>
    </SidebarProvider>
  );
}
