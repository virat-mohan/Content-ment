"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  entityStore, knowledgeStore, brandBookStore, aiSettingsStore,
  type Entity, type BrandBook,
} from "@/lib/store";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Trash2, FileText, BookOpen, Sparkles, Save, Loader2,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeDate } from "@/lib/utils";

// ─── Brand book sections config ───────────────────────────────────────────────

const SECTIONS: { key: keyof Omit<BrandBook, "updatedAt">; label: string; hint: string }[] = [
  { key: "about",             label: "About / Background",        hint: "Company history, mission, founding story, what you do and why." },
  { key: "brandVoice",        label: "Brand Voice & Tone",        hint: "How you write and speak — adjectives, examples of on-brand vs off-brand language." },
  { key: "targetAudience",    label: "Target Audience",           hint: "Who you're writing for — demographics, psychographics, pain points, goals." },
  { key: "productsServices",  label: "Products & Services",       hint: "What you sell or offer — key features, benefits, pricing tiers if relevant." },
  { key: "keyMessages",       label: "Key Messages & Proof Points", hint: "The 3–5 things you always want people to know. Data points, differentiators, taglines." },
  { key: "competitors",       label: "Competitive Landscape",     hint: "Who you compete with and how you're different. Keep it factual." },
  { key: "contentGuidelines", label: "Content Guidelines",        hint: "Topics to cover, topics to avoid, preferred formats, posting cadence, hashtag strategy." },
];

// ─── Extraction prompt ────────────────────────────────────────────────────────

function buildExtractionPrompt(rawText: string): string {
  return `You are a brand strategist. Extract and organize the key brand information from the document below into structured sections. Be thorough — extract everything relevant, synthesize scattered information, and write each section in clear, usable prose that a content writer can immediately apply.

Return ONLY a valid JSON object with these exact keys (no markdown, no code fences):
{
  "about": "...",
  "brandVoice": "...",
  "targetAudience": "...",
  "productsServices": "...",
  "keyMessages": "...",
  "competitors": "...",
  "contentGuidelines": "..."
}

If the document has no information for a section, return an empty string for that key.

---DOCUMENT START---
${rawText.slice(0, 12000)}
---DOCUMENT END---`;
}

export default function KnowledgePage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const brandFileRef = useRef<HTMLInputElement>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [docs, setDocs] = useState<ReturnType<typeof knowledgeStore.getAll>>([]);
  const [book, setBook] = useState<BrandBook>({ about: "", brandVoice: "", targetAudience: "", productsServices: "", keyMessages: "", competitors: "", contentGuidelines: "", updatedAt: "" });
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("about");
  const [tab, setTab] = useState<"brand-book" | "source-docs">("brand-book");

  const load = useCallback(() => {
    if (!selectedEntity) return;
    setDocs(knowledgeStore.getAll(selectedEntity));
    setBook(brandBookStore.get(selectedEntity));
  }, [selectedEntity]);

  useEffect(() => {
    const all = entityStore.getAll();
    setEntities(all);
    if (all.length) setSelectedEntity(all[0].id);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save brand book ─────────────────────────────────────────────────────────

  function saveBook() {
    if (!selectedEntity) return;
    setSaving(true);
    const updated = { ...book, updatedAt: new Date().toISOString() };
    brandBookStore.save(selectedEntity, updated);
    setBook(updated);
    setSaving(false);
    toast({ title: "Brand book saved" });
  }

  // ── Extract from brand book upload ──────────────────────────────────────────

  async function handleBrandBookFile(files: FileList | null) {
    if (!files || !selectedEntity) return;
    const file = files[0];
    setExtracting(true);

    try {
      const text = await readFile(file);

      // Get AI settings
      const settings = aiSettingsStore.get();
      const entityObj = entities.find(e => e.id === selectedEntity);
      const aiCfg = entityObj?.llmApiKey ? { provider: entityObj.preferredLLM || "CLAUDE", apiKey: entityObj.llmApiKey, model: entityObj.llmModel } : settings;

      if (!aiCfg?.apiKey) {
        toast({ title: "No AI API key configured", description: "Add an API key in Settings or the Entity settings.", variant: "destructive" });
        setExtracting(false);
        return;
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiCfg.provider,
          apiKey: aiCfg.apiKey,
          model: aiCfg.model,
          systemPrompt: "You are a brand strategist who extracts structured brand information from documents. Always return valid JSON.",
          messages: [{ role: "user", content: buildExtractionPrompt(text) }],
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Extraction failed");

      // Strip possible markdown fences
      let raw = data.text.trim();
      if (raw.startsWith("```")) raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
      const extracted = JSON.parse(raw);

      const merged: BrandBook = {
        about:             extracted.about             || book.about,
        brandVoice:        extracted.brandVoice        || book.brandVoice,
        targetAudience:    extracted.targetAudience    || book.targetAudience,
        productsServices:  extracted.productsServices  || book.productsServices,
        keyMessages:       extracted.keyMessages       || book.keyMessages,
        competitors:       extracted.competitors       || book.competitors,
        contentGuidelines: extracted.contentGuidelines || book.contentGuidelines,
        updatedAt: new Date().toISOString(),
      };

      brandBookStore.save(selectedEntity, merged);
      setBook(merged);

      // Also save as raw doc
      knowledgeStore.save(selectedEntity, {
        id: generateId(),
        title: file.name,
        content: text,
        type: file.type || "text/plain",
        createdAt: new Date().toISOString(),
      });
      load();

      toast({ title: "Brand book extracted and saved", description: "All sections have been populated from your upload." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Extraction failed", description: msg, variant: "destructive" });
    }

    setExtracting(false);
  }

  // ── Upload raw docs ──────────────────────────────────────────────────────────

  async function handleFiles(files: FileList | null) {
    if (!files || !selectedEntity) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const text = await readFile(file);
        knowledgeStore.save(selectedEntity, {
          id: generateId(),
          title: file.name,
          content: text,
          type: file.type || "text/plain",
          createdAt: new Date().toISOString(),
        });
      } catch {
        toast({ title: `Failed to read ${file.name}`, variant: "destructive" });
      }
    }
    load();
    setUploading(false);
    toast({ title: `${files.length} file${files.length > 1 ? "s" : ""} added` });
  }

  const hasBookContent = SECTIONS.some(s => book[s.key]?.trim());

  return (
    <div className="flex flex-col">
      <Header title="Knowledge" />
      <div className="flex-1 p-4 sm:p-6 animate-fade-in space-y-6">

        {entities.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No entities yet</p>
            <p className="text-xs text-muted-foreground">Create an entity first, then build its knowledge base.</p>
          </div>
        ) : (
          <>
            {/* Entity selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="w-56 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasBookContent && book.updatedAt && (
                <span className="text-xs text-muted-foreground">Last saved {formatRelativeDate(book.updatedAt)}</span>
              )}
            </div>

            <div>
              {/* Tab bar */}
              <div className="flex border-b">
                {(["brand-book", "source-docs"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    {t === "brand-book" ? "Brand Book" : (
                      <span className="flex items-center gap-1.5">
                        Source Documents
                        {docs.length > 0 && <Badge variant="secondary" className="text-[10px] px-1 py-0">{docs.length}</Badge>}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Brand Book tab ─────────────────────────────────────── */}
              {tab === "brand-book" && (
              <div className="space-y-4 mt-4">

                {/* Extract CTA */}
                <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Upload a brand book to auto-populate</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Drop a PDF, Word doc, or text file — AI will extract and fill all sections automatically.</p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={extracting}
                    onClick={() => brandFileRef.current?.click()}
                  >
                    {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {extracting ? "Extracting…" : "Extract from File"}
                  </Button>
                  <input
                    ref={brandFileRef}
                    type="file"
                    accept=".txt,.md,.pdf,.docx,.doc,.csv"
                    className="hidden"
                    onChange={(e) => handleBrandBookFile(e.target.files)}
                  />
                </div>

                {/* Sections */}
                <div className="space-y-2">
                  {SECTIONS.map(({ key, label, hint }) => {
                    const isOpen = expandedSection === key;
                    const filled = !!book[key]?.trim();
                    return (
                      <div key={key} className="rounded-lg border overflow-hidden">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedSection(isOpen ? null : key)}
                        >
                          <span className={`h-2 w-2 rounded-full shrink-0 ${filled ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                          <span className="flex-1 text-sm font-medium">{label}</span>
                          {filled && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">Filled</Badge>}
                          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 space-y-2 border-t">
                            <p className="text-[11px] text-muted-foreground pt-3">{hint}</p>
                            <Textarea
                              className="text-sm min-h-[120px] resize-y"
                              placeholder={`Enter ${label.toLowerCase()}…`}
                              value={book[key]}
                              onChange={(e) => setBook(b => ({ ...b, [key]: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={saveBook} disabled={saving} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    Save Brand Book
                  </Button>
                </div>
              </div>
              )}

              {/* ── Source Documents tab ───────────────────────────────── */}
              {tab === "source-docs" && (
              <div className="space-y-4 mt-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drag & drop files here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .txt, .md, .pdf, .docx, .csv — used as reference context for AI drafting</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.pdf,.docx,.csv"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={uploading}
                />

                {docs.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">File</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Type</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Size</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Added</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((item) => (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate max-w-[200px]">{item.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <Badge variant="secondary" className="text-xs">{item.type.split("/")[1] || "text"}</Badge>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">{formatBytes(item.content.length)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{formatRelativeDate(item.createdAt)}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => { knowledgeStore.delete(selectedEntity, item.id); load(); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
