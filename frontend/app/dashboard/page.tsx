"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import type { ColDef, ICellRendererParams, CellStyle } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

interface Stats {
  total_transactions: number;
  blocked: number;
  approved: number;
  bypass_attempts: number;
  avg_trust_score: number;
  block_rate: number;
}

interface Transaction {
  id: number;
  created_at: string;
  user_query: string;
  product_name: string;
  product_price: number;
  merchant_domain: string;
  trust_score: number;
  verdict: string;
  paypal_order_id: string | null;
  bypass_attempted: number;
  trust_breakdown: string;
}

/* ── SVG Canary Logo (same as main page) ── */
function CanaryLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-secondary)" />
        </linearGradient>
      </defs>
      <path
        d="M16 3C11 3 7 6.5 7 11c0 2.5 1.2 4.7 3 6.2L8 22l3-1.5L9 27h4l1-3 2 3 2-3 1 3h4l-2-6.5 3 1.5-2-4.8c1.8-1.5 3-3.7 3-6.2C25 6.5 21 3 16 3z"
        fill="url(#cGrad)"
      />
      <circle cx="13" cy="10" r="1.2" fill="var(--bg)" />
      <path d="M6 12c-2-1-3.5 0-3 2s3 2 4 1" fill="url(#cGrad)" opacity="0.7" />
    </svg>
  );
}

/* ── Theme icons ── */
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

/* ── Theme hook ── */
function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("canary-theme") as "dark" | "light" | null;
    if (saved) {
      setThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("canary-theme", next);
  }, [theme]);

  return { theme, toggle, isDark: theme === "dark" };
}

function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div
        className="text-[9px] uppercase tracking-[0.15em] font-bold mb-2"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </div>
      <div className="text-3xl font-black font-mono" style={{ color }}>{value}</div>
    </motion.div>
  );
}

const canaryDark = themeQuartz.withParams({
  backgroundColor: "#09091a",
  foregroundColor: "#e5e5e5",
  headerBackgroundColor: "#0c0c18",
  headerTextColor: "#71717a",
  borderColor: "rgba(255,255,255,0.04)",
  rowHoverColor: "rgba(255,255,255,0.02)",
  headerFontSize: 10,
  fontSize: 12,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  rowBorder: { color: "rgba(255,255,255,0.03)" },
  columnBorder: false,
  wrapperBorder: false,
  cellHorizontalPadding: 16,
  headerColumnResizeHandleColor: "#333",
  spacing: 6,
});

const canaryLight = themeQuartz.withParams({
  backgroundColor: "#fafafa",
  foregroundColor: "#1a1a2e",
  headerBackgroundColor: "#f0f0f2",
  headerTextColor: "#6b7280",
  borderColor: "rgba(0,0,0,0.06)",
  rowHoverColor: "rgba(0,0,0,0.02)",
  headerFontSize: 10,
  fontSize: 12,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  rowBorder: { color: "rgba(0,0,0,0.04)" },
  columnBorder: false,
  wrapperBorder: false,
  cellHorizontalPadding: 16,
  headerColumnResizeHandleColor: "#ccc",
  spacing: 6,
});

export default function Dashboard() {
  const { toggle, isDark } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, txRes] = await Promise.all([
          fetch(`${API_URL}/api/stats`),
          fetch(`${API_URL}/api/transactions`),
        ]);
        setStats(await statsRes.json());
        setTransactions(await txRes.json());
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const columnDefs = useMemo<ColDef<Transaction>[]>(
    () => [
      {
        headerName: "TIME",
        field: "created_at",
        flex: 1.2,
        minWidth: 140,
        cellStyle: { color: "#71717a", fontSize: "11px" } as CellStyle,
      },
      {
        headerName: "PRODUCT",
        field: "product_name",
        flex: 1.5,
        minWidth: 160,
        valueFormatter: (p) => p.value || "—",
      },
      {
        headerName: "MERCHANT",
        field: "merchant_domain",
        flex: 1.3,
        minWidth: 140,
        cellStyle: { fontSize: "11px" } as CellStyle,
        valueFormatter: (p) => p.value || "—",
      },
      {
        headerName: "PRICE",
        field: "product_price",
        flex: 0.7,
        minWidth: 80,
        valueFormatter: (p) =>
          p.value != null ? `$${Number(p.value).toFixed(2)}` : "—",
      },
      {
        headerName: "TRUST",
        field: "trust_score",
        flex: 0.6,
        minWidth: 70,
        cellRenderer: (p: ICellRendererParams<Transaction>) => {
          if (p.value == null) return <span style={{ color: "#3f3f46" }}>{"—"}</span>;
          const color =
            p.value >= 70 ? "#10b981" : p.value >= 40 ? "#f59e0b" : "#ef4444";
          return <span style={{ fontWeight: 700, color }}>{p.value}</span>;
        },
      },
      {
        headerName: "VERDICT",
        field: "verdict",
        flex: 0.9,
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<Transaction>) => {
          const colors: Record<string, { bg: string; fg: string; border: string }> = {
            BLOCKED: { bg: "rgba(239,68,68,0.1)", fg: "#f87171", border: "rgba(239,68,68,0.2)" },
            APPROVED: { bg: "rgba(16,185,129,0.1)", fg: "#34d399", border: "rgba(16,185,129,0.2)" },
            AWAITING_USER: { bg: "rgba(245,158,11,0.1)", fg: "#fbbf24", border: "rgba(245,158,11,0.2)" },
            USER_APPROVED: { bg: "rgba(16,185,129,0.1)", fg: "#6ee7b7", border: "rgba(16,185,129,0.2)" },
            USER_CANCELLED: { bg: "rgba(107,114,128,0.1)", fg: "#9ca3af", border: "rgba(107,114,128,0.2)" },
          };
          const c = colors[p.value] || colors["USER_CANCELLED"];
          return (
            <span
              style={{
                background: c.bg,
                color: c.fg,
                border: `1px solid ${c.border}`,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: 4,
                letterSpacing: "0.04em",
              }}
            >
              {p.value}
            </span>
          );
        },
      },
      {
        headerName: "BYPASS",
        field: "bypass_attempted",
        flex: 0.5,
        minWidth: 60,
        cellRenderer: (p: ICellRendererParams<Transaction>) =>
          p.value ? (
            <span style={{ color: "#f87171", fontSize: 11, fontWeight: 700 }}>YES</span>
          ) : (
            <span style={{ color: "#3f3f46", fontSize: 11 }}>No</span>
          ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: "var(--bg)" }}>
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "var(--bg)" }} />
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 80% 50% at 50% -20%, var(--brand-dim), transparent 70%)",
              "radial-gradient(ellipse 50% 50% at 100% 50%, rgba(99,102,241,0.02), transparent 60%)",
            ].join(","),
          }}
        />
      </div>

      {/* Header */}
      <header
        className="relative z-10 px-6 py-3 flex items-center justify-between glass"
      >
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--brand-glow), transparent)" }}
        />
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--brand-dim), transparent)",
              border: "1px solid var(--border-bright)",
            }}
          >
            <CanaryLogo size={22} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Canary Dashboard
            </h1>
            <span
              className="text-[9px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: "var(--brand)", opacity: 0.5 }}
            >
              Transaction Monitor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "var(--text-secondary)" }}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>

          <div className="w-px h-4" style={{ background: "var(--border)" }} />

          <a
            href="/"
            className="text-[11px] font-medium tracking-wide transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <span className="mr-1 opacity-50">{"←"}</span>
            Back to Demo
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6 relative z-10">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Transactions" value={stats.total_transactions} color="var(--text)" delay={0} />
            <StatCard label="Blocked" value={stats.blocked} color="var(--danger)" delay={0.05} />
            <StatCard label="Approved" value={stats.approved} color="var(--success)" delay={0.1} />
            <StatCard label="Bypass Attempts" value={stats.bypass_attempts} color="var(--danger)" delay={0.15} />
            <StatCard
              label="Avg Trust"
              value={stats.avg_trust_score}
              color={
                stats.avg_trust_score >= 70
                  ? "var(--success)"
                  : stats.avg_trust_score >= 40
                  ? "var(--warning)"
                  : "var(--danger)"
              }
              delay={0.2}
            />
            <StatCard label="Block Rate" value={`${stats.block_rate}%`} color="var(--brand)" delay={0.25} />
          </div>
        )}

        {/* AG Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Transaction History</h2>
            <span
              className="text-[9px] uppercase tracking-[0.15em] font-bold"
              style={{ color: "var(--text-dim)" }}
            >
              Powered by AG Grid
            </span>
          </div>
          <div style={{ height: Math.max(320, transactions.length * 48 + 56) }}>
            <AgGridReact<Transaction>
              theme={isDark ? canaryDark : canaryLight}
              rowData={transactions}
              columnDefs={columnDefs}
              animateRows={true}
              domLayout="normal"
              rowHeight={44}
              headerHeight={40}
              suppressCellFocus={true}
              overlayNoRowsTemplate='<div style="padding:40px;color:#3f3f46;font-size:13px">No transactions yet — run the demo first</div>'
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
