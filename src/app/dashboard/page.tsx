"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BrokerConnectCard } from "@/components/BrokerConnectCard";
import { CopyTradingPanel } from "@/components/CopyTradingPanel";
import { LiveTradesFeed } from "@/components/LiveTradesFeed";
import { SignalForm } from "@/components/SignalForm";
import { SummaryCards } from "@/components/SummaryCards";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";
import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type { BrokerAccount, BrokerBalance, CopyLeaderStats, DashboardOverview, DashboardSummary, Trade } from "@/lib/types";

const initialSummary: DashboardSummary = {
  total_trades: 0,
  cumulative_pnl: "0",
  winning_trades: 0,
  losing_trades: 0,
};

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [brokerAccount, setBrokerAccount] = useState<BrokerAccount | null>(null);
  const [brokerBalance, setBrokerBalance] = useState<BrokerBalance | null>(null);
  const [copyStats, setCopyStats] = useState<CopyLeaderStats | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const loadData = async () => {
    try {
      const [summaryRes, tradesRes, overviewRes] = await Promise.all([
        api.get<DashboardSummary>("/dashboard/summary"),
        api.get<Trade[]>("/trades/me"),
        api.get<DashboardOverview>("/dashboard/overview"),
      ]);
      setSummary(summaryRes.data);
      setTrades(tradesRes.data);
      setOverview(overviewRes.data);
    } finally {
      setLoading(false);
    }
  };

  const loadExtras = async () => {
    try {
      const [balanceRes, statsRes] = await Promise.allSettled([
        api.get<BrokerBalance>("/broker/balance"),
        api.get<CopyLeaderStats>("/copy/leaders/1/stats"),
      ]);

      if (balanceRes.status === "fulfilled") {
        setBrokerBalance(balanceRes.value.data);
      }

      if (statsRes.status === "fulfilled") {
        setCopyStats(statsRes.value.data);
      }
    } catch {
      // Dashboard still renders if optional panels fail.
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    void loadData();
    void loadExtras();
  }, [router]);

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const openProfilePage = () => {
    setShowProfileMenu(false);
    router.push("/dashboard/profile?tab=profile");
  };

  const openTradingAccountPage = () => {
    setShowProfileMenu(false);
    router.push("/dashboard/profile?tab=trading");
  };

  const openNotificationPage = () => {
    setShowProfileMenu(false);
    router.push("/dashboard/profile?tab=notification");
  };

  const onTradeCreated = (trade: Trade) => {
    setTrades((current) => [trade, ...current]);
    void loadData();
  };

  const winRate =
    summary.total_trades > 0 ? Math.round((summary.winning_trades / summary.total_trades) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#050607] text-[#E8ECEF]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-[#1A1E23] bg-[#090B0F]/90 px-5 py-4 shadow-[0_0_0_1px_rgba(153,255,0,0.04)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1E23] pb-4">
            <nav className="flex items-center gap-2 text-sm">
              <button className="rounded-full bg-[#0F141B] px-3 py-1.5 font-semibold text-[#F3F7FB]">Dashboard</button>
              <button className="rounded-full px-3 py-1.5 text-[#AAB4C0] hover:bg-[#0F141B] hover:text-[#F3F7FB]">Strategy</button>
              <button className="rounded-full px-3 py-1.5 text-[#AAB4C0] hover:bg-[#0F141B] hover:text-[#F3F7FB]">Academy</button>
            </nav>

            <div className="relative flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-[#2A313A] bg-[#0B0F14] px-3 py-1.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#7F8A97]" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.65" y1="16.65" x2="21" y2="21" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-28 bg-transparent text-sm text-[#DDE4EC] outline-none placeholder:text-[#7F8A97] sm:w-40"
                />
              </div>

              <button
                onClick={() => setShowProfileMenu((current) => !current)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2A313A] bg-[#0B0F14] text-[#C1CBD8] hover:bg-[#10151D]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
                </svg>
              </button>

              {showProfileMenu ? (
                <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-[#26303A] bg-[#0B0F14] p-2 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
                  <button
                    onClick={openProfilePage}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#D5DEE8] hover:bg-[#111822]"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={openNotificationPage}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#D5DEE8] hover:bg-[#111822]"
                  >
                    Notification
                  </button>
                  <button
                    onClick={openTradingAccountPage}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#D5DEE8] hover:bg-[#111822]"
                  >
                    Trading Account
                  </button>
                  <div className="my-1 border-t border-[#1F2833]" />
                  <button
                    onClick={onLogout}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#F87171] hover:bg-[#111822]"
                  >
                    Sign Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[#8B95A1]">Trading Desk</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#F6FAFF]">Hello, Vishnu</h1>
            </div>
            <div className="flex items-center gap-3" />
          </div>
          <p className="mt-3 text-sm text-[#9AA5B1]">
            Connect broker after login to enable live order routing, copy trading, and dashboard sync.
          </p>
          {brokerAccount ? (
            <p className="mt-2 text-sm text-[#9BFF00]">Connected broker: {brokerAccount.broker_name}</p>
          ) : null}
        </header>

        {loading ? (
          <p className="rounded-xl border border-[#1A1E23] bg-[#090B0F] px-5 py-8 text-[#9AA5B1]">Loading dashboard...</p>
        ) : (
          <div className="space-y-6">
            <SummaryCards summary={summary} />

            <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
              <div className="rounded-2xl border border-[#1A1E23] bg-gradient-to-b from-[#0D1218] to-[#090C11] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#F3F7FB]">Portfolio Performance</h2>
                  <span className="rounded-full border border-[#26303A] px-3 py-1 text-xs text-[#AAB4C0]">PnL Trend</span>
                </div>
                <div className="relative h-52 overflow-hidden rounded-xl border border-[#20262E] bg-[#06090E]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(155,255,0,0.16),transparent_55%)]" />
                  <svg viewBox="0 0 600 240" className="absolute inset-0 h-full w-full">
                    <polyline
                      fill="none"
                      stroke="#9BFF00"
                      strokeWidth="3"
                      points="0,210 60,178 120,185 180,154 240,142 300,104 360,116 420,86 480,63 540,52 600,32"
                    />
                  </svg>
                </div>
              </div>

              <aside className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
                <h2 className="text-lg font-semibold text-[#F3F7FB]">Quick Stats</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-[#20262E] bg-[#0D1218] px-3 py-2">
                    <span className="text-[#94A0AD]">Total Trades</span>
                    <span className="font-semibold text-[#F6FAFF]">{summary.total_trades}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#20262E] bg-[#0D1218] px-3 py-2">
                    <span className="text-[#94A0AD]">Cumulative PnL</span>
                    <span className="font-semibold text-[#67E8A5]">{summary.cumulative_pnl}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#20262E] bg-[#0D1218] px-3 py-2">
                    <span className="text-[#94A0AD]">Win Rate</span>
                    <span className="font-semibold text-[#9BFF00]">{winRate}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#20262E] bg-[#0D1218] px-3 py-2">
                    <span className="text-[#94A0AD]">Broker Balance</span>
                    <span className="font-semibold text-[#F6FAFF]">
                      {brokerBalance ? `${brokerBalance.currency} ${brokerBalance.balance}` : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#20262E] bg-[#0D1218] px-3 py-2">
                    <span className="text-[#94A0AD]">Open Positions</span>
                    <span className="font-semibold text-[#F6FAFF]">{overview?.open_positions.length ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#20262E] bg-[#0D1218] px-3 py-2">
                    <span className="text-[#94A0AD]">Strategies</span>
                    <span className="font-semibold text-[#F6FAFF]">{overview?.strategy_performance.length ?? 0}</span>
                  </div>
                </div>
              </aside>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <BrokerConnectCard onConnected={(account) => setBrokerAccount(account)} />
              <SignalForm onSignalAccepted={loadExtras} />
              <CopyTradingPanel stats={copyStats} onFollowChange={loadExtras} />
              <LiveTradesFeed />
            </section>

            <TradeForm onTradeCreated={onTradeCreated} />
            <TradeTable trades={trades} />
          </div>
        )}
      </div>
    </main>
  );
}
