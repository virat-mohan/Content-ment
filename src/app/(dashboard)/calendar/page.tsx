"use client";

import { useEffect, useState, useCallback } from "react";
import { contentStore, campaignStore, type ContentItem, type Campaign, CONTENT_STATUS_LABELS } from "@/lib/store";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, List, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_COLOR: Record<string, string> = {
  not_started:       "bg-muted-foreground/20 text-muted-foreground",
  drafted:           "bg-muted-foreground/30 text-muted-foreground",
  author_review:     "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  sent_for_approval: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved:          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  published:         "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  archived:          "bg-muted/60 text-muted-foreground",
};

// Consistent campaign colours by index
const CAMPAIGN_HUES = [
  "bg-violet-500", "bg-blue-500", "bg-rose-500", "bg-amber-500",
  "bg-teal-500",   "bg-fuchsia-500", "bg-sky-500", "bg-orange-500",
];

function campaignColor(idx: number) { return CAMPAIGN_HUES[idx % CAMPAIGN_HUES.length]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function itemDate(item: ContentItem): string | null {
  if (!item.scheduledAt) return null;
  const d = new Date(item.scheduledAt);
  return isoDate(d);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { activeId } = useActiveEntity();
  const [today] = useState(() => new Date());
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<"month" | "week">("month");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!activeId) return;
    setItems(contentStore.getAll().filter(c => c.entityId === activeId && c.scheduledAt));
    setCampaigns(campaignStore.getAll(activeId));
  }, [activeId]);

  useEffect(() => { load(); }, [load]);

  const campaignIndex = Object.fromEntries(campaigns.map((c, i) => [c.id, i]));

  // ── Navigation ───────────────────────────────────────────────────────────────

  function prev() {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    else setCursor(new Date(cursor.getTime() - 7 * 86400000));
  }
  function next() {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    else setCursor(new Date(cursor.getTime() + 7 * 86400000));
  }
  function goToday() {
    setCursor(view === "month" ? new Date(today.getFullYear(), today.getMonth(), 1) : startOfWeek(today));
    setSelectedDate(isoDate(today));
  }

  function startOfWeek(d: Date) {
    const day = d.getDay();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  }

  // ── Drag to reschedule ───────────────────────────────────────────────────────

  function handleDrop(dateStr: string) {
    if (!dragId) return;
    const item = items.find(c => c.id === dragId);
    if (!item) return;
    // Keep original time, change only the date
    const orig = item.scheduledAt ? new Date(item.scheduledAt) : new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    const newDate = new Date(y, m - 1, d, orig.getHours(), orig.getMinutes());
    const updated: ContentItem = { ...item, scheduledAt: newDate.toISOString(), updatedAt: new Date().toISOString() };
    contentStore.save(updated);
    load();
    setDragId(null);
    setHighlightDate(null);
  }

  // ── Build cell dates ─────────────────────────────────────────────────────────

  function getMonthCells(): (Date | null)[] {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(y, m, i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function getWeekDates(): Date[] {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000));
  }

  // ── Gap detection — days with no content in the next 4 weeks ─────────────────

  const gapDates = (() => {
    const gaps = new Set<string>();
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const scheduledDates = new Set(items.map(i => itemDate(i)).filter(Boolean) as string[]);
    for (let i = 0; i < 28; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const ds = isoDate(d);
      if (!scheduledDates.has(ds)) gaps.add(ds);
    }
    return gaps;
  })();

  // ── Selected day items ───────────────────────────────────────────────────────

  const selectedItems = selectedDate
    ? items.filter(i => itemDate(i) === selectedDate).sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
    : [];

  // ── Render cell ──────────────────────────────────────────────────────────────

  function CellContent({ date, compact = false }: { date: Date; compact?: boolean }) {
    const ds = isoDate(date);
    const dayItems = items.filter(i => itemDate(i) === ds);
    const isToday = ds === isoDate(today);
    const isSelected = ds === selectedDate;
    const isGap = gapDates.has(ds) && !compact;
    const isDragOver = highlightDate === ds;

    return (
      <div
        className={cn(
          "h-full p-1 transition-colors cursor-pointer",
          isSelected ? "bg-accent/50" : "hover:bg-muted/30",
          isDragOver && "bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-400 ring-inset",
          compact ? "min-h-[64px]" : "min-h-[90px]",
        )}
        onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
        onDragOver={(e) => { e.preventDefault(); setHighlightDate(ds); }}
        onDragLeave={() => setHighlightDate(h => h === ds ? null : h)}
        onDrop={(e) => { e.preventDefault(); handleDrop(ds); }}
      >
        <span className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
          isToday ? "bg-foreground text-background" : "text-muted-foreground",
        )}>
          {date.getDate()}
        </span>
        {isGap && dayItems.length === 0 && (
          <div className="mt-0.5 flex items-center gap-0.5">
            <AlertCircle className="h-2.5 w-2.5 text-orange-400 shrink-0" />
            <span className="text-[9px] text-orange-400 leading-tight">gap</span>
          </div>
        )}
        <div className="mt-0.5 space-y-0.5">
          {dayItems.slice(0, compact ? 2 : 3).map((item) => {
            const campIdx = item.campaignId ? campaignIndex[item.campaignId] : undefined;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => { e.stopPropagation(); setDragId(item.id); }}
                onDragEnd={() => { setDragId(null); setHighlightDate(null); }}
                className="flex items-center gap-1 rounded px-1 py-0.5 bg-muted/60 hover:bg-muted truncate cursor-grab active:cursor-grabbing"
                title={item.hook || item.title}
              >
                {campIdx !== undefined && (
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", campaignColor(campIdx))} />
                )}
                <span className="text-[10px] truncate leading-tight">{item.hook || item.title}</span>
              </div>
            );
          })}
          {dayItems.length > (compact ? 2 : 3) && (
            <span className="text-[10px] text-muted-foreground px-1">+{dayItems.length - (compact ? 2 : 3)}</span>
          )}
        </div>
      </div>
    );
  }

  const monthCells = getMonthCells();
  const weekDates = getWeekDates();

  // Heading label
  const headingLabel = view === "month"
    ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : (() => {
        const wk = getWeekDates();
        const s = wk[0], e = wk[6];
        if (s.getMonth() === e.getMonth()) return `${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
        return `${MONTHS[s.getMonth()]} – ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
      })();

  return (
    <div className="flex flex-col">
      <Header title="Calendar" />
      <div className="flex-1 p-4 sm:p-6 animate-fade-in space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold w-52 text-center">{headingLabel}</span>
          <Button variant="ghost" size="sm" className="text-xs" onClick={goToday}>Today</Button>
          <div className="ml-auto flex items-center gap-1 border rounded-md overflow-hidden">
            <button
              onClick={() => setView("month")}
              className={cn("px-3 py-1.5 text-xs transition-colors", view === "month" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/30")}
            >
              <CalendarDays className="h-3.5 w-3.5 inline mr-1" />Month
            </button>
            <button
              onClick={() => { setView("week"); setCursor(startOfWeek(today)); }}
              className={cn("px-3 py-1.5 text-xs transition-colors", view === "week" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/30")}
            >
              <List className="h-3.5 w-3.5 inline mr-1" />Week
            </button>
          </div>
        </div>

        {/* Campaign legend */}
        {campaigns.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {campaigns.slice(0, 6).map((c, i) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", campaignColor(i))} />
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{c.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Month view */}
        {view === "month" && (
          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthCells.map((date, i) => (
                <div
                  key={i}
                  className={cn(
                    "border-b border-r",
                    i % 7 === 6 && "border-r-0",
                    !date && "bg-muted/10",
                  )}
                >
                  {date ? <CellContent date={date} /> : <div className="min-h-[90px]" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Week view */}
        {view === "week" && (
          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {weekDates.map((d) => {
                const isToday = isoDate(d) === isoDate(today);
                return (
                  <div key={d.toISOString()} className="px-2 py-2 text-center">
                    <p className="text-xs font-medium text-muted-foreground">{DAYS_SHORT[d.getDay()]}</p>
                    <span className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold mx-auto mt-0.5",
                      isToday ? "bg-foreground text-background" : "text-foreground",
                    )}>
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7">
              {weekDates.map((d) => (
                <div key={d.toISOString()} className="border-r last:border-r-0">
                  <CellContent date={d} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected day panel */}
        {selectedDate && (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-semibold">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            {selectedItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">No content scheduled. Go to Content to schedule a piece for this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => {
                  const campIdx = item.campaignId ? campaignIndex[item.campaignId] : undefined;
                  const camp = item.campaignId ? campaigns.find(c => c.id === item.campaignId) : undefined;
                  return (
                    <div key={item.id} className="flex items-start gap-3 rounded-md border p-3">
                      {campIdx !== undefined && (
                        <span className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0", campaignColor(campIdx))} />
                      )}
                      {campIdx === undefined && (
                        <span className="mt-1 h-2.5 w-2.5 rounded-full shrink-0 bg-muted-foreground/30" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.hook || item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground capitalize">{item.platform}</span>
                          <Badge variant="secondary" className={cn("text-[10px] capitalize px-1.5 py-0", STATUS_COLOR[item.status])}>
                            {CONTENT_STATUS_LABELS[item.status]}
                          </Badge>
                          {camp && (
                            <span className="text-[10px] text-muted-foreground">· {camp.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Gap hint */}
        {gapDates.size > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            Days marked <span className="text-orange-400 font-medium">gap</span> have no content scheduled in the next 28 days.
          </p>
        )}

      </div>
    </div>
  );
}
