import type { ContentPlatform, ContentItem, Entity } from "./store";

// ─── Platform specifications ──────────────────────────────────────────────────

export interface PlatformSpec {
  label: string;
  minChars: number;
  idealMin: number;
  idealMax: number;
  maxChars: number;
  formatGuide: string;
  outputInstructions: string;
}

export const PLATFORM_SPECS: Record<ContentPlatform, PlatformSpec> = {
  linkedin: {
    label: "LinkedIn",
    minChars: 300,
    idealMin: 1200,
    idealMax: 1800,
    maxChars: 3000,
    formatGuide: "1,200–1,800 characters",
    outputInstructions: `
FORMAT RULES — follow exactly:
- Line 1: The hook statement (this is shown in the feed before "see more" — make it impossible to scroll past)
- Blank line
- Body: 4–6 short paragraphs, 1–3 sentences each. Hard returns between paragraphs. No bullet points unless listing 3+ items.
- Blank line before the closing
- Closing: A single genuine question to invite comments OR a provocative statement. No "drop a comment below" clichés.
- Blank line
- 0–3 hashtags at the very end, only if genuinely relevant. No hashtag spam.

TONE: First-person, confident, no corporate jargon. Never "thrilled to announce", "excited to share", or "I am humbled". Write like a smart professional talking to a peer, not a press release.

TARGET: 1,200–1,800 characters (hard limit before feed truncation is ~3,000 but 1,200–1,800 drives the most engagement).`,
  },

  twitter: {
    label: "Twitter / X",
    minChars: 200,
    idealMin: 700,
    idealMax: 1400,
    maxChars: 1960, // 7 tweets × 280
    formatGuide: "5–7 tweets as a thread",
    outputInstructions: `
FORMAT RULES — follow exactly:
- Write a thread of 5–7 tweets
- Separate each tweet with a blank line
- Number each tweet: start with "1/" then "2/" etc.
- Tweet 1 (hook): Bold, scroll-stopping claim or question. Under 240 characters. Must work standalone — people RT and quote the first tweet.
- Tweets 2–5: One insight or proof point per tweet. Each under 280 characters. Short sentences. No padding.
- Tweet 6 (optional): The "so what" — why this matters
- Last tweet: CTA, summary, or "What's your take?" question. No generic "follow me for more" closings.
- 0–1 hashtags in the entire thread (place in last tweet only if absolutely on-topic)

TONE: Punchy, direct, no filler words. Each tweet must be worth reading standalone.`,
  },

  instagram: {
    label: "Instagram",
    minChars: 200,
    idealMin: 600,
    idealMax: 1200,
    maxChars: 2200,
    formatGuide: "600–1,200 characters",
    outputInstructions: `
FORMAT RULES — follow exactly:
- Line 1: The hook (shown in feed before "more" — 125 characters max). Must compel the tap.
- Blank line
- Body: Conversational, 3–5 short paragraphs. Warm, personal tone. Can use line breaks generously.
- CTA: One clear action — "Save this", "Share with someone who needs it", "Comment your answer below"
- Blank line
- Hashtags: 8–12 hashtags at the end, mix of niche (under 500k posts) and broad. One per line or space-separated.

TONE: Warm, relatable, human. Write like you're sharing with a friend, not broadcasting to an audience. Emojis are okay sparingly (1–3 max).

TARGET: 600–1,200 characters for the body (before hashtags). Total including hashtags under 2,200.`,
  },

  blog: {
    label: "Blog",
    minChars: 2000,
    idealMin: 4000,
    idealMax: 8000,
    maxChars: 15000,
    formatGuide: "800–2,000 words",
    outputInstructions: `
FORMAT RULES — follow exactly. Use Markdown:
- ## Title (H2 — compelling, SEO-friendly, includes core topic naturally)
- Intro paragraph (100–150 words): Open with the hook/problem. Promise a specific takeaway. No "In this article, I will..." openers.
- 3–5 ## Section headings (H2). Each section: 150–300 words. First sentence of each section states the point directly.
- Use **bold** for key terms or insights. Use bullet lists only when you have 3+ parallel items.
- Conclusion (75–100 words): Reinforce the core insight. End with one clear CTA.

TONE: Authoritative but readable. No academic jargon. Short sentences for key points, longer for context. Aim for Flesch reading ease 60+.

SEO: Include the core topic phrase naturally in the intro, at least one H2, and conclusion.

TARGET: 800–2,000 words (approximately 4,000–10,000 characters).`,
  },

  youtube: {
    label: "YouTube",
    minChars: 500,
    idealMin: 1500,
    idealMax: 4000,
    maxChars: 5000,
    formatGuide: "Video description + script outline",
    outputInstructions: `
Write BOTH a video description and a script outline:

─── VIDEO DESCRIPTION ───
- Line 1–2: Hook + core topic (shown before "Show more"). Include main keyword.
- 3–4 sentences summarising what viewers will learn
- Timestamps (use placeholder times): 0:00 Intro, 1:30 [Section 1], etc.
- Links section: [Link 1], [Link 2] placeholders
- Subscribe CTA + social handles placeholder
- 3–5 relevant hashtags at very end
Under 500 words total.

─── SCRIPT OUTLINE ───
[HOOK — 0:00–0:15] What you say in the first 15 seconds to stop the click-away
[INTRO — 0:15–1:00] Quick intro, what they'll get, why to stay
[SECTION 1 — title] Key points (bullet)
[SECTION 2 — title] Key points
... (3–5 sections)
[CTA — near end] The primary ask (subscribe, comment, download)
[OUTRO] Sign-off

TONE: Conversational and energetic. Write as spoken, not read. Short sentences. Vary pace.`,
  },

  email: {
    label: "Email",
    minChars: 300,
    idealMin: 800,
    idealMax: 1500,
    maxChars: 2500,
    formatGuide: "Subject + 300–500 word email",
    outputInstructions: `
FORMAT RULES — follow exactly:

SUBJECT LINE: [Write 2 subject line options]
Option A: (curiosity/benefit angle, under 50 chars)
Option B: (urgency/direct angle, under 50 chars)

PREVIEW TEXT: (85–100 chars, supplements the subject — what shows in inbox preview)

---

[EMAIL BODY]
Greeting: First name personalisation placeholder e.g. "Hi {{first_name}},"
Opening line: 1 sentence that earns the next sentence. Not "Hope you're well."
Body: 2–3 short paragraphs. One idea per paragraph. 2–4 sentences each.
CTA: One clear, specific ask. Bold the CTA link text or write it as [CTA: action → url-placeholder].
Sign-off: Warm, human. Name + title.

TONE: Direct, personal, one human to another. No newsletter-speak ("In today's issue…"). Mobile-first — assume they're reading on a phone.

TARGET: 300–500 words for the body. Total under 600 words.`,
  },

  other: {
    label: "Other",
    minChars: 100,
    idealMin: 300,
    idealMax: 1000,
    maxChars: 3000,
    formatGuide: "300–1,000 characters",
    outputInstructions: `
Write clear, purposeful content for the platform. Adapt length and tone to the context provided. If no specific platform context is given, aim for 300–800 characters, use plain paragraphs, and close with a clear point or CTA.`,
  },
};

// ─── Char count status ────────────────────────────────────────────────────────

export type CharStatus = "empty" | "short" | "ideal" | "long" | "over";

export function getCharStatus(platform: ContentPlatform, charCount: number): CharStatus {
  if (charCount === 0) return "empty";
  const spec = PLATFORM_SPECS[platform];
  if (charCount < spec.minChars) return "short";
  if (charCount <= spec.idealMax) return "ideal";
  if (charCount <= spec.maxChars) return "long";
  return "over";
}

export const CHAR_STATUS_STYLES: Record<CharStatus, { bar: string; text: string; label: string }> = {
  empty: { bar: "bg-muted", text: "text-muted-foreground", label: "" },
  short:  { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", label: "Too short" },
  ideal:  { bar: "bg-green-500", text: "text-green-600 dark:text-green-400", label: "Ideal length" },
  long:   { bar: "bg-blue-400",  text: "text-blue-600 dark:text-blue-400",   label: "A bit long" },
  over:   { bar: "bg-red-500",   text: "text-red-600 dark:text-red-400",     label: "Over limit" },
};

// ─── Prompt builders ──────────────────────────────────────────────────────────

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  type: string;
}

export function buildSystemPrompt(entity: Entity, knowledgeDocs: KnowledgeDoc[]): string {
  const brandDocs = knowledgeDocs.filter(d =>
    /brand|voice|tone|style|guideline|persona|about/i.test(d.type + " " + d.title)
  );
  const otherDocs = knowledgeDocs.filter(d => !brandDocs.includes(d));

  const lines: string[] = [
    `You are a senior content strategist and ghostwriter working exclusively for ${entity.name}.`,
    entity.type === "INDIVIDUAL"
      ? `${entity.name} is an individual creator/professional.`
      : `${entity.name} is a ${entity.type.toLowerCase()} brand.`,
    entity.industry ? `Industry: ${entity.industry}.` : "",
    entity.description ? `\nAbout ${entity.name}: ${entity.description}` : "",
    entity.website ? `Website: ${entity.website}` : "",
  ].filter(Boolean);

  if (brandDocs.length) {
    lines.push("\n## Brand Voice & Guidelines");
    brandDocs.forEach(d => lines.push(`### ${d.title}\n${d.content}`));
  }

  if (otherDocs.length) {
    lines.push("\n## Additional Context");
    otherDocs.forEach(d => lines.push(`### ${d.title}\n${d.content}`));
  }

  lines.push(
    "\n## Your role",
    "You write content that sounds exactly like this person/brand — not generic AI content.",
    "You deeply understand their audience, their voice, and their goals.",
    "Every piece you write serves a strategic purpose tied to their content pillars.",
    "Output ONLY the content. No meta-commentary, no 'Here is your post:', no preamble, no closing notes."
  );

  return lines.filter(Boolean).join("\n");
}

export function buildDraftPrompt(item: Partial<ContentItem>, platform: ContentPlatform): string {
  const spec = PLATFORM_SPECS[platform];

  const lines: string[] = [
    `## Content brief`,
    `Platform: ${spec.label} (${spec.formatGuide})`,
    item.pillar ? `Content pillar: ${item.pillar}` : "",
    `Hook / angle: ${item.hook || item.title || "(not specified)"}`,
    item.title && item.title !== item.hook ? `Working title: ${item.title}` : "",
    (item.tags ?? []).length ? `Topics / tags: ${(item.tags ?? []).join(", ")}` : "",
    item.notes ? `Notes from author: ${item.notes}` : "",
    item.body?.trim() ? `\nExisting draft to refine:\n---\n${item.body}\n---\nImprove and expand this draft using the platform rules below.` : "",
    "\n## Platform instructions",
    spec.outputInstructions,
  ];

  return lines.filter(Boolean).join("\n");
}
