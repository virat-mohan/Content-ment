"use client";

import { useEffect, useState, useCallback } from "react";
import {
  campaignStore, contentStore, entityStore, knowledgeStore, aiSettingsStore, brandBookStore,
  type Campaign, type ContentItem, type ContentPlatform,
  CONTENT_STATUS_LABELS, PLATFORM_CODE, generateContentId,
} from "@/lib/store";
import { buildSystemPrompt } from "@/lib/ai-draft";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Pencil, Folder, FileText, Sparkles,
  Loader2, AlertCircle, Check, X, ChevronRight, BarChart2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedPiece {
  pillar: string;
  hook: string;
  platform: ContentPlatform;
  notes: string;
  selected: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const PLATFORM_OPTIONS: ContentPlatform[] = ["linkedin", "twitter", "instagram", "blog", "youtube", "email"];

const EMPTY_CAMPAIGN: Partial<Campaign> = { name: "", description: "", status: "planning", goal: "" };

// ���── AI plan generator ────────────────────────────────────────────────────────

async function generateCampaignPlan(
  entity: ReturnType<typeof entityStore.getAll>[0],
  knowledgeDocs: ReturnType<typeof knowledgeStore.getAll>,
  brief: {
    name: string;
    goal: string;
    description: string;
    audience: string;
    platforms: ContentPlatform[];
    pillars: string;
    piecesPerPlatform: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<GeneratedPiece[]> {
  const global = aiSettingsStore.get();
  const provider = entity.preferredLLM || global.provider || "CLAUDE";
  const apiKey = entity.llmApiKey || global.apiKey;
  const model = entity.llmModel || global.model;

  if (!apiKey) throw new Error("No AI API key configured. Add one in entity settings or Settings → AI.");

  const brandBook = brandBookStore.get(entity.id);
  const systemPrompt = buildSystemPrompt(entity, knowledgeDocs, brandBook);

  const platformList = brief.platforms.map(p => `- ${p}`).join("\n");
  const pillarList = brief.pillars ? `Content pillars to cover:\n${brief.pillars.split(/[,\n]/).map(p => `- ${p.trim()}`).filter(Boolean).join("\n")}` : "";
  const dateRange = brief.startDate && brief.endDate
    ? `Campaign runs: ${brief.startDate} to ${brief.endDate}`
    : "";

  const userPrompt = `## Campaign Brief
Campaign name: ${brief.name}
Goal: ${brief.goal}
${brief.description ? `Description: ${brief.description}` : ""}
${brief.audience ? `Target audience: ${brief.audience}` : ""}
${dateRange}

Platforms to create content for:
${platformList}

Pieces to create per platform: ${brief.piecesPerPlatform}

${pillarList}

## Your task
Generate a content plan for this campaign. For each content piece, create a compelling hook and assign it to the right pillar.

Respond with ONLY a valid JSON array. No explanation, no markdown, no code fences. Each element must have exactly these keys:
- "pillar": content pillar this piece belongs to (string)
- "hook": the specific hook/angle for this piece — make it punchy, specific, scroll-stopping (string)
- "platform": one of: ${brief.platforms.join(", ")} (string)
- "notes": brief notes on angle, data points to use, or tone guidance (string)

Generate exactly ${brief.piecesPerPlatform} pieces per platform (${brief.platforms.length * brief.piecesPerPlatform} total). Distribute pillars evenly. Make each hook genuinely different — no repetition.`;

  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider, apiKey, model,
      systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const data = await res.json() as { text?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "AI generation failed");

  const text = (data.text ?? "").trim();
  // Strip markdown code fences if AI wraps in them
  const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  const parsed = JSON.parse(json) as GeneratedPiece[];
  return parsed.map(p => ({ ...p, selected: true }));
}

// ─── Campaign stats ────────────────────────────────────────────────────────────

function CampaignStats({ campaignId, entityId }: { campaignId: string; entityId: string }) {
  const items = contentStore.getAll().filter(c => c.entityId === entityId && c.campaignId === campaignId);
  const total = items.length;
  const published = items.filter(c => c.status === "published").length;
  const approved = items.filter(c => c.status === "approved" || c.status === "sent_for_approval").length;
  const inProgress = total - published - approved;

  if (!total) return <span className="text-xs text-muted-foreground">No content yet</span>;

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1 text-muted-foreground">
        <FileText className="h-3 w-3" /> {total} pieces
      </span>
      {published > 0 && <span className="text-emerald-600 dark:text-emerald-400">✓ {published} published</span>}
      {approved > 0 && <span className="text-blue-600 dark:text-blue-400">● {approved} in review</span>}
      {inProgress > 0 && <span className="text-muted-foreground">○ {inProgress} drafting</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { toast } = useToast();
  const { activeId, activeEntity } = useActiveEntity();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Campaign edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign>>(EMPTY_CAMPAIGN);

  // AI generate dialog
  const [genOpen, setGenOpen] = useState(false);
  const [genCampaignId, setGenCampaignId] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [genPieces, setGenPieces] = useState<GeneratedPiece[]>([]);
  const [genConfirming, setGenConfirming] = useState(false);

  // Brief state
  const [brief, setBrief] = useState({
    name: "", goal: "", description: "", audience: "",
    platforms: ["linkedin", "twitter"] as ContentPlatform[],
    pillars: "", piecesPerPlatform: 3,
    startDate: "", endDate: "",
  });

  const load = useCallback(() => {
    if (!activeId) return;
    setCampaigns(campaignStore.getAll().filter(c => c.entityId === activeId));
  }, [activeId]);

  useEffect(() => { load(); }, [load]);

  // ── Campaign CRUD ──────────────────────────────────────────────────────────

  function openNew() {
    setEditingCampaign({ ...EMPTY_CAMPAIGN, entityId: activeId });
    setEditOpen(true);
  }

  function saveCampaign() {
    if (!editingCampaign.name?.trim() || !editingCampaign.entityId) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const item: Campaign = {
      id: editingCampaign.id ?? generateId(),
      entityId: editingCampaign.entityId!,
      name: editingCampaign.name!,
      description: editingCampaign.description,
      status: (editingCampaign.status ?? "planning") as Campaign["status"],
      startDate: editingCampaign.startDate,
      endDate: editingCampaign.endDate,
      goal: editingCampaign.goal,
      createdAt: editingCampaign.createdAt ?? now,
      updatedAt: now,
    };
    campaignStore.save(item);
    load();
    setEditOpen(false);
    toast({ title: editingCampaign.id ? "Campaign updated" : "Campaign created" });
  }

  function deleteCampaign(id: string) {
    campaignStore.delete(id);
    load();
    toast({ title: "Deleted" });
  }

  // ── AI generation ──────────────────────────────────────────────────────────

  function openGenerator(campaign: Campaign) {
    setGenCampaignId(campaign.id);
    setBrief({
      name: campaign.name,
      goal: campaign.goal ?? "",
      description: campaign.description ?? "",
      audience: "",
      platforms: ["linkedin", "twitter"],
      pillars: "",
      piecesPerPlatform: 3,
      startDate: campaign.startDate ?? "",
      endDate: campaign.endDate ?? "",
    });
    setGenPieces([]);
    setGenError("");
    setGenConfirming(false);
    setGenOpen(true);
  }

  async function runGenerate() {
    if (!activeEntity) return;
    setGenError("");
    setGenLoading(true);
    try {
      const docs = knowledgeStore.getAll(activeEntity.id);
      const pieces = await generateCampaignPlan(activeEntity, docs, brief);
      setGenPieces(pieces);
      setGenConfirming(true);
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setGenLoading(false);
    }
  }

  function confirmAndCreate() {
    if (!genCampaignId || !activeId || !activeEntity) return;
    const now = new Date().toISOString();
    const existing = contentStore.getAll();
    const selected = genPieces.filter(p => p.selected);

    const items: ContentItem[] = selected.map(piece => {
      const contentId = generateContentId(activeEntity.name, piece.platform, [...existing, ...items]);
      return {
        id: generateId(),
        contentId,
        entityId: activeId,
        campaignId: genCampaignId,
        pillar: piece.pillar,
        hook: piece.hook,
        title: piece.hook,
        body: "",
        platform: piece.platform,
        status: "not_started" as const,
        tags: [piece.pillar].filter(Boolean),
        notes: piece.notes,
        assetIds: [],
        createdAt: now,
        updatedAt: now,
      };
    });

    contentStore.saveMany(items);
    setGenOpen(false);
    toast({
      title: `${items.length} content pieces created`,
      description: `All linked to campaign "${brief.name}". Open Content to draft them.`,
    });
  }

  function togglePlatform(p: ContentPlatform) {
    setBrief(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  }

  function togglePiece(i: number) {
    setGenPieces(prev => prev.map((p, idx) => idx === i ? { ...p, selected: !p.selected } : p));
  }

  function editPieceHook(i: number, hook: string) {
    setGenPieces(prev => prev.map((p, idx) => idx === i ? { ...p, hook } : p));
  }

  const selectedCount = genPieces.filter(p => p.selected).length;

  return (
    <div className="flex flex-col">
      <Header title="Campaigns" />
      <div className="flex-1 p-4 sm:p-6 animate-fade-in space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
          <Button size="sm" onClick={openNew} className="h-8 text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" /> New Campaign
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <Folder className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No campaigns yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              A campaign groups related content under one goal. Use AI to generate a full content plan from a brief.
            </p>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-3.5 w-3.5" /> New Campaign</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((c) => (
              <Card key={c.id} className="group flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm truncate">{c.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(c.createdAt)}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                  {c.goal && (
                    <div className="rounded bg-muted/50 px-2.5 py-1.5 text-xs">
                      <span className="font-medium">Goal: </span>{c.goal}
                    </div>
                  )}
                  {(c.startDate || c.endDate) && (
                    <p className="text-xs text-muted-foreground">
                      {c.startDate && new Date(c.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {c.startDate && c.endDate && " → "}
                      {c.endDate && new Date(c.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}

                  <CampaignStats campaignId={c.id} entityId={activeId ?? ""} />

                  {/* Actions */}
                  <div className="pt-1 space-y-1.5">
                    <Button
                      className="w-full h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                      size="sm"
                      onClick={() => openGenerator(c)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Generate Content with AI
                    </Button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" className="h-7 text-xs flex-1"
                        onClick={() => { setEditingCampaign({ ...c }); setEditOpen(true); }}>
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Link href={`/content?campaign=${c.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                          <BarChart2 className="h-3 w-3" /> View content
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteCampaign(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Campaign edit dialog ─────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingCampaign.id ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input className="h-8 text-sm" value={editingCampaign.name ?? ""}
                onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={editingCampaign.status ?? "planning"}
                  onValueChange={(v) => setEditingCampaign({ ...editingCampaign, status: v as Campaign["status"] })}>
                  <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["planning", "active", "paused", "completed"].map(s =>
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Goal</Label>
              <Input className="h-8 text-sm" placeholder="e.g. 10k impressions, 500 signups"
                value={editingCampaign.goal ?? ""}
                onChange={(e) => setEditingCampaign({ ...editingCampaign, goal: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input type="date" className="h-8 text-xs" value={editingCampaign.startDate?.slice(0, 10) ?? ""}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End date</Label>
                <Input type="date" className="h-8 text-xs" value={editingCampaign.endDate?.slice(0, 10) ?? ""}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea rows={3} className="text-sm resize-none" value={editingCampaign.description ?? ""}
                onChange={(e) => setEditingCampaign({ ...editingCampaign, description: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={saveCampaign}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AI Generate dialog ───────────────────────────────── */}
      <Dialog open={genOpen} onOpenChange={(v) => { setGenOpen(v); if (!v) { setGenPieces([]); setGenConfirming(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              {genConfirming ? "Review your content plan" : `Generate content — ${brief.name}`}
            </DialogTitle>
          </DialogHeader>

          {!genConfirming ? (
            /* ── Brief form ── */
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Campaign goal <span className="text-muted-foreground font-normal">(what should this content achieve?)</span></Label>
                <Input className="h-8 text-sm" placeholder="e.g. Drive 500 signups for our product launch"
                  value={brief.goal} onChange={(e) => setBrief({ ...brief, goal: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Target audience</Label>
                <Input className="h-8 text-sm" placeholder="e.g. Early-stage founders in SaaS, aged 28–45"
                  value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Content pillars <span className="text-muted-foreground font-normal">(comma-separated — the AI will spread hooks across these)</span></Label>
                <Input className="h-8 text-sm" placeholder="e.g. Thought leadership, Behind the scenes, Social proof, Education"
                  value={brief.pillars} onChange={(e) => setBrief({ ...brief, pillars: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Additional context or angle</Label>
                <Textarea rows={3} className="text-sm resize-none"
                  placeholder="Any specific angles, data points, product features, or stories the AI should draw from…"
                  value={brief.description} onChange={(e) => setBrief({ ...brief, description: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Platforms to cover</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map(p => {
                    const active = brief.platforms.includes(p);
                    return (
                      <button key={p} onClick={() => togglePlatform(p)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${active ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground/40"}`}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pieces per platform</Label>
                  <Select value={String(brief.piecesPerPlatform)}
                    onValueChange={(v) => setBrief({ ...brief, piecesPerPlatform: Number(v) })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 8, 10].map(n =>
                        <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start date</Label>
                  <Input type="date" className="h-8 text-xs" value={brief.startDate}
                    onChange={(e) => setBrief({ ...brief, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End date</Label>
                  <Input type="date" className="h-8 text-xs" value={brief.endDate}
                    onChange={(e) => setBrief({ ...brief, endDate: e.target.value })} />
                </div>
              </div>

              {brief.platforms.length > 0 && (
                <p className="text-[11px] text-muted-foreground bg-muted/40 rounded px-3 py-2">
                  AI will generate <strong className="text-foreground">{brief.platforms.length * brief.piecesPerPlatform} content pieces</strong> — {brief.piecesPerPlatform} per platform across {brief.platforms.length} platform{brief.platforms.length > 1 ? "s" : ""}.
                </p>
              )}

              {genError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{genError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={runGenerate}
                  disabled={genLoading || !brief.goal.trim() || brief.platforms.length === 0}
                >
                  {genLoading
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating plan…</>
                    : <><Sparkles className="h-3.5 w-3.5" /> Generate content plan</>}
                </Button>
              </div>
            </div>
          ) : (
            /* ── Review plan ── */
            <div className="space-y-4 pt-1">
              <p className="text-xs text-muted-foreground">
                Review the generated hooks. Deselect any you don't want, or edit the hook text. Confirming will create all selected pieces in Content.
              </p>

              {/* Group by platform */}
              {PLATFORM_OPTIONS.filter(p => genPieces.some(x => x.platform === p)).map(platform => {
                const pieces = genPieces.map((p, i) => ({ ...p, idx: i })).filter(p => p.platform === platform);
                return (
                  <div key={platform} className="space-y-1.5">
                    <p className="text-xs font-semibold capitalize flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] capitalize">{platform}</Badge>
                      <span className="text-muted-foreground font-normal">{pieces.filter(p => p.selected).length}/{pieces.length} selected</span>
                    </p>
                    {pieces.map(({ idx, selected, pillar, hook, notes }) => (
                      <div key={idx}
                        className={`rounded-lg border p-3 space-y-1.5 transition-colors ${selected ? "bg-background" : "bg-muted/30 opacity-50"}`}>
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => togglePiece(idx)}
                            className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-colors ${selected ? "bg-violet-600 border-violet-600" : "border-border"}`}>
                            {selected && <Check className="h-2.5 w-2.5 text-white" />}
                          </button>
                          <div className="flex-1 space-y-1">
                            <input
                              className="w-full text-xs font-medium bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-violet-300 rounded px-1 -mx-1"
                              value={hook}
                              onChange={(e) => editPieceHook(idx, e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                              {pillar && <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{pillar}</span>}
                              {notes && <span className="text-[10px] text-muted-foreground truncate max-w-[300px]">{notes}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setGenConfirming(false)}>
                  ← Adjust brief
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedCount} pieces selected</span>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={confirmAndCreate}
                    disabled={selectedCount === 0}
                  >
                    <Check className="h-3.5 w-3.5" /> Create {selectedCount} pieces
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
