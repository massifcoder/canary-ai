"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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

function VerdictBadge({ verdict }: { verdict: string }) {
  const style: Record<string, string> = {
    BLOCKED: "bg-red-500/20 text-red-400 border-red-500/30",
    APPROVED: "bg-green-500/20 text-green-400 border-green-500/30",
    AWAITING_USER: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    USER_APPROVED: "bg-green-500/20 text-green-300 border-green-500/30",
    USER_CANCELLED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
        style[verdict] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
      }`}
    >
      {verdict}
    </span>
  );
}

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

        {/* Transactions table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--card-border)]">
            <h2 className="font-semibold">Transaction History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-[var(--card-border)]">
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Merchant</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Trust Score</th>
                  <th className="px-6 py-3">Verdict</th>
                  <th className="px-6 py-3">Bypass</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="border-b border-[var(--card-border)] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                      {tx.created_at}
                    </td>
                    <td className="px-6 py-3">{tx.product_name || "—"}</td>
                    <td className="px-6 py-3 font-mono text-xs">
                      {tx.merchant_domain || "—"}
                    </td>
                    <td className="px-6 py-3 font-mono">
                      {tx.product_price ? `$${tx.product_price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-6 py-3">
                      {tx.trust_score != null ? (
                        <span
                          className={`font-mono font-bold ${
                            tx.trust_score >= 70
                              ? "text-green-400"
                              : tx.trust_score >= 40
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {tx.trust_score}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <VerdictBadge verdict={tx.verdict} />
                    </td>
                    <td className="px-6 py-3">
                      {tx.bypass_attempted ? (
                        <span className="text-red-400 text-xs font-bold">
                          🚨 YES
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">No</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No transactions yet. Run the demo first!
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
