import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { provider, apiKey, model, messages, systemPrompt } = await request.json();

  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 400 });
  if (!messages?.length) return NextResponse.json({ error: "Messages required" }, { status: 400 });

  try {
    let text = "";

    if (provider === "CLAUDE") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model || "claude-opus-4-5",
          max_tokens: 4096,
          system: systemPrompt || "You are a helpful content creation assistant.",
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Claude API error");
      text = data.content[0].text;

    } else if (provider === "OPENAI") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "gpt-4o",
          messages: systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "OpenAI API error");
      text = data.choices[0].message.content;

    } else if (provider === "OPENROUTER") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "anthropic/claude-opus-4-5",
          messages: systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "OpenRouter API error");
      text = data.choices[0].message.content;

    } else if (provider === "GEMINI") {
      const modelId = model || "gemini-1.5-pro";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages.map((m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gemini API error");
      text = data.candidates[0].content.parts[0].text;

    } else {
      return NextResponse.json({ error: `Provider ${provider} not yet supported` }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
