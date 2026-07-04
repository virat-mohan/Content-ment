"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { contentStore, type ContentItem } from "@/lib/store";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Plus, ArrowRight, TrendingUp, TableProperties, Zap, Settings } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  not_started: "bg-muted-foreground/20",
  drafted: "bg-muted-foreground/40",
  author_review: "bg-yellow-400",
  sent_for_approval: "bg-blue-300",
  approved: "bg-blue-400",
  published: "bg-green-400",
  archived: "bg-muted-foreground/20",
};

export default function DashboardPage() {
  const { activeId, activeEntity, entities } = useActiveEntity();
  const [content, setContent] = useState<ContentItem[]>([]);

  useEffect(() => {
    if (!activeId) return;
    setContent(contentStore.getAll().filter(c => c.entityId === activeId));
  }, [activeId]);

  const published = content.filter((c) => c.status === "published").length;
  const drafts = content.filter((c) => c.status === "not_started" || c.status === "drafted").length;
  const recent = [...content].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />
      <div className="flex-1 p-6 space-y-6 animate-fade-in">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Content Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{content.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{activeEntity?.name ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Published</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{published}</div>
              <p className="text-xs text-muted-foreground mt-1">Published pieces</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Drafts</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{drafts}</div>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Content</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="/content">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No content yet</p>
                  <Button size="sm" asChild>
                    <Link href="/content"><Plus className="mr-1 h-3 w-3" /> Create content</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {recent.map((item) => (
                    <Link key={item.id} href="/content" className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[item.status])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.platform} · {formatRelativeDate(item.updatedAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entities + Quick actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Entities</CardTitle>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href="/entities">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                {entities.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <Building2 className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No entities yet</p>
                    <Button size="sm" asChild><Link href="/entities/new"><Plus className="mr-1 h-3 w-3" /> New Entity</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {entities.slice(0, 3).map((entity) => (
                      <Link key={entity.id} href={`/entities/${entity.slug}`} className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-semibold shrink-0">
                          {entity.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entity.name}</p>
                          <p className="text-xs text-muted-foreground">{entity.industry || entity.type}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {[
                  { icon: Plus, label: "New Entity", href: "/entities/new" },
                  { icon: TableProperties, label: "Import Sheet", href: "/import" },
                  { icon: Zap, label: "Prompts", href: "/prompts" },
                  { icon: Settings, label: "AI Settings", href: "/settings" },
                ].map(({ icon: Icon, label, href }) => (
                  <Button key={href} variant="outline" size="sm" className="justify-start text-xs h-8" asChild>
                    <Link href={href}><Icon className="mr-1.5 h-3.5 w-3.5" />{label}</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
