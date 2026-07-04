import { Header } from "@/components/layout/header";
import { Image } from "lucide-react";

export const metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Assets" />
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <Image className="h-8 w-8 text-muted-foreground/40 mb-4" />
        <h3 className="text-sm font-semibold">Digital Asset Library</h3>
        <p className="text-xs text-muted-foreground mt-1">Coming in Phase 5</p>
      </div>
    </div>
  );
}
