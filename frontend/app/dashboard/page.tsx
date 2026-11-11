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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6"
    >
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
    </motion.div>
  );
}


const canaryDark = themeQuartz.withParams({
  backgroundColor: "#0a0a0a",
  foregroundColor: "#e5e5e5",
  headerBackgroundColor: "#111111",
  headerTextColor: "#9ca3af",
  borderColor: "#1a1a1a",
  rowHoverColor: "rgba(255,255,255,0.02)",
  headerFontSize: 11,
  fontSize: 13,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  rowBorder: { color: "#1a1a1a" },
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
        cellStyle: { color: "#9ca3af", fontSize: "11px" } as CellStyle,
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
          if (p.value == null) return <span style={{ color: "#4b5563" }}>—</span>;
          const color =
            p.value >= 70
              ? "#4ade80"
              : p.value >= 40
              ? "#facc15"
              : "#f87171";
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
            BLOCKED: { bg: "rgba(239,68,68,0.15)", fg: "#f87171", border: "rgba(239,68,68,0.3)" },
            APPROVED: { bg: "rgba(34,197,94,0.15)", fg: "#4ade80", border: "rgba(34,197,94,0.3)" },
            AWAITING_USER: { bg: "rgba(234,179,8,0.15)", fg: "#facc15", border: "rgba(234,179,8,0.3)" },
            USER_APPROVED: { bg: "rgba(34,197,94,0.15)", fg: "#86efac", border: "rgba(34,197,94,0.3)" },
            USER_CANCELLED: { bg: "rgba(107,114,128,0.15)", fg: "#9ca3af", border: "rgba(107,114,128,0.3)" },
          };
          const c = colors[p.value] || colors["USER_CANCELLED"];
          return (
            <span style={{
              background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              padding: "2px 8px", borderRadius: 4,
            }}>
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
          p.value
            ? <span style={{ color: "#f87171", fontSize: 11, fontWeight: 700 }}>YES</span>
            : <span style={{ color: "#4b5563", fontSize: 11 }}>No</span>,
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-lg">
            🐤
          </div>
          <h1 className="text-xl font-bold tracking-tight">Canary Dashboard</h1>
        </div>
        <a
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Demo
        </a>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard
              label="Total Transactions"
              value={stats.total_transactions}
              color="text-white"
              delay={0}
            />
            <StatCard
              label="Blocked"
              value={stats.blocked}
              color="text-red-400"
              delay={0.1}
            />
            <StatCard
              label="Approved"
              value={stats.approved}
              color="text-green-400"
              delay={0.2}
            />
            <StatCard
              label="Bypass Attempts"
              value={stats.bypass_attempts}
              color="text-red-400"
              delay={0.3}
            />
            <StatCard
              label="Avg Trust Score"
              value={stats.avg_trust_score}
              color={
                stats.avg_trust_score >= 70
                  ? "text-green-400"
                  : stats.avg_trust_score >= 40
                  ? "text-yellow-400"
                  : "text-red-400"
              }
              delay={0.4}
            />
            <StatCard
              label="Block Rate"
              value={`${stats.block_rate}%`}
              color="text-orange-400"
              delay={0.5}
            />
          </div>
        )}

        {/* AG Grid Transaction History */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between">
            <h2 className="font-semibold">Transaction History</h2>
            <span className="text-[10px] text-gray-600 uppercase tracking-widest">
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
              overlayNoRowsTemplate='<div style="padding:40px;color:#6b7280">No transactions yet. Run the demo first!</div>'
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
