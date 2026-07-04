import { Header } from "@/components/layout/header";
import { Zap } from "lucide-react";

export const metadata = { title: "Prompts" };

export default function PromptsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Prompts" />
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <Zap className="h-8 w-8 text-muted-foreground/40 mb-4" />
        <h3 className="text-sm font-semibold">Prompt Library</h3>
        <p className="text-xs text-muted-foreground mt-1">Coming in Phase 4</p>
      </div>
    </div>
  );
}
