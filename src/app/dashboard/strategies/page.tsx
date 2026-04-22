"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import { extractApiErrorMessage } from "@/lib/errors";
import type { StrategyCard, UserProfile } from "@/lib/types";

function parseSeries(points: string | null): number[] {
  if (!points) {
    return [];
  }

  return points
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

function buildPolylinePoints(raw: number[]): string {
  if (!raw.length) {
    return "0,80 320,80";
  }

  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const spread = max - min || 1;

  return raw
    .map((value, index) => {
      const x = (index / Math.max(raw.length - 1, 1)) * 320;
      const normalized = (value - min) / spread;
      const y = 70 - normalized * 50;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function StrategiesPage() {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [strategies, setStrategies] = useState<StrategyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const loadPage = async () => {
    setLoading(true);
    setError(null);

    try {
      const [strategiesRes, profileRes] = await Promise.all([
        api.get<StrategyCard[]>("/strategy/public"),
        api.get<UserProfile>("/auth/me"),
      ]);
      if (profileRes.data.role === "admin") {
        router.replace("/admin");
        return;
      }
      setStrategies(strategiesRes.data);
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err && "response" in err
          ? ((err as { response?: { status?: unknown } }).response?.status as number | undefined)
          : undefined;
      if (status === 401) {
        clearTokens();
        router.push("/login");
        return;
      }
      setError(extractApiErrorMessage(err, "Unable to load strategy catalog."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    void loadPage();
  }, [router]);

  const showcase = useMemo(() => strategies, [strategies]);
  const useCarousel = showcase.length > 3;

  const refreshScrollState = () => {
    const node = carouselRef.current;
    if (!node) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(node.scrollLeft > 8);
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 8);
  };

  useEffect(() => {
    refreshScrollState();
    const node = carouselRef.current;
    if (!node) {
      return;
    }

    const onScroll = () => refreshScrollState();
    const onResize = () => refreshScrollState();

    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [showcase.length]);

  const scrollCards = (direction: "left" | "right") => {
    const node = carouselRef.current;
    if (!node) {
      return;
    }

    node.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  };

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#040607] text-[#E8ECEF]">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-[#1A1F26] bg-[#080B10] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#151B22] pb-4">
            <nav className="flex max-w-full items-center gap-4 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none]">
              <button onClick={() => router.push("/dashboard")} className="text-[#8D98A5] hover:text-[#DEE6EE]">Dashboard</button>
              <button className="font-semibold text-[#F7FAFD]">Strategies</button>
              <button onClick={() => router.push("/dashboard/academy")} className="text-[#8D98A5] hover:text-[#DEE6EE]">Academy</button>
              <button onClick={() => router.push("/dashboard/backtesting")} className="text-[#8D98A5] hover:text-[#DEE6EE]">Backtesting</button>
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={() => void loadPage()} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Refresh</button>
              <button onClick={onLogout} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Sign Out</button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#91A0AF]">Mirror Pip Style Board</p>
              <h1 className="mt-1 text-[28px] font-semibold text-[#F6FAFF]">Sample Strategies</h1>
            </div>
            <p className="text-sm text-[#9AA5B1]">Upload from admin panel, then users can mirror directly from here.</p>
          </div>
        </header>

        {error ? <p className="mt-4 rounded-lg border border-[#4F2A2A] bg-[#2A1414] px-3 py-2 text-sm text-[#FFB4B4]">{error}</p> : null}

        {loading ? (
          <p className="mt-5 rounded-xl border border-[#1A1E23] bg-[#090B0F] px-5 py-8 text-[#9AA5B1]">Loading strategies...</p>
        ) : (
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#DDE5EE]">Sample Strategies ({showcase.length})</h2>
              {useCarousel ? <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollCards("left")}
                  disabled={!canScrollLeft}
                  className="rounded-full border border-[#28323D] p-2 text-[#A6B1BE] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Scroll left"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => scrollCards("right")}
                  disabled={!canScrollRight}
                  className="rounded-full border border-[#28323D] p-2 text-[#A6B1BE] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Scroll right"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div> : null}
            </div>

            {useCarousel ? (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-[linear-gradient(90deg,#040607,rgba(4,6,7,0))]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-[linear-gradient(270deg,#040607,rgba(4,6,7,0))]" />
                <div
                  ref={carouselRef}
                  className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-2 [scrollbar-color:#27313C_transparent] [scrollbar-width:thin]"
                >
              {showcase.map((strategy) => {
                const pnl = Number(strategy.pnl);
                const roi = Number(strategy.roi_percent);
                const chart = parseSeries(strategy.chart_points);
                const academyParts = strategy.academy_slugs
                  ? strategy.academy_slugs.split(",").map((item) => item.trim()).filter(Boolean)
                  : [];

                return (
                  <article
                    key={strategy.id}
                    className={`w-[320px] shrink-0 snap-start rounded-3xl border bg-[linear-gradient(180deg,#0E141D,#0A1017)] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.35)] ${strategy.is_featured ? "border-[#9BFF00]" : "border-[#1D2630]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[#F4F9FF]">{strategy.name}</h3>
                        <p className="text-xs text-[#8B97A5]">{strategy.exchange} • {strategy.followers} followers</p>
                      </div>
                      <span className="rounded-full border border-[#2B3440] px-2 py-0.5 text-[11px] text-[#B4BFCD]">{strategy.strategy_tag}</span>
                    </div>

                    <div className="mt-4">
                      <p className={`text-[26px] font-semibold ${pnl >= 0 ? "text-[#22D08C]" : "text-[#FB6969]"}`}>
                        {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(2)}
                      </p>
                      <p className={`text-sm ${roi >= 0 ? "text-[#22D08C]" : "text-[#FB6969]"}`}>
                        {roi >= 0 ? "▲" : "▼"} {Math.abs(roi).toFixed(2)}%
                      </p>
                    </div>

                    <div className="mt-4 h-20 rounded-xl border border-[#202A35] bg-[#0A1119] p-2">
                      <svg viewBox="0 0 320 80" className="h-full w-full">
                        <polyline fill="none" stroke={pnl >= 0 ? "#21D08A" : "#FB6969"} strokeWidth="2.5" points={buildPolylinePoints(chart)} />
                      </svg>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-[#1F2833] bg-[#0B121A] px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-[#7D8A98]">Recommended Margin</p>
                        <p className="mt-1 font-semibold text-[#EAF0F7]">${Number(strategy.recommended_margin).toFixed(0)}</p>
                      </div>
                      <div className="rounded-lg border border-[#1F2833] bg-[#0B121A] px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-[#7D8A98]">MDD</p>
                        <p className="mt-1 font-semibold text-[#EAF0F7]">{Number(strategy.mdd_percent).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-[#8B97A5]">
                        <span>Win Rate</span>
                        <span>{Number(strategy.win_rate_percent).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#2A1212]">
                        <div className="h-full rounded-full bg-[#FB6969]" style={{ width: `${Math.min(Math.max(Number(strategy.win_rate_percent), 0), 100)}%` }} />
                      </div>
                    </div>

                    <div className="mt-3 min-h-8 text-xs text-[#A4B0BF]">
                      {academyParts.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {academyParts.map((slug) => (
                            <button
                              key={`${strategy.id}-${slug}`}
                              onClick={() => router.push(`/dashboard/academy/${slug}?from=${strategy.strategy_tag}`)}
                              className="rounded-full border border-[#2A3440] px-2 py-0.5 text-[11px] text-[#C7D2DF] hover:border-[#3E4D5D] hover:text-[#EAF1F8]"
                            >
                              {slug}
                            </button>
                          ))}
                        </div>
                      ) : (
                        "Academy linked: none"
                      )}
                    </div>

                    <button className="mt-4 w-full rounded-xl bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] hover:bg-[#B7FF45]">
                      Mirror Strategy
                    </button>
                  </article>
                );
              })}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {showcase.map((strategy) => {
                  const pnl = Number(strategy.pnl);
                  const roi = Number(strategy.roi_percent);
                  const chart = parseSeries(strategy.chart_points);
                  const academyParts = strategy.academy_slugs
                    ? strategy.academy_slugs.split(",").map((item) => item.trim()).filter(Boolean)
                    : [];

                  return (
                    <article
                      key={strategy.id}
                      className={`mx-auto w-full max-w-[360px] rounded-3xl border bg-[linear-gradient(180deg,#0E141D,#0A1017)] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.35)] ${strategy.is_featured ? "border-[#9BFF00]" : "border-[#1D2630]"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-[#F4F9FF]">{strategy.name}</h3>
                          <p className="text-xs text-[#8B97A5]">{strategy.exchange} • {strategy.followers} followers</p>
                        </div>
                        <span className="rounded-full border border-[#2B3440] px-2 py-0.5 text-[11px] text-[#B4BFCD]">{strategy.strategy_tag}</span>
                      </div>

                      <div className="mt-4">
                        <p className={`text-[26px] font-semibold ${pnl >= 0 ? "text-[#22D08C]" : "text-[#FB6969]"}`}>
                          {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(2)}
                        </p>
                        <p className={`text-sm ${roi >= 0 ? "text-[#22D08C]" : "text-[#FB6969]"}`}>
                          {roi >= 0 ? "▲" : "▼"} {Math.abs(roi).toFixed(2)}%
                        </p>
                      </div>

                      <div className="mt-4 h-20 rounded-xl border border-[#202A35] bg-[#0A1119] p-2">
                        <svg viewBox="0 0 320 80" className="h-full w-full">
                          <polyline fill="none" stroke={pnl >= 0 ? "#21D08A" : "#FB6969"} strokeWidth="2.5" points={buildPolylinePoints(chart)} />
                        </svg>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-[#1F2833] bg-[#0B121A] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-[#7D8A98]">Recommended Margin</p>
                          <p className="mt-1 font-semibold text-[#EAF0F7]">${Number(strategy.recommended_margin).toFixed(0)}</p>
                        </div>
                        <div className="rounded-lg border border-[#1F2833] bg-[#0B121A] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-[#7D8A98]">MDD</p>
                          <p className="mt-1 font-semibold text-[#EAF0F7]">{Number(strategy.mdd_percent).toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-[#8B97A5]">
                          <span>Win Rate</span>
                          <span>{Number(strategy.win_rate_percent).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#2A1212]">
                          <div className="h-full rounded-full bg-[#FB6969]" style={{ width: `${Math.min(Math.max(Number(strategy.win_rate_percent), 0), 100)}%` }} />
                        </div>
                      </div>

                      <div className="mt-3 min-h-8 text-xs text-[#A4B0BF]">
                        {academyParts.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {academyParts.map((slug) => (
                              <button
                                key={`${strategy.id}-${slug}`}
                                onClick={() => router.push(`/dashboard/academy/${slug}?from=${strategy.strategy_tag}`)}
                                className="rounded-full border border-[#2A3440] px-2 py-0.5 text-[11px] text-[#C7D2DF] hover:border-[#3E4D5D] hover:text-[#EAF1F8]"
                              >
                                {slug}
                              </button>
                            ))}
                          </div>
                        ) : (
                          "Academy linked: none"
                        )}
                      </div>

                      <button className="mt-4 w-full rounded-xl bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] hover:bg-[#B7FF45]">
                        Mirror Strategy
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {!loading && showcase.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#1A212A] bg-[#070A10] p-6 text-center text-[#97A2AF]">
                No public strategies available yet. Admin panel se strategy upload karne ke baad ye section auto-fill hoga.
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
