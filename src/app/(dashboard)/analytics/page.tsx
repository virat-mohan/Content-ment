import { Header } from "@/components/layout/header";
import { BarChart2 } from "lucide-react";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Analytics" />
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <BarChart2 className="h-8 w-8 text-muted-foreground/40 mb-4" />
        <h3 className="text-sm font-semibold">Analytics</h3>
        <p className="text-xs text-muted-foreground mt-1">Coming in Phase 8</p>
      </div>
    </div>
  );
}
