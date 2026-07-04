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

export type ContentStatus = "draft" | "review" | "approved" | "published" | "archived";
export type ContentPlatform = "linkedin" | "twitter" | "instagram" | "blog" | "youtube" | "email" | "other";

export interface ContentItem {
  id: string;
  entityId: string;
  title: string;
  body: string;
  platform: ContentPlatform;
  status: ContentStatus;
  scheduledAt?: string;
  publishedAt?: string;
  tags: string[];
  notes?: string;
  importSource?: string;
  createdAt: string;
  updatedAt: string;
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
