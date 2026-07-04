import { z } from "zod";

export const entitySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["INDIVIDUAL", "BUSINESS"]),
  description: z.string().max(500).optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
  linkedinHandle: z.string().max(100).optional().or(z.literal("")),
  xHandle: z.string().max(100).optional().or(z.literal("")),
  instagramHandle: z.string().max(100).optional().or(z.literal("")),
  mediumHandle: z.string().max(100).optional().or(z.literal("")),
  redditHandle: z.string().max(100).optional().or(z.literal("")),
  quoraHandle: z.string().max(100).optional().or(z.literal("")),
  youtubeHandle: z.string().max(100).optional().or(z.literal("")),
  preferredLLM: z
    .enum(["CLAUDE", "OPENAI", "GEMINI", "OPENROUTER", "DEEPSEEK", "GROK", "MISTRAL"])
    .optional(),
  llmApiKey: z.string().optional().or(z.literal("")),
  llmModel: z.string().optional().or(z.literal("")),
});

export type EntityFormValues = z.infer<typeof entitySchema>;
