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
}

function roleColor(role: string): string {
  const map: Record<string, string> = {
    user: "text-white",
    shopper: "text-blue-400",
    guardian: "text-orange-400",
    system: "text-gray-400",
    bypass_alert: "text-red-400 font-bold",
  };
  return map[role] || "text-gray-300";
}

function roleIcon(role: string): string {
  const map: Record<string, string> = {
    user: "👤",
    shopper: "🛒",
    guardian: "🛡️",
    system: "⚙️",
    bypass_alert: "🚨",
  };
  return map[role] || "💬";
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    user: "You",
    shopper: "Shopper",
    guardian: "Guardian",
    system: "System",
    bypass_alert: "ALERT",
  };
  return map[role] || role;
}

function PulsingDots() {
  return (
    <div className="flex items-center gap-1 py-2 px-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-blue-400 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function TrustScoreBar({
  score,
  label,
  max = 100,
}: {
  score: number;
  label: string;
  max?: number;
}) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const color =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span
        className={`w-8 text-right font-mono text-xs font-bold ${
          score >= 70
            ? "text-green-400"
            : score >= 40
            ? "text-yellow-400"
            : "text-red-400"
        }`}
      >
        {score}
      </span>
    </div>
  );
}

function StepCard({
  step,
  data,
  index,
}: {
  step: string;
  data: Record<string, unknown>;
  index: number;
}) {
  const isDone = step.includes("done") || step.includes("calculated");
  const stepLabels: Record<string, string> = {
    domain_check_start: "🔍 Checking Domain...",
    domain_check_done: "🌐 Domain Analysis",
    price_check_start: "💰 Comparing Prices...",
    price_check_done: "💰 Price Analysis",
    review_analysis_start: "📝 Analyzing Reviews...",
    review_analysis_done: "📝 Review Analysis",
    registry_check_start: "🏢 Checking Registry...",
    registry_check_done: "🏢 Registry Check",
    trust_score_calculated: "📊 Trust Score",
  };

  const importantKeys: Record<string, string[]> = {
    domain_check_done: ["domain_age_days", "domain_age_score", "ssl_valid", "ssl_issuer", "ssl_score"],
    price_check_done: ["market_avg", "price_deviation_pct", "price_score", "sources_count"],
    review_analysis_done: ["authenticity_score", "red_flags", "reasoning"],
    registry_check_done: ["registry_score"],
    trust_score_calculated: ["trust_score", "verdict", "breakdown"],
  };

  const keysToShow = importantKeys[step] || Object.keys(data);
  const isTrustScore = step === "trust_score_calculated";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={`border rounded-lg p-4 ${
        isTrustScore
          ? "bg-[#111118] border-orange-500/30"
          : isDone
          ? "bg-[#111118] border-[#1e1e2e]"
          : "bg-[#111118] border-yellow-500/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-2 h-2 rounded-full ${
            isDone ? "bg-green-500" : "bg-yellow-500 animate-pulse"
          }`}
        />
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            isTrustScore ? "text-orange-400" : "text-gray-400"
          }`}
        >
          {stepLabels[step] || step.replace(/_/g, " ")}
        </span>
      </div>
      <div className="space-y-1">
        {keysToShow.map((k) => {
          const v = data[k];
          if (v === undefined) return null;

          if (k === "red_flags" && Array.isArray(v)) {
            return (
              <div key={k} className="mt-1">
                {(v as string[]).map((flag, fi) => (
                  <div
                    key={fi}
                    className="text-[11px] text-red-400/80 pl-3 border-l-2 border-red-500/30 mb-1"
                  >
                    {flag}
                  </div>
                ))}
              </div>
            );
          }

          if (k === "breakdown" && typeof v === "object" && v !== null) {
            return (
              <div key={k} className="space-y-1 mt-1">
                {Object.entries(v as Record<string, number>).map(([bk, bv]) => (
                  <div key={bk} className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-500">{bk}</span>
                    <span
                      className={
                        bv >= 70
                          ? "text-green-400"
                          : bv >= 40
                          ? "text-yellow-400"
                          : "text-red-400"
                      }
                    >
                      {bv}
                    </span>
                  </div>
                ))}
              </div>
            );
          }

          if (k === "reasoning") {
            return (
              <div
                key={k}
                className="text-[11px] text-gray-400 italic mt-1 leading-relaxed"
              >
                {String(v)}
              </div>
            );
          }

          return (
            <div key={k} className="flex justify-between text-[11px] font-mono">
              <span className="text-gray-500">{k.replace(/_/g, " ")}</span>
              <span
                className={
                  typeof v === "boolean"
                    ? v
                      ? "text-green-400"
                      : "text-red-400"
                    : typeof v === "number" && k.includes("score")
                    ? v >= 70
                      ? "text-green-400"
                      : v >= 40
                      ? "text-yellow-400"
                      : "text-red-400"
                    : k === "verdict"
                    ? v === "BLOCKED"
                      ? "text-red-400 font-bold"
                      : v === "APPROVED"
                      ? "text-green-400 font-bold"
                      : "text-yellow-400 font-bold"
                    : "text-gray-300"
                }
              >
                {String(v ?? "null")}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

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

  const startPurchase = useCallback(async (canaryOverride?: boolean) => {
    const canary = canaryOverride !== undefined ? canaryOverride : canaryEnabled;
    setEvents([]);
    setSessionResult(null);
    setIsRunning(true);

    try {
      const res = await fetch(`${API_URL}/api/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          canary,
          sites: DEMO_SITES,
        }),
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
          if (line.startsWith("data: ")) {
            try {
              const evt: SSEEvent = JSON.parse(line.slice(6));
              if (evt.type === "session_start") {
                setSessionId(evt.session_id || null);
              } else if (evt.type === "session_end") {
                setSessionResult(evt);
              } else if (evt.type === "event") {
                setEvents((prev) => [...prev, evt]);
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        { type: "event", role: "system", content: `Connection error: ${err}` },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [query, canaryEnabled]);

  // Auto-start via ?auto=on or ?auto=off
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
      const res = await fetch(`${API_URL}/api/consent/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      const data = await res.json();
      setEvents((prev) => [
        ...prev,
        {
          type: "event",
          role: "system",
          content: consent
            ? `User approved. Order: ${data.order_id || "pending"}`
            : "User cancelled the transaction.",
        },
      ]);
      setSessionResult((prev) =>
        prev ? { ...prev, verdict: data.verdict, order_id: data.order_id } : null
      );
    },
    [sessionId]
  );

  const trustBreakdown = sessionResult?.trust_breakdown as
    | Record<string, number>
    | undefined;

  const chatEvents = events.filter(
    (e) => e.role && e.content && !e.content.startsWith("[")
  );
  const stepEvents = events.filter(
    (e) => e.role === "guardian" && e.content?.startsWith("[") && e.data
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[#1e1e2e] px-6 py-3 flex items-center justify-between bg-[#0d0d14]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500/30 to-orange-500/20 flex items-center justify-center text-lg">
            🐤
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              Canary
            </h1>
            <span className="text-[10px] text-gray-500 tracking-wide">
              TRUST VERIFICATION FOR AGENTIC COMMERCE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
            <span
              className={`text-xs font-semibold tracking-wide ${
                canaryEnabled ? "text-green-400" : "text-red-400"
              }`}
            >
              {canaryEnabled ? "PROTECTED" : "UNPROTECTED"}
            </span>
            <button
              onClick={() => setCanaryEnabled(!canaryEnabled)}
              className={`w-11 h-6 rounded-full transition-all relative ${
                canaryEnabled
                  ? "bg-green-600 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  : "bg-red-600 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              }`}
              disabled={isRunning}
            >
              <motion.div
                className="w-4.5 h-4.5 bg-white rounded-full absolute top-[3px]"
                animate={{ left: canaryEnabled ? 22 : 3 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ width: 18, height: 18 }}
              />
            </button>
          </label>
          <div className="w-px h-5 bg-[#1e1e2e]" />
          <a
            href="/dashboard"
            className="text-xs text-gray-500 hover:text-white transition-colors font-medium"
          >
            Dashboard →
          </a>
        </div>
      </header>

      {/* Main split-screen */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chat Panel */}
        <div className="w-1/2 border-r border-[#1e1e2e] flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#1e1e2e] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Agent Conversation
            </span>
            {isRunning && <PulsingDots />}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatEvents.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center text-center py-16 opacity-40">
                <p className="text-sm text-gray-500">
                  Click <span className="text-blue-400 font-medium">Buy</span> to
                  start a purchase flow
                </p>
              </div>
            )}

            <AnimatePresence>
              {chatEvents.map((evt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 items-start ${
                    evt.role === "bypass_alert"
                      ? "bypass-glow rounded-lg p-3 bg-red-500/10 border border-red-500/30"
                      : ""
                  }`}
                >
                  <div className="shrink-0 mt-0.5 w-16">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                        evt.role === "shopper"
                          ? "bg-blue-500/15 text-blue-400"
                          : evt.role === "guardian"
                          ? "bg-orange-500/15 text-orange-400"
                          : evt.role === "bypass_alert"
                          ? "bg-red-500/20 text-red-400"
                          : evt.role === "user"
                          ? "bg-purple-500/15 text-purple-400"
                          : "bg-gray-500/15 text-gray-500"
                      }`}
                    >
                      <span>{roleIcon(evt.role!)}</span>
                      {roleLabel(evt.role!)}
                    </span>
                  </div>
                  <p
                    className={`text-[13px] leading-relaxed flex-1 ${roleColor(
                      evt.role!
                    )}`}
                  >
                    {evt.content}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>

            {isRunning && chatEvents.length > 0 && <PulsingDots />}

            {sessionResult?.verdict === "AWAITING_USER" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex gap-3 items-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mt-2"
              >
                <span className="text-sm text-yellow-400 flex-1">
                  ⚠️ Guardian flagged concerns. Proceed anyway?
                </span>
                <button
                  onClick={() => sendConsent(true)}
                  className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 rounded-md transition-colors font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => sendConsent(false)}
                  className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 rounded-md transition-colors font-medium"
                >
                  Deny
                </button>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[#1e1e2e] p-4 bg-[#0d0d14]">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to buy?"
                className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-gray-600 transition-colors"
                disabled={isRunning}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isRunning && startPurchase()
                }
              />
              <button
                onClick={() => startPurchase()}
                disabled={isRunning || !query.trim()}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isRunning || !query.trim()
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                }`}
              >
                {isRunning ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="inline-block w-4 h-4 border-2 border-gray-500 border-t-white rounded-full"
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

        {/* Right: Step Showcaser */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#1e1e2e] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Trust Analysis
            </span>
            {isRunning && canaryEnabled && (
              <span className="text-[10px] text-orange-400 ml-auto animate-pulse">
                analyzing...
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Canary OFF warning */}
            {!canaryEnabled && events.length > 0 && !sessionResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center"
              >
                <div className="text-2xl mb-2">⚠️</div>
                <p className="text-sm text-red-400 font-semibold">
                  Canary Protection OFF
                </p>
                <p className="text-xs text-red-400/60 mt-1">
                  No trust analysis is being performed
                </p>
              </motion.div>
            )}

            {/* Trust step cards */}
            {stepEvents.map((evt, i) => {
              const step = evt.content?.replace(/[\[\]]/g, "") || "";
              return (
                <StepCard
                  key={i}
                  step={step}
                  data={evt.data as Record<string, unknown>}
                  index={i}
                />
              );
            })}

            {/* Final verdict card */}
            {sessionResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className={`rounded-xl p-6 border-2 ${
                  sessionResult.verdict === "BLOCKED"
                    ? "bg-red-500/10 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                    : sessionResult.verdict === "APPROVED" && !canaryEnabled
                    ? "bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.1)]"
                    : sessionResult.verdict === "APPROVED"
                    ? "bg-green-500/10 border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
                    : "bg-yellow-500/10 border-yellow-500/40"
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Final Verdict
                    </div>
                    <span className="text-xl font-bold">
                      {sessionResult.verdict === "BLOCKED"
                        ? "🛡️ Transaction Blocked"
                        : sessionResult.verdict === "APPROVED" && !canaryEnabled
                        ? "⚠️ Unprotected Purchase"
                        : sessionResult.verdict === "APPROVED"
                        ? "✅ Transaction Approved"
                        : sessionResult.verdict === "AWAITING_USER"
                        ? "⏳ Awaiting Decision"
                        : `📋 ${sessionResult.verdict}`}
                    </span>
                  </div>
                  {sessionResult.trust_score != null && (
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Score</div>
                      <span
                        className={`text-4xl font-black font-mono ${
                          sessionResult.trust_score >= 70
                            ? "text-green-400"
                            : sessionResult.trust_score >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {sessionResult.trust_score}
                      </span>
                    </div>
                  )}
                </div>

                {trustBreakdown && (
                  <div className="space-y-2.5">
                    <TrustScoreBar
                      score={trustBreakdown.domain_age ?? 0}
                      label="Domain Age"
                    />
                    <TrustScoreBar score={trustBreakdown.ssl ?? 0} label="SSL" />
                    <TrustScoreBar
                      score={trustBreakdown.price ?? 0}
                      label="Price"
                    />
                    <TrustScoreBar
                      score={trustBreakdown.reviews ?? 0}
                      label="Reviews"
                    />
                    <TrustScoreBar
                      score={trustBreakdown.registry ?? 0}
                      label="Registry"
                    />
                  </div>
                )}

                {sessionResult.order_id && (
                  <div className="mt-5 pt-4 border-t border-white/10 text-sm flex items-center gap-2">
                    <span className="text-gray-500">PayPal Order:</span>
                    <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-xs">
                      {sessionResult.order_id}
                    </span>
                  </div>
                )}

                {sessionResult.bypass_attempted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-3 bg-red-500/20 rounded-lg text-sm text-red-300 flex items-center gap-2 border border-red-500/30"
                  >
                    🚨 Bypass attempt was detected and blocked
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Empty state */}
            {events.length === 0 && !isRunning && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                <div className="text-6xl mb-5">🐤</div>
                <h2 className="text-xl font-bold mb-2">
                  Your canary for agentic commerce
                </h2>
                <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                  Toggle protection off to see what happens when an AI agent shops
                  without trust verification. Then turn it on and watch the Guardian
                  catch the scam.
                </p>
                <div className="mt-8 flex gap-6 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Shopper Agent
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    Guardian Agent
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
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
