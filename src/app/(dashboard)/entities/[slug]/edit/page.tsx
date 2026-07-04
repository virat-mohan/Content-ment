import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { EntityForm } from "@/components/entities/entity-form";
import { ChevronLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const entity = await prisma.entity.findUnique({ where: { slug }, select: { name: true } });
  return { title: `Edit ${entity?.name ?? "Entity"}` };
}

export default async function EditEntityPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const entity = await prisma.entity.findUnique({ where: { slug } });
  if (!entity || entity.userId !== session.user.id) notFound();

  return (
    <div className="flex flex-col">
      <Header title={`Edit ${entity.name}`} />
      <div className="flex-1 p-6 max-w-2xl animate-fade-in">
        <Link href={`/entities/${entity.slug}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 w-fit">
          <ChevronLeft className="h-3 w-3" /> Back to {entity.name}
        </Link>
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Edit Entity</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your entity details and configuration.</p>
        </div>
        <EntityForm entity={entity} />
      </div>
    </div>
  );
}
