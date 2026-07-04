import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Globe, ExternalLink } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { EntityActions } from "@/components/entities/entity-actions";

export const metadata = { title: "Entities" };

export default async function EntitiesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const entities = await prisma.entity.findMany({
    where: { clerkUserId: userId, isActive: true },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { contentItems: true } },
    },
  });

  return (
    <div className="flex flex-col">
      <Header title="Entities" />
      <div className="flex-1 p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {entities.length} {entities.length === 1 ? "entity" : "entities"}
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/entities/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Entity
            </Link>
          </Button>
        </div>

        {entities.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30">
              <Building2 className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">No entities yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                An entity is an individual or business that you create and manage content for.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/entities/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create your first entity
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Industry</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Content</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Updated</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((entity) => (
                  <tr key={entity.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                          {entity.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/entities/${entity.slug}`}
                            className="text-sm font-medium hover:underline truncate block"
                          >
                            {entity.name}
                          </Link>
                          {entity.website && (
                            <a
                              href={entity.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Globe className="h-3 w-3" />
                              <span className="truncate">{new URL(entity.website).hostname}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {entity.type === "INDIVIDUAL" ? "Individual" : "Business"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{entity.industry || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{entity._count.contentItems}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{formatRelativeDate(entity.updatedAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EntityActions entityId={entity.id} entitySlug={entity.slug} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
