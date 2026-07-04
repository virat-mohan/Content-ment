import { Header } from "@/components/layout/header";
import { Settings } from "lucide-react";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Settings" />
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <Settings className="h-8 w-8 text-muted-foreground/40 mb-4" />
        <h3 className="text-sm font-semibold">Settings</h3>
        <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
      </div>
    </div>
  );
}
