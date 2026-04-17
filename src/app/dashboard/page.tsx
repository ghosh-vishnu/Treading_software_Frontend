"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type { BrokerBalance, DashboardOverview, DashboardSummary, Trade, UserProfile } from "@/lib/types";

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
  const [brokerBalance, setBrokerBalance] = useState<BrokerBalance | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [displayName, setDisplayName] = useState("Trader");
  const [isAdmin, setIsAdmin] = useState(false);

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
    } catch (error: any) {
      if (error?.response?.status === 401) {
        clearTokens();
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadExtras = async () => {
    try {
      const balanceRes = await api.get<BrokerBalance>("/broker/balance");
      setBrokerBalance(balanceRes.data);
    } catch {
      // Optional card values can stay in fallback state.
    }
  };

  const loadCurrentUser = async () => {
    try {
      const profileRes = await api.get<UserProfile>("/auth/me");
      const fullName = profileRes.data.full_name?.trim();

      if (profileRes.data.role === "admin") {
        router.replace("/admin");
        return;
      }

      if (fullName) {
        setDisplayName(fullName);
      }
      setIsAdmin(false);
    } catch {
      // Keep fallback name when profile endpoint is unavailable.
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    void loadData();
    void loadExtras();
    void loadCurrentUser();
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
    router.push("/dashboard/notifications");
  };

  const winRate =
    summary.total_trades > 0 ? Math.round((summary.winning_trades / summary.total_trades) * 100) : 0;

  const balanceValue = useMemo(() => {
    const raw = brokerBalance?.balance ?? "0";
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [brokerBalance?.balance]);

  const pnlValue = useMemo(() => {
    const parsed = Number(summary.cumulative_pnl || "0");
    return Number.isFinite(parsed) ? parsed : 0;
  }, [summary.cumulative_pnl]);

  const avgGain = trades.length > 0 ? Math.max(pnlValue / Math.max(trades.length, 1), 0) : 0;
  const avgLoss = trades.length > 0 ? Math.min(pnlValue / Math.max(trades.length, 1), 0) : 0;

  const totalWinners = summary.winning_trades;
  const totalLosers = summary.losing_trades;

  const bestTradePnl = useMemo(() => {
    if (trades.length === 0) return 0;
    return Math.max(...trades.map((trade) => Number(trade.pnl || 0)));
  }, [trades]);

  const worstTradePnl = useMemo(() => {
    if (trades.length === 0) return 0;
    return Math.min(...trades.map((trade) => Number(trade.pnl || 0)));
  }, [trades]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <main className="min-h-screen bg-[#030507] text-[#E8ECEF]">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-[#1B222B] bg-[#06090E] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#141B23] pb-4">
            <nav className="flex items-center gap-5 text-sm">
              <button className="font-semibold text-[#F7FAFD]">Dashboard</button>
              <button onClick={() => router.push("/dashboard/strategies")} className="text-[#8D98A5] hover:text-[#DEE6EE]">Strategies</button>
              <button onClick={() => router.push("/dashboard/academy")} className="text-[#8D98A5] hover:text-[#DEE6EE]">Academy</button>
              <button onClick={() => router.push("/dashboard/backtesting")} className="text-[#8D98A5] hover:text-[#DEE6EE]">Backtesting</button>
              <button onClick={() => router.push("/dashboard/notifications")} className="text-[#8D98A5] hover:text-[#DEE6EE]">Notifications</button>
              <button onClick={() => router.push("/dashboard/settings")} className="text-[#8D98A5] hover:text-[#DEE6EE]">Settings</button>
            </nav>

            <div className="relative flex items-center gap-2">
              <button className="rounded-full border border-[#26303A] p-2 text-[#AEB8C4] hover:bg-[#10151D]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.65" y1="16.65" x2="21" y2="21" />
                </svg>
              </button>
              <button className="rounded-full border border-[#26303A] p-2 text-[#AEB8C4] hover:bg-[#10151D]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M10 21h4" />
                </svg>
              </button>
              <button
                onClick={() => setShowProfileMenu((current) => !current)}
                className="rounded-full border border-[#26303A] p-2 text-[#AEB8C4] hover:bg-[#10151D]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      router.push("/dashboard/kyc");
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#D5DEE8] hover:bg-[#111822]"
                  >
                    KYC
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[30px] font-semibold text-[#F3F7FB]">Hello, {displayName}</h1>

            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-[#27313D] px-3 py-1.5 text-xs text-[#A8B3BF]">Select Dates</button>
              <div className="flex items-center rounded-lg border border-[#27313D] bg-[#090D13] p-1 text-xs text-[#94A1AE]">
                <button className="rounded px-2 py-1 hover:text-[#E4EBF3]">1D</button>
                <button className="rounded px-2 py-1 hover:text-[#E4EBF3]">1W</button>
                <button className="rounded px-2 py-1 hover:text-[#E4EBF3]">1M</button>
                <button className="rounded px-2 py-1 hover:text-[#E4EBF3]">1Y</button>
                <button className="rounded bg-[#9BFF00] px-2 py-1 font-semibold text-[#11140D]">All</button>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <p className="mt-5 rounded-xl border border-[#1A1E23] bg-[#090B0F] px-5 py-8 text-[#9AA5B1]">Loading dashboard...</p>
        ) : (
          <div className="mt-5 space-y-4">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8995A3]">Estimated Balance</p>
                <p className="mt-3 text-[32px] font-semibold text-[#F0F5FA]">{formatCurrency(balanceValue)}</p>
                <p className="text-xs text-[#7C8794]">Across 1 exchange</p>
              </article>

              <article className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8995A3]">Open Position</p>
                <p className="mt-3 text-[32px] font-semibold text-[#F0F5FA]">{overview?.open_positions.length ?? 0}</p>
                <p className="text-xs text-[#7C8794]">Across exchange</p>
              </article>

              <article className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8995A3]">P&amp;L</p>
                <p className="mt-3 text-[32px] font-semibold text-[#F0F5FA]">{formatCurrency(pnlValue)}</p>
                <p className="text-xs text-[#7C8794]">All time</p>
              </article>

              <article className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8995A3]">Win Rate</p>
                <p className="mt-3 text-[32px] font-semibold text-[#F0F5FA]">{winRate.toFixed(2)}%</p>
                <p className="text-xs text-[#7C8794]">All Closed Trades</p>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.65fr_0.55fr]">
              <div className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#F3F7FB]">Portfolio Performance</h2>
                  <div className="flex items-center rounded-lg border border-[#27313D] bg-[#090D13] p-1 text-xs text-[#94A1AE]">
                    <button className="rounded bg-[#232A35] px-2 py-1 text-[#E4EBF3]">P&amp;L</button>
                    <button className="rounded px-2 py-1">ROI</button>
                  </div>
                </div>

                <div className="relative h-[300px] overflow-hidden rounded-xl border border-[#1F2630] bg-[linear-gradient(180deg,#070B12,#05080D)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(76,116,255,0.09),transparent_62%)]" />
                  <svg viewBox="0 0 720 300" className="absolute inset-0 h-full w-full">
                    <polyline
                      fill="none"
                      stroke="#4A5A73"
                      strokeWidth="2.5"
                      points="20,250 80,210 130,230 190,190 250,170 310,130 360,155 420,118 480,92 540,102 600,70 680,48"
                    />
                  </svg>
                </div>
              </div>

              <aside className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
                <p className="mt-24 text-center text-sm text-[#95A2B1]">You haven't mirrored any strategies yet</p>
                <button className="mx-auto mt-4 block rounded-full bg-[#9BFF00] px-5 py-2 text-sm font-semibold text-[#11140D] hover:bg-[#B7FF45]">
                  Explore Strategies
                </button>
              </aside>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.7fr]">
              <div className="rounded-2xl border border-[#1A212A] bg-[#0A101A] p-4">
                <h3 className="text-sm font-semibold text-[#DDE5EE]">Asset Allocation</h3>
                <div className="mt-5 flex items-center gap-4">
                  <div className="relative h-36 w-36 rounded-full bg-[conic-gradient(#2D3646_0_65%,#1D2431_65%_100%)]">
                    <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0A101A]" />
                  </div>
                  <p className="text-sm text-[#7F8B98]">No allocation data yet</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#7E8B98]">Average gain</p>
                    <p className="mt-1 font-semibold text-[#15D68A]">{formatCurrency(avgGain)}</p>
                  </div>
                  <div>
                    <p className="text-[#7E8B98]">Average loss</p>
                    <p className="mt-1 font-semibold text-[#FF6666]">{formatCurrency(avgLoss)}</p>
                  </div>
                  <div>
                    <p className="text-[#7E8B98]">Big Win</p>
                    <p className="mt-1 font-semibold text-[#15D68A]">{formatCurrency(Math.max(bestTradePnl, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[#7E8B98]">Big Loss</p>
                    <p className="mt-1 font-semibold text-[#FF6666]">{formatCurrency(Math.min(worstTradePnl, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[#7E8B98]">Risk / Reward Ratio</p>
                    <p className="mt-1 font-semibold text-[#E8EEF6]">--</p>
                  </div>
                  <div>
                    <p className="text-[#7E8B98]">Max Drawdown</p>
                    <p className="mt-1 font-semibold text-[#E8EEF6]">0%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
                <h3 className="text-sm font-semibold text-[#DDE5EE]">ROI</h3>
                <p className="mt-2 text-xl font-semibold text-[#F2F7FC]">{formatCurrency(pnlValue)}</p>
                <p className="text-xs text-[#7F8B98]">vs last month</p>
                <div className="mt-3 h-14 rounded-lg border border-[#242C37] bg-[#0A0E14] p-1">
                  <svg viewBox="0 0 120 40" className="h-full w-full">
                    <polyline fill="none" stroke="#4A5A73" strokeWidth="2" points="0,30 18,20 36,24 54,15 72,19 90,8 120,12" />
                  </svg>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between"><span className="text-[#7F8B98]">Win Rate (%)</span><span className="text-[#E6EDF4]">{winRate}%</span></div>
                  <div className="h-1.5 rounded-full bg-[#2B1111]"><div className="h-full rounded-full bg-[#FB4141]" style={{ width: `${Math.min(Math.max(winRate, 0), 100)}%` }} /></div>
                  <div className="flex items-center justify-between"><span className="text-[#15D68A]">Profitable Trades {totalWinners}</span><span className="text-[#FF6666]">Losing Trades {totalLosers}</span></div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
              <h3 className="text-sm font-semibold text-[#DDE5EE]">Avg Holding Time</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-4 text-sm">
                <div className="rounded-lg border border-[#242C37] bg-[#0A0F16] px-3 py-2">
                  <p className="text-[#7F8B98]">Winners</p>
                  <p className="mt-1 font-semibold text-[#15D68A]">--</p>
                </div>
                <div className="rounded-lg border border-[#242C37] bg-[#0A0F16] px-3 py-2">
                  <p className="text-[#7F8B98]">Losers</p>
                  <p className="mt-1 font-semibold text-[#FF6666]">--</p>
                </div>
                <div className="rounded-lg border border-[#242C37] bg-[#0A0F16] px-3 py-2">
                  <p className="text-[#7F8B98]">Biggest Win</p>
                  <p className="mt-1 font-semibold text-[#E6EDF4]">{formatCurrency(Math.max(bestTradePnl, 0))}</p>
                </div>
                <div className="rounded-lg border border-[#242C37] bg-[#0A0F16] px-3 py-2">
                  <p className="text-[#7F8B98]">Biggest Loss</p>
                  <p className="mt-1 font-semibold text-[#E6EDF4]">{formatCurrency(Math.min(worstTradePnl, 0))}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#DDE5EE]">Trade History</h3>
                <button
                  onClick={() => {
                    void loadData();
                    void loadExtras();
                  }}
                  className="rounded-lg bg-[#9BFF00] px-3 py-1.5 text-xs font-semibold text-[#11140D]"
                >
                  Refresh
                </button>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <button className="rounded-full border border-[#26303A] px-3 py-1.5 text-[#A3AFBD]">Symbol</button>
                <button className="rounded-full border border-[#26303A] px-3 py-1.5 text-[#A3AFBD]">All</button>
                <button className="rounded-full border border-[#26303A] px-3 py-1.5 text-[#A3AFBD]">Source</button>
                <button className="rounded-full border border-[#26303A] px-3 py-1.5 text-[#A3AFBD]">Select Dates</button>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#212934]">
                <div className="grid grid-cols-7 border-b border-[#212934] bg-[#0A0F16] px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[#778493]">
                  <span>Symbol</span>
                  <span>Side</span>
                  <span>Qty</span>
                  <span>Entry Price</span>
                  <span>P&amp;L</span>
                  <span>Status</span>
                  <span>Source</span>
                </div>

                {trades.length > 0 ? (
                  <div className="divide-y divide-[#1D2530]">
                    {trades.slice(0, 8).map((trade) => (
                      <div key={trade.id} className="grid grid-cols-7 px-3 py-3 text-sm text-[#C9D4E0]">
                        <span>{trade.symbol}</span>
                        <span>{trade.side}</span>
                        <span>{trade.quantity}</span>
                        <span>{trade.price}</span>
                        <span className={Number(trade.pnl) >= 0 ? "text-[#15D68A]" : "text-[#FF6666]"}>{trade.pnl}</span>
                        <span>{trade.status}</span>
                        <span>{trade.broker}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center bg-[#060A10] text-center">
                    <div className="mb-4 h-20 w-20 rounded-full border border-[#27303A]" />
                    <p className="text-lg font-semibold text-[#E7EEF6]">You have no open trades!</p>
                    <p className="text-sm text-[#7F8B98]">Open trades will appear here.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
