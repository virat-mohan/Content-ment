import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { EntityForm } from "@/components/entities/entity-form";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "New Entity" };

export default async function NewEntityPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex flex-col">
      <Header title="New Entity" />
      <div className="flex-1 p-6 max-w-2xl animate-fade-in">
        <Link
          href="/entities"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 w-fit"
        >
          <ChevronLeft className="h-3 w-3" /> Back to Entities
        </Link>
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Create Entity</h1>
          <p className="text-sm text-muted-foreground mt-1">
            An entity is a person or business that you create and manage content for.
          </p>
        </div>
        <EntityForm />
      </div>
    </div>
  );
}
