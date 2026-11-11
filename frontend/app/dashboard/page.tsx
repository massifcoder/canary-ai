"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import type { ColDef, ICellRendererParams, CellStyle } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
      className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-xl p-5"
    >
      <div className="text-[9px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-2">
        {label}
      </div>
      <div className={`text-3xl font-black font-mono ${color}`}>{value}</div>
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

export default function Dashboard() {
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
          if (p.value == null) return <span style={{ color: "#3f3f46" }}>—</span>;
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-sm">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245,183,49,0.03), transparent 70%)",
              "radial-gradient(ellipse 50% 50% at 100% 50%, rgba(59,130,246,0.015), transparent 60%)",
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

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] px-6 py-4 flex items-center justify-between bg-white/[0.015] backdrop-blur-xl">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-lg shadow-lg shadow-amber-500/5">
            🐤
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Canary Dashboard</h1>
            <span className="text-[9px] text-amber-500/40 font-semibold tracking-[0.2em] uppercase">
              Transaction Monitor
            </span>
          </div>
        </div>
        <a
          href="/"
          className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors font-medium tracking-wide"
        >
          ← Back to Demo
        </a>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6 relative z-10">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Transactions" value={stats.total_transactions} color="text-white" delay={0} />
            <StatCard label="Blocked" value={stats.blocked} color="text-red-400" delay={0.05} />
            <StatCard label="Approved" value={stats.approved} color="text-emerald-400" delay={0.1} />
            <StatCard label="Bypass Attempts" value={stats.bypass_attempts} color="text-red-400" delay={0.15} />
            <StatCard
              label="Avg Trust"
              value={stats.avg_trust_score}
              color={
                stats.avg_trust_score >= 70
                  ? "text-emerald-400"
                  : stats.avg_trust_score >= 40
                  ? "text-amber-400"
                  : "text-red-400"
              }
              delay={0.2}
            />
            <StatCard label="Block Rate" value={`${stats.block_rate}%`} color="text-amber-400" delay={0.25} />
          </div>
        )}

        {/* AG Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden backdrop-blur-sm"
        >
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <h2 className="font-semibold text-sm text-white">Transaction History</h2>
            <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-bold">
              Powered by AG Grid
            </span>
          </div>
          <div style={{ height: Math.max(320, transactions.length * 48 + 56) }}>
            <AgGridReact<Transaction>
              theme={canaryDark}
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
