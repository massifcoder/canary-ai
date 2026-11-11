"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const AnimatedBackground = dynamic(() => import("./ThreeBackground"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_SITES = [
  {
    domain: "super-cheap-electronics.xyz",
    name: "Sony WH-1000XM5 Wireless Headphones",
    price: 45.99,
    description: "Brand new Sony headphones, 80% off! Limited time!",
    reviews:
      "Amazing deal! Best purchase ever! - John. Got mine in 2 days, perfect condition! - Sarah. Unbelievable price! - Mike.",
  },
  {
    domain: "amazon.com",
    name: "Sony WH-1000XM5 Wireless Headphones",
    price: 298.0,
    description: "Sony WH-1000XM5 noise canceling headphones",
    reviews:
      "Great noise canceling but pricey. Battery lasts 30 hours. Sound quality excellent. - Verified Purchase",
  },
];

interface SSEEvent {
  type: string;
  role?: string;
  content?: string;
  data?: Record<string, unknown>;
  session_id?: string;
  verdict?: string;
  order_id?: string;
  bypass_attempted?: boolean;
  trust_score?: number;
  trust_breakdown?: Record<string, number>;
  expectation?: {
    match_score: number;
    user_expects: string;
    product_reality: string;
    mismatches: string[];
    reasoning: string;
  };
}

/* ═══════════════════════════════════════════════════
   CANARY SVG LOGO — geometric bird silhouette
   ═══════════════════════════════════════════════════ */
function CanaryLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="canaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-secondary)" />
        </linearGradient>
      </defs>
      <path
        d="M16 3C11 3 7 6.5 7 11c0 2.5 1.2 4.7 3 6.2L8 22l3-1.5L9 27h4l1-3 2 3 2-3 1 3h4l-2-6.5 3 1.5-2-4.8c1.8-1.5 3-3.7 3-6.2C25 6.5 21 3 16 3z"
        fill="url(#canaryGrad)"
      />
      <circle cx="13" cy="10" r="1.2" fill="var(--bg)" />
      <path d="M6 12c-2-1-3.5 0-3 2s3 2 4 1" fill="url(#canaryGrad)" opacity="0.7" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   THEME HOOK
   ═══════════════════════════════════════════════════ */
function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("canary-theme") as "dark" | "light" | null;
    if (saved) {
      setThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("canary-theme", t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, toggle, isDark: theme === "dark" };
}

/* ═══════════════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════════════ */
const ROLE_META: Record<string, { label: string; color: string; bgClass: string; textClass: string }> = {
  user: { label: "You", color: "#a78bfa", bgClass: "bg-violet-500/10 border-violet-500/15", textClass: "text-[var(--text)]" },
  shopper: { label: "Shopper", color: "#818cf8", bgClass: "bg-indigo-500/10 border-indigo-500/15", textClass: "text-indigo-200/70 dark:text-indigo-200/70" },
  guardian: { label: "Guardian", color: "#f59e0b", bgClass: "bg-amber-500/10 border-amber-500/15", textClass: "text-amber-200/70 dark:text-amber-200/70" },
  system: { label: "System", color: "#6b7280", bgClass: "bg-[var(--bg-card)] border-[var(--border)]", textClass: "text-[var(--text-secondary)]" },
  bypass_alert: { label: "Alert", color: "#ef4444", bgClass: "bg-red-500/10 border-red-500/20", textClass: "text-red-300 font-semibold" },
};

function PulsingDots() {
  return (
    <div className="flex items-center gap-1 ml-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 h-1 rounded-full"
          style={{ background: "var(--brand)" }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function TrustGauge({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="relative w-[100px] h-[100px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <motion.circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-black font-mono leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-[8px] uppercase tracking-[0.2em] mt-0.5" style={{ color: "var(--text-dim)" }}>
          trust
        </span>
      </div>
    </div>
  );
}

function TrustBar({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="w-20 capitalize shrink-0 font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="w-7 text-right font-mono font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

/* ── Step labels ── */
const STEP_LABELS: Record<string, string> = {
  domain_check_start: "Checking domain",
  domain_check_done: "Domain Analysis",
  price_check_start: "Checking price",
  price_check_done: "Price Analysis",
  review_analysis_start: "Analyzing reviews",
  review_analysis_done: "Review Analysis",
  registry_check_start: "Checking registry",
  registry_check_done: "Registry Check",
  expectation_start: "Analyzing expectations",
  expectation_done: "Expectation Match",
  trust_score_calculated: "Trust Score",
};

const IMPORTANT_KEYS: Record<string, string[]> = {
  domain_check_done: ["domain_age_days", "domain_age_score", "ssl_valid", "ssl_issuer", "ssl_score"],
  price_check_done: ["market_avg", "price_deviation_pct", "price_score", "sources_count"],
  review_analysis_done: ["authenticity_score", "red_flags", "reasoning"],
  registry_check_done: ["registry_score"],
  expectation_done: ["match_score", "user_expects", "product_reality", "mismatches", "reasoning"],
  trust_score_calculated: ["trust_score", "verdict", "breakdown"],
};

function DataValue({ k, v }: { k: string; v: unknown }) {
  if (v === undefined) return null;

  if (k === "red_flags" && Array.isArray(v)) {
    return (
      <div className="mt-1 space-y-1">
        {(v as string[]).map((f, i) => (
          <div key={i} className="text-[10px] pl-3 border-l" style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)", opacity: 0.7 }}>
            {f}
          </div>
        ))}
      </div>
    );
  }

  if (k === "mismatches" && Array.isArray(v)) {
    return (
      <div className="mt-1 space-y-1">
        {(v as string[]).slice(0, 3).map((m, i) => (
          <div key={i} className="text-[10px] pl-3 border-l" style={{ color: "var(--warning)", borderColor: "rgba(245,158,11,0.2)", opacity: 0.7 }}>
            {m}
          </div>
        ))}
      </div>
    );
  }

  if (k === "breakdown" && typeof v === "object" && v !== null) {
    return (
      <div className="space-y-1 mt-1">
        {Object.entries(v as Record<string, number>).map(([bk, bv]) => (
          <div key={bk} className="flex justify-between text-[10px] font-mono">
            <span style={{ color: "var(--text-dim)" }}>{bk}</span>
            <span style={{ color: bv >= 70 ? "var(--success)" : bv >= 40 ? "var(--warning)" : "var(--danger)" }}>
              {bv}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (k === "reasoning" || k === "user_expects" || k === "product_reality") {
    const label = k === "user_expects" ? "Expects" : k === "product_reality" ? "Reality" : null;
    return (
      <div className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {label && (
          <span className="font-medium mr-1" style={{ color: k === "user_expects" ? "var(--info)" : "var(--warning)" }}>
            {label}:
          </span>
        )}
        <span className={k === "reasoning" ? "italic" : ""}>{String(v)}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between text-[10px] font-mono">
      <span style={{ color: "var(--text-dim)" }}>{k.replace(/_/g, " ")}</span>
      <span
        style={{
          color:
            typeof v === "boolean"
              ? v ? "var(--success)" : "var(--danger)"
              : typeof v === "number" && k.includes("score")
              ? v >= 70 ? "var(--success)" : v >= 40 ? "var(--warning)" : "var(--danger)"
              : k === "verdict"
              ? v === "BLOCKED" ? "var(--danger)" : v === "APPROVED" ? "var(--success)" : "var(--warning)"
              : "var(--text)",
          fontWeight: k === "verdict" ? 700 : undefined,
        }}
      >
        {String(v ?? "—")}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ICON COMPONENTS (no emojis)
   ═══════════════════════════════════════════════════ */
function IconShield({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1L2 4v4c0 3.5 2.6 6.4 6 7 3.4-.6 6-3.5 6-7V4L8 1z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function IconCart({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M1 1h2l.9 2M4 3h10l-1.5 6H5.4M6 13a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlert({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1l7 13H1L8 1z" fill="currentColor" opacity="0.9" />
      <path d="M8 6v3M8 11v.5" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconUser({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" fill="currentColor" opacity="0.8" />
      <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function IconGear({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconSun({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M13.5 9.5A5.5 5.5 0 116.5 2.5a4 4 0 007 7z" fill="currentColor" />
    </svg>
  );
}

const ROLE_ICON: Record<string, (props: { size?: number }) => JSX.Element> = {
  user: IconUser,
  shopper: IconCart,
  guardian: IconShield,
  system: IconGear,
  bypass_alert: IconAlert,
};

/* ═══════════════════════════════════════════════════ */

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const { toggle, isDark } = useTheme();
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [canaryEnabled, setCanaryEnabled] = useState(true);
  const [query, setQuery] = useState("Buy Sony WH-1000XM5 headphones");
  const [sessionResult, setSessionResult] = useState<SSEEvent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveSearch, setLiveSearch] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const autoStarted = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, sessionResult]);

  const startPurchase = useCallback(
    async (canaryOverride?: boolean) => {
      const canary = canaryOverride !== undefined ? canaryOverride : canaryEnabled;
      setEvents([]);
      setSessionResult(null);
      setIsRunning(true);
      try {
        const res = await fetch(`${API_URL}/api/purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, canary, sites: liveSearch ? undefined : DEMO_SITES }),
        });
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt: SSEEvent = JSON.parse(line.slice(6));
              if (evt.type === "session_start") setSessionId(evt.session_id || null);
              else if (evt.type === "session_end") setSessionResult(evt);
              else if (evt.type === "event") setEvents((p) => [...p, evt]);
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        setEvents((p) => [...p, { type: "event", role: "system", content: `Connection error: ${err}` }]);
      } finally {
        setIsRunning(false);
      }
    },
    [query, canaryEnabled, liveSearch],
  );

  useEffect(() => {
    if (autoStarted.current) return;
    const auto = searchParams.get("auto");
    if (auto === "on" || auto === "off") {
      autoStarted.current = true;
      const wantCanary = auto === "on";
      setCanaryEnabled(wantCanary);
      setTimeout(() => startPurchase(wantCanary), 300);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendConsent = useCallback(
    async (consent: boolean) => {
      if (!sessionId) return;
      setSessionResult(null);
      setIsRunning(true);
      const res = await fetch(`${API_URL}/api/consent/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const evt: SSEEvent = JSON.parse(line.slice(6));
          if (evt.type === "event") setEvents((p) => [...p, evt]);
          else if (evt.type === "session_end") setSessionResult(evt);
        }
      }
      setIsRunning(false);
    },
    [sessionId],
  );

  /* Derived */
  const chatEvents = events.filter((e) => e.role && e.content && !e.content.startsWith("["));
  const stepEvents = events.filter((e) => e.role === "guardian" && e.content?.startsWith("[") && e.data);
  const trustBreakdown = sessionResult?.trust_breakdown as Record<string, number> | undefined;

  const vColor = sessionResult?.verdict === "BLOCKED"
    ? "var(--danger)" : (sessionResult?.verdict === "APPROVED" || sessionResult?.verdict === "USER_APPROVED")
    ? "var(--success)" : "var(--warning)";

  const vLabel = {
    BLOCKED: "Transaction Blocked",
    APPROVED: canaryEnabled ? "Transaction Approved" : "Unprotected Purchase",
    USER_APPROVED: "User Approved",
    AWAITING_USER: "Awaiting Decision",
    USER_CANCELLED: "Cancelled",
  }[sessionResult?.verdict || ""] || sessionResult?.verdict || "";

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <AnimatedBackground isDark={isDark} />

      {/* ══════════ Header ══════════ */}
      <header className="relative z-10 px-6 py-3 flex items-center justify-between glass">
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, var(--brand-glow), transparent)` }}
        />

        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, var(--brand-dim), transparent)`,
              border: "1px solid var(--border-bright)",
            }}
          >
            <CanaryLogo size={24} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight leading-none" style={{ color: "var(--text)" }}>
              Canary
            </h1>
            <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: "var(--brand)", opacity: 0.5 }}>
              Trust Verification
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Protected toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span
              className="text-[10px] font-bold tracking-wider"
              style={{ color: canaryEnabled ? "var(--success)" : "var(--danger)" }}
            >
              {canaryEnabled ? "PROTECTED" : "UNPROTECTED"}
            </span>
            <button
              onClick={() => setCanaryEnabled(!canaryEnabled)}
              disabled={isRunning}
              className="w-10 h-[22px] rounded-full transition-all relative"
              style={{
                background: canaryEnabled ? "var(--success)" : "var(--danger)",
                boxShadow: `0 0 12px ${canaryEnabled ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                opacity: canaryEnabled ? 0.8 : 0.7,
              }}
            >
              <motion.div
                className="w-4 h-4 bg-white rounded-full absolute top-[3px]"
                animate={{ left: canaryEnabled ? 21 : 3 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </label>

          <div className="w-px h-4" style={{ background: "var(--border)" }} />

          {/* Live / Demo */}
          <label className="flex items-center gap-2 text-[10px] cursor-pointer select-none">
            <span className="font-bold tracking-wider" style={{ color: liveSearch ? "var(--info)" : "var(--text-dim)" }}>
              {liveSearch ? "LIVE" : "DEMO"}
            </span>
            <button
              onClick={() => setLiveSearch(!liveSearch)}
              className="w-8 h-[18px] rounded-full transition-all relative"
              style={{
                background: liveSearch ? "var(--info)" : "var(--text-dim)",
                opacity: 0.7,
              }}
            >
              <div
                className="w-3 h-3 bg-white rounded-full absolute top-[3px] transition-all"
                style={{ left: liveSearch ? 16 : 3 }}
              />
            </button>
          </label>

          <div className="w-px h-4" style={{ background: "var(--border)" }} />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-card-hover)]"
            style={{ color: "var(--text-secondary)" }}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>

          <div className="w-px h-4" style={{ background: "var(--border)" }} />

          <a
            href="/dashboard"
            className="text-[11px] font-medium tracking-wide transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Dashboard
            <span className="ml-1 opacity-50">→</span>
          </a>
        </div>
      </header>

      {/* ══════════ Main ══════════ */}
      <div className="flex-1 flex min-h-0 relative z-10">
        {/* ─── Left: Agent Activity ─── */}
        <div className="w-1/2 flex flex-col" style={{ borderRight: "1px solid var(--border)" }}>
          <div className="px-5 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-panel)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--shopper)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text-secondary)" }}>
              Agent Activity
            </span>
            {isRunning && <PulsingDots />}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {chatEvents.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                  Enter a product and click{" "}
                  <span className="font-semibold" style={{ color: "var(--brand)" }}>Buy</span>
                </p>
              </div>
            )}

            <AnimatePresence>
              {chatEvents.map((evt, i) => {
                const meta = ROLE_META[evt.role!] || ROLE_META.system;
                const Icon = ROLE_ICON[evt.role!] || IconGear;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 items-start py-2 px-3 rounded-lg transition-colors ${
                      evt.role === "bypass_alert" ? "bypass-glow" : ""
                    }`}
                    style={{
                      background: evt.role === "bypass_alert" ? "rgba(239,68,68,0.06)" : undefined,
                      border: evt.role === "bypass_alert" ? "1px solid rgba(239,68,68,0.15)" : undefined,
                    }}
                  >
                    <div className="shrink-0 mt-0.5">
                      <span
                        className={`text-[8px] font-bold uppercase tracking-wider px-2 py-[3px] rounded-md inline-flex items-center gap-1 border ${meta.bgClass}`}
                        style={{ color: meta.color }}
                      >
                        <Icon size={10} />
                        {meta.label}
                      </span>
                    </div>
                    <p className={`text-[13px] leading-relaxed flex-1 ${meta.textClass}`}>
                      {evt.content}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isRunning && chatEvents.length > 0 && <div className="pl-3"><PulsingDots /></div>}

            {/* ── AWAITING_USER ── */}
            {sessionResult?.verdict === "AWAITING_USER" &&
              (() => {
                const reasons: string[] = [];
                if (sessionResult.trust_score != null) reasons.push(`Trust score: ${sessionResult.trust_score}/100`);
                if (sessionResult.expectation) {
                  reasons.push(`Product match: ${sessionResult.expectation.match_score}/100`);
                  sessionResult.expectation.mismatches?.slice(0, 2).forEach((m) => reasons.push(m));
                }
                events
                  .filter((e) => e.role === "guardian" && e.content?.includes("unverified"))
                  .slice(0, 2)
                  .forEach((e) => {
                    const claim = e.content?.match(/\] (.+?) →/)?.[1];
                    if (claim) reasons.push(`Unverified: ${claim}`);
                  });

                return (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--warning)",
                        borderLeftWidth: 3,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <IconShield size={16} />
                        <span className="text-sm font-bold" style={{ color: "var(--warning)" }}>
                          Guardian flagged concerns
                        </span>
                      </div>
                      {reasons.length > 0 && (
                        <ul className="space-y-1.5 ml-1">
                          {reasons.map((r, ri) => (
                            <li key={ri} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "var(--warning)" }} />
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={() => sendConsent(true)}
                          className="px-4 py-1.5 text-sm rounded-lg font-semibold transition-all text-white"
                          style={{ background: "var(--success)" }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => sendConsent(false)}
                          className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-bright)", color: "var(--text-secondary)" }}
                        >
                          Try Next Option
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

            {/* ── BLOCKED: offer fallback ── */}
            {sessionResult?.verdict === "BLOCKED" &&
              (() => {
                const mismatches = sessionResult.expectation?.mismatches || [];
                return (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--danger)",
                        borderLeftWidth: 3,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <IconShield size={16} />
                        <span className="text-sm font-bold" style={{ color: "var(--danger)" }}>
                          Blocked — want to try another option?
                        </span>
                      </div>
                      {mismatches.length > 0 && (
                        <ul className="space-y-1.5 ml-1">
                          {mismatches.slice(0, 3).map((m, mi) => (
                            <li key={mi} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "var(--danger)" }} />
                              {m}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
                        Canary can search for a better match that actually meets your expectations.
                      </p>
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={() => sendConsent(false)}
                          className="px-4 py-1.5 text-sm rounded-lg font-semibold transition-all"
                          style={{ background: "var(--brand)", color: "var(--bg)" }}
                        >
                          Find Better Option
                        </button>
                        <button
                          onClick={() => { setSessionResult(null); setIsRunning(false); }}
                          className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-bright)", color: "var(--text-secondary)" }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

            <div ref={chatEndRef} />
          </div>

          {/* ── Input ── */}
          <div className="p-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-panel)" }}>
            <div className="flex gap-2.5">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to buy?"
                className="flex-1 rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                disabled={isRunning}
                onKeyDown={(e) => e.key === "Enter" && !isRunning && startPurchase()}
              />
              <button
                onClick={() => startPurchase()}
                disabled={isRunning || !query.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background:
                    isRunning || !query.trim()
                      ? "var(--bg-card)"
                      : `linear-gradient(135deg, var(--brand), var(--brand-secondary))`,
                  color: isRunning || !query.trim() ? "var(--text-dim)" : "var(--bg)",
                  border: isRunning || !query.trim() ? "1px solid var(--border)" : "none",
                  cursor: isRunning || !query.trim() ? "not-allowed" : "pointer",
                }}
              >
                {isRunning ? (
                  <span className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-4 h-4 rounded-full"
                      style={{ border: "2px solid var(--border-bright)", borderTopColor: "var(--text-secondary)" }}
                    />
                    Running
                  </span>
                ) : (
                  "Buy"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Right: Trust Analysis ─── */}
        <div className="w-1/2 flex flex-col">
          <div className="px-5 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-panel)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--guardian)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text-secondary)" }}>
              Trust Analysis
            </span>
            {isRunning && canaryEnabled && (
              <span className="text-[10px] ml-auto animate-pulse font-medium" style={{ color: "var(--brand)", opacity: 0.5 }}>
                analyzing
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {/* Canary OFF */}
            {!canaryEnabled && events.length > 0 && !sessionResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 rounded-xl text-center"
                style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}
              >
                <IconAlert size={32} />
                <p className="text-sm font-bold mt-2" style={{ color: "var(--danger)" }}>
                  No Protection Active
                </p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>
                  Trust analysis is disabled
                </p>
              </motion.div>
            )}

            {/* ── Timeline ── */}
            {stepEvents.length > 0 && (
              <div className="relative" style={{ paddingLeft: 24 }}>
                {/* Vertical line — centered on dots at left:5px, dot is 9px wide, center = 5 + 4.5 = 9.5 → line at left 9px */}
                <div
                  className="absolute top-3 bottom-3"
                  style={{
                    left: 9,
                    width: 1,
                    background: `linear-gradient(to bottom, var(--brand-glow), transparent)`,
                  }}
                />

                {stepEvents.map((evt, i) => {
                  const step = evt.content?.replace(/[\[\]]/g, "") || "";
                  const isDone = step.includes("done") || step.includes("calculated");
                  const isTrust = step === "trust_score_calculated";
                  const keys = IMPORTANT_KEYS[step] || Object.keys(evt.data || {});

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.02 }}
                      className="relative mb-3"
                    >
                      {/* Dot — centered at left:5px from the pl-24 container, 9px wide → center at 9.5px matches line at 9px */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          left: -19,
                          top: 14,
                          width: 9,
                          height: 9,
                          border: `2px solid ${isTrust ? "var(--brand)" : isDone ? "var(--brand)" : "var(--border-bright)"}`,
                          background: isTrust
                            ? "var(--brand-dim)"
                            : isDone
                            ? "var(--brand-dim)"
                            : "var(--bg)",
                          boxShadow: isTrust ? `0 0 8px var(--brand-glow)` : "none",
                        }}
                      />

                      <div
                        className="rounded-lg p-3.5 transition-colors"
                        style={{
                          background: isTrust ? "var(--brand-dim)" : "var(--bg-card)",
                          border: `1px solid ${isTrust ? "var(--brand-glow)" : "var(--border)"}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: isTrust ? "var(--brand)" : isDone ? "var(--text-secondary)" : "var(--text-dim)" }}
                          >
                            {STEP_LABELS[step] || step.replace(/_/g, " ")}
                          </span>
                          {!isDone && (
                            <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "var(--brand)" }} />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {keys.map((k) => (
                            <DataValue key={k} k={k} v={(evt.data as Record<string, unknown>)?.[k]} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── Verdict ── */}
            {sessionResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                <div
                  className="rounded-2xl p-6 space-y-5"
                  style={{
                    background: "var(--bg-card)",
                    border: `1px solid ${vColor}`,
                    borderLeftWidth: 4,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: "var(--text-dim)" }}>
                        Final Verdict
                      </div>
                      <div className="flex items-center gap-2.5">
                        <IconShield size={22} />
                        <span className="text-xl font-bold" style={{ color: "var(--text)" }}>{vLabel}</span>
                      </div>
                    </div>
                    {sessionResult.trust_score != null && <TrustGauge score={sessionResult.trust_score} />}
                  </div>

                  {trustBreakdown && (
                    <div className="space-y-2 pt-2">
                      {Object.entries(trustBreakdown).map(([key, val]) => (
                        <TrustBar key={key} score={val} label={key.replace(/_/g, " ")} />
                      ))}
                    </div>
                  )}

                  {sessionResult.expectation && (
                    <div className="pt-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-dim)" }}>
                          Expectation vs Reality
                        </span>
                        <span
                          className="text-sm font-bold font-mono"
                          style={{
                            color:
                              sessionResult.expectation.match_score >= 70
                                ? "var(--success)"
                                : sessionResult.expectation.match_score >= 40
                                ? "var(--warning)"
                                : "var(--danger)",
                          }}
                        >
                          {sessionResult.expectation.match_score}/100
                        </span>
                      </div>
                      <div className="text-[11px] space-y-2">
                        <div className="flex gap-2">
                          <span className="shrink-0 font-medium" style={{ color: "var(--info)" }}>Expects:</span>
                          <span style={{ color: "var(--text-secondary)" }}>{sessionResult.expectation.user_expects}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="shrink-0 font-medium" style={{ color: "var(--warning)" }}>Reality:</span>
                          <span style={{ color: "var(--text-secondary)" }}>{sessionResult.expectation.product_reality}</span>
                        </div>
                        {sessionResult.expectation.mismatches?.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {sessionResult.expectation.mismatches.slice(0, 3).map((m, mi) => (
                              <div key={mi} className="flex items-start gap-2 text-[11px]" style={{ color: "var(--warning)", opacity: 0.7 }}>
                                <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ background: "var(--warning)" }} />
                                {m}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {sessionResult.order_id && (
                    <div className="pt-4 text-sm flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="text-xs" style={{ color: "var(--text-dim)" }}>PayPal Order:</span>
                      <span
                        className="font-mono text-xs px-2.5 py-0.5 rounded-md"
                        style={{ color: "var(--success)", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.12)" }}
                      >
                        {sessionResult.order_id}
                      </span>
                    </div>
                  )}

                  {sessionResult.bypass_attempted && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-lg text-sm flex items-center gap-2"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", color: "var(--danger)" }}
                    >
                      <IconAlert size={16} />
                      Bypass attempt detected and blocked
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Empty state ── */}
            {events.length === 0 && !isRunning && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: `linear-gradient(135deg, var(--brand-dim), transparent)`,
                    border: "1px solid var(--border-bright)",
                    boxShadow: `0 8px 32px var(--brand-dim)`,
                  }}
                >
                  <CanaryLogo size={44} />
                </motion.div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
                  Your canary for agentic commerce
                </h2>
                <p className="text-[13px] max-w-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Multi-agent trust verification that protects you before AI makes a purchase.
                </p>
                <div className="mt-10 flex gap-8 text-[11px]" style={{ color: "var(--text-dim)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: "var(--shopper)", opacity: 0.5 }} />
                    Shopper Agent
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: "var(--guardian)", opacity: 0.5 }} />
                    Guardian Agent
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: "var(--danger)", opacity: 0.5 }} />
                    Bypass Monitor
                  </div>
                </div>
              </div>
            )}

            <div ref={stepsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
