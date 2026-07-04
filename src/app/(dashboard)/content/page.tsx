"use client";

import { useEffect, useState } from "react";
import { entityStore, contentStore, type Entity, type ContentItem, type ContentStatus, type ContentPlatform } from "@/lib/store";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";

const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-muted/60 text-muted-foreground/60",
};

const PLATFORMS: ContentPlatform[] = ["linkedin", "twitter", "instagram", "blog", "youtube", "email", "other"];
const STATUSES: ContentStatus[] = ["draft", "review", "approved", "published", "archived"];

const EMPTY: Partial<ContentItem> = {
  title: "", body: "", platform: "linkedin", status: "draft", tags: [], notes: "",
};

export default function ContentPage() {
  const { toast } = useToast();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ContentItem>>(EMPTY);

  useEffect(() => {
    setEntities(entityStore.getAll());
    setItems(contentStore.getAll());
  }, []);

  const filtered = items.filter((c) => {
    if (filterEntity !== "all" && c.entityId !== filterEntity) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  function openNew() {
    setEditing({ ...EMPTY, entityId: entities[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing({ ...item });
    setOpen(true);
  }

  function save() {
    if (!editing.title?.trim() || !editing.entityId) {
      toast({ title: "Title and entity are required", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const item: ContentItem = {
      id: editing.id ?? generateId(),
      entityId: editing.entityId!,
      title: editing.title!,
      body: editing.body ?? "",
      platform: (editing.platform ?? "other") as ContentPlatform,
      status: (editing.status ?? "draft") as ContentStatus,
      scheduledAt: editing.scheduledAt,
      tags: editing.tags ?? [],
      notes: editing.notes,
      importSource: editing.importSource,
      createdAt: editing.createdAt ?? now,
      updatedAt: now,
    };
    contentStore.save(item);
    setItems(contentStore.getAll());
    setOpen(false);
    toast({ title: editing.id ? "Content updated" : "Content created" });
  }

  function remove(id: string) {
    contentStore.delete(id);
    setItems(contentStore.getAll());
    toast({ title: "Deleted" });
  }

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col">
      <Header title="Content" />
      <div className="flex-1 p-6 animate-fade-in space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All entities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
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

        {/* Table */}
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
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Entity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Platform</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
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
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{entityName(item.entityId)}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs capitalize">{item.platform}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{formatRelativeDate(item.updatedAt)}</span>
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

      {/* Edit / Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{editing.id ? "Edit Content" : "New Content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input className="h-8 text-sm" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Entity</Label>
                <Select value={editing.entityId ?? ""} onValueChange={(v) => setEditing({ ...editing, entityId: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Platform</Label>
                <Select value={editing.platform ?? "other"} onValueChange={(v) => setEditing({ ...editing, platform: v as ContentPlatform })}>
                  <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={editing.status ?? "draft"} onValueChange={(v) => setEditing({ ...editing, status: v as ContentStatus })}>
                  <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Schedule date</Label>
                <Input type="datetime-local" className="h-8 text-xs" value={editing.scheduledAt?.slice(0, 16) ?? ""}
                  onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Body</Label>
              <Textarea rows={5} className="text-sm resize-none" value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input className="h-8 text-sm" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
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
