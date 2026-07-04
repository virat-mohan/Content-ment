import { Header } from "@/components/layout/header";
import { Inbox } from "lucide-react";

export const metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <div className="flex flex-col">
      <Header title="Inbox" />
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground/40 mb-4" />
        <h3 className="text-sm font-semibold">Engagement Inbox</h3>
        <p className="text-xs text-muted-foreground mt-1">Coming in Phase 7</p>
      </div>
    </div>
  );
}
