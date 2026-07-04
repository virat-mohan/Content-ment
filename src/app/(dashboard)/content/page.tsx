"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  contentStore, knowledgeStore, entityStore, aiSettingsStore,
  type ContentItem, type ContentStatus, type ContentPlatform,
  CONTENT_STATUS_LABELS, PLATFORM_CODE, generateContentId,
} from "@/lib/store";
import {
  PLATFORM_SPECS, buildSystemPrompt, buildDraftPrompt,
  getCharStatus, CHAR_STATUS_STYLES, type KnowledgeDoc,
} from "@/lib/ai-draft";
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
import {
  Plus, Trash2, Pencil, ExternalLink, Sparkles, Share2,
  Copy, Check, Loader2, Download, RefreshCw, BookOpen, AlertCircle,
} from "lucide-react";
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

const EMPTY: Partial<ContentItem> = {
  contentId: "", pillar: "", hook: "",
  title: "", body: "", platform: "linkedin", status: "not_started", tags: [], notes: "",
};

function displayDate(item: ContentItem) {
  if (item.importSource && item.createdAt === item.updatedAt) return "Imported";
  return formatRelativeDate(item.updatedAt);
}

function escapeCsvCell(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function exportToCsv(items: ContentItem[]) {
  const headers = ["Content ID", "Pillar", "Hook", "Title", "Body", "Platform", "Status", "Scheduled At", "Tags", "Notes", "Created At", "Updated At"];
  const rows = items.map((c) => [
    c.contentId ?? "",
    c.pillar ?? "",
    c.hook ?? "",
    c.title,
    c.body,
    c.platform,
    CONTENT_STATUS_LABELS[c.status] ?? c.status,
    c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "",
    (c.tags ?? []).join("; "),
    c.notes ?? "",
    new Date(c.createdAt).toLocaleString(),
    new Date(c.updatedAt).toLocaleString(),
  ].map(escapeCsvCell));

  const csv = [headers.map(escapeCsvCell), ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `content-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Character meter component ────────────────────────────────────────────────

function CharMeter({ platform, body }: { platform: ContentPlatform; body: string }) {
  const spec = PLATFORM_SPECS[platform];
  const count = body?.length ?? 0;
  const status = getCharStatus(platform, count);
  const styles = CHAR_STATUS_STYLES[status];
  const pct = Math.min(100, (count / spec.maxChars) * 100);

  return (
    <div className="space-y-1">
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${styles.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">
          Target: <span className="font-medium">{spec.formatGuide}</span>
        </span>
        <span className={styles.text}>
          {count.toLocaleString()} chars
          {status !== "empty" && ` · ${styles.label}`}
        </span>
      </div>
    </div>
  );
}

// ─── AI context summary ────────────────────────────────────────────────────────

function AiContextBadges({ entityName, knowledgeDocs, pillar, platform }: {
  entityName: string;
  knowledgeDocs: KnowledgeDoc[];
  pillar: string;
  platform: ContentPlatform;
}) {
  const brandDocs = knowledgeDocs.filter(d =>
    /brand|voice|tone|style|guideline|persona|about/i.test(d.type + " " + d.title)
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-medium">Context:</span>
      <span className="inline-flex items-center gap-1 bg-muted rounded px-1.5 py-0.5">
        {entityName}
      </span>
      {pillar && (
        <span className="inline-flex items-center gap-1 bg-muted rounded px-1.5 py-0.5">
          Pillar: {pillar}
        </span>
      )}
      <span className="inline-flex items-center gap-1 bg-muted rounded px-1.5 py-0.5 capitalize">
        {PLATFORM_SPECS[platform].label}
      </span>
      {brandDocs.length > 0 && (
        <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded px-1.5 py-0.5">
          <BookOpen className="h-2.5 w-2.5" />
          {brandDocs.length} brand doc{brandDocs.length > 1 ? "s" : ""}
        </span>
      )}
      {knowledgeDocs.length > brandDocs.length && (
        <span className="inline-flex items-center gap-1 bg-muted rounded px-1.5 py-0.5">
          +{knowledgeDocs.length - brandDocs.length} context doc{knowledgeDocs.length - brandDocs.length > 1 ? "s" : ""}
        </span>
      )}
      {knowledgeDocs.length === 0 && (
        <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
          <AlertCircle className="h-2.5 w-2.5" /> No brand docs — add them in Knowledge for better results
        </span>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const { toast } = useToast();
  const { activeId, activeEntity } = useActiveEntity();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPillar, setFilterPillar] = useState("all");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ContentItem>>(EMPTY);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => {
    if (!activeId) return;
    setItems(contentStore.getAll().filter(c => c.entityId === activeId));
  }, [activeId]);

  useEffect(() => { load(); }, [load]);

  // Load knowledge docs when dialog opens
  useEffect(() => {
    if (open && activeId) {
      setKnowledgeDocs(knowledgeStore.getAll(activeId));
    }
  }, [open, activeId]);

  const pillars = Array.from(new Set(items.map(c => c.pillar).filter(Boolean))).sort() as string[];
  const filtered = items
    .filter(c => filterStatus === "all" || c.status === filterStatus)
    .filter(c => filterPillar === "all" || c.pillar === filterPillar);

  function openNew() {
    setEditing({ ...EMPTY, entityId: activeId });
    setShareUrl(null);
    setAiError("");
    setOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing({ ...item });
    setShareUrl(item.reviewToken ? `${window.location.origin}/review/${item.reviewToken}` : null);
    setAiError("");
    setOpen(true);
  }

  function handlePlatformChange(platform: ContentPlatform) {
    if (editing.id) { setEditing(prev => ({ ...prev, platform })); return; }
    const allItems = contentStore.getAll();
    const newId = generateContentId(activeEntity?.name ?? "XX", platform, allItems);
    setEditing(prev => ({ ...prev, platform, contentId: newId }));
  }

  function save() {
    if (!editing.title?.trim() && !editing.hook?.trim()) {
      toast({ title: "Hook or title is required", variant: "destructive" });
      return;
    }
    if (!editing.entityId) return;
    const now = new Date().toISOString();
    const isNew = !editing.id;
    const allItems = contentStore.getAll();
    const platform = (editing.platform ?? "linkedin") as ContentPlatform;

    let contentId = editing.contentId?.trim() || "";
    if (!contentId) contentId = generateContentId(activeEntity?.name ?? "XX", platform, allItems);

    const title = (editing.title || editing.hook || "").trim();
    const hook = (editing.hook || editing.title || "").trim();

    const item: ContentItem = {
      id: editing.id ?? generateId(),
      contentId,
      entityId: editing.entityId!,
      pillar: editing.pillar ?? "",
      hook,
      title,
      body: editing.body ?? "",
      platform,
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
    toast({ title: isNew ? `Created ${contentId}` : `Updated ${contentId}` });
  }

  function remove(id: string) {
    contentStore.delete(id);
    load();
    toast({ title: "Deleted" });
  }

  async function runAIDraft(refine = false) {
    if (!activeEntity) {
      setAiError("No active entity selected.");
      return;
    }

    // Resolve AI settings: entity-level first, then global
    const global = aiSettingsStore.get();
    const provider = activeEntity.preferredLLM || global.provider || "CLAUDE";
    const apiKey = activeEntity.llmApiKey || global.apiKey;
    const model = activeEntity.llmModel || global.model;

    if (!apiKey) {
      setAiError("No AI API key found. Add one in entity settings or Settings → AI.");
      return;
    }

    if (!editing.hook?.trim() && !editing.title?.trim()) {
      setAiError("Add a hook first so the AI knows what to write about.");
      return;
    }

    setAiError("");
    setAiLoading(true);

    const platform = (editing.platform ?? "linkedin") as ContentPlatform;
    const docs = knowledgeDocs.length ? knowledgeDocs : knowledgeStore.getAll(activeEntity.id);

    const systemPrompt = buildSystemPrompt(activeEntity, docs);
    const userPrompt = buildDraftPrompt(
      refine ? editing : { ...editing, body: "" }, // refine = improve existing, else fresh
      platform
    );

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          model,
          systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const data = await res.json() as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "AI generation failed");

      const draft = data.text ?? "";
      setEditing(prev => ({
        ...prev,
        body: draft,
        status: prev.status === "not_started" ? "drafted" : prev.status,
      }));
      setKnowledgeDocs(docs); // ensure badges update
      setTimeout(() => bodyRef.current?.focus(), 50);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  function generateShareLink() {
    const token = generateId();
    setEditing(prev => ({ ...prev, reviewToken: token, status: "sent_for_approval" }));
    setShareUrl(`${window.location.origin}/review/${token}`);
    toast({ title: "Review link ready — save the item to activate it" });
  }

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const platform = (editing.platform ?? "linkedin") as ContentPlatform;
  const hasDraft = (editing.body?.trim().length ?? 0) > 0;
  const canDraft = !!(editing.hook?.trim() || editing.title?.trim());

  return (
    <div className="flex flex-col">
      <Header title="Content" />
      <div className="flex-1 p-6 animate-fade-in space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{CONTENT_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          {pillars.length > 0 && (
            <Select value={filterPillar} onValueChange={setFilterPillar}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All pillars" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pillars</SelectItem>
                {pillars.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto flex items-center gap-2">
            {items.length > 0 && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                onClick={() => exportToCsv(filtered.length < items.length ? filtered : items)}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            )}
            <Button size="sm" variant="outline" asChild className="h-8 text-xs">
              <Link href="/import">Import</Link>
            </Button>
            <Button size="sm" onClick={openNew} className="h-8 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" /> New
            </Button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <p className="text-sm font-medium">No content yet</p>
            <p className="text-xs text-muted-foreground">Create items manually or import from a sheet.</p>
            <Button size="sm" onClick={openNew} className="mt-1"><Plus className="mr-1 h-3.5 w-3.5" /> New Content</Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-28">ID</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell w-28">Pillar</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Hook / Title</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell w-24">Platform</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-36">Stage</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell w-24">Updated</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a, b) => (a.contentId ?? "").localeCompare(b.contentId ?? "")).map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-3">
                      <code className="text-xs font-mono text-muted-foreground">{item.contentId || "—"}</code>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      {item.pillar
                        ? <span className="text-xs text-muted-foreground truncate max-w-[100px] block">{item.pillar}</span>
                        : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <p className="text-sm font-medium truncate max-w-[260px]">{item.hook || item.title}</p>
                        {item.hook && item.title && item.hook !== item.title && (
                          <p className="text-xs text-muted-foreground truncate max-w-[260px] mt-0.5">{item.title}</p>
                        )}
                        {item.importSource && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <ExternalLink className="h-2.5 w-2.5" /> imported
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs capitalize">{item.platform}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {CONTENT_STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{displayDate(item)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
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

      {/* ─── Edit / Create Dialog ─────────────────────────────────── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShareUrl(null); setAiError(""); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editing.id ? `Edit — ${editing.contentId || "content"}` : "New Content"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">

            {/* Content ID + Pillar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Content ID</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="Auto-generated on save"
                  value={editing.contentId ?? ""}
                  onChange={(e) => setEditing({ ...editing, contentId: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pillar</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="e.g. Thought Leadership"
                  value={editing.pillar ?? ""}
                  onChange={(e) => setEditing({ ...editing, pillar: e.target.value })}
                />
              </div>
            </div>

            {/* Hook */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Hook <span className="text-muted-foreground font-normal">(the scroll-stopping angle — drives the AI draft)</span>
              </Label>
              <Input
                className="h-8 text-sm"
                placeholder="e.g. Most founders get hiring backwards. Here's what changed everything for us."
                value={editing.hook ?? ""}
                onChange={(e) => setEditing({ ...editing, hook: e.target.value })}
              />
            </div>

            {/* Working title */}
            <div className="space-y-1.5">
              <Label className="text-xs">Working Title <span className="text-muted-foreground font-normal">(optional if same as hook)</span></Label>
              <Input
                className="h-8 text-sm"
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>

            {/* Platform + Stage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Platform</Label>
                <Select value={editing.platform ?? "linkedin"} onValueChange={(v) => handlePlatformChange(v as ContentPlatform)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {PLATFORM_SPECS[p].label}
                        <span className="text-muted-foreground ml-1">· {PLATFORM_SPECS[p].formatGuide}</span>
                      </SelectItem>
                    ))}
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

            {/* ── AI Draft section ───────────────────────────────────── */}
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                  <span className="text-xs font-semibold text-violet-900 dark:text-violet-200">AI Draft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasDraft && (
                    <Button
                      type="button" variant="outline" size="sm"
                      className="h-7 text-[11px] gap-1 border-violet-200 dark:border-violet-700"
                      onClick={() => runAIDraft(true)}
                      disabled={aiLoading}
                    >
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Refine
                    </Button>
                  )}
                  <Button
                    type="button"
                    className="h-7 text-[11px] gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                    size="sm"
                    onClick={() => runAIDraft(false)}
                    disabled={aiLoading || !canDraft}
                  >
                    {aiLoading
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Drafting for {PLATFORM_SPECS[platform].label}…</>
                      : <><Sparkles className="h-3 w-3" /> {hasDraft ? "Regenerate" : `Draft for ${PLATFORM_SPECS[platform].label}`}</>
                    }
                  </Button>
                </div>
              </div>

              {/* Context summary */}
              {activeEntity && (
                <AiContextBadges
                  entityName={activeEntity.name}
                  knowledgeDocs={knowledgeDocs}
                  pillar={editing.pillar ?? ""}
                  platform={platform}
                />
              )}

              {/* Platform spec hint */}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {PLATFORM_SPECS[platform].formatGuide} ·{" "}
                {platform === "linkedin" && "professional tone, short paragraphs, ends with question"}
                {platform === "twitter" && "numbered thread format, one insight per tweet"}
                {platform === "instagram" && "hook first line, conversational body, hashtags at end"}
                {platform === "blog" && "markdown H2 sections, SEO-friendly, 800–2,000 words"}
                {platform === "youtube" && "description + script outline with [HOOK] [SECTION] markers"}
                {platform === "email" && "subject lines, preview text, body, one CTA"}
                {platform === "other" && "clear, purposeful, platform-appropriate"}
              </p>

              {/* AI error */}
              {aiError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>

            {/* Body textarea */}
            <div className="space-y-1.5">
              <Label className="text-xs">Body</Label>
              <Textarea
                ref={bodyRef}
                rows={10}
                className="text-sm resize-none font-mono leading-relaxed"
                placeholder={`Write or generate your ${PLATFORM_SPECS[platform].label} content here…`}
                value={editing.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
              <CharMeter platform={platform} body={editing.body ?? ""} />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes <span className="text-muted-foreground font-normal">(also feeds the AI — add context, data points, personal anecdotes)</span></Label>
              <Input className="h-8 text-sm" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label className="text-xs">Schedule date</Label>
              <Input
                type="datetime-local" className="h-8 text-xs"
                value={editing.scheduledAt?.slice(0, 16) ?? ""}
                onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
              {editing.scheduledAt && (
                <p className="text-[11px] text-muted-foreground">
                  Scheduled for {new Date(editing.scheduledAt).toLocaleString()}. Appears on the Calendar.
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
