"use client";

import { useEffect, useRef, useState } from "react";
import { entityStore, contentStore, type Entity, type ContentItem, type ContentPlatform, type ContentStatus } from "@/lib/store";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableProperties, Download, CheckCircle, AlertCircle, Loader2, Info, Upload, FileSpreadsheet, ClipboardPaste } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedRow {
  title: string;
  body: string;
  platform: string;
  status: string;
  scheduledAt: string;
  tags: string;
  notes: string;
  [key: string]: string;
}

const PLATFORM_ALIASES: Record<string, ContentPlatform> = {
  linkedin: "linkedin", li: "linkedin",
  twitter: "twitter", x: "twitter", tweet: "twitter",
  instagram: "instagram", ig: "instagram",
  blog: "blog", medium: "blog", article: "blog",
  youtube: "youtube", yt: "youtube",
  email: "email", newsletter: "email",
};

const STATUS_ALIASES: Record<string, ContentStatus> = {
  draft: "draft", wip: "draft",
  review: "review", "in review": "review",
  approved: "approved", approve: "approved",
  published: "published", live: "published", done: "published",
  archived: "archived", archive: "archived",
};

const PLATFORMS: ContentPlatform[] = ["linkedin", "twitter", "instagram", "blog", "youtube", "email", "other"];

function toSheetCsvUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.includes("export?format=csv") || trimmed.includes("output=csv")) return trimmed;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const id = match[1];
  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : "";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&single=true${gidParam}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(cell); cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell); if (row.some((c) => c.trim())) rows.push(row); }
  return rows;
}

function parseTsv(text: string): string[][] {
  return text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split("\t"));
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-\/\.]+/g, "").replace(/[^a-z0-9]/g, "");
}

// Expanded header map — covers "Working Title / Hook", "Pillar", "ID" etc.
const HEADER_MAP: Record<string, keyof ParsedRow> = {
  // title variants
  title: "title", headline: "title", name: "title", subject: "title",
  workingtitle: "title", workingtitlehook: "title", hook: "title",
  topic: "title", posttitle: "title", contenttitle: "title",
  // body variants
  body: "body", content: "body", copy: "body", text: "body",
  post: "body", caption: "body", script: "body", draft: "body",
  // platform variants
  platform: "platform", channel: "platform", network: "platform", type: "platform",
  // status variants
  status: "status", state: "status", stage: "status",
  // date variants
  scheduledat: "scheduledAt", scheduled: "scheduledAt", date: "scheduledAt",
  publishdate: "scheduledAt", publishedat: "scheduledAt", goliveon: "scheduledAt",
  // tags — "Pillar" maps here
  tags: "tags", tag: "tags", labels: "tags", label: "tags",
  pillar: "tags", category: "tags", series: "tags", theme: "tags",
  // notes — "ID" maps here
  notes: "notes", note: "notes", comments: "notes", remarks: "notes",
  id: "notes", contentid: "notes", ref: "notes", code: "notes",
};

function rowsToPreview(rows: string[][], defaultPlatform = "other"): ParsedRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const hasPlatformCol = headers.some(h => HEADER_MAP[h] === "platform");
  return rows.slice(1).map((row) => {
    const obj: ParsedRow = { title: "", body: "", platform: defaultPlatform, status: "", scheduledAt: "", tags: "", notes: "" };
    headers.forEach((h, i) => {
      const field = HEADER_MAP[h];
      if (field) {
        const val = (row[i] ?? "").toString().trim();
        // notes: append if already has content (e.g. ID in notes)
        if (field === "notes" && obj.notes) obj.notes = obj.notes + " · " + val;
        else if (val) obj[field] = val;
      }
    });
    if (!hasPlatformCol) obj.platform = defaultPlatform;
    if (!obj.title) obj.title = (row[0] ?? "").toString().trim();
    return obj;
  }).filter((r) => r.title);
}

type Tab = "sheets" | "file" | "paste";

export default function ImportPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("sheets");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [defaultPlatform, setDefaultPlatform] = useState<string>("other");

  // Sheets state
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState("");

  // File state
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [fileDragging, setFileDragging] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);

  // Paste state
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");

  // Shared
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [imported, setImported] = useState(false);
  const [importSource, setImportSource] = useState("");
  const [hasPlatformData, setHasPlatformData] = useState(false);

  useEffect(() => {
    const all = entityStore.getAll();
    setEntities(all);
    if (all.length) setEntityId(all[0].id);
  }, []);

  function applyPreview(rows: string[][], source: string) {
    const headers = rows[0]?.map(normalizeHeader) ?? [];
    const hasPlat = headers.some(h => HEADER_MAP[h] === "platform");
    setHasPlatformData(hasPlat);
    const parsed = rowsToPreview(rows, hasPlat ? "other" : defaultPlatform);
    if (!parsed.length) throw new Error("No rows with a title found. Make sure row 1 is a header row.");
    setPreview(parsed);
    setImportSource(source);
    setImported(false);
  }

  // Re-apply default platform when it changes
  useEffect(() => {
    if (preview.length && !hasPlatformData) {
      setPreview(p => p.map(r => ({ ...r, platform: defaultPlatform })));
    }
  }, [defaultPlatform, hasPlatformData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Google Sheets fetch ──────────────────────────────────
  async function fetchSheet() {
    setSheetsError(""); setPreview([]); setImported(false);
    const exportUrl = toSheetCsvUrl(url.trim());
    if (!exportUrl) { setSheetsError("Paste a valid Google Sheets URL."); return; }
    if (!entityId) { setSheetsError("Select an entity first."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/proxy?url=${encodeURIComponent(exportUrl)}`);
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("Sheet appears empty or has no data rows.");
      applyPreview(rows, exportUrl);
    } catch (e) {
      setSheetsError(e instanceof Error ? e.message : "Failed to fetch sheet");
    } finally {
      setLoading(false);
    }
  }

  // ── File upload (CSV, TSV or Excel — all sheets) ─────────
  async function handleFile(file: File) {
    setFileError(""); setPreview([]); setImported(false); setSheetNames([]);
    if (!entityId) { setFileError("Select an entity first."); return; }
    const name = file.name.toLowerCase();
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm");
    const isCsv  = name.endsWith(".csv") || name.endsWith(".tsv");
    if (!isXlsx && !isCsv) { setFileError("Only .csv, .tsv, .xlsx, .xls files are supported."); return; }
    setFileName(file.name);
    try {
      let rows: string[][];
      if (isCsv) {
        const text = await file.text();
        rows = name.endsWith(".tsv") ? parseTsv(text) : parseCsv(text);
      } else {
        const XLSX = await import("xlsx");
        const buf  = await file.arrayBuffer();
        const wb   = XLSX.read(buf, { type: "array" });
        setSheetNames(wb.SheetNames);
        // Combine all sheets: read each, append rows (skip duplicate headers after first sheet)
        const allRows: string[][] = [];
        wb.SheetNames.forEach((sName, si) => {
          const ws   = wb.Sheets[sName];
          const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          const sheetRows = raw.map(r => r.map(c => String(c ?? ""))).filter(r => r.some(c => c.trim()));
          if (si === 0) {
            allRows.push(...sheetRows);
          } else if (sheetRows.length > 1) {
            // Skip header row (row 0) for subsequent sheets if same structure
            allRows.push(...sheetRows.slice(1));
          }
        });
        rows = allRows;
      }
      if (rows.length < 2) throw new Error("File appears empty or has no data rows.");
      applyPreview(rows, `file:${file.name}`);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Failed to read file");
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setFileDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // ── Paste parse ──────────────────────────────────────────
  function parsePaste() {
    setPasteError(""); setPreview([]); setImported(false);
    if (!entityId) { setPasteError("Select an entity first."); return; }
    const text = pasteText.trim();
    if (!text) { setPasteError("Paste some data first."); return; }
    // Auto-detect delimiter: if more tabs than commas → TSV
    const tabCount   = (text.match(/\t/g) ?? []).length;
    const commaCount = (text.match(/,/g)  ?? []).length;
    const rows = tabCount > commaCount ? parseTsv(text) : parseCsv(text);
    try {
      if (rows.length < 2) throw new Error("Need at least a header row and one data row.");
      applyPreview(rows, "paste");
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : "Failed to parse");
    }
  }

  // ── Import confirmed ─────────────────────────────────────
  function doImport() {
    const now = new Date().toISOString();
    const items: ContentItem[] = preview.map((row) => ({
      id: generateId(),
      entityId,
      title: row.title,
      body: row.body,
      platform: (PLATFORM_ALIASES[row.platform.toLowerCase()] ?? "other") as ContentPlatform,
      status: (STATUS_ALIASES[row.status.toLowerCase()] ?? "draft") as ContentStatus,
      scheduledAt: row.scheduledAt ? (() => { try { return new Date(row.scheduledAt).toISOString(); } catch { return undefined; } })() : undefined,
      tags: row.tags ? row.tags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
      notes: row.notes,
      importSource,
      createdAt: now,
      updatedAt: now,
    }));
    contentStore.saveMany(items);
    setImported(true);
    toast({ title: `${items.length} item${items.length !== 1 ? "s" : ""} imported` });
  }

  const COLUMNS = ["title / headline / working title / hook", "body / content / copy", "platform / channel", "status", "scheduledAt / date", "tags / pillar / category", "notes / id"];

  return (
    <div className="flex flex-col">
      <Header title="Import" />
      <div className="flex-1 p-6 animate-fade-in space-y-6 max-w-3xl">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {([
            ["sheets", "Google Sheets", TableProperties],
            ["file",   "CSV / Excel",   FileSpreadsheet],
            ["paste",  "Paste Data",    ClipboardPaste],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setPreview([]); setImported(false); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Entity + default platform (shared) */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Import to</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Default platform</Label>
            <Select value={defaultPlatform} onValueChange={setDefaultPlatform}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Google Sheets tab ── */}
        {tab === "sheets" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TableProperties className="h-4 w-4" /> Import from Google Sheets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground space-y-1.5">
                <p className="flex items-center gap-1.5 font-medium text-foreground"><Info className="h-3.5 w-3.5" /> Setup</p>
                <p>Share → Anyone with the link → <strong>Viewer</strong>. Row 1 = headers.</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {COLUMNS.map((c) => <span key={c} className="rounded bg-background border px-1.5 py-0.5 font-mono text-[10px]">{c}</span>)}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Google Sheet URL</Label>
                <div className="flex gap-2">
                  <Input className="text-xs h-8 flex-1" placeholder="https://docs.google.com/spreadsheets/d/…" value={url} onChange={(e) => { setUrl(e.target.value); setPreview([]); setImported(false); }} />
                  <Button size="sm" className="h-8 text-xs shrink-0" onClick={fetchSheet} disabled={loading || !url.trim()}>
                    {loading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Fetching…</> : "Fetch"}
                  </Button>
                </div>
              </div>
              {sheetsError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {sheetsError}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── File Upload tab ── */}
        {tab === "file" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Import from CSV or Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground space-y-1.5">
                <p className="flex items-center gap-1.5 font-medium text-foreground"><Info className="h-3.5 w-3.5" /> File format</p>
                <p>Accepted: <strong>.csv .tsv .xlsx .xls</strong> · Row 1 = headers · <strong>All sheets</strong> in Excel are read and combined.</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {COLUMNS.map((c) => <span key={c} className="rounded bg-background border px-1.5 py-0.5 font-mono text-[10px]">{c}</span>)}
                </div>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${fileDragging ? "border-foreground bg-muted/40" : "border-border hover:bg-muted/30"}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setFileDragging(true); }}
                onDragLeave={() => setFileDragging(false)}
                onDrop={onDrop}
              >
                <Upload className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
                {fileName ? (
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    {sheetNames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {sheetNames.length} sheet{sheetNames.length !== 1 ? "s" : ""} read: {sheetNames.join(", ")}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Drag & drop a file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">.csv · .tsv · .xlsx · .xls — all tabs imported</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.xlsx,.xls,.xlsm" className="hidden" onChange={onFileInput} />

              {fileError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {fileError}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Paste tab ── */}
        {tab === "paste" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4" /> Paste Data Directly
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground space-y-1.5">
                <p className="flex items-center gap-1.5 font-medium text-foreground"><Info className="h-3.5 w-3.5" /> How to paste</p>
                <p>Copy from Excel, Google Sheets, or any table (row 1 = headers). Tab-separated and comma-separated both work.</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {COLUMNS.map((c) => <span key={c} className="rounded bg-background border px-1.5 py-0.5 font-mono text-[10px]">{c}</span>)}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Paste your data here</Label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono resize-y min-h-[180px] focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={"ID\tPillar\tWorking Title / Hook\nHQ01\tThe Human Quotient\tThe conversation that made me certain…"}
                  value={pasteText}
                  onChange={(e) => { setPasteText(e.target.value); setPreview([]); setImported(false); }}
                />
              </div>

              <Button size="sm" className="h-8 text-xs" onClick={parsePaste} disabled={!pasteText.trim()}>
                <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" /> Parse &amp; Preview
              </Button>

              {pasteError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {pasteError}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Preview (shared) ── */}
        {preview.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Preview — {preview.length} row{preview.length !== 1 ? "s" : ""} ready to import
                </CardTitle>
                {!hasPlatformData && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">No platform column detected — using default: <span className="font-medium capitalize">{defaultPlatform}</span></p>
                )}
              </div>
              {imported ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle className="h-3.5 w-3.5" /> Imported
                </span>
              ) : (
                <Button size="sm" className="h-7 text-xs" onClick={doImport}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Import {preview.length} items
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Title</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Platform</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Tags / Pillar</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">Notes / ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 25).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium truncate max-w-[220px]">{row.title}</td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <Badge variant="secondary" className="text-[10px] capitalize">{row.platform || "other"}</Badge>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground truncate max-w-[160px]">{row.tags}</td>
                        <td className="px-4 py-2.5 capitalize text-muted-foreground">{row.status || "draft"}</td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground truncate max-w-[120px]">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 25 && (
                  <p className="px-4 py-2 text-xs text-muted-foreground border-t">…and {preview.length - 25} more rows</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
