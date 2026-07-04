"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, FileText, Calendar, Folder,
  Image, BarChart2, Settings, Zap, BookOpen, Inbox,
  TableProperties, ChevronRight, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "@/components/layout/logo";
import { useSidebar } from "@/components/layout/sidebar-context";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard" },
  { icon: Building2,       label: "Entities",   href: "/entities"  },
  { icon: FileText,        label: "Content",     href: "/content"   },
  { icon: TableProperties, label: "Import",      href: "/import"    },
  { icon: Calendar,        label: "Calendar",    href: "/calendar"  },
  { icon: Folder,          label: "Campaigns",   href: "/campaigns" },
  { icon: BookOpen,        label: "Knowledge",   href: "/knowledge" },
  { icon: Image,           label: "Assets",      href: "/assets"    },
  { icon: Inbox,           label: "Inbox",       href: "/inbox"     },
  { icon: BarChart2,       label: "Analytics",   href: "/analytics" },
];

const bottomItems = [
  { icon: Zap,      label: "Prompts",  href: "/prompts"  },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const w = collapsed ? 56 : 192;

  function NavItem({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
    const active = isActive(href);
    const link = (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-md transition-colors",
          collapsed ? "h-9 w-9 justify-center" : "h-9 px-2.5 w-full",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="text-xs font-medium truncate">{label}</span>}
        {collapsed && <span className="sr-only">{label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  }

  return (
    <aside
      className="fixed left-0 top-0 z-30 flex h-screen flex-col border-r bg-background transition-[width] duration-200 overflow-hidden"
      style={{ width: w }}
    >
      {/* Logo row + toggle */}
      <div className="flex h-14 items-center border-b px-2 gap-1 shrink-0">
        <div className={cn("flex items-center gap-2 overflow-hidden flex-1", collapsed ? "justify-center" : "pl-1")}>
          <Logo collapsed />
          {!collapsed && (
            <span className="text-xs font-semibold whitespace-nowrap tracking-tight">
              Content<span className="text-muted-foreground font-normal">·ment</span>
            </span>
          )}
        </div>
        <button
          onClick={toggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Main nav */}
      <nav className={cn("flex flex-1 flex-col gap-0.5 py-3 overflow-y-auto", collapsed ? "items-center px-2" : "px-2")}>
        {navItems.map(item => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* Bottom nav */}
      <div className={cn("flex flex-col gap-0.5 py-3 border-t", collapsed ? "items-center px-2" : "px-2")}>
        {bottomItems.map(item => <NavItem key={item.href} {...item} />)}
      </div>
    </aside>
  );
}
