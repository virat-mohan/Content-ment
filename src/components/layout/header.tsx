"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, Settings, ChevronDown, Check, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { entityStore, type Entity } from "@/lib/store";
import { getActiveEntityId, setActiveEntityId } from "@/lib/active-entity";
import { useSidebar } from "@/components/layout/sidebar-context";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { setMobileOpen } = useSidebar();

  useEffect(() => {
    const all = entityStore.getAll();
    setEntities(all);
    const stored = getActiveEntityId();
    if (stored && all.find(e => e.id === stored)) {
      setActiveId(stored);
    } else if (all.length) {
      setActiveId(all[0].id);
      setActiveEntityId(all[0].id);
    }
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = entities.find(e => e.id === activeId);

  function select(id: string) {
    setActiveId(id);
    setActiveEntityId(id);
    setOpen(false);
    // Dispatch a storage event so other components can react
    window.dispatchEvent(new Event("active-entity-changed"));
  }

  const initials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur px-3 sm:px-4">

      {/* Mobile hamburger */}
      <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden shrink-0" onClick={() => setMobileOpen(true)}>
        <Menu className="h-4 w-4" />
      </Button>

      {/* Active entity badge / switcher */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 rounded-md border bg-muted/50 hover:bg-muted px-2.5 h-8 transition-colors max-w-[140px] sm:max-w-[200px]"
        >
          {active ? (
            <>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold bg-foreground text-background">
                {initials(active.name)}
              </div>
              <span className="text-xs font-medium truncate">{active.name}</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No entity</span>
          )}
        </button>

        {open && entities.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-52 rounded-lg border bg-background shadow-lg py-1 z-50">
            <p className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Switch entity</p>
            {entities.map(e => (
              <button
                key={e.id}
                onClick={() => select(e.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold bg-foreground text-background">
                  {initials(e.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{e.name}</p>
                  {e.industry && <p className="text-[10px] text-muted-foreground truncate">{e.industry}</p>}
                </div>
                {e.id === activeId && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
              </button>
            ))}
            <div className="border-t mt-1 pt-1">
              <Link
                href="/entities"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Manage entities →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Page title */}
      {title && <h1 className="text-sm font-semibold text-foreground">{title}</h1>}

      {/* Search — hidden on small screens */}
      <div className="hidden sm:flex flex-1 items-center gap-2 ml-auto max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>
      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild>
          <Link href="/settings"><Settings className="h-4 w-4" /></Link>
        </Button>
      </div>
    </header>
  );
}
