"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSettingsStore, type AISettings } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Zap, CheckCircle } from "lucide-react";

const PROVIDER_MODELS: Record<string, string[]> = {
  CLAUDE: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
  OPENAI: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  GEMINI: ["gemini-1.5-pro", "gemini-1.5-flash"],
  OPENROUTER: ["anthropic/claude-opus-4-5", "openai/gpt-4o", "google/gemini-pro"],
  DEEPSEEK: ["deepseek-chat"],
  GROK: ["grok-beta"],
  MISTRAL: ["mistral-large-latest"],
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<AISettings>({
    defaultValues: { provider: "CLAUDE", apiKey: "", model: "" },
  });

  const provider = watch("provider");

  useEffect(() => {
    const s = aiSettingsStore.get();
    setValue("provider", s.provider || "CLAUDE");
    setValue("apiKey", s.apiKey || "");
    setValue("model", s.model || "");
  }, [setValue]);

  function onSubmit(data: AISettings) {
    aiSettingsStore.save(data);
    setSaved(true);
    toast({ title: "AI settings saved" });
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col">
      <Header title="Settings" />
      <div className="flex-1 p-6 max-w-xl animate-fade-in space-y-6">

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" /> Global AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              This is the default AI used across the app. Each entity can override it with its own key.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={(v) => { setValue("provider", v); setValue("model", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLAUDE">Claude (Anthropic)</SelectItem>
                    <SelectItem value="OPENAI">OpenAI</SelectItem>
                    <SelectItem value="GEMINI">Gemini (Google)</SelectItem>
                    <SelectItem value="OPENROUTER">OpenRouter</SelectItem>
                    <SelectItem value="DEEPSEEK">DeepSeek</SelectItem>
                    <SelectItem value="GROK">Grok (xAI)</SelectItem>
                    <SelectItem value="MISTRAL">Mistral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select value={watch("model")} onValueChange={(v) => setValue("model", v)}>
                  <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>
                    {(PROVIDER_MODELS[provider] ?? []).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>API Key</Label>
                <Input type="password" placeholder="sk-..." {...register("apiKey")} />
                <p className="text-xs text-muted-foreground">Stored in your browser only. Never sent to our servers.</p>
              </div>

              <Button type="submit" size="sm" className="flex items-center gap-2">
                {saved ? <><CheckCircle className="h-3.5 w-3.5" /> Saved</> : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Trial Mode</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>All data is stored in your browser&apos;s localStorage — no database, no account required.</p>
            <p>When you&apos;re ready to go production, connect a real database and auth will be restored.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
