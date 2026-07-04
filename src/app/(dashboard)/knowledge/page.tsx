import { Header } from "@/components/layout/header";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Knowledge" };

export default function KnowledgePage() {
  return (
    <div className="flex flex-col">
      <Header title="Knowledge" />
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-4" />
        <h3 className="text-sm font-semibold">Knowledge Base</h3>
        <p className="text-xs text-muted-foreground mt-1">Coming in Phase 2</p>
      </div>
    </div>
  );
}
