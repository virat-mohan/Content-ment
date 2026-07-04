import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Plus, ArrowRight, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [entityCount, contentCount] = await Promise.all([
    prisma.entity.count({ where: { clerkUserId: userId, isActive: true } }),
    prisma.contentItem.count({
      where: { entity: { clerkUserId: userId } },
    }),
  ]);

  const recentEntities = await prisma.entity.findMany({
    where: { clerkUserId: userId, isActive: true },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, name: true, type: true, industry: true, slug: true },
  });

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />
      <div className="flex-1 p-6 space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entities</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{entityCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Active workspaces</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Content Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{contentCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all entities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">0</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Entities</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="/entities">
                  View all <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentEntities.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium">No entities yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create your first entity to get started</p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href="/entities/new">
                      <Plus className="mr-1 h-3 w-3" /> New Entity
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentEntities.map((entity) => (
                    <Link
                      key={entity.id}
                      href={`/entities/${entity.slug}`}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                        {entity.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entity.name}</p>
                        <p className="text-xs text-muted-foreground">{entity.type} · {entity.industry || "No industry"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link href="/entities/new">
                  <Plus className="mr-2 h-4 w-4" /> Create Entity
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link href="/content/new">
                  <FileText className="mr-2 h-4 w-4" /> New Content
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
