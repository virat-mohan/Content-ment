"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Calendar,
  Folder,
  Image,
  BarChart2,
  Settings,
  Zap,
  BookOpen,
  Inbox,
  TableProperties,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "@/components/layout/logo";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Entities", href: "/entities" },
  { icon: FileText, label: "Content", href: "/content" },
  { icon: TableProperties, label: "Import", href: "/import" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Folder, label: "Campaigns", href: "/campaigns" },
  { icon: BookOpen, label: "Knowledge", href: "/knowledge" },
  { icon: Image, label: "Assets", href: "/assets" },
  { icon: Inbox, label: "Inbox", href: "/inbox" },
  { icon: BarChart2, label: "Analytics", href: "/analytics" },
];

const bottomItems = [
  { icon: Zap, label: "Prompts", href: "/prompts" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-14 flex-col border-r bg-background">
      <div className="flex h-14 items-center justify-center border-b">
        <Logo collapsed />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1 py-3 px-2">
        {navItems.map(({ icon: Icon, label, href }) => (
          <Tooltip key={href} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  isActive(href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="sr-only">{label}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </nav>

      <div className="flex flex-col items-center gap-1 py-3 px-2 border-t">
        {bottomItems.map(({ icon: Icon, label, href }) => (
          <Tooltip key={href} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  isActive(href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="sr-only">{label}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </aside>
  );
}
