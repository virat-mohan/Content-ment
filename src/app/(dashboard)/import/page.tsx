"use client";

import { useEffect, useState } from "react";
import { entityStore, contentStore, type Entity, type ContentItem, type ContentPlatform, type ContentStatus } from "@/lib/store";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableProperties, Download, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
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

  // Already a direct CSV export URL
  if (trimmed.includes("export?format=csv") || trimmed.includes("output=csv")) return trimmed;

  // Extract spreadsheet ID
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const id = match[1];

  // Extract gid (sheet tab) if present — omit entirely if not found (avoids 400 on default tab)
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
  return h.toLowerCase().replace(/[\s_-]+/g, "");
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

export default function ImportPage() {
  const { toast } = useToast();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [url, setUrl] = useState("");
  const [entityId, setEntityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [csvUrl, setCsvUrl] = useState("");
  const [imported, setImported] = useState(false);

  useEffect(() => {
    const all = entityStore.getAll();
    setEntities(all);
    if (all.length) setEntityId(all[0].id);
  }, []);

  async function fetchSheet() {
    setError(""); setPreview([]); setImported(false);
    const exportUrl = toSheetCsvUrl(url.trim());
    if (!exportUrl) {
      setError("Paste a valid Google Sheets URL (e.g. https://docs.google.com/spreadsheets/d/…)");
      return;
    }
    if (!entityId) {
      setError("Select an entity first.");
      return;
    }

    setLoading(true);
    setCsvUrl(exportUrl);

    try {
      const res = await fetch(`/api/sheets/proxy?url=${encodeURIComponent(exportUrl)}`);
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("Sheet appears empty or has no data rows.");

      const headers = rows[0].map(normalizeHeader);
      const parsed: ParsedRow[] = rows.slice(1).map((row) => {
        const obj: ParsedRow = { title: "", body: "", platform: "", status: "", scheduledAt: "", tags: "", notes: "" };
        headers.forEach((h, i) => {
          const field = HEADER_MAP[h];
          if (field) obj[field] = row[i]?.trim() ?? "";
        });
        if (!obj.title) obj.title = row[0]?.trim() ?? "";
        return obj;
      }).filter((r) => r.title);

      if (!parsed.length) throw new Error("No rows with a title found. Make sure row 1 is a header row.");
      setPreview(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch sheet");
    } finally {
      setLoading(false);
    }
  }

  function doImport() {
    const now = new Date().toISOString();
    const items: ContentItem[] = preview.map((row) => ({
      id: generateId(),
      entityId,
      title: row.title,
      body: row.body,
      platform: (PLATFORM_ALIASES[row.platform.toLowerCase()] ?? "other") as ContentPlatform,
      status: (STATUS_ALIASES[row.status.toLowerCase()] ?? "draft") as ContentStatus,
      scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : undefined,
      tags: row.tags ? row.tags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
      notes: row.notes,
      importSource: csvUrl,
      createdAt: now,
      updatedAt: now,
    }));
    contentStore.saveMany(items);
    setImported(true);
    toast({ title: `${items.length} items imported to Content` });
  }

  return (
    <div className="flex flex-col">
      <Header title="Import" />
      <div className="flex-1 p-6 animate-fade-in space-y-6 max-w-3xl">

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TableProperties className="h-4 w-4" /> Import from Google Sheets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Instructions */}
            <div className="rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground space-y-1.5">
              <p className="flex items-center gap-1.5 font-medium text-foreground"><Info className="h-3.5 w-3.5" /> How to set up your sheet</p>
              <p>1. Make the sheet <strong>publicly viewable</strong>: Share → Anyone with the link → Viewer.</p>
              <p>2. Row 1 must be a header row. Recognised columns (case-insensitive):</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {["title / headline", "body / content / copy", "platform / channel", "status", "scheduledAt / date", "tags", "notes"].map((c) => (
                  <span key={c} className="rounded bg-background border px-1.5 py-0.5 font-mono text-[10px]">{c}</span>
                ))}
              </div>
              <p>3. Paste the sheet URL below and click Fetch.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Google Sheet URL</Label>
                <Input
                  className="text-xs h-8"
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setPreview([]); setImported(false); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Import to entity</Label>
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button size="sm" className="h-8 text-xs w-full" onClick={fetchSheet} disabled={loading || !url.trim()}>
                  {loading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Fetching…</> : "Fetch Sheet"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {preview.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-semibold">
                Preview — {preview.length} row{preview.length > 1 ? "s" : ""} found
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
