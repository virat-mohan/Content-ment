"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  published: "background:rgba(34,197,94,.1);color:#15803d",
  review: "background:rgba(245,166,35,.1);color:#b07a10",
  approved: "background:rgba(59,130,246,.1);color:#1d4ed8",
  draft: "background:rgba(156,163,175,.1);color:#6b7280",
};

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.045)";
      ctx.lineWidth = 1;
      const colW = Math.floor(W / 7);
      for (let x = 0; x <= W; x += colW) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
    };
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement!);
    draw();
    return () => ro.disconnect();
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const d = theme === "dark";

  const vars = {
    bg:      d ? "#0C0C0C" : "#F8F8F7",
    bg2:     d ? "#141414" : "#F1F1EF",
    surface: d ? "#181818" : "#FFFFFF",
    border:  d ? "#242422" : "#E3E3E1",
    border2: d ? "#303030" : "#CDCDCB",
    text:    d ? "#F2F2F0" : "#111111",
    text2:   d ? "#9A9A96" : "#5A5A58",
    text3:   d ? "#5A5A58" : "#9A9A98",
    silver:  d ? "#6A6C72" : "#B6B8BD",
    accent:  d ? "#F2F2F0" : "#111111",
    accentFg:d ? "#111111" : "#FFFFFF",
  };

  const v = (k: keyof typeof vars) => vars[k];

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", background: v("bg"), color: v("text"), minHeight: "100vh", WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        a{color:inherit;text-decoration:none}
        .reveal{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease}
        .reveal.in{opacity:1;transform:none}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none}}
      `}</style>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, background: `${v("bg")}dd`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${v("border")}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="7" fill={v("text")} />
            <path d="M20 10C18.4 9 16.6 8.5 15 8.5C10.9 8.5 8 11.3 8 15C8 18.7 10.9 21.5 15 21.5C16.6 21.5 18.4 21 20 20" stroke={v("accentFg")} strokeWidth="2" strokeLinecap="round" />
            <circle cx="21.5" cy="15" r="1.8" fill={v("silver")} />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.3px" }}>Content<span style={{ color: v("text3"), fontWeight: 400 }}>·ment</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${v("border")}`, background: v("bg2"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: v("text2") }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
          </button>
          <Link href="/app" style={{ fontSize: 13, fontWeight: 500, background: v("accent"), color: v("accentFg"), padding: "7px 16px", borderRadius: 6, border: `1px solid ${v("accent")}` }}>
            Open app →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", padding: "96px 32px 72px", textAlign: "center" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", width: "100%", height: "100%" }} />

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, letterSpacing: ".08em", color: v("text3"), background: v("surface"), border: `1px solid ${v("border")}`, padding: "5px 12px", borderRadius: 20, marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: v("silver"), display: "inline-block", animation: "pulse 2.5s ease-in-out infinite" }} />
          Trial mode · No account required
        </div>

        <h1 style={{ fontSize: "clamp(40px,6vw,68px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1.06, maxWidth: 780, margin: "0 auto 24px" }}>
          The content OS for<br /><span style={{ color: v("text3") }}>serious creators.</span>
        </h1>

        <p style={{ fontSize: 17, color: v("text2"), lineHeight: 1.65, maxWidth: 480, margin: "0 auto 44px" }}>
          Manage every entity, piece of content, and AI workflow from a single, calm interface.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/app" style={{ fontSize: 14, fontWeight: 500, background: v("accent"), color: v("accentFg"), padding: "10px 22px", borderRadius: 6, border: `1px solid ${v("accent")}` }}>Open app</Link>
          <a href="#features" style={{ fontSize: 14, color: v("text2"), padding: "10px 22px", borderRadius: 6, border: `1px solid ${v("border")}` }}>See features</a>
        </div>

        {/* Mini product UI */}
        <div className="reveal" style={{ maxWidth: 820, margin: "64px auto 0", background: v("surface"), border: `1px solid ${v("border")}`, borderRadius: 14, overflow: "hidden", boxShadow: d ? "0 2px 8px rgba(0,0,0,.4),0 12px 40px rgba(0,0,0,.3)" : "0 2px 8px rgba(0,0,0,.08),0 12px 40px rgba(0,0,0,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${v("border")}`, background: v("bg2") }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
            <span style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, color: v("text3"), marginLeft: 8 }}>content-ment — Content</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${v("border")}`, background: v("bg2") }}>
                {["TITLE", "ENTITY", "PLATFORM", "STATUS"].map(h => (
                  <th key={h} style={{ padding: "7px 16px", textAlign: "left", fontSize: 10, fontWeight: 500, color: v("text3"), letterSpacing: ".06em", fontFamily: "'SF Mono','Fira Code',monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["How we grew 0→10k followers in 90 days", "Acme Corp", "LinkedIn", "published"],
                ["The future of async work — thread", "Personal", "Twitter", "review"],
                ["Q2 Product launch announcement", "Acme Corp", "Blog", "approved"],
                ["Instagram caption series — Week 14", "Side project", "Instagram", "draft"],
              ].map(([title, entity, platform, status]) => (
                <tr key={title} style={{ borderBottom: `1px solid ${v("border")}` }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: v("text"), maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: v("text2") }}>{entity}</td>
                  <td style={{ padding: "10px 16px" }}><span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, background: v("bg2"), border: `1px solid ${v("border")}`, color: v("text2") }}>{platform}</span></td>
                  <td style={{ padding: "10px 16px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "2px 8px", borderRadius: 20, ...Object.fromEntries((STATUS_STYLES[status] || "").split(";").filter(Boolean).map(s => s.split(":").map(x => x.trim()))) as object }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />{status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr style={{ border: "none", borderTop: `1px solid ${v("border")}`, margin: "0 32px" }} />

      {/* Features intro */}
      <section id="features" style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 32px 0" }}>
        <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, letterSpacing: ".1em", color: v("text3"), textTransform: "uppercase", marginBottom: 16 }}>Features</div>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.15, marginBottom: 16 }}>Everything a content operation needs</h2>
        <p style={{ fontSize: 16, color: v("text2"), lineHeight: 1.7, maxWidth: 520 }}>Built module by module, each piece designed to work cleanly with the next. Stored entirely in your browser — zero config, zero servers.</p>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 72px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            { tag: "Entities", h: "One workspace per voice", p: "Create separate entities for every brand, client, or persona. Each gets its own AI config, knowledge base, and content silo." },
            { tag: "Content Table", h: "Editorial-grade tracking", p: "Track every piece across platform, status, and schedule. Draft → Review → Approved → Published in one clean table." },
            { tag: "Calendar", h: "See your pipeline", p: "Monthly grid view. Every scheduled piece lands on its date. Click any day to see what's due." },
            { tag: "Campaigns", h: "Group by goal", p: "Tie content to campaigns with timelines and objectives. Track from planning to completion." },
            { tag: "Analytics", h: "Content by the numbers", p: "KPIs and bar charts by platform, status, and entity. No external tracking. Everything from localStorage." },
            { tag: "Prompt Library", h: "Reusable AI recipes", p: "6 built-in templates for LinkedIn, Twitter, blog, email, and repurposing. Add your own with {{entity}} placeholders." },
            { tag: "Google Sheets Import", h: "Your sheet, your system", p: "Paste any public Google Sheets URL. Fetches, parses, and maps columns automatically — title, platform, status, schedule date." },
            { tag: "AI Writing", h: "Grounded in entity context", p: "Chat with a system-prompted assistant that already knows the brand's name, industry, and description before the first message." },
            { tag: "Knowledge Base", h: "Upload what the AI needs", p: "Attach .txt, .md, .pdf, .docx, or .csv files per entity. Uploaded content persists in your browser for future AI sessions." },
          ].map(({ tag, h, p }) => (
            <div key={tag} style={{ background: v("surface"), border: `1px solid ${v("border")}`, borderRadius: 10, padding: 28, transition: "border-color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = v("border2"))}
              onMouseLeave={e => (e.currentTarget.style.borderColor = v("border"))}>
              <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 10, letterSpacing: ".08em", color: v("text3"), textTransform: "uppercase", marginBottom: 12 }}>{tag}</div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 8 }}>{h}</div>
              <p style={{ fontSize: 13.5, color: v("text2"), lineHeight: 1.65 }}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border: "none", borderTop: `1px solid ${v("border")}`, margin: "0 32px" }} />

      {/* How it works */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 32px" }}>
        <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, letterSpacing: ".1em", color: v("text3"), textTransform: "uppercase", marginBottom: 16 }}>How it works</div>
        <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.15, marginBottom: 16 }}>Zero setup, full control</h2>
        <p style={{ fontSize: 16, color: v("text2"), lineHeight: 1.7, maxWidth: 500, marginBottom: 56 }}>No account. No database. Opens in your browser in seconds. Everything persists in localStorage until you're ready to go production.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 40 }}>
          {[
            ["Step one", "Create an entity", "Name your brand, persona, or client. Add industry, description, and social handles. Each entity is a self-contained workspace."],
            ["Step two", "Add your API key", "Paste your key from Claude, OpenAI, or any supported provider in Settings. It stays in your browser — never leaves your machine."],
            ["Step three", "Create and ship", "Build content with the AI assistant, import from Google Sheets, schedule across platforms, and track everything from the content table."],
          ].map(([step, h, p]) => (
            <div key={step}>
              <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 12, color: v("silver"), marginBottom: 12 }}>{step}</div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 8 }}>{h}</div>
              <p style={{ fontSize: 13.5, color: v("text2"), lineHeight: 1.65 }}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{ maxWidth: 1100, margin: "0 auto 80px", padding: "0 32px" }}>
        <div style={{ background: v("text"), borderRadius: 16, padding: "64px 48px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, letterSpacing: "-.04em", color: v("accentFg"), marginBottom: 16 }}>Start managing content like it's a system.</h2>
          <p style={{ fontSize: 16, color: `${v("accentFg")}88`, marginBottom: 36 }}>Free during trial. No account required. Everything in your browser.</p>
          <Link href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, background: v("bg"), color: v("text"), padding: "11px 24px", borderRadius: 6 }}>
            Open Content-ment →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${v("border")}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 30 30" fill="none"><rect width="30" height="30" rx="6" fill={v("text")} /><path d="M20 10C18.4 9 16.6 8.5 15 8.5C10.9 8.5 8 11.3 8 15C8 18.7 10.9 21.5 15 21.5C16.6 21.5 18.4 21 20 20" stroke={v("accentFg")} strokeWidth="2" strokeLinecap="round" /><circle cx="21.5" cy="15" r="1.8" fill={v("silver")} /></svg>
            <span style={{ fontSize: 13, color: v("text3") }}>Content-ment · Trial mode</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <a href="#features" style={{ fontSize: 13, color: v("text3") }}>Features</a>
            <Link href="/app" style={{ fontSize: 13, color: v("text3") }}>Open app</Link>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelectorAll('.reveal').forEach(el => {
          const io = new IntersectionObserver(entries => {
            entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);} });
          },{threshold:.1});
          io.observe(el);
        });
      ` }} />
    </div>
  );
}
