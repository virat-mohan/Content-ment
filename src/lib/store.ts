// localStorage-based store for trial mode

export interface Entity {
  id: string;
  name: string;
  slug: string;
  type: "INDIVIDUAL" | "BUSINESS";
  description?: string;
  website?: string;
  industry?: string;
  linkedinHandle?: string;
  xHandle?: string;
  instagramHandle?: string;
  mediumHandle?: string;
  redditHandle?: string;
  quoraHandle?: string;
  youtubeHandle?: string;
  preferredLLM?: string;
  llmApiKey?: string;
  llmModel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AISettings {
  provider: string;
  apiKey: string;
  model: string;
}

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const entityStore = {
  getAll: (): Entity[] => get<Entity[]>("cm_entities", []),
  getBySlug: (slug: string): Entity | undefined =>
    entityStore.getAll().find((e) => e.slug === slug),
  save: (entity: Entity): void => {
    const all = entityStore.getAll().filter((e) => e.id !== entity.id);
    set("cm_entities", [...all, entity]);
  },
  delete: (id: string): void => {
    set("cm_entities", entityStore.getAll().filter((e) => e.id !== id));
  },
};

export const aiSettingsStore = {
  get: (): AISettings => get<AISettings>("cm_ai_settings", { provider: "CLAUDE", apiKey: "", model: "" }),
  save: (s: AISettings): void => set("cm_ai_settings", s),
};

export type ContentStatus =
  | "not_started"
  | "drafted"
  | "author_review"
  | "sent_for_approval"
  | "approved"
  | "published"
  | "archived";

export type ContentPlatform = "linkedin" | "twitter" | "instagram" | "blog" | "youtube" | "email" | "other";

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  not_started: "Not started",
  drafted: "Drafted",
  author_review: "Reviewed by author",
  sent_for_approval: "Sent for approval",
  approved: "Approved by owner",
  published: "Published",
  archived: "Archived",
};

export const PLATFORM_CODE: Record<ContentPlatform, string> = {
  linkedin: "LI", twitter: "TW", instagram: "IG",
  blog: "BL", youtube: "YT", email: "EM", other: "OT",
};

export interface ContentItem {
  id: string;
  contentId: string;    // human-readable e.g. AJ-001-LI
  entityId: string;
  pillar: string;       // content pillar / category
  hook: string;         // the hook / angle (short)
  title: string;        // working title (may equal hook)
  body: string;
  platform: ContentPlatform;
  status: ContentStatus;
  scheduledAt?: string;
  publishedAt?: string;
  tags: string[];
  notes?: string;
  importSource?: string;
  reviewToken?: string;
  reviewedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function generateContentId(entityName: string, platform: ContentPlatform, existing: ContentItem[]): string {
  const initials = entityName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const code = PLATFORM_CODE[platform];
  const prefix = `${initials}-`;
  const nums = existing
    .map((c) => {
      const m = c.contentId?.match(new RegExp(`^${prefix}(\\d+)-${code}$`));
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}-${code}`;
}

export const contentStore = {
  getAll: (entityId?: string): ContentItem[] => {
    const all = get<ContentItem[]>("cm_content", []);
    return entityId ? all.filter((c) => c.entityId === entityId) : all;
  },
  save: (item: ContentItem): void => {
    const all = get<ContentItem[]>("cm_content", []).filter((c) => c.id !== item.id);
    set("cm_content", [...all, item]);
  },
  saveMany: (items: ContentItem[]): void => {
    const existing = get<ContentItem[]>("cm_content", []);
    const ids = new Set(items.map((i) => i.id));
    set("cm_content", [...existing.filter((c) => !ids.has(c.id)), ...items]);
  },
  delete: (id: string): void => {
    set("cm_content", get<ContentItem[]>("cm_content", []).filter((c) => c.id !== id));
  },
};

export interface Campaign {
  id: string;
  entityId: string;
  name: string;
  description?: string;
  status: "planning" | "active" | "paused" | "completed";
  startDate?: string;
  endDate?: string;
  goal?: string;
  createdAt: string;
  updatedAt: string;
}

export const campaignStore = {
  getAll: (entityId?: string): Campaign[] => {
    const all = get<Campaign[]>("cm_campaigns", []);
    return entityId ? all.filter((c) => c.entityId === entityId) : all;
  },
  save: (item: Campaign): void => {
    const all = get<Campaign[]>("cm_campaigns", []).filter((c) => c.id !== item.id);
    set("cm_campaigns", [...all, item]);
  },
  delete: (id: string): void => {
    set("cm_campaigns", get<Campaign[]>("cm_campaigns", []).filter((c) => c.id !== id));
  },
};

export interface Prompt {
  id: string;
  title: string;
  body: string;
  category: string;
  platform: ContentPlatform | "general";
  createdAt: string;
}

export const promptStore = {
  getAll: (): Prompt[] => get<Prompt[]>("cm_prompts", DEFAULT_PROMPTS),
  save: (item: Prompt): void => {
    const all = get<Prompt[]>("cm_prompts", DEFAULT_PROMPTS).filter((p) => p.id !== item.id);
    set("cm_prompts", [...all, item]);
  },
  delete: (id: string): void => {
    set("cm_prompts", get<Prompt[]>("cm_prompts", DEFAULT_PROMPTS).filter((p) => p.id !== id));
  },
};

const DEFAULT_PROMPTS: Prompt[] = [
  { id: "p1", title: "LinkedIn thought leadership", category: "Thought Leadership", platform: "linkedin", body: "Write a LinkedIn post establishing {{entity}} as a thought leader in {{topic}}. Share a contrarian insight, back it with a short story or data point, and end with a question that invites comments. Tone: confident, clear, no jargon.", createdAt: "2024-01-01T00:00:00Z" },
  { id: "p2", title: "Twitter thread hook", category: "Engagement", platform: "twitter", body: "Write a 5-tweet thread for {{entity}} about {{topic}}. Tweet 1 must be a bold, scroll-stopping hook. Tweets 2–4 deliver the value. Tweet 5 is a CTA. Each tweet under 260 chars.", createdAt: "2024-01-01T00:00:00Z" },
  { id: "p3", title: "Blog intro paragraph", category: "Long-form", platform: "blog", body: "Write the opening paragraph of a blog post for {{entity}} on the topic '{{topic}}'. Hook the reader with a surprising fact or question, set up the problem, and promise a specific takeaway. 80–120 words.", createdAt: "2024-01-01T00:00:00Z" },
  { id: "p4", title: "Instagram caption with CTA", category: "Social", platform: "instagram", body: "Write an Instagram caption for {{entity}} for a post about {{topic}}. Start with an attention-grabbing first line (no emoji to start). Keep it under 150 words. Include 1 CTA and 5 relevant hashtags at the end.", createdAt: "2024-01-01T00:00:00Z" },
  { id: "p5", title: "Email subject lines (A/B)", category: "Email", platform: "email", body: "Generate 5 email subject line variants for {{entity}} promoting {{topic}}. Mix curiosity, benefit, and urgency styles. Keep each under 50 characters. Output as a numbered list.", createdAt: "2024-01-01T00:00:00Z" },
  { id: "p6", title: "Repurpose long-form to shorts", category: "Repurposing", platform: "general", body: "Given this long-form content from {{entity}}: ---\n{{content}}\n---\nRepurpose it into: 1 LinkedIn post, 1 tweet, and 1 Instagram caption. Keep the core insight but adapt tone and length for each platform.", createdAt: "2024-01-01T00:00:00Z" },
];

export const knowledgeStore = {
  getAll: (entityId: string) => get<{ id: string; title: string; content: string; type: string; createdAt: string }[]>(`cm_knowledge_${entityId}`, []),
  save: (entityId: string, item: { id: string; title: string; content: string; type: string; createdAt: string }) => {
    const all = knowledgeStore.getAll(entityId).filter((k) => k.id !== item.id);
    set(`cm_knowledge_${entityId}`, [...all, item]);
  },
  delete: (entityId: string, id: string) => {
    set(`cm_knowledge_${entityId}`, knowledgeStore.getAll(entityId).filter((k) => k.id !== id));
  },
};
