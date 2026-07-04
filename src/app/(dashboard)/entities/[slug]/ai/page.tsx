"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { entityStore, aiSettingsStore, type Entity } from "@/lib/store";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Send, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function EntityAIPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [entity, setEntity] = useState<Entity | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEntity(entityStore.getBySlug(slug) ?? null);
  }, [slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;

    const global = aiSettingsStore.get();
    const provider = entity?.preferredLLM || global.provider;
    const apiKey = entity?.llmApiKey || global.apiKey;
    const model = entity?.llmModel || global.model;

    if (!apiKey) {
      setError("No API key found. Add one in entity settings or in Settings → AI.");
      return;
    }

    setError("");
    const userMsg: Message = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          model,
          messages: next,
          systemPrompt: entity
            ? `You are a content creation assistant for ${entity.name}. ${entity.description ? `About them: ${entity.description}` : ""} ${entity.industry ? `Industry: ${entity.industry}` : ""}`
            : "You are a helpful content creation assistant.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title={entity ? `AI · ${entity.name}` : "AI Chat"} />
      <div className="flex flex-col flex-1 max-w-3xl w-full mx-auto px-4 overflow-hidden">
        <div className="py-3">
          <Link href={`/entities/${slug}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit">
            <ChevronLeft className="h-3 w-3" /> Back to {entity?.name ?? "Entity"}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-20">
              <p className="text-sm font-medium">AI Assistant</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Ask me to write content, brainstorm ideas, draft LinkedIn posts, write blogs, or anything else for {entity?.name ?? "your entity"}.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t py-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Write a LinkedIn post about..."
              className="min-h-[44px] max-h-32 resize-none text-sm"
              rows={1}
            />
            <Button size="icon" onClick={send} disabled={loading || !input.trim()} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
