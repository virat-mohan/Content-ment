"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 min-w-0"
        // Desktop: offset main by sidebar width. Mobile: sidebar is a drawer (no offset needed).
        // The CSS below handles the responsive override.
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
      <InnerLayout>{children}</InnerLayout>
    </SidebarProvider>
  );
}
