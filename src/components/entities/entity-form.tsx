"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { entitySchema, type EntityFormValues } from "@/lib/validations/entity";
import type { Entity } from "@prisma/client";

interface EntityFormProps {
  entity?: Entity;
}

export function EntityForm({ entity }: EntityFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EntityFormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: entity?.name ?? "",
      type: entity?.type ?? "INDIVIDUAL",
      description: entity?.description ?? "",
      website: entity?.website ?? "",
      industry: entity?.industry ?? "",
      linkedinHandle: entity?.linkedinHandle ?? "",
      xHandle: entity?.xHandle ?? "",
      instagramHandle: entity?.instagramHandle ?? "",
      mediumHandle: entity?.mediumHandle ?? "",
      redditHandle: entity?.redditHandle ?? "",
      quoraHandle: entity?.quoraHandle ?? "",
      youtubeHandle: entity?.youtubeHandle ?? "",
      preferredLLM: entity?.preferredLLM ?? undefined,
      llmModel: entity?.llmModel ?? "",
    },
  });

  const type = watch("type");

  async function onSubmit(data: EntityFormValues) {
    const url = entity ? `/api/entities/${entity.id}` : "/api/entities";
    const method = entity ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error || "Something went wrong", variant: "destructive" });
      return;
    }

    const result = await res.json();
    toast({ title: entity ? "Entity updated" : "Entity created" });
    router.push(`/entities/${result.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="Arihant Jain" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={(v) => setValue("type", v as "INDIVIDUAL" | "BUSINESS")}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Brief description..." rows={3} {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" placeholder="https://example.com" {...register("website")} />
            {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" placeholder="Technology, Marketing, Finance..." {...register("industry")} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Social Handles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: "linkedinHandle", label: "LinkedIn", placeholder: "arihant-jain-agentic" },
            { id: "xHandle", label: "X / Twitter", placeholder: "arihantism" },
            { id: "instagramHandle", label: "Instagram", placeholder: "arihantism" },
            { id: "mediumHandle", label: "Medium", placeholder: "axjain" },
            { id: "redditHandle", label: "Reddit", placeholder: "arihantismm" },
            { id: "quoraHandle", label: "Quora", placeholder: "Arihant-Jain-1" },
            { id: "youtubeHandle", label: "YouTube", placeholder: "@channel" },
          ].map(({ id, label, placeholder }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                placeholder={placeholder}
                {...register(id as keyof EntityFormValues)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">AI Configuration</h2>
        <p className="text-xs text-muted-foreground">
          Connect your own AI provider. Content-ment never uses its own tokens.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="preferredLLM">Preferred LLM</Label>
            <Select
              value={watch("preferredLLM") ?? ""}
              onValueChange={(v) => setValue("preferredLLM", v as EntityFormValues["preferredLLM"])}
            >
              <SelectTrigger id="preferredLLM">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
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
            <Label htmlFor="llmModel">Model</Label>
            <Input id="llmModel" placeholder="claude-opus-4-5, gpt-4o..." {...register("llmModel")} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="llmApiKey">API Key</Label>
            <Input
              id="llmApiKey"
              type="password"
              placeholder="sk-..."
              {...register("llmApiKey")}
            />
            <p className="text-xs text-muted-foreground">Stored securely. Never shared or logged.</p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : entity ? "Save changes" : "Create entity"}
        </Button>
      </div>
    </form>
  );
}
