"use client";

import { useEffect, useState } from "react";
import { contentStore, type ContentItem } from "@/lib/store";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, CheckCircle, Clock } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0A66C2", twitter: "#1DA1F2", instagram: "#E1306C",
  blog: "#F97316", youtube: "#FF0000", email: "#8B5CF6", other: "#6B7280",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#9CA3AF", review: "#F59E0B", approved: "#3B82F6",
  published: "#10B981", archived: "#D1D5DB",
};

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20 shrink-0 capitalize truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium w-6 text-right">{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { activeId } = useActiveEntity();
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    if (!activeId) return;
    setItems(contentStore.getAll().filter(c => c.entityId === activeId));
  }, [activeId]);

  const filtered = items;

  const total = filtered.length;
  const published = filtered.filter((c) => c.status === "published").length;
  const drafts = filtered.filter((c) => c.status === "draft").length;
  const scheduled = filtered.filter((c) => c.scheduledAt && c.status !== "published").length;

  const byPlatform = Object.entries(
    filtered.reduce<Record<string, number>>((acc, c) => { acc[c.platform] = (acc[c.platform] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  const byStatus = Object.entries(
    filtered.reduce<Record<string, number>>((acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  const maxPlatform = Math.max(...byPlatform.map((b) => b[1]), 1);
  const maxStatus = Math.max(...byStatus.map((b) => b[1]), 1);

  return (
    <div className="flex flex-col">
      <Header title="Analytics" />
      <div className="flex-1 p-6 animate-fade-in space-y-6">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total items", value: total, icon: FileText, color: "text-foreground" },
            { label: "Published", value: published, icon: TrendingUp, color: "text-green-600 dark:text-green-400" },
            { label: "In draft", value: drafts, icon: Clock, color: "text-muted-foreground" },
            { label: "Scheduled", value: scheduled, icon: CheckCircle, color: "text-blue-600 dark:text-blue-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">By Platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byPlatform.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet</p>
              ) : byPlatform.map(([p, v]) => (
                <Bar key={p} label={p} value={v} max={maxPlatform} color={PLATFORM_COLORS[p] ?? "#6B7280"} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">By Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byStatus.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet</p>
              ) : byStatus.map(([s, v]) => (
                <Bar key={s} label={s} value={v} max={maxStatus} color={STATUS_COLORS[s] ?? "#6B7280"} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
