"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { entityStore, type Entity } from "@/lib/store";
import { Header } from "@/components/layout/header";
import { EntityForm } from "@/components/entities/entity-form";
import { ChevronLeft } from "lucide-react";

export default function EditEntityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [entity, setEntity] = useState<Entity | undefined>();

  useEffect(() => {
    setEntity(entityStore.getBySlug(slug));
  }, [slug]);

  if (!entity) return null;

  return (
    <div className="flex flex-col">
      <Header title={`Edit ${entity.name}`} />
      <div className="flex-1 p-6 max-w-2xl animate-fade-in">
        <Link href={`/entities/${entity.slug}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 w-fit">
          <ChevronLeft className="h-3 w-3" /> Back to {entity.name}
        </Link>
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Edit Entity</h1>
          <p className="text-sm text-muted-foreground mt-1">Update entity details and configuration.</p>
        </div>
        <EntityForm entity={entity} />
      </div>
    </div>
  );
}
