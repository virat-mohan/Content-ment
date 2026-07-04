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
import { TableProperties, Download, CheckCircle, AlertCircle, Loader2, Info, Upload, FileSpreadsheet } from "lucide-react";
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

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-]+/g, "");
}

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  title: "title", headline: "title", name: "title", subject: "title",
  body: "body", content: "body", copy: "body", text: "body", post: "body", caption: "body",
  platform: "platform", channel: "platform", network: "platform",
  status: "status", state: "status",
  scheduledat: "scheduledAt", scheduled: "scheduledAt", date: "scheduledAt", publishdate: "scheduledAt",
  tags: "tags", tag: "tags", labels: "tags",
  notes: "notes", note: "notes", comments: "notes",
};

function rowsToPreview(rows: string[][]): ParsedRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row) => {
    const obj: ParsedRow = { title: "", body: "", platform: "", status: "", scheduledAt: "", tags: "", notes: "" };
    headers.forEach((h, i) => {
      const field = HEADER_MAP[h];
      if (field) obj[field] = (row[i] ?? "").toString().trim();
    });
    if (!obj.title) obj.title = (row[0] ?? "").toString().trim();
    return obj;
  }).filter((r) => r.title);
}

type Tab = "sheets" | "file";

export default function ImportPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("sheets");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");

  // Sheets state
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState("");
  const [csvUrl, setCsvUrl] = useState("");

  // File state
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [fileDragging, setFileDragging] = useState(false);

  // Shared
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [imported, setImported] = useState(false);
  const [importSource, setImportSource] = useState("");

  useEffect(() => {
    const all = entityStore.getAll();
    setEntities(all);
    if (all.length) setEntityId(all[0].id);
  }, []);

  // ── Google Sheets fetch ──────────────────────────────────
  async function fetchSheet() {
    setSheetsError(""); setPreview([]); setImported(false);
    const exportUrl = toSheetCsvUrl(url.trim());
    if (!exportUrl) {
      setSheetsError("Paste a valid Google Sheets URL (e.g. https://docs.google.com/spreadsheets/d/…)");
      return;
    }
    if (!entityId) { setSheetsError("Select an entity first."); return; }
    setLoading(true);
    setCsvUrl(exportUrl);
    try {
      const res = await fetch(`/api/sheets/proxy?url=${encodeURIComponent(exportUrl)}`);
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("Sheet appears empty or has no data rows.");
      const parsed = rowsToPreview(rows);
      if (!parsed.length) throw new Error("No rows with a title found. Make sure row 1 is a header row.");
      setPreview(parsed);
      setImportSource(exportUrl);
    } catch (e) {
      setSheetsError(e instanceof Error ? e.message : "Failed to fetch sheet");
    } finally {
      setLoading(false);
    }
  }

  // ── File upload (CSV or Excel) ───────────────────────────
  async function handleFile(file: File) {
    setFileError(""); setPreview([]); setImported(false);
    if (!entityId) { setFileError("Select an entity first."); return; }

    const name = file.name.toLowerCase();
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm");
    const isCsv  = name.endsWith(".csv") || name.endsWith(".tsv");

    if (!isXlsx && !isCsv) {
      setFileError("Only .csv, .tsv, .xlsx, .xls files are supported.");
      return;
    }

    setFileName(file.name);

    try {
      let rows: string[][];

      if (isCsv) {
        const text = await file.text();
        const sep = name.endsWith(".tsv") ? "\t" : ",";
        if (sep === "\t") {
          // Simple TSV split
          rows = text.split(/\r?\n/).filter(Boolean).map(r => r.split("\t"));
        } else {
          rows = parseCsv(text);
        }
      } else {
        // Excel — dynamic import to avoid SSR issues
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        rows = raw.map(r => r.map(c => String(c ?? "")));
      }

      if (rows.length < 2) throw new Error("File appears empty or has no data rows.");
      const parsed = rowsToPreview(rows);
      if (!parsed.length) throw new Error("No rows with a title found. Make sure row 1 is a header row.");
      setPreview(parsed);
      setImportSource(`file:${file.name}`);
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
    toast({ title: `${items.length} item${items.length !== 1 ? "s" : ""} imported to Content` });
  }

  const COLUMNS = ["title / headline", "body / content / copy", "platform / channel", "status", "scheduledAt / date", "tags", "notes"];

  return (
    <div className="flex flex-col">
      <Header title="Import" />
      <div className="flex-1 p-6 animate-fade-in space-y-6 max-w-3xl">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {([["sheets", "Google Sheets", TableProperties], ["file", "CSV / Excel", FileSpreadsheet]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setPreview([]); setImported(false); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Entity picker (shared) */}
        <div className="flex items-center gap-3">
          <Label className="text-xs shrink-0">Import to entity</Label>
          <Select value={entityId} onValueChange={setEntityId}>
            <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
                <p>1. Share → Anyone with the link → <strong>Viewer</strong></p>
                <p>2. Row 1 must be headers. Recognised columns:</p>
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
                <p>Row 1 must be headers. Accepted: <strong>.csv .tsv .xlsx .xls</strong></p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {COLUMNS.map((c) => <span key={c} className="rounded bg-background border px-1.5 py-0.5 font-mono text-[10px]">{c}</span>)}
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${fileDragging ? "border-foreground bg-muted/40" : "border-border hover:bg-muted/30"}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setFileDragging(true); }}
                onDragLeave={() => setFileDragging(false)}
                onDrop={onDrop}
              >
                <Upload className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
                {fileName ? (
                  <p className="text-sm font-medium">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Drag & drop a file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">.csv · .tsv · .xlsx · .xls</p>
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

        {/* ── Preview (shared) ── */}
        {preview.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-semibold">
                Preview — {preview.length} row{preview.length !== 1 ? "s" : ""} found
              </CardTitle>
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
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">Body preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium truncate max-w-[200px]">{row.title}</td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <Badge variant="secondary" className="text-[10px] capitalize">{row.platform || "other"}</Badge>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-muted-foreground">{row.status || "draft"}</td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground truncate max-w-[240px]">{row.body}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <p className="px-4 py-2 text-xs text-muted-foreground border-t">…and {preview.length - 20} more rows</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
