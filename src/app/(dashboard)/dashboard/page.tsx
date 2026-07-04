"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { entityStore, type Entity } from "@/lib/store";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Plus, ArrowRight, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    setEntities(entityStore.getAll());
  }, []);

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
              <div className="text-2xl font-semibold">{entities.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active workspaces</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Content Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">0</div>
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
                <Link href="/entities">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {entities.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium">No entities yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create your first entity to get started</p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href="/entities/new"><Plus className="mr-1 h-3 w-3" /> New Entity</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {entities.slice(0, 3).map((entity) => (
                    <Link key={entity.id} href={`/entities/${entity.slug}`} className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors">
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
            <CardHeader><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link href="/entities/new"><Plus className="mr-2 h-4 w-4" /> Create Entity</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link href="/settings"><Settings className="mr-2 h-4 w-4" /> Configure AI</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Settings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
