"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

function roleLabel(role: string): string {
  return (
    { user: "You", shopper: "Shopper", guardian: "Guardian", system: "System", bypass_alert: "Alert" }[role] || role
  );
}

function roleIcon(role: string): string {
  return { user: "👤", shopper: "🛒", guardian: "🛡️", system: "⚙️", bypass_alert: "🚨" }[role] || "💬";
}

/* ─── Animated dots ─── */
function PulsingDots() {
  return (
    <div className="flex items-center gap-1 ml-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 h-1 rounded-full bg-amber-400"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/* ─── Circular trust gauge ─── */
function TrustGauge({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const glow = score >= 70 ? "rgba(16,185,129,.25)" : score >= 40 ? "rgba(245,158,11,.25)" : "rgba(239,68,68,.25)";

  return (
    <div className="relative w-[100px] h-[100px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-black font-mono leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">trust</span>
      </div>
    </div>
  );
}

/* ─── Trust bar ─── */
function TrustBar({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const bar = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  const text = score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="w-20 text-gray-500 capitalize shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${bar} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className={`w-7 text-right font-mono font-bold ${text}`}>{score}</span>
    </div>
  );
}

/* ─── Step labels ─── */
const STEP_LABELS: Record<string, string> = {
  domain_check_start: "Checking domain…",
  domain_check_done: "Domain Analysis",
  price_check_start: "Checking price…",
  price_check_done: "Price Analysis",
  review_analysis_start: "Analyzing reviews…",
  review_analysis_done: "Review Analysis",
  registry_check_start: "Checking registry…",
  registry_check_done: "Registry Check",
  expectation_start: "Analyzing expectations…",
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

/* ─── Data value renderer ─── */
function DataValue({ k, v }: { k: string; v: unknown }) {
  if (v === undefined) return null;

  if (k === "red_flags" && Array.isArray(v)) {
    return (
      <div className="mt-1 space-y-1">
        {(v as string[]).map((f, i) => (
          <div key={i} className="text-[10px] text-red-400/70 pl-3 border-l border-red-500/20">
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
          <div key={i} className="text-[10px] text-amber-400/70 pl-3 border-l border-amber-500/20">
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
            <span className="text-gray-600">{bk}</span>
            <span className={bv >= 70 ? "text-emerald-400" : bv >= 40 ? "text-amber-400" : "text-red-400"}>
              {bv}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (k === "reasoning" || k === "user_expects" || k === "product_reality") {
    const label =
      k === "user_expects" ? "Expects" : k === "product_reality" ? "Reality" : null;
    const labelColor = k === "user_expects" ? "text-blue-400" : k === "product_reality" ? "text-orange-400" : "";
    return (
      <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">
        {label && <span className={`${labelColor} font-medium mr-1`}>{label}:</span>}
        <span className={k === "reasoning" ? "italic" : ""}>{String(v)}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between text-[10px] font-mono">
      <span className="text-gray-600">{k.replace(/_/g, " ")}</span>
      <span
        className={
          typeof v === "boolean"
            ? v ? "text-emerald-400" : "text-red-400"
            : typeof v === "number" && k.includes("score")
            ? v >= 70 ? "text-emerald-400" : v >= 40 ? "text-amber-400" : "text-red-400"
            : k === "verdict"
            ? v === "BLOCKED" ? "text-red-400 font-bold" : v === "APPROVED" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"
            : "text-gray-300"
        }
      >
        {String(v ?? "—")}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
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

  /* ── purchase flow ── */
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

  /* ── auto-start ── */
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

  /* ── consent ── */
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

  /* ── derived ── */
  const trustBreakdown = sessionResult?.trust_breakdown as Record<string, number> | undefined;
  const chatEvents = events.filter((e) => e.role && e.content && !e.content.startsWith("["));
  const stepEvents = events.filter((e) => e.role === "guardian" && e.content?.startsWith("[") && e.data);

  const verdictColor =
    sessionResult?.verdict === "BLOCKED"
      ? { border: "from-red-500/60 via-red-500/20 to-red-500/5", glow: "shadow-red-500/10" }
      : sessionResult?.verdict === "APPROVED" && !canaryEnabled
      ? { border: "from-amber-500/60 via-amber-500/20 to-amber-500/5", glow: "shadow-amber-500/10" }
      : sessionResult?.verdict === "APPROVED" || sessionResult?.verdict === "USER_APPROVED"
      ? { border: "from-emerald-500/60 via-emerald-500/20 to-emerald-500/5", glow: "shadow-emerald-500/10" }
      : { border: "from-amber-500/60 via-amber-500/20 to-amber-500/5", glow: "shadow-amber-500/10" };

  const verdictLabel =
    sessionResult?.verdict === "BLOCKED"
      ? "Transaction Blocked"
      : sessionResult?.verdict === "APPROVED" && !canaryEnabled
      ? "Unprotected Purchase"
      : sessionResult?.verdict === "APPROVED"
      ? "Transaction Approved"
      : sessionResult?.verdict === "USER_APPROVED"
      ? "User Approved"
      : sessionResult?.verdict === "AWAITING_USER"
      ? "Awaiting Decision"
      : sessionResult?.verdict === "USER_CANCELLED"
      ? "Cancelled"
      : sessionResult?.verdict || "";

  const verdictIcon =
    sessionResult?.verdict === "BLOCKED"
      ? "🛡️"
      : sessionResult?.verdict === "APPROVED" && !canaryEnabled
      ? "⚠️"
      : sessionResult?.verdict === "APPROVED" || sessionResult?.verdict === "USER_APPROVED"
      ? "✅"
      : sessionResult?.verdict === "AWAITING_USER"
      ? "⏳"
      : "📋";

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245,183,49,0.045), transparent 70%)",
              "radial-gradient(ellipse 50% 50% at 100% 50%, rgba(59,130,246,0.02), transparent 60%)",
              "radial-gradient(ellipse 50% 50% at 0% 80%, rgba(249,115,22,0.02), transparent 60%)",
            ].join(","),
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ══════════ Header ══════════ */}
      <header className="relative z-10 px-6 py-3 flex items-center justify-between bg-white/[0.015] backdrop-blur-xl border-b border-white/[0.06]">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-xl shadow-lg shadow-amber-500/5">
            🐤
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight leading-none text-white">
              Canary
            </h1>
            <span className="text-[9px] text-amber-500/50 font-semibold tracking-[0.2em] uppercase">
              Trust Verification
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Canary toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span
              className={`text-[10px] font-bold tracking-wider ${
                canaryEnabled ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {canaryEnabled ? "PROTECTED" : "UNPROTECTED"}
            </span>
            <button
              onClick={() => setCanaryEnabled(!canaryEnabled)}
              className={`w-11 h-6 rounded-full transition-all relative ${
                canaryEnabled
                  ? "bg-emerald-600/80 shadow-[0_0_14px_rgba(16,185,129,0.25)]"
                  : "bg-red-600/80 shadow-[0_0_14px_rgba(239,68,68,0.25)]"
              }`}
              disabled={isRunning}
            >
              <motion.div
                className="w-[18px] h-[18px] bg-white rounded-full absolute top-[3px]"
                animate={{ left: canaryEnabled ? 22 : 3 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </label>

          <div className="w-px h-4 bg-white/[0.06]" />

          {/* Live / Demo */}
          <label className="flex items-center gap-2 text-[10px] cursor-pointer select-none">
            <span className={`font-bold tracking-wider ${liveSearch ? "text-cyan-400" : "text-gray-600"}`}>
              {liveSearch ? "LIVE" : "DEMO"}
            </span>
            <button
              onClick={() => setLiveSearch(!liveSearch)}
              className={`w-9 h-5 rounded-full transition-all relative ${
                liveSearch ? "bg-cyan-600/80 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "bg-gray-700/60"
              }`}
            >
              <div
                className="w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all"
                style={{ left: liveSearch ? 18 : 3 }}
              />
            </button>
          </label>

          <div className="w-px h-4 bg-white/[0.06]" />

          <a
            href="/dashboard"
            className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors font-medium tracking-wide"
          >
            Dashboard →
          </a>
        </div>
      </header>

      {/* ══════════ Main split ══════════ */}
      <div className="flex-1 flex min-h-0 relative z-10">
        {/* ─── Left: Agent Conversation ─── */}
        <div className="w-1/2 flex flex-col border-r border-white/[0.04]">
          <div className="px-5 py-2.5 border-b border-white/[0.04] flex items-center gap-2 bg-white/[0.01]">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Agent Activity
            </span>
            {isRunning && <PulsingDots />}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* Empty state */}
            {chatEvents.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center text-center py-20 opacity-30">
                <p className="text-sm text-gray-500">
                  Enter a product and click <span className="text-amber-400 font-medium">Buy</span>
                </p>
              </div>
            )}

            {/* Messages */}
            <AnimatePresence>
              {chatEvents.map((evt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 items-start py-2 px-3 rounded-lg ${
                    evt.role === "bypass_alert"
                      ? "bypass-glow bg-red-500/[0.07] border border-red-500/20"
                      : "hover:bg-white/[0.015] transition-colors"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    <span
                      className={`text-[8px] font-bold uppercase tracking-wider px-2 py-[3px] rounded-md inline-flex items-center gap-1 ${
                        evt.role === "shopper"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                          : evt.role === "guardian"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                          : evt.role === "bypass_alert"
                          ? "bg-red-500/15 text-red-400 border border-red-500/20"
                          : evt.role === "user"
                          ? "bg-violet-500/10 text-violet-400 border border-violet-500/10"
                          : "bg-white/[0.03] text-gray-500 border border-white/[0.04]"
                      }`}
                    >
                      <span className="text-[9px]">{roleIcon(evt.role!)}</span>
                      {roleLabel(evt.role!)}
                    </span>
                  </div>
                  <p
                    className={`text-[13px] leading-relaxed flex-1 ${
                      evt.role === "bypass_alert"
                        ? "text-red-300 font-semibold"
                        : evt.role === "guardian"
                        ? "text-amber-100/70"
                        : evt.role === "shopper"
                        ? "text-blue-100/70"
                        : evt.role === "user"
                        ? "text-white"
                        : "text-gray-400"
                    }`}
                  >
                    {evt.content}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>

            {isRunning && chatEvents.length > 0 && (
              <div className="pl-3">
                <PulsingDots />
              </div>
            )}

            {/* ── AWAITING_USER consent ── */}
            {sessionResult?.verdict === "AWAITING_USER" &&
              (() => {
                const reasons: string[] = [];
                if (sessionResult.trust_score != null)
                  reasons.push(`Trust score: ${sessionResult.trust_score}/100`);
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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-3"
                  >
                    <div className="rounded-xl p-px bg-gradient-to-br from-amber-500/40 via-amber-500/10 to-transparent">
                      <div className="rounded-xl bg-[#0a0a15] p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-xs">
                            ⚠️
                          </div>
                          <span className="text-sm font-bold text-amber-300">
                            Guardian flagged concerns
                          </span>
                        </div>
                        {reasons.length > 0 && (
                          <ul className="space-y-1.5">
                            {reasons.map((r, ri) => (
                              <li key={ri} className="text-xs text-amber-200/60 flex items-start gap-2">
                                <span className="text-amber-500 mt-px text-[10px]">●</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => sendConsent(true)}
                            className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all font-semibold shadow-lg shadow-emerald-500/10"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => sendConsent(false)}
                            className="px-5 py-2 text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-all font-medium text-gray-400"
                          >
                            Try Next Option
                          </button>
                        </div>
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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-3"
                  >
                    <div className="rounded-xl p-px bg-gradient-to-br from-red-500/40 via-red-500/10 to-transparent">
                      <div className="rounded-xl bg-[#0a0a15] p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center text-xs">
                            🛡️
                          </div>
                          <span className="text-sm font-bold text-red-300">
                            Blocked — want to try another option?
                          </span>
                        </div>
                        {mismatches.length > 0 && (
                          <ul className="space-y-1.5">
                            {mismatches.slice(0, 3).map((m, mi) => (
                              <li key={mi} className="text-xs text-red-200/60 flex items-start gap-2">
                                <span className="text-red-500 mt-px text-[10px]">●</span>
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Canary can search for a better match that actually meets your expectations.
                        </p>
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => sendConsent(false)}
                            className="px-5 py-2 text-sm bg-amber-600 hover:bg-amber-500 rounded-lg transition-all font-semibold shadow-lg shadow-amber-500/10 text-black"
                          >
                            Find Better Option
                          </button>
                          <button
                            onClick={() => {
                              setSessionResult(null);
                              setIsRunning(false);
                            }}
                            className="px-5 py-2 text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-all font-medium text-gray-400"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

            <div ref={chatEndRef} />
          </div>

          {/* ── Input ── */}
          <div className="border-t border-white/[0.04] p-4 bg-white/[0.01]">
            <div className="flex gap-2.5">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to buy?"
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/30 focus:bg-white/[0.04] placeholder:text-gray-600 transition-all"
                disabled={isRunning}
                onKeyDown={(e) => e.key === "Enter" && !isRunning && startPurchase()}
              />
              <button
                onClick={() => startPurchase()}
                disabled={isRunning || !query.trim()}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isRunning || !query.trim()
                    ? "bg-white/[0.03] text-gray-600 cursor-not-allowed border border-white/[0.04]"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:brightness-110"
                }`}
              >
                {isRunning ? (
                  <span className="flex items-center gap-2 text-gray-400">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-4 h-4 border-2 border-gray-600 border-t-gray-300 rounded-full"
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
          <div className="px-5 py-2.5 border-b border-white/[0.04] flex items-center gap-2 bg-white/[0.01]">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Trust Analysis
            </span>
            {isRunning && canaryEnabled && (
              <span className="text-[10px] text-amber-400/50 ml-auto animate-pulse font-medium">
                analyzing
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {/* Canary OFF warning */}
            {!canaryEnabled && events.length > 0 && !sessionResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 bg-red-500/[0.05] border border-red-500/15 rounded-xl text-center"
              >
                <div className="text-3xl mb-2">⚠️</div>
                <p className="text-sm text-red-400 font-bold">No Protection Active</p>
                <p className="text-[11px] text-red-400/40 mt-1">Trust analysis is disabled</p>
              </motion.div>
            )}

            {/* ── Timeline of analysis steps ── */}
            {stepEvents.length > 0 && (
              <div className="relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent" />

                {stepEvents.map((evt, i) => {
                  const step = evt.content?.replace(/[\[\]]/g, "") || "";
                  const isDone = step.includes("done") || step.includes("calculated");
                  const isTrust = step === "trust_score_calculated";
                  const keys = IMPORTANT_KEYS[step] || Object.keys(evt.data || {});

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.02 }}
                      className="relative mb-3"
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-6 top-3.5 w-[9px] h-[9px] rounded-full border-[1.5px] ${
                          isTrust
                            ? "border-amber-400 bg-amber-400/30 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                            : isDone
                            ? "border-amber-500/60 bg-amber-500/15"
                            : "border-amber-500/30 bg-transparent animate-pulse"
                        }`}
                      />

                      {/* Card */}
                      <div
                        className={`rounded-lg p-3.5 border transition-colors ${
                          isTrust
                            ? "bg-amber-500/[0.04] border-amber-500/15"
                            : isDone
                            ? "bg-white/[0.02] border-white/[0.04]"
                            : "bg-white/[0.015] border-amber-500/[0.08]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isTrust ? "text-amber-400" : isDone ? "text-gray-400" : "text-amber-500/60"
                            }`}
                          >
                            {STEP_LABELS[step] || step.replace(/_/g, " ")}
                          </span>
                          {!isDone && (
                            <div className="w-1 h-1 rounded-full bg-amber-500/50 animate-pulse" />
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

            {/* ── Verdict card ── */}
            {sessionResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                <div
                  className={`rounded-2xl p-px bg-gradient-to-br ${verdictColor.border}`}
                >
                  <div className={`rounded-2xl bg-[#09091a] p-6 space-y-5 shadow-2xl ${verdictColor.glow}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-2">
                          Final Verdict
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{verdictIcon}</span>
                          <span className="text-xl font-bold text-white">{verdictLabel}</span>
                        </div>
                      </div>
                      {sessionResult.trust_score != null && (
                        <TrustGauge score={sessionResult.trust_score} />
                      )}
                    </div>

                    {/* Trust bars */}
                    {trustBreakdown && (
                      <div className="space-y-2 pt-2">
                        {Object.entries(trustBreakdown).map(([key, val]) => (
                          <TrustBar key={key} score={val} label={key.replace(/_/g, " ")} />
                        ))}
                      </div>
                    )}

                    {/* Expectation vs Reality */}
                    {sessionResult.expectation && (
                      <div className="pt-4 border-t border-white/[0.04] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">
                            Expectation vs Reality
                          </span>
                          <span
                            className={`text-sm font-bold font-mono ${
                              sessionResult.expectation.match_score >= 70
                                ? "text-emerald-400"
                                : sessionResult.expectation.match_score >= 40
                                ? "text-amber-400"
                                : "text-red-400"
                            }`}
                          >
                            {sessionResult.expectation.match_score}/100
                          </span>
                        </div>
                        <div className="text-[11px] space-y-2">
                          <div className="flex gap-2">
                            <span className="text-blue-400 shrink-0 font-medium">Expects:</span>
                            <span className="text-gray-400">{sessionResult.expectation.user_expects}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-orange-400 shrink-0 font-medium">Reality:</span>
                            <span className="text-gray-400">
                              {sessionResult.expectation.product_reality}
                            </span>
                          </div>
                          {sessionResult.expectation.mismatches?.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {sessionResult.expectation.mismatches.slice(0, 3).map((m, mi) => (
                                <div
                                  key={mi}
                                  className="text-amber-400/70 flex items-start gap-2 text-[11px]"
                                >
                                  <span className="text-amber-500 mt-0.5 text-[9px]">▲</span>
                                  <span>{m}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PayPal order */}
                    {sessionResult.order_id && (
                      <div className="pt-4 border-t border-white/[0.04] text-sm flex items-center gap-2">
                        <span className="text-gray-500 text-xs">PayPal Order:</span>
                        <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md text-xs border border-emerald-500/10">
                          {sessionResult.order_id}
                        </span>
                      </div>
                    )}

                    {/* Bypass alert */}
                    {sessionResult.bypass_attempted && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-red-500/[0.08] rounded-lg text-sm text-red-300 flex items-center gap-2 border border-red-500/15"
                      >
                        🚨 Bypass attempt detected and blocked
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Empty state ── */}
            {events.length === 0 && !isRunning && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/15 to-orange-500/10 border border-amber-500/15 flex items-center justify-center text-4xl mb-6 shadow-xl shadow-amber-500/5"
                >
                  🐤
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Your canary for agentic commerce
                </h2>
                <p className="text-[13px] text-gray-500 max-w-sm leading-relaxed">
                  Multi-agent trust verification that protects you before AI makes a purchase.
                </p>
                <div className="mt-10 flex gap-8 text-[11px] text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500/50" />
                    Shopper Agent
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                    Guardian Agent
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
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
