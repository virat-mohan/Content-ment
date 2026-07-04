"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  contentStore, campaignStore, type ContentItem, type ContentStatus,
  CONTENT_STATUS_LABELS,
} from "@/lib/store";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, AlertCircle, CheckCircle2, Clock,
  Folder, FileText, TrendingUp, CalendarDays, Zap, Download,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Stage pipeline config ─────────────────────────────────────────────────

const PIPELINE_STAGES: { key: ContentStatus; label: string; color: string; bar: string }[] = [
  { key: "not_started", label: "Not started", color: "text-muted-foreground",                       bar: "bg-muted-foreground/30" },
  { key: "drafted",     label: "Drafted",     color: "text-muted-foreground",                       bar: "bg-muted-foreground/50" },
  { key: "author_review", label: "Author review", color: "text-yellow-700 dark:text-yellow-400",    bar: "bg-yellow-400" },
  { key: "sent_for_approval", label: "Sent for approval", color: "text-blue-700 dark:text-blue-400", bar: "bg-blue-400" },
  { key: "approved",    label: "Approved",    color: "text-green-700 dark:text-green-400",           bar: "bg-green-400" },
  { key: "published",   label: "Published",   color: "text-emerald-700 dark:text-emerald-400",       bar: "bg-emerald-500" },
];

const STATUS_DOT: Record<string, string> = {
  not_started: "bg-muted-foreground/25",
  drafted: "bg-muted-foreground/50",
  author_review: "bg-yellow-400",
  sent_for_approval: "bg-blue-400",
  approved: "bg-green-400",
  published: "bg-emerald-500",
  archived: "bg-muted-foreground/20",
};

// ─── Needs attention logic ─────────────────────────────────────────────────

interface AttentionItem {
  id: string;
  type: "overdue" | "stuck_approval" | "approved_unpublished" | "no_body";
  label: string;
  item: ContentItem;
}

function getNeedsAttention(items: ContentItem[]): AttentionItem[] {
  const now = Date.now();
  const DAY = 86400000;
  const results: AttentionItem[] = [];

  for (const item of items) {
    // Overdue scheduled
    if (item.scheduledAt && item.status !== "published" && item.status !== "archived") {
      if (new Date(item.scheduledAt).getTime() < now) {
        results.push({ id: `od-${item.id}`, type: "overdue", label: "Overdue — scheduled date passed", item });
        continue;
      }
    }
    // Stuck in sent_for_approval > 3 days
    if (item.status === "sent_for_approval") {
      const age = now - new Date(item.updatedAt).getTime();
      if (age > 3 * DAY) {
        results.push({ id: `sa-${item.id}`, type: "stuck_approval", label: "Waiting for approval 3+ days", item });
        continue;
      }
    }
    // Approved but not published
    if (item.status === "approved") {
      results.push({ id: `ap-${item.id}`, type: "approved_unpublished", label: "Approved — ready to publish", item });
      continue;
    }
    // Has no body drafted
    if ((item.status === "not_started" || item.status === "drafted") && !item.body?.trim()) {
      results.push({ id: `nb-${item.id}`, type: "no_body", label: "No draft yet", item });
    }
  }

  return results.slice(0, 8);
}

const ATTENTION_ICON: Record<AttentionItem["type"], { icon: React.ElementType; cls: string }> = {
  overdue:              { icon: AlertCircle,   cls: "text-red-500" },
  stuck_approval:       { icon: Clock,         cls: "text-amber-500" },
  approved_unpublished: { icon: CheckCircle2,  cls: "text-green-500" },
  no_body:              { icon: FileText,      cls: "text-muted-foreground" },
};

// ─── Upcoming items ────────────────────────────────────────────────────────

function getUpcoming(items: ContentItem[]): ContentItem[] {
  const now = Date.now();
  const WEEK = 7 * 86400000;
  return items
    .filter(c => c.scheduledAt && c.status !== "published" && c.status !== "archived")
    .filter(c => {
      const t = new Date(c.scheduledAt!).getTime();
      return t >= now && t <= now + WEEK;
    })
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))
    .slice(0, 6);
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { activeId, activeEntity } = useActiveEntity();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<ReturnType<typeof campaignStore.getAll>>([]);

  const load = useCallback(() => {
    if (!activeId) return;
    setContent(contentStore.getAll().filter(c => c.entityId === activeId));
    setCampaigns(campaignStore.getAll().filter(c => c.entityId === activeId));
  }, [activeId]);

  useEffect(() => { load(); }, [load]);

  // Pipeline counts
  const stageCounts = PIPELINE_STAGES.map(s => ({
    ...s,
    count: content.filter(c => c.status === s.key).length,
  }));
  const total = content.length;
  const published = content.filter(c => c.status === "published").length;
  const publishRate = total > 0 ? Math.round((published / total) * 100) : 0;

  // Active campaigns with progress
  const activeCampaigns = campaigns
    .filter(c => c.status === "active" || c.status === "planning")
    .map(campaign => {
      const pieces = content.filter(c => c.campaignId === campaign.id);
      const done = pieces.filter(c => c.status === "published").length;
      const pct = pieces.length > 0 ? Math.round((done / pieces.length) * 100) : 0;
      return { campaign, pieces: pieces.length, done, pct };
    })
    .sort((a, b) => b.pieces - a.pieces)
    .slice(0, 4);

  const attention = getNeedsAttention(content);
  const upcoming = getUpcoming(content);

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />
      <div className="flex-1 p-4 sm:p-6 space-y-6 animate-fade-in">

        {/* ── Content pipeline ─────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Content pipeline</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {total} pieces · {publishRate}% publish rate
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/content">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {total === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No content yet. <Link href="/campaigns" className="underline underline-offset-2">Start a campaign →</Link></p>
            ) : stageCounts.map(({ key, label, color, bar, count }) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <Link key={key} href={`/content`} className="flex items-center gap-3 group">
                  <span className="text-xs w-36 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-semibold w-6 text-right tabular-nums ${count > 0 ? color : "text-muted-foreground/40"}`}>{count}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">

          {/* ── Needs attention ────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Needs attention
                {attention.length > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5">{attention.length}</span>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="/content">Fix <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {attention.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 py-2">
                  <CheckCircle2 className="h-4 w-4" /> All caught up — nothing needs action right now.
                </div>
              ) : (
                <div className="space-y-1">
                  {attention.map(({ id, type, label, item }) => {
                    const { icon: Icon, cls } = ATTENTION_ICON[type];
                    return (
                      <Link key={id} href="/content" className="flex items-start gap-2.5 rounded-md px-2 py-2 hover:bg-muted/40 transition-colors">
                        <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cls}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.hook || item.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                            <Badge variant="secondary" className="text-[9px] capitalize px-1 py-0">{item.platform}</Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Upcoming ───────────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                Scheduled next 7 days
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="/calendar">Calendar <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Nothing scheduled this week. <Link href="/content" className="underline underline-offset-2">Schedule content →</Link>
                </p>
              ) : (
                <div className="space-y-1">
                  {upcoming.map(item => (
                    <Link key={item.id} href="/calendar" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40 transition-colors">
                      <div className="shrink-0 w-10 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {new Date(item.scheduledAt!).toLocaleDateString("en-US", { weekday: "short" })}
                        </p>
                        <p className="text-sm font-semibold leading-none">
                          {new Date(item.scheduledAt!).getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.hook || item.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{item.platform} · {CONTENT_STATUS_LABELS[item.status]}</p>
                      </div>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[item.status]}`} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Active campaigns ────────────────────────────── */}
        {activeCampaigns.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-violet-500" />
                Active campaigns
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="/campaigns">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCampaigns.map(({ campaign, pieces, done, pct }) => (
                <div key={campaign.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{campaign.name}</p>
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${campaign.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{done}/{pieces} published</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {campaign.goal && (
                    <p className="text-[11px] text-muted-foreground truncate">Goal: {campaign.goal}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Export for Execution ─────────────────────────── */}
        {content.filter(c => c.status === "approved" || c.scheduledAt).length > 0 && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Ready to execute?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Export a full execution brief — scheduled calendar, content copy, and platform links — to share with your team or distributor.
              </p>
            </div>
            <Button size="sm" asChild className="gap-1.5 shrink-0">
              <Link href="/export"><Download className="h-3.5 w-3.5" /> Export Brief</Link>
            </Button>
          </div>
        )}

        {/* ── Quick actions ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Folder,      label: "New Campaign",   href: "/campaigns",  cls: "border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/20" },
            { icon: FileText,    label: "New Content",    href: "/content",    cls: "" },
            { icon: CalendarDays,label: "Calendar",       href: "/calendar",   cls: "" },
            { icon: Download,    label: "Export Brief",   href: "/export",     cls: "border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20" },
          ].map(({ icon: Icon, label, href, cls }) => (
            <Link key={href} href={href}>
              <div className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center hover:bg-muted/40 transition-colors cursor-pointer ${cls}`}>
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
