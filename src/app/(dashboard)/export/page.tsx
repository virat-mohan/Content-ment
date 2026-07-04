"use client";

import { useEffect, useState, useCallback } from "react";
import {
  contentStore, campaignStore, entityStore,
  type ContentItem, type Campaign, type Entity,
  CONTENT_STATUS_LABELS,
} from "@/lib/store";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, CalendarDays, CheckSquare, Clock, FileText } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = {
  approved: 0, sent_for_approval: 1, author_review: 2,
  drafted: 3, not_started: 4, published: 5, archived: 6,
};

const PLATFORM_URLS: Record<string, string> = {
  linkedin: "https://www.linkedin.com/feed/",
  twitter: "https://x.com/compose/post",
  instagram: "https://www.instagram.com/",
  blog: "(open your CMS)",
  youtube: "https://studio.youtube.com/",
  email: "(open your email platform)",
  other: "(open your publishing channel)",
};

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Export page ─────────────────────────────────────────────────────────────

export default function ExportPage() {
  const { activeId } = useActiveEntity();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "ready" | "scheduled">("ready");

  const load = useCallback(() => {
    if (!activeId) return;
    const all = contentStore.getAll().filter(c => c.entityId === activeId);
    setItems(all);
    setCampaigns(campaignStore.getAll(activeId));
    setEntity(entityStore.getAll().find(e => e.id === activeId) ?? null);
  }, [activeId]);

  useEffect(() => { load(); }, [load]);

  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  // Filtered & sorted content
  const filtered = items
    .filter(item => {
      if (item.status === "archived" || item.status === "published") return false;
      if (filterStatus === "ready") return item.status === "approved";
      if (filterStatus === "scheduled") return !!item.scheduledAt;
      return true;
    })
    .sort((a, b) => {
      // Scheduled first, then by status priority, then by contentId
      if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    });

  // Upcoming 4 weeks schedule
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const upcoming = items
    .filter(c => c.scheduledAt && c.status !== "published" && c.status !== "archived")
    .filter(c => new Date(c.scheduledAt!).getTime() >= now.getTime())
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))
    .slice(0, 30);

  // Group upcoming by week
  const byWeek: Record<string, ContentItem[]> = {};
  for (const item of upcoming) {
    const d = new Date(item.scheduledAt!);
    // Find week start (Monday)
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(d); weekStart.setDate(d.getDate() + diff);
    const key = isoDate(weekStart);
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(item);
  }
  const weeks = Object.keys(byWeek).sort();

  function downloadMarkdown() {
    const lines: string[] = [
      `# Content Execution Brief — ${entity?.name ?? ""}`,
      `Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      "",
      "---",
      "",
    ];

    if (weeks.length > 0) {
      lines.push("## Scheduled Calendar\n");
      for (const weekKey of weeks) {
        const wItems = byWeek[weekKey];
        const wDate = new Date(weekKey + "T12:00:00");
        lines.push(`### Week of ${wDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}\n`);
        for (const item of wItems) {
          const d = new Date(item.scheduledAt!);
          const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const camp = item.campaignId ? campaignMap[item.campaignId]?.name : null;
          lines.push(`**${dateStr}** · ${item.platform.toUpperCase()} · ${item.hook || item.title}`);
          if (camp) lines.push(`  Campaign: ${camp}`);
          lines.push(`  Status: ${CONTENT_STATUS_LABELS[item.status]}`);
          lines.push(`  Post to: ${PLATFORM_URLS[item.platform] || item.platform}`);
          if (item.body?.trim()) lines.push(`\n  > ${item.body.split("\n")[0].slice(0, 120)}…\n`);
          lines.push("");
        }
      }
    }

    lines.push("## All Content to Publish\n");
    const toPub = items.filter(i => i.status !== "published" && i.status !== "archived");
    for (const item of toPub.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))) {
      const camp = item.campaignId ? campaignMap[item.campaignId]?.name : null;
      lines.push(`### [${item.contentId}] ${item.hook || item.title}`);
      lines.push(`- Platform: ${item.platform}`);
      lines.push(`- Status: ${CONTENT_STATUS_LABELS[item.status]}`);
      if (camp) lines.push(`- Campaign: ${camp}`);
      if (item.scheduledAt) lines.push(`- Scheduled: ${new Date(item.scheduledAt).toLocaleDateString()}`);
      lines.push(`- Post to: ${PLATFORM_URLS[item.platform] || item.platform}`);
      if (item.body?.trim()) {
        lines.push("\n**Content:**");
        lines.push("```");
        lines.push(item.body.trim());
        lines.push("```");
      }
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `execution-brief-${entity?.name?.toLowerCase().replace(/\s+/g, "-") ?? "export"}-${isoDate(new Date())}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const readyCount = items.filter(i => i.status === "approved").length;
  const inProgressCount = items.filter(i => ["drafted", "author_review", "sent_for_approval"].includes(i.status)).length;

  return (
    <div className="flex flex-col">
      <Header title="Export for Execution" />
      <div className="flex-1 p-4 sm:p-6 animate-fade-in space-y-6 max-w-4xl">

        {/* Header actions */}
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <h2 className="text-base font-semibold">{entity?.name ?? "—"} · Execution Brief</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={downloadMarkdown}>
              <Download className="h-3.5 w-3.5" /> Download .md
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: CheckSquare, label: "Ready to publish", value: readyCount, color: "text-green-600" },
            { icon: Clock,       label: "In progress",       value: inProgressCount, color: "text-amber-600" },
            { icon: CalendarDays,label: "Scheduled ahead",   value: upcoming.length, color: "text-blue-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-lg border p-3 space-y-1">
              <div className={`flex items-center gap-1.5 ${color}`}>
                <Icon className="h-4 w-4" />
                <span className="text-xl font-bold tabular-nums">{value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Scheduled calendar view */}
        {weeks.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-500" /> Upcoming Schedule
            </h3>
            <div className="space-y-4">
              {weeks.map(weekKey => {
                const wDate = new Date(weekKey + "T12:00:00");
                return (
                  <div key={weekKey} className="rounded-lg border overflow-hidden">
                    <div className="bg-muted/40 px-4 py-2 border-b">
                      <p className="text-xs font-semibold">
                        Week of {wDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="divide-y">
                      {byWeek[weekKey].map(item => {
                        const d = new Date(item.scheduledAt!);
                        const camp = item.campaignId ? campaignMap[item.campaignId] : null;
                        return (
                          <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="shrink-0 w-14 text-center">
                              <p className="text-[10px] text-muted-foreground uppercase">
                                {d.toLocaleDateString("en-US", { weekday: "short" })}
                              </p>
                              <p className="text-sm font-bold leading-none">{d.getDate()}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {d.toLocaleDateString("en-US", { month: "short" })}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-[10px] capitalize">{item.platform}</Badge>
                                {camp && <Badge variant="outline" className="text-[10px]">{camp.name}</Badge>}
                                <span className={`text-[10px] font-medium ${item.status === "approved" ? "text-green-600" : "text-amber-600"}`}>
                                  {CONTENT_STATUS_LABELS[item.status]}
                                </span>
                              </div>
                              <p className="text-sm font-medium leading-snug">{item.hook || item.title}</p>
                              {item.body?.trim() && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{item.body.trim()}</p>
                              )}
                              <p className="text-[10px] text-blue-600">
                                ↗ Post to: {PLATFORM_URLS[item.platform] || item.platform}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Content pieces list */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-500" /> Content Pieces
            </h3>
            <div className="flex items-center gap-1 border rounded-md overflow-hidden text-xs">
              {([["all", "All"], ["ready", "Ready to post"], ["scheduled", "Scheduled"]] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setFilterStatus(val)}
                  className={`px-3 py-1.5 transition-colors ${filterStatus === val ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/30"}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center border rounded-lg">
              {filterStatus === "ready" ? "No approved content yet." : "No content matching this filter."}
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y">
                {filtered.map(item => {
                  const camp = item.campaignId ? campaignMap[item.campaignId] : null;
                  return (
                    <div key={item.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-[10px] text-muted-foreground font-mono">{item.contentId}</code>
                            <Badge variant="secondary" className="text-[10px] capitalize">{item.platform}</Badge>
                            {camp && <Badge variant="outline" className="text-[10px]">{camp.name}</Badge>}
                            {item.pillar && <span className="text-[10px] text-muted-foreground">{item.pillar}</span>}
                          </div>
                          <p className="text-sm font-medium leading-snug">{item.hook || item.title}</p>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <span className={`text-xs font-medium ${item.status === "approved" ? "text-green-600" : "text-amber-600"}`}>
                            {CONTENT_STATUS_LABELS[item.status]}
                          </span>
                          {item.scheduledAt && (
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(item.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.body?.trim() && (
                        <div className="rounded bg-muted/40 p-3 text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                          {item.body.trim()}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-muted-foreground">Post to:</span>
                        <a
                          href={PLATFORM_URLS[item.platform]?.startsWith("http") ? PLATFORM_URLS[item.platform] : undefined}
                          target="_blank" rel="noreferrer"
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          {PLATFORM_URLS[item.platform] || item.platform}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
