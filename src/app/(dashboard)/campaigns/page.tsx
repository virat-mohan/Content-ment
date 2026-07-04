import { Header } from "@/components/layout/header";
import { Folder } from "lucide-react";

export const metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Campaigns" />
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <Folder className="h-8 w-8 text-muted-foreground/40 mb-4" />
        <h3 className="text-sm font-semibold">Campaigns</h3>
        <p className="text-xs text-muted-foreground mt-1">Coming in Phase 3</p>
      </div>
    </div>
  );
}
