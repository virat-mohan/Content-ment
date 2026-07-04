"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ── colour constants ──────────────────────────────────────── */
const GREEN   = "#22C55E";
const AMBER   = "#F5A623";
const BLUE    = "#3B82F6";
const GRAY    = "#9A9A98";

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  published: { bg: "rgba(34,197,94,.10)",  text: "#15803D", dot: GREEN },
  review:    { bg: "rgba(245,166,35,.10)", text: "#B07A10", dot: AMBER },
  approved:  { bg: "rgba(59,130,246,.10)", text: "#1D4ED8", dot: BLUE  },
  draft:     { bg: "rgba(156,163,175,.10)",text: "#6B7280", dot: GRAY  },
  active:    { bg: "rgba(34,197,94,.10)",  text: "#15803D", dot: GREEN },
  planning:  { bg: "rgba(245,166,35,.10)", text: "#B07A10", dot: AMBER },
};

function StatusPill({ s }: { s: string }) {
  const c = STATUS_COLOR[s] ?? STATUS_COLOR.draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "2px 9px", borderRadius: 20, background: c.bg, color: c.text, flexShrink: 0 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />{s}
    </span>
  );
}

/* ── theme vars ────────────────────────────────────────────── */
function useVars(d: boolean) {
  return {
    bg:       d ? "#0C0C0C" : "#F8F8F7",
    bg2:      d ? "#141414" : "#F1F1EF",
    surface:  d ? "#181818" : "#FFFFFF",
    border:   d ? "#242422" : "#E3E3E1",
    border2:  d ? "#303030" : "#CDCDCB",
    text:     d ? "#F2F2F0" : "#111111",
    text2:    d ? "#9A9A96" : "#5A5A58",
    text3:    d ? "#5A5A58" : "#9A9A98",
    silver:   d ? "#6A6C72" : "#B6B8BD",
    accent:   d ? "#F2F2F0" : "#111111",
    accentFg: d ? "#111111" : "#FFFFFF",
  };
}

/* ── main ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme]       = useState<"light" | "dark">("light");
  const [splashOut, setSplashOut] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  /* system dark mode */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");
    const h = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  /* splash timing */
  useEffect(() => {
    const t1 = setTimeout(() => setSplashOut(true),  2000);
    const t2 = setTimeout(() => setSplashGone(true), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const d = theme === "dark";
  const v = useVars(d);

  /* scroll reveal */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => (e.target as HTMLElement).classList.add("in"), i * 60);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [splashGone]);

  /* hero grid canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = d ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.045)";
      ctx.lineWidth = 1;
      const cw = Math.floor(W / 7);
      for (let x = 0; x <= W; x += cw) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 36)  { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
    };
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement!);
    draw();
    return () => ro.disconnect();
  }, [d]);

  const mono = "'SF Mono','Fira Code','Cascadia Code',monospace";

  const cell = (extra?: object) => ({
    background: v.surface,
    border: `1px solid ${v.border}`,
    borderRadius: 10,
    padding: 28,
    overflow: "hidden" as const,
    ...extra,
  });

  const tag = { fontFamily: mono, fontSize: 10, letterSpacing: ".08em", color: v.text3, textTransform: "uppercase" as const, marginBottom: 12 };
  const h3  = { fontSize: 17, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 8, color: v.text };
  const p_  = { fontSize: 13.5, color: v.text2, lineHeight: 1.65 };

  return (
    <>
      {/* ── Splash ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes splashIn  { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
        @keyframes splashOut { from{opacity:1}                       to{opacity:0} }
        @keyframes tagIn     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.3} }
        .reveal{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease}
        .reveal.in{opacity:1;transform:none}
        @media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none}}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        a{color:inherit;text-decoration:none}
      `}</style>

      {!splashGone && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#0A0A0A",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          animation: splashOut ? "splashOut .65s ease forwards" : undefined,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Content-ment"
            style={{
              width: 140, height: 140, borderRadius: 28, objectFit: "cover",
              boxShadow: "0 24px 80px rgba(0,0,0,.8)",
              animation: "splashIn .7s cubic-bezier(.22,1,.36,1) forwards",
            }}
          />
          <div style={{
            marginTop: 28,
            fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
            fontSize: 15, fontWeight: 500, letterSpacing: "-.01em",
            color: "rgba(255,255,255,.55)",
            animation: "tagIn .6s .3s ease both",
          }}>
            Your content OS
          </div>
        </div>
      )}

      {/* ── Page ───────────────────────────────────────────────── */}
      <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", background: v.bg, color: v.text, minHeight: "100vh", WebkitFontSmoothing: "antialiased" }}>

        {/* Nav */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, background: `${v.bg}dd`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${v.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Content-ment" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.3px" }}>Content<span style={{ color: v.text3, fontWeight: 400 }}>·ment</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <a href="#features" style={{ fontSize: 13, color: v.text2, padding: "6px 12px", borderRadius: 6 }}>Features</a>
            <a href="#how"      style={{ fontSize: 13, color: v.text2, padding: "6px 12px", borderRadius: 6 }}>How it works</a>
            <a href="#ai"       style={{ fontSize: 13, color: v.text2, padding: "6px 12px", borderRadius: 6 }}>AI</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${v.border}`, background: v.bg2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: v.text2 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            </button>
            <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 500, background: v.accent, color: v.accentFg, padding: "7px 16px", borderRadius: 6, border: `1px solid ${v.accent}` }}>Open app →</Link>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ position: "relative", overflow: "hidden", padding: "96px 32px 72px", textAlign: "center" }}>
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", width: "100%", height: "100%" }} />

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 11, letterSpacing: ".08em", color: v.text3, background: v.surface, border: `1px solid ${v.border}`, padding: "5px 12px", borderRadius: 20, marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: v.silver, display: "inline-block", animation: "pulse 2.5s ease-in-out infinite" }} />
            Trial mode · No account required
          </div>

          <h1 style={{ fontSize: "clamp(40px,6vw,68px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1.06, maxWidth: 780, margin: "0 auto 24px" }}>
            The content OS for<br /><span style={{ color: v.text3 }}>serious creators.</span>
          </h1>

          <p style={{ fontSize: 17, color: v.text2, lineHeight: 1.65, maxWidth: 480, margin: "0 auto 44px" }}>
            Manage every entity, piece of content, and AI workflow from a single, calm interface.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 500, background: v.accent, color: v.accentFg, padding: "10px 22px", borderRadius: 6, border: `1px solid ${v.accent}` }}>Open app</Link>
            <a href="#features"    style={{ fontSize: 14, color: v.text2, padding: "10px 22px", borderRadius: 6, border: `1px solid ${v.border}` }}>See features</a>
          </div>

          {/* Mini product preview */}
          <div className="reveal" style={{ maxWidth: 820, margin: "64px auto 0", background: v.surface, border: `1px solid ${v.border}`, borderRadius: 14, overflow: "hidden", boxShadow: d ? "0 2px 8px rgba(0,0,0,.4),0 12px 40px rgba(0,0,0,.3)" : "0 2px 8px rgba(0,0,0,.08),0 12px 40px rgba(0,0,0,.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${v.border}`, background: v.bg2 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
              <span style={{ fontFamily: mono, fontSize: 11, color: v.text3, marginLeft: 8 }}>content-ment — Content</span>
            </div>
            <div style={{ display: "flex" }}>
              {/* mini sidebar */}
              <div style={{ width: 44, borderRight: `1px solid ${v.border}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 4, background: v.bg }}>
                {[true, false, false, false].map((active, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: active ? v.bg2 : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={active ? v.text2 : v.text3} strokeWidth="2">
                      {i === 0 && <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>}
                      {i === 1 && <><path d="M3 6h18M3 12h18M3 18h18"/></>}
                      {i === 2 && <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>}
                      {i === 3 && <path d="M18 20V10M12 20V4M6 20v-6"/>}
                    </svg>
                  </div>
                ))}
              </div>
              {/* table */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${v.border}` }}>
                  {["All", "LinkedIn", "Blog", "Twitter"].map((c, i) => (
                    <span key={c} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, background: i === 0 ? v.text : v.bg2, color: i === 0 ? v.accentFg : v.text2, border: `1px solid ${i === 0 ? v.text : v.border}` }}>{c}</span>
                  ))}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${v.border}`, background: v.bg2 }}>
                      {["TITLE", "ENTITY", "PLATFORM", "STATUS"].map(h => (
                        <th key={h} style={{ padding: "7px 14px", textAlign: "left", fontSize: 10, fontWeight: 500, color: v.text3, letterSpacing: ".06em", fontFamily: mono }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["How we grew 0→10k followers in 90 days", "Acme Corp",    "LinkedIn",  "published"],
                      ["The future of async work — thread",       "Personal",     "Twitter",   "review"],
                      ["Q2 Product launch announcement",           "Acme Corp",    "Blog",      "approved"],
                      ["Instagram caption series — Week 14",      "Side project", "Instagram", "draft"],
                    ] as const).map(([title, entity, platform, status]) => (
                      <tr key={title} style={{ borderBottom: `1px solid ${v.border}` }}>
                        <td style={{ padding: "9px 14px", fontSize: 12, color: v.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</td>
                        <td style={{ padding: "9px 14px", fontSize: 12, color: v.text2 }}>{entity}</td>
                        <td style={{ padding: "9px 14px" }}><span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, background: v.bg2, border: `1px solid ${v.border}`, color: v.text2 }}>{platform}</span></td>
                        <td style={{ padding: "9px 14px" }}><StatusPill s={status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <hr style={{ border: "none", borderTop: `1px solid ${v.border}`, margin: "0 32px" }} />

        {/* ── Features bento ──────────────────────────────────── */}
        <section id="features" style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 32px 0" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".1em", color: v.text3, textTransform: "uppercase", marginBottom: 16 }}>Features</div>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.15, marginBottom: 16 }}>Everything a content operation needs</h2>
          <p style={{ fontSize: 16, color: v.text2, lineHeight: 1.7, maxWidth: 520 }}>Built module by module, each piece designed to work cleanly with the next. No bloat, no unnecessary complexity.</p>
        </section>

        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 72px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12 }}>

            {/* Entities — span 5 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 5" }}>
              <div style={tag}>Entities</div>
              <h3 style={h3}>One workspace per voice</h3>
              <p style={p_}>Create separate entities for every brand, client, or persona. Each gets its own AI config, knowledge base, and content silo.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
                {[["A","#4F46E5","Acme Corp"],["P","#0891B2","Personal"],["S","#059669","Side project"]].map(([letter, color, name]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 7, background: v.bg2, border: `1px solid ${v.border}`, borderRadius: 8, padding: "6px 10px" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, background: color, color: "#fff" }}>{letter}</div>
                    <span style={{ fontSize: 12, color: v.text2 }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content table — span 7 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 7" }}>
              <div style={tag}>Content</div>
              <h3 style={h3}>Editorial-grade content table</h3>
              <p style={p_}>Track every piece across platform, status, and schedule. Draft → Review → Approved → Published in one view.</p>
              <div style={{ marginTop: 20, border: `1px solid ${v.border}`, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${v.border}`, background: v.bg2 }}>
                      {["TITLE","PLATFORM","STATUS"].map(h => (
                        <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 500, color: v.text3, letterSpacing: ".04em", fontSize: 10, fontFamily: mono }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([["How we grew 0→10k in 90 days","LinkedIn","published"],["Async work — thread","Twitter","review"],["Q2 launch announcement","Blog","approved"]] as const).map(([t,p,s]) => (
                      <tr key={t} style={{ borderBottom: `1px solid ${v.border}` }}>
                        <td style={{ padding: "8px 12px", color: v.text }}>{t}</td>
                        <td style={{ padding: "8px 12px" }}><span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, background: v.bg2, border: `1px solid ${v.border}`, color: v.text2 }}>{p}</span></td>
                        <td style={{ padding: "8px 12px" }}><StatusPill s={s} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calendar — span 4 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 4" }}>
              <div style={tag}>Calendar</div>
              <h3 style={h3}>See your pipeline at a glance</h3>
              <p style={p_}>Monthly grid view. Every scheduled piece lands on its date.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginTop: 20 }}>
                {["S","M","T","W","T","F","S"].map((d, i) => (
                  <div key={i} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: v.text3, fontWeight: 500 }}>{d}</div>
                ))}
                {[
                  [1,false,false],[2,true,"green"],[3,true,""],[4,false,false],[5,true,"green"],[6,false,false],[7,false,false],
                  [8,true,""],[9,true,"today"],[10,true,"green"],[11,true,""],[12,false,false],[13,true,""],[14,false,false],
                  [15,true,"green"],[16,false,false],[17,true,""],[18,false,false],[19,true,""],[20,false,false],[21,false,false],
                ].map(([n, has, type], i) => (
                  <div key={i} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, borderRadius: 4, position: "relative", background: type === "today" ? v.text : has ? v.bg2 : "transparent", color: type === "today" ? v.accentFg : has ? v.text2 : v.text3, fontWeight: type === "today" ? 600 : 400 }}>
                    {n}
                    {has && type !== "today" && <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: type === "green" ? GREEN : v.silver }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Analytics — span 4 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 4" }}>
              <div style={tag}>Analytics</div>
              <h3 style={h3}>Content by the numbers</h3>
              <p style={p_}>KPIs and breakdowns by platform, status, and entity. No external tracking.</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {([["LinkedIn",72,"#0A66C2",18],["Blog",48,"#F97316",12],["Twitter",36,"#1DA1F2",9],["Instagram",24,"#E1306C",6]] as const).map(([label, w, color, val]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: v.text2, width: 72, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: v.bg2, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, width: `${w}%`, background: color }} />
                    </div>
                    <span style={{ fontFamily: mono, fontSize: 11, color: v.text3, width: 24, textAlign: "right" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaigns — span 4 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 4" }}>
              <div style={tag}>Campaigns</div>
              <h3 style={h3}>Group by goal</h3>
              <p style={p_}>Tie content to campaigns with timelines and objectives.</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {[["Q3 Product Launch","Acme Corp · 12 items","active"],["Brand Awareness Push","Personal · 7 items","planning"]].map(([name, sub, status]) => (
                  <div key={name} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${v.border}`, background: v.bg2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: v.text }}>{name}</div>
                      <div style={{ fontSize: 11, color: v.text3, marginTop: 2 }}>{sub}</div>
                    </div>
                    <StatusPill s={status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Import — span 6 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 6" }}>
              <div style={tag}>Import</div>
              <h3 style={h3}>Your sheet, your system</h3>
              <p style={p_}>Paste a Google Sheets URL or drop a CSV / Excel file. Columns map automatically — title, platform, status, schedule date.</p>
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, background: v.bg2, border: `1px solid ${v.border}`, borderRadius: 6, padding: "8px 12px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={v.text3} strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <span style={{ flex: 1, fontFamily: mono, fontSize: 11, color: v.text3 }}>docs.google.com/spreadsheets/d/1BxiMVs0…</span>
                <span style={{ fontSize: 11, fontWeight: 500, background: v.text, color: v.accentFg, padding: "4px 10px", borderRadius: 5 }}>Fetch</span>
              </div>
              <div style={{ marginTop: 12 }}>
                {[["How we hit $1M ARR — the full breakdown","draft"],["5 things I wish I knew before scaling","review"],["The counterintuitive truth about delegation","published"]].map(([title, s]) => (
                  <div key={title} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${v.border}`, fontSize: 12, color: v.text2 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: v.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={v.accentFg} strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                    <span style={{ flex: 1 }}>{title}</span>
                    <StatusPill s={s} />
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt library — span 6 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 6" }}>
              <div style={tag}>Prompt Library</div>
              <h3 style={h3}>Reusable AI recipes</h3>
              <p style={p_}>6 built-in templates for LinkedIn, Twitter, blog, Instagram, email, and repurposing. Add your own with <code style={{ fontFamily: mono, fontSize: 11 }}>{"{{entity}}"}</code> placeholders.</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {[["LINKEDIN","Thought leadership post","Share a contrarian insight, back it with a short story, end with a question…"],["TWITTER","5-tweet thread hook","Bold scroll-stopping opener, 3 value tweets, CTA close…"],["GENERAL","Repurpose long-form to 3 formats","LinkedIn post + tweet + Instagram caption from one source…"]].map(([plat,title,body]) => (
                  <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 6, background: v.bg2, border: `1px solid ${v.border}` }}>
                    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".06em", color: v.text3, marginTop: 1, whiteSpace: "nowrap" }}>{plat}</div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: v.text }}>{title}</div>
                      <div style={{ fontSize: 11, color: v.text3, marginTop: 2 }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        <hr style={{ border: "none", borderTop: `1px solid ${v.border}`, margin: "0 32px" }} />

        {/* AI section */}
        <section id="ai" style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 32px" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".1em", color: v.text3, textTransform: "uppercase", marginBottom: 16 }}>AI Writing</div>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.15, marginBottom: 16 }}>An assistant that knows<br />who it&apos;s writing for</h2>
          <p style={{ fontSize: 16, color: v.text2, lineHeight: 1.7, maxWidth: 520 }}>Every entity carries its own AI configuration — provider, model, API key, and context. The assistant understands the brand before the first message.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12, marginTop: 40 }}>
            {/* Chat preview — span 6 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 6" }}>
              <div style={tag}>AI Chat</div>
              <h3 style={h3}>Chat grounded in entity context</h3>
              <p style={p_}>The system prompt is pre-loaded with entity name, industry, and description. Ask it to write, repurpose, or brainstorm.</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ maxWidth: "88%", alignSelf: "flex-end", fontSize: 12, lineHeight: 1.55, padding: "9px 12px", borderRadius: "8px 8px 2px 8px", background: v.text, color: v.accentFg }}>Write a LinkedIn post about our Q3 product launch</div>
                <div style={{ maxWidth: "88%", alignSelf: "flex-start", fontSize: 12, lineHeight: 1.55, padding: "9px 12px", borderRadius: "8px 8px 8px 2px", background: v.bg2, color: v.text2 }}>🚀 We just shipped the feature our users have been asking for since day one. After 3 months of building and iterating — it&apos;s live. One platform. Everything you need. 60% fewer context switches.</div>
              </div>
            </div>

            {/* Key + providers — span 6 */}
            <div className="reveal" style={{ ...cell(), gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={tag}>Your Key, Your Data</div>
                <h3 style={h3}>Zero server storage</h3>
                <p style={p_}>API keys live in your browser&apos;s localStorage. The AI proxy forwards your request directly to the provider — nothing is stored on our servers.</p>
              </div>
              <div>
                <div style={tag}>Providers</div>
                <h3 style={h3}>Use any model you prefer</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  {["Claude","OpenAI","Gemini","OpenRouter","DeepSeek","Mistral","Grok"].map(p => (
                    <span key={p} style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 6, background: v.surface, border: `1px solid ${v.border}`, color: v.text2 }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr style={{ border: "none", borderTop: `1px solid ${v.border}`, margin: "0 32px" }} />

        {/* How it works */}
        <section id="how" style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 32px" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".1em", color: v.text3, textTransform: "uppercase", marginBottom: 16 }}>How it works</div>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.15, marginBottom: 16 }}>Zero setup, full control</h2>
          <p style={{ fontSize: 16, color: v.text2, lineHeight: 1.7, maxWidth: 500, marginBottom: 56 }}>No account. No database. Opens in your browser in seconds. Everything persists in localStorage until you&apos;re ready to go production.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 40 }}>
            {[["Step one","Create an entity","Name your brand, persona, or client. Add industry, description, and social handles. Each entity is a self-contained workspace."],["Step two","Add your API key","Paste your key from Claude, OpenAI, or any supported provider in Settings. It stays in your browser — never leaves your machine."],["Step three","Create and ship","Build content with the AI assistant, import from Google Sheets, schedule across platforms, and track everything from the content table."]].map(([step, h, p]) => (
              <div key={step} className="reveal">
                <div style={{ fontFamily: mono, fontSize: 12, color: v.silver, marginBottom: 12 }}>{step}</div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 8, color: v.text }}>{h}</div>
                <p style={{ fontSize: 13.5, color: v.text2, lineHeight: 1.65 }}>{p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ maxWidth: 1100, margin: "0 auto 80px", padding: "0 32px" }}>
          <div className="reveal" style={{ background: v.text, borderRadius: 16, padding: "64px 48px", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, letterSpacing: "-.04em", color: v.accentFg, marginBottom: 16 }}>Start managing content<br />like it&apos;s a system.</h2>
            <p style={{ fontSize: 16, color: `${v.accentFg}88`, marginBottom: 36 }}>Free during trial. No account required. Everything in your browser.</p>
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, background: v.bg, color: v.text, padding: "11px 24px", borderRadius: 6 }}>
              Open Content-ment →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${v.border}` }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Content-ment" style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover" }} />
              <span style={{ fontSize: 13, color: v.text3 }}>Content-ment · Trial mode</span>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <a href="#features" style={{ fontSize: 13, color: v.text3 }}>Features</a>
              <Link href="/dashboard" style={{ fontSize: 13, color: v.text3 }}>Open app</Link>
            </div>
          </div>
        </div>

      </div>

    </>
  );
}
