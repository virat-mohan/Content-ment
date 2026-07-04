"use client";

import { useEffect, useState } from "react";
import { contentStore, type ContentItem } from "@/lib/store";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  review: "bg-yellow-400",
  approved: "bg-blue-400",
  published: "bg-green-400",
  archived: "bg-muted-foreground/20",
};

export default function CalendarPage() {
  const { activeId } = useActiveEntity();
  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => {
    if (!activeId) return;
    setItems(contentStore.getAll().filter(c => c.entityId === activeId));
  }, [activeId]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function itemsForDay(day: number) {
    return items.filter((item) => {
      const d = item.scheduledAt ? new Date(item.scheduledAt) : null;
      return d && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const selectedItems = selected ? itemsForDay(selected.getDate()) : [];

  return (
    <div className="flex flex-col">
      <Header title="Calendar" />
      <div className="flex-1 p-6 animate-fade-in space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold w-40 text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs ml-auto" onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today); }}>
            Today
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {DAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dayItems = day ? itemsForDay(day) : [];
              const isToday = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const isSelected = selected !== null && day !== null && day === selected.getDate() && selected.getMonth() === month && selected.getFullYear() === year;
              return (
                <div
                  key={i}
                  onClick={() => day && setSelected(new Date(year, month, day))}
                  className={cn(
                    "min-h-[80px] p-1.5 border-b border-r transition-colors",
                    i % 7 === 6 && "border-r-0",
                    day ? "cursor-pointer hover:bg-muted/30" : "bg-muted/10",
                    isSelected && "bg-accent/50",
                  )}
                >
                  {day && (
                    <>
                      <span className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday ? "bg-foreground text-background font-semibold" : "text-muted-foreground"
                      )}>{day}</span>
                      <div className="mt-1 space-y-0.5">
                        {dayItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-1 rounded px-1 py-0.5 bg-muted/60 truncate">
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[item.status])} />
                            <span className="text-[10px] truncate leading-tight">{item.title}</span>
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selected && (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-semibold">
              {selected.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            {selectedItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">No content scheduled. <Link href="/content" className="underline underline-offset-2">Add from Content →</Link></p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-md border p-3">
                    <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", STATUS_DOT[item.status])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.platform} · {item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
