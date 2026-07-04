"use client";

import { useEffect, useState } from "react";
import { promptStore, type Prompt, type ContentPlatform } from "@/lib/store";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Copy, Pencil, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS: (ContentPlatform | "general")[] = ["general","linkedin","twitter","instagram","blog","youtube","email","other"];

const EMPTY: Partial<Prompt> = { title: "", body: "", category: "", platform: "general" };

export default function PromptsPage() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Prompt>>(EMPTY);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { setPrompts(promptStore.getAll()); }, []);

  const categories = Array.from(new Set(prompts.map((p) => p.category).filter(Boolean)));
  const filtered = filter === "all" ? prompts : prompts.filter((p) => p.platform === filter || p.category === filter);

  function save() {
    if (!editing.title?.trim() || !editing.body?.trim()) {
      toast({ title: "Title and body are required", variant: "destructive" });
      return;
    }
    const item: Prompt = {
      id: editing.id ?? generateId(),
      title: editing.title!,
      body: editing.body!,
      category: editing.category ?? "",
      platform: editing.platform ?? "general",
      createdAt: editing.createdAt ?? new Date().toISOString(),
    };
    promptStore.save(item);
    setPrompts(promptStore.getAll());
    setOpen(false);
    toast({ title: editing.id ? "Prompt updated" : "Prompt saved" });
  }

  function copy(body: string) {
    navigator.clipboard.writeText(body);
    toast({ title: "Copied to clipboard" });
  }

  function remove(id: string) {
    promptStore.delete(id);
    setPrompts(promptStore.getAll());
  }

  return (
    <div className="flex flex-col">
      <Header title="Prompts" />
      <div className="flex-1 p-6 animate-fade-in space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {["all", ...PLATFORMS.slice(0,5), ...categories].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >{f}</button>
            ))}
          </div>
          <Button size="sm" className="ml-auto h-8 text-xs" onClick={() => { setEditing(EMPTY); setOpen(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New Prompt
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <Zap className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No prompts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="group rounded-lg border bg-card transition-colors hover:bg-muted/20">
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{p.title}</span>
                      <Badge variant="secondary" className="text-[10px] capitalize">{p.platform}</Badge>
                      {p.category && <span className="text-[10px] text-muted-foreground">{p.category}</span>}
                    </div>
                    {expanded !== p.id && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); copy(p.body); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setEditing({ ...p }); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); remove(p.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {expanded === p.id && (
                  <div className="px-4 pb-3">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans rounded bg-muted/50 p-3">{p.body}</pre>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copy(p.body)}>
                        <Copy className="mr-1 h-3 w-3" /> Copy prompt
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{editing.id ? "Edit Prompt" : "New Prompt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input className="h-8 text-sm" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Platform</Label>
                <Select value={editing.platform ?? "general"} onValueChange={(v) => setEditing({ ...editing, platform: v as Prompt["platform"] })}>
                  <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input className="h-8 text-sm" placeholder="e.g. Engagement" value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prompt body</Label>
              <p className="text-[10px] text-muted-foreground">Use {"{{entity}}"}, {"{{topic}}"}, {"{{content}}"} as placeholders.</p>
              <Textarea rows={7} className="text-sm font-mono resize-none" value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
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
