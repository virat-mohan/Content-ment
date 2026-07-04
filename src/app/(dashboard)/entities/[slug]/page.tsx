import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  BookOpen,
  FileText,
  ExternalLink,
  ChevronLeft,
  Zap,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const entity = await prisma.entity.findUnique({ where: { slug }, select: { name: true } });
  return { title: entity?.name ?? "Entity" };
}

export default async function EntityPage({ params }: PageProps) {
  const { slug } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const entity = await prisma.entity.findUnique({
    where: { slug },
    include: {
      brandDNA: true,
      _count: {
        select: {
          contentItems: true,
          knowledgeItems: true,
          assets: true,
        },
      },
    },
  });

  if (!entity || entity.clerkUserId !== userId) notFound();

  const socialHandles = [
    { label: "LinkedIn", handle: entity.linkedinHandle, icon: Linkedin, url: `https://linkedin.com/in/${entity.linkedinHandle}` },
    { label: "X", handle: entity.xHandle, icon: Twitter, url: `https://x.com/${entity.xHandle}` },
    { label: "Instagram", handle: entity.instagramHandle, icon: Instagram, url: `https://instagram.com/${entity.instagramHandle}` },
    { label: "Medium", handle: entity.mediumHandle, icon: BookOpen, url: `https://medium.com/@${entity.mediumHandle}` },
  ].filter((s) => s.handle);

  return (
    <div className="flex flex-col">
      <Header title={entity.name} />
      <div className="flex-1 p-6 animate-fade-in">
        <Link
          href="/entities"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 w-fit"
        >
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
                <Badge variant="secondary" className="text-xs">
                  {entity.type === "INDIVIDUAL" ? "Individual" : "Business"}
                </Badge>
              </div>
              {entity.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{entity.description}</p>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/entities/${entity.slug}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-semibold">{entity._count.contentItems}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Content Items
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-semibold">{entity._count.knowledgeItems}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Knowledge Items
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-semibold">{entity._count.assets}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Assets
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {entity.website && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Website</span>
                  <a
                    href={entity.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    {new URL(entity.website).hostname}
                    <ExternalLink className="h-2.5 w-2.5" />
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
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{entity.preferredLLM}</span>
                    </div>
                  </div>
                  {entity.llmModel && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Model</span>
                      <span className="text-xs font-mono">{entity.llmModel}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {socialHandles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Social Profiles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {socialHandles.map(({ label, handle, icon: Icon, url }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs hover:underline"
                    >
                      @{handle}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
