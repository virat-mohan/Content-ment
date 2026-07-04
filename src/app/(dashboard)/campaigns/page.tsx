"use client";

import { useEffect, useState } from "react";
import { campaignStore, entityStore, contentStore, type Campaign, type Entity } from "@/lib/store";
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
import { Plus, Trash2, Pencil, Folder, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const EMPTY: Partial<Campaign> = { name: "", description: "", status: "planning", goal: "" };

export default function CampaignsPage() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Campaign>>(EMPTY);
  const [contentCounts, setContentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setCampaigns(campaignStore.getAll());
    setEntities(entityStore.getAll());
    const allContent = contentStore.getAll();
    const counts: Record<string, number> = {};
    allContent.forEach((c) => { counts[c.entityId] = (counts[c.entityId] ?? 0) + 1; });
    setContentCounts(counts);
  }, []);

  function openNew() {
    setEditing({ ...EMPTY, entityId: entities[0]?.id ?? "" });
    setOpen(true);
  }

  function save() {
    if (!editing.name?.trim() || !editing.entityId) {
      toast({ title: "Name and entity are required", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const item: Campaign = {
      id: editing.id ?? generateId(),
      entityId: editing.entityId!,
      name: editing.name!,
      description: editing.description,
      status: (editing.status ?? "planning") as Campaign["status"],
      startDate: editing.startDate,
      endDate: editing.endDate,
      goal: editing.goal,
      createdAt: editing.createdAt ?? now,
      updatedAt: now,
    };
    campaignStore.save(item);
    setCampaigns(campaignStore.getAll());
    setOpen(false);
    toast({ title: editing.id ? "Campaign updated" : "Campaign created" });
  }

  function remove(id: string) {
    campaignStore.delete(id);
    setCampaigns(campaignStore.getAll());
    toast({ title: "Deleted" });
  }

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col">
      <Header title="Campaigns" />
      <div className="flex-1 p-6 animate-fade-in space-y-4">
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
            <p className="text-xs text-muted-foreground">Group your content into campaigns to track goals and timelines.</p>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-3.5 w-3.5" /> New Campaign</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((c) => (
              <Card key={c.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm truncate">{c.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{entityName(c.entityId)}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                  {c.goal && (
                    <div className="rounded bg-muted/50 px-2.5 py-1.5 text-xs">
                      <span className="font-medium">Goal: </span>{c.goal}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {contentCounts[c.entityId] ?? 0} items</span>
                    <span>{formatRelativeDate(c.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => { setEditing({ ...c }); setOpen(true); }}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editing.id ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input className="h-8 text-sm" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Entity</Label>
                <Select value={editing.entityId ?? ""} onValueChange={(v) => setEditing({ ...editing, entityId: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={editing.status ?? "planning"} onValueChange={(v) => setEditing({ ...editing, status: v as Campaign["status"] })}>
                  <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["planning","active","paused","completed"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Goal</Label>
              <Input className="h-8 text-sm" placeholder="e.g. 10k impressions, 500 signups" value={editing.goal ?? ""} onChange={(e) => setEditing({ ...editing, goal: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input type="date" className="h-8 text-xs" value={editing.startDate?.slice(0,10) ?? ""} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End date</Label>
                <Input type="date" className="h-8 text-xs" value={editing.endDate?.slice(0,10) ?? ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea rows={3} className="text-sm resize-none" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
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
