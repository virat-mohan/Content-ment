"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { assetStore, contentStore, assetTypeFromMime, type Asset, type AssetType } from "@/lib/store";
import { useActiveEntity } from "@/hooks/use-active-entity";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Link2, Film, FileText, Image as ImageIcon, File, X, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TYPE_ICON: Record<AssetType, React.ElementType> = {
  image: ImageIcon, video: Film, document: FileText, other: File,
};

const TYPE_COLORS: Record<AssetType, string> = {
  image: "text-blue-500", video: "text-violet-500",
  document: "text-amber-500", other: "text-muted-foreground",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetThumb({ asset }: { asset: Asset }) {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (asset.type === "image") {
      const data = assetStore.getDataUrl(asset.id);
      setSrc(data);
    }
  }, [asset.id, asset.type]);

  const Icon = TYPE_ICON[asset.type];

  if (asset.type === "image" && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={asset.name} className="w-full h-full object-cover" />
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted/40">
      <Icon className={`h-8 w-8 ${TYPE_COLORS[asset.type]}`} />
      {asset.type === "video" && (
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Video</span>
      )}
    </div>
  );
}

export default function AssetsPage() {
  const { toast } = useToast();
  const { activeId } = useActiveEntity();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filterType, setFilterType] = useState<"all" | AssetType>("all");
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!activeId) return;
    setAssets(assetStore.getAll(activeId));
  }, [activeId]);

  useEffect(() => { load(); }, [load]);

  const filtered = assets.filter(a => filterType === "all" || a.type === filterType);

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function processFiles(files: FileList | File[]) {
    if (!activeId) return;
    const fileArray = Array.from(files);
    let successCount = 0;

    for (const file of fileArray) {
      const type = assetTypeFromMime(file.type);
      const now = new Date().toISOString();
      const id = generateId();

      const asset: Asset = {
        id,
        entityId: activeId,
        name: file.name,
        type,
        mimeType: file.type,
        size: file.size,
        createdAt: now,
      };

      if (assetStore.canStoreData(file.size) && type === "image") {
        // Read as dataURL for images under 1.5 MB
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Also get dimensions
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 0, h: 0 });
          img.src = dataUrl;
        });

        assetStore.save({ ...asset, dataUrl, width: dims.w, height: dims.h });
      } else {
        // For large files / videos: save metadata only
        assetStore.save(asset);
        if (type !== "image") {
          // Video / doc — metadata only in trial mode
        } else {
          toast({
            title: `${file.name} is too large to store locally`,
            description: "Images over 1.5 MB are saved as metadata only. Connect cloud storage in a future update.",
            variant: "destructive",
          });
        }
      }
      successCount++;
    }

    load();
    if (successCount > 0) {
      toast({ title: `${successCount} asset${successCount > 1 ? "s" : ""} uploaded` });
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }

  function deleteAsset(id: string) {
    if (!activeId) return;
    assetStore.delete(activeId, id);
    if (selected?.id === id) setSelected(null);
    load();
    toast({ title: "Deleted" });
  }

  // ���─ Link to content ─────────────────────────────────────────────────────────

  const contentItems = activeId
    ? contentStore.getAll().filter(c => c.entityId === activeId)
    : [];

  const linkedContentIds = selected
    ? contentItems.filter(c => c.assetIds?.includes(selected.id)).map(c => c.id)
    : [];

  function searchedItems() {
    if (!linkSearch.trim()) return contentItems;
    const q = linkSearch.toLowerCase();
    return contentItems.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.hook?.toLowerCase().includes(q) ||
      c.contentId?.toLowerCase().includes(q)
    );
  }

  function toggleLink(contentItemId: string) {
    const item = contentItems.find(c => c.id === contentItemId);
    if (!item || !selected) return;
    const now = new Date().toISOString();
    const current = item.assetIds ?? [];
    const linked = current.includes(selected.id);
    contentStore.save({
      ...item,
      assetIds: linked ? current.filter(id => id !== selected.id) : [...current, selected.id],
      updatedAt: now,
    });
    load(); // refresh to update linked count
  }

  return (
    <div className="flex flex-col">
      <Header title="Assets" />
      <div className="flex-1 p-6 animate-fade-in space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as "all" | AssetType)}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{assets.length} asset{assets.length !== 1 ? "s" : ""}</p>
          <div className="ml-auto">
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            <input
              ref={fileRef} type="file" multiple className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={(e) => e.target.files && processFiles(e.target.files)}
            />
          </div>
        </div>

        {/* Drop zone (shown when empty) or gallery */}
        {filtered.length === 0 ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-24 gap-3 text-center transition-colors cursor-pointer ${dragging ? "border-violet-400 bg-violet-50/50 dark:bg-violet-950/20" : "border-border hover:border-muted-foreground/40"}`}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground">Images, videos, PDFs — stored locally in your browser</p>
          </div>
        ) : (
          <>
            {/* Drop overlay on existing gallery */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 transition-all ${dragging ? "opacity-50" : ""}`}
            >
              {filtered.map(asset => {
                const linkedCount = contentItems.filter(c => c.assetIds?.includes(asset.id)).length;
                return (
                  <div
                    key={asset.id}
                    className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-md ${selected?.id === asset.id ? "ring-2 ring-violet-500" : ""}`}
                    onClick={() => setSelected(asset.id === selected?.id ? null : asset)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square">
                      <AssetThumb asset={asset} />
                    </div>

                    {/* Info bar */}
                    <div className="p-1.5 border-t bg-background">
                      <p className="text-[10px] font-medium truncate">{asset.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(asset.size)}</p>
                    </div>

                    {/* Linked badge */}
                    {linkedCount > 0 && (
                      <div className="absolute top-1 left-1 bg-violet-600 text-white text-[9px] font-bold rounded px-1 py-0.5 flex items-center gap-0.5">
                        <Link2 className="h-2 w-2" />{linkedCount}
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(asset); setLinkOpen(true); }}
                        className="h-6 w-6 rounded bg-background/90 border flex items-center justify-center hover:bg-accent"
                        title="Link to content"
                      >
                        <Link2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                        className="h-6 w-6 rounded bg-background/90 border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected asset detail */}
            {selected && (
              <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">{selected.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{selected.type}</span>
                      <span>·</span>
                      <span>{selected.mimeType}</span>
                      <span>·</span>
                      <span>{formatSize(selected.size)}</span>
                      {selected.width && selected.height && (
                        <><span>·</span><span>{selected.width}×{selected.height}px</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => setLinkOpen(true)}>
                      <Link2 className="h-3 w-3" /> Link to content
                    </Button>
                    <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Linked content items */}
                {linkedContentIds.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Linked to {linkedContentIds.length} content item{linkedContentIds.length > 1 ? "s" : ""}:</p>
                    {linkedContentIds.map(id => {
                      const item = contentItems.find(c => c.id === id);
                      if (!item) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 text-xs">
                          <code className="text-muted-foreground font-mono">{item.contentId}</code>
                          <span className="text-muted-foreground">·</span>
                          <span className="truncate">{item.hook || item.title}</span>
                          <Badge variant="secondary" className="text-[10px] capitalize ml-auto shrink-0">{item.platform}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Link dialog ────────────────────────────────────────────── */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link "{selected?.name}" to content
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              className="h-8 text-xs"
              placeholder="Search by content ID, hook, or title…"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
            />
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {searchedItems().length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No content items found</p>
              )}
              {searchedItems().map(item => {
                const isLinked = selected ? (item.assetIds ?? []).includes(selected.id) : false;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleLink(item.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${isLinked ? "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800" : "hover:bg-muted/40 border border-transparent"}`}
                  >
                    <div className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${isLinked ? "bg-violet-600 border-violet-600" : "border-border"}`}>
                      {isLinked && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.hook || item.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <code>{item.contentId}</code>
                        <span>·</span>
                        <span className="capitalize">{item.platform}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
