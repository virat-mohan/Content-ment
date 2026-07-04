"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { entityStore, type Entity } from "@/lib/store";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Pencil, Globe, FileText, ExternalLink, ChevronLeft, Zap } from "lucide-react";

export default function EntityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const e = entityStore.getBySlug(slug);
    setEntity(e ?? null);
    setLoading(false);
  }, [slug]);

  if (loading) return null;
  if (!entity) return notFound();

  const socialHandles = [
    { label: "LinkedIn", handle: entity.linkedinHandle, url: `https://linkedin.com/in/${entity.linkedinHandle}` },
    { label: "X", handle: entity.xHandle, url: `https://x.com/${entity.xHandle}` },
    { label: "Instagram", handle: entity.instagramHandle, url: `https://instagram.com/${entity.instagramHandle}` },
    { label: "Medium", handle: entity.mediumHandle, url: `https://medium.com/@${entity.mediumHandle}` },
    { label: "Reddit", handle: entity.redditHandle, url: `https://reddit.com/u/${entity.redditHandle}` },
    { label: "Quora", handle: entity.quoraHandle, url: `https://quora.com/profile/${entity.quoraHandle}` },
  ].filter((s) => s.handle);

  return (
    <div className="flex flex-col">
      <Header title={entity.name} />
      <div className="flex-1 p-6 animate-fade-in">
        <Link href="/entities" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 w-fit">
          <ChevronLeft className="h-3 w-3" /> Entities
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-lg font-bold">
              {entity.name[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{entity.name}</h1>
                <Badge variant="secondary" className="text-xs">{entity.type === "INDIVIDUAL" ? "Individual" : "Business"}</Badge>
              </div>
              {entity.description && <p className="text-sm text-muted-foreground mt-0.5">{entity.description}</p>}
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/entities/${entity.slug}/edit`}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {entity.website && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Website</span>
                  <a href={entity.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs hover:underline">
                    <Globe className="h-3 w-3" />{new URL(entity.website).hostname}<ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              )}
              {entity.industry && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Industry</span>
                  <span className="text-xs">{entity.industry}</span>
                </div>
              )}
              {entity.preferredLLM && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">AI Provider</span>
                    <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-muted-foreground" /><span className="text-xs">{entity.preferredLLM}</span></div>
                  </div>
                  {entity.llmModel && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Model</span>
                      <span className="text-xs font-mono">{entity.llmModel}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">API Key</span>
                    <span className="text-xs font-mono text-muted-foreground">{entity.llmApiKey ? "••••••••" : "Not set"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {socialHandles.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Social Profiles</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {socialHandles.map(({ label, handle, url }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs hover:underline">
                      @{handle}<ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">AI Assistant</CardTitle></CardHeader>
            <CardContent>
              <Link href={`/entities/${entity.slug}/ai`}>
                <Button variant="outline" size="sm">
                  <Zap className="mr-1.5 h-3.5 w-3.5" /> Open AI Chat
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
