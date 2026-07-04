"use client";

import { useEffect, useRef, useState } from "react";
import { entityStore, knowledgeStore, type Entity } from "@/lib/store";
import { generateId } from "@/lib/id";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, FileText, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeDate } from "@/lib/utils";

export default function KnowledgePage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [items, setItems] = useState<ReturnType<typeof knowledgeStore.getAll>>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const all = entityStore.getAll();
    setEntities(all);
    if (all.length) setSelectedEntity(all[0].id);
  }, []);

  useEffect(() => {
    if (selectedEntity) setItems(knowledgeStore.getAll(selectedEntity));
  }, [selectedEntity]);

  async function handleFiles(files: FileList | null) {
    if (!files || !selectedEntity) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        const text = await readFile(file);
        const item = {
          id: generateId(),
          title: file.name,
          content: text,
          type: file.type || "text/plain",
          createdAt: new Date().toISOString(),
        };
        knowledgeStore.save(selectedEntity, item);
      } catch {
        toast({ title: `Failed to read ${file.name}`, variant: "destructive" });
      }
    }

    setItems(knowledgeStore.getAll(selectedEntity));
    setUploading(false);
    toast({ title: `${files.length} file${files.length > 1 ? "s" : ""} uploaded` });
  }

  function handleDelete(id: string) {
    knowledgeStore.delete(selectedEntity, id);
    setItems(knowledgeStore.getAll(selectedEntity));
  }

  return (
    <div className="flex flex-col">
      <Header title="Knowledge" />
      <div className="flex-1 p-6 animate-fade-in space-y-6">
        {entities.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No entities yet</p>
            <p className="text-xs text-muted-foreground">Create an entity first, then upload knowledge to it.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> {uploading ? "Uploading..." : "Upload Files"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".txt,.md,.pdf,.docx,.csv"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Drag & drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .txt, .md, .pdf, .docx, .csv</p>
            </div>

            {items.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">File</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Size</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Uploaded</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
