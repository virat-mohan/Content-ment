"use client";

import { useEffect, useState, useRef } from "react";
import {
  contentStore, knowledgeStore, entityStore,
  type ContentItem, type ContentStatus, type ContentPlatform,
  CONTENT_STATUS_LABELS,
} from "@/lib/store";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, ExternalLink, Sparkles, Share2, CalendarPlus, Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";

const STATUS_COLORS: Record<ContentStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  drafted: "bg-muted text-muted-foreground",
  author_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  sent_for_approval: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  archived: "bg-muted/60 text-muted-foreground/60",
};

const STATUSES = Object.keys(CONTENT_STATUS_LABELS) as ContentStatus[];
const PLATFORMS: ContentPlatform[] = ["linkedin", "twitter", "instagram", "blog", "youtube", "email", "other"];

const PLATFORM_TIPS: Record<ContentPlatform, string> = {
  linkedin: "Professional tone, 1200–1800 chars ideal. Use line breaks, end with a question. No more than 3 hashtags.",
  twitter: "Under 280 chars per tweet. Hook-first. Use a thread for depth. Bold claim → proof → CTA.",
  instagram: "Visual-first, caption supports. Lead with a hook. 150–200 words ideal. 5–10 hashtags at end.",
  blog: "SEO-friendly H2s, 800–2000 words. Open with a problem, close with action steps.",
  youtube: "Script or description. Hook in first 10 seconds. Chapters for long-form. CTA at 30% and end.",
  email: "Subject under 50 chars. One clear CTA. Personalise the opener. Mobile-first formatting.",
  other: "Match platform norms. Keep it concise and goal-oriented.",
};

const EMPTY: Partial<ContentItem> = {
  title: "", body: "", platform: "linkedin", status: "not_started", tags: [], notes: "",
};

function displayDate(item: ContentItem) {
  if (item.importSource && item.createdAt === item.updatedAt) return "Imported";
  return formatRelativeDate(item.updatedAt);
}

async function generateAIDraft(
  entity: ReturnType<typeof entityStore.getAll>[0],
  item: Partial<ContentItem>,
  knowledgeDocs: { title: string; content: string }[]
): Promise<string> {
  const platform = item.platform ?? "other";
  const tip = PLATFORM_TIPS[platform];
  const brandContext = knowledgeDocs.map((d) => `### ${d.title}\n${d.content}`).join("\n\n");
  const prompt = [
    `You are a content strategist writing for ${entity.name}${entity.industry ? ` (${entity.industry})` : ""}.`,
    entity.description ? `About: ${entity.description}` : "",
    brandContext ? `\n## Brand context\n${brandContext}` : "",
    `\n## Platform: ${platform}`,
    `Platform guidance: ${tip}`,
    `\n## Content brief`,
    `Title / Hook: ${item.title ?? ""}`,
    item.notes ? `Notes: ${item.notes}` : "",
    item.tags?.length ? `Topics: ${item.tags.join(", ")}` : "",
    `\nWrite the full content body for this piece. Respond with only the content — no preamble, no markdown headers, no explanations.`,
  ].filter(Boolean).join("\n");

  const aiSettings = entity.llmApiKey
    ? { provider: entity.preferredLLM ?? "CLAUDE", apiKey: entity.llmApiKey, model: entity.llmModel ?? "" }
    : null;

  if (!aiSettings?.apiKey) {
    throw new Error("No AI API key configured. Add one in entity settings.");
  }

  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...aiSettings }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "AI generation failed");
  }
  const data = await res.json() as { text?: string };
  return data.text ?? "";
}

export default function ContentPage() {
  const { toast } = useToast();
  const { activeId, activeEntity } = useActiveEntity();
  const [filterStatus, setFilterStatus] = useState("all");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ContentItem>>(EMPTY);
  const [aiLoading, setAiLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function load() {
    if (!activeId) return;
    setItems(contentStore.getAll().filter(c => c.entityId === activeId));
  }

  useEffect(() => { load(); }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filterStatus === "all" ? items : items.filter(c => c.status === filterStatus);

  function openNew() {
    setEditing({ ...EMPTY, entityId: activeId });
    setShareUrl(null);
    setOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing({ ...item });
    setShareUrl(item.reviewToken ? `${window.location.origin}/review/${item.reviewToken}` : null);
    setOpen(true);
  }

  function save() {
    if (!editing.title?.trim() || !editing.entityId) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const isNew = !editing.id;
    const item: ContentItem = {
      id: editing.id ?? generateId(),
      entityId: editing.entityId!,
      title: editing.title!,
      body: editing.body ?? "",
      platform: (editing.platform ?? "other") as ContentPlatform,
      status: (editing.status ?? "not_started") as ContentStatus,
      scheduledAt: editing.scheduledAt,
      publishedAt: editing.publishedAt,
      tags: editing.tags ?? [],
      notes: editing.notes,
      importSource: editing.importSource,
      reviewToken: editing.reviewToken,
      reviewedAt: editing.reviewedAt,
      approvedAt: editing.approvedAt,
      createdAt: editing.createdAt ?? now,
      updatedAt: now,
    };
    contentStore.save(item);
    load();
    setOpen(false);
    toast({ title: isNew ? "Content created" : "Content updated" });
  }

  function remove(id: string) {
    contentStore.delete(id);
    load();
    toast({ title: "Deleted" });
  }

  async function handleAIDraft() {
    if (!activeEntity) { toast({ title: "No active entity", variant: "destructive" }); return; }
    setAiLoading(true);
    try {
      const knowledgeDocs = knowledgeStore.getAll(activeEntity.id);
      const draft = await generateAIDraft(activeEntity, editing, knowledgeDocs);
      setEditing(prev => ({ ...prev, body: draft, status: prev.status === "not_started" ? "drafted" : prev.status }));
      bodyRef.current?.focus();
    } catch (e) {
      toast({ title: "AI draft failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  function generateShareLink() {
    const token = generateId();
    setEditing(prev => ({ ...prev, reviewToken: token, status: "sent_for_approval" }));
    const url = `${window.location.origin}/review/${token}`;
    setShareUrl(url);
    toast({ title: "Review link ready — save to activate it" });
  }

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col">
      <Header title="Content" />
      <div className="flex-1 p-6 animate-fade-in space-y-4">

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{CONTENT_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" asChild className="h-8 text-xs">
              <Link href="/import">Import Sheet</Link>
            </Button>
            <Button size="sm" onClick={openNew} className="h-8 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" /> New Content
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <p className="text-sm font-medium">No content yet</p>
            <p className="text-xs text-muted-foreground">Create items manually or import from a Google Sheet.</p>
            <Button size="sm" onClick={openNew} className="mt-1"><Plus className="mr-1 h-3.5 w-3.5" /> New Content</Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Platform</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Stage</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Updated</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium truncate max-w-[240px]">{item.title}</p>
                        {item.importSource && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <ExternalLink className="h-2.5 w-2.5" /> imported
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs capitalize">{item.platform}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {CONTENT_STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{displayDate(item)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShareUrl(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{editing.id ? "Edit Content" : "New Content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs">Title / Hook</Label>
              <Input className="h-8 text-sm" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>

            {/* Platform + Stage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Platform</Label>
                <Select value={editing.platform ?? "other"} onValueChange={(v) => setEditing({ ...editing, platform: v as ContentPlatform })}>
                  <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stage</Label>
                <Select value={editing.status ?? "not_started"} onValueChange={(v) => setEditing({ ...editing, status: v as ContentStatus })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{CONTENT_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Platform tip */}
            {editing.platform && (
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2.5 py-1.5 leading-relaxed">
                <span className="font-medium capitalize">{editing.platform}:</span> {PLATFORM_TIPS[editing.platform as ContentPlatform]}
              </p>
            )}

            {/* Body + AI draft */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Body</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] gap-1 px-2"
                  onClick={handleAIDraft}
                  disabled={aiLoading || !editing.title?.trim()}
                >
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-violet-500" />}
                  AI Draft
                </Button>
              </div>
              <Textarea ref={bodyRef} rows={8} className="text-sm resize-none font-mono" value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              {editing.body && (
                <p className="text-[11px] text-muted-foreground text-right">{editing.body.length} chars</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input className="h-8 text-sm" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </div>

            {/* Schedule + Add to calendar */}
            <div className="space-y-1.5">
              <Label className="text-xs">Schedule date</Label>
              <Input
                type="datetime-local"
                className="h-8 text-xs"
                value={editing.scheduledAt?.slice(0, 16) ?? ""}
                onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
              {editing.scheduledAt && (
                <p className="text-[11px] text-muted-foreground">
                  Scheduled for {new Date(editing.scheduledAt).toLocaleString()}. This will appear on the Calendar.
                </p>
              )}
            </div>

            {/* Share for review */}
            <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Share for review</p>
                  <p className="text-[11px] text-muted-foreground">Anyone with the link can read and approve this content.</p>
                </div>
                {!shareUrl && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={generateShareLink}>
                    <Share2 className="h-3 w-3" /> Generate link
                  </Button>
                )}
              </div>
              {shareUrl && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] bg-background border rounded px-2 py-1.5 truncate">{shareUrl}</code>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyShareLink}>
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
              {editing.reviewedAt && (
                <p className="text-[11px] text-green-600 dark:text-green-400">
                  ✓ Approved by reviewer on {new Date(editing.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
