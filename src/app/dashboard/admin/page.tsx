"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import axios from "axios";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type {
  AcademyArticle,
  AcademyArticleCreateRequest,
  AcademyArticleUpdateRequest,
  ActivityItem,
  AdminDashboardMetrics,
  AdminTradeListResponse,
  AdminUserListResponse,
  AuditLogListResponse,
  ChartPoint,
  PlatformSettings,
  PlatformSettingsUpdateRequest,
  StrategyCard,
  StrategyPerformance,
  UserProfile,
} from "@/lib/types";

type AdminTab =
  | "overview"
  | "strategies"
  | "performance"
  | "academy"
  | "users"
  | "trades"
  | "notifications"
  | "settings"
  | "security";

type StrategyFormState = {
  name: string;
  description: string;
  strategy_tag: string;
  exchange: string;
  risk_level: "low" | "medium" | "high";
  logo_url: string;
  image_url: string;
  tags: string[];
  followers: number;
  recommended_margin: string;
  mdd_percent: string;
  win_rate_percent: string;
  pnl: string;
  roi_percent: string;
  chart_points: string[];
  academy_slugs: string[];
  is_public: boolean;
  is_featured: boolean;
};

const tabs: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "strategies", label: "Strategy Management" },
  { id: "performance", label: "Performance" },
  { id: "academy", label: "Academy CMS" },
  { id: "users", label: "Users" },
  { id: "trades", label: "Trades" },
  { id: "notifications", label: "Notifications" },
  { id: "settings", label: "Settings" },
  { id: "security", label: "Security" },
];

const emptyStrategy: StrategyFormState = {
  name: "",
  description: "",
  strategy_tag: "",
  exchange: "Delta Exchange",
  risk_level: "medium",
  logo_url: "",
  image_url: "",
  tags: [] as string[],
  followers: 0,
  recommended_margin: "1000",
  mdd_percent: "0",
  win_rate_percent: "0",
  pnl: "0",
  roi_percent: "0",
  chart_points: ["0", "5", "8", "12", "10", "15"],
  academy_slugs: [] as string[],
  is_public: true,
  is_featured: false,
};

const emptyArticle: AcademyArticleCreateRequest = {
  title: "",
  slug: "",
  category: "general",
  summary: "",
  content_markdown: "",
  is_published: true,
};

function formatCurrency(value: string | number): string {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "0.00";
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || "").filter(Boolean).join("; ") || fallback;
  }
  return fallback;
}

function getAdminWebSocketUrl(): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return null;
  }

  const normalized = baseUrl.replace(/\/+$/, "");
  const root = normalized.replace(/\/api\/v1$/, "");
  if (root.startsWith("https://")) {
    return `${root.replace("https://", "wss://")}/ws/live`;
  }
  if (root.startsWith("http://")) {
    return `${root.replace("http://", "ws://")}/ws/live`;
  }
  return null;
}

export default function AdminPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [growth, setGrowth] = useState<ChartPoint[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [strategies, setStrategies] = useState<StrategyCard[]>([]);
  const [strategySearch, setStrategySearch] = useState("");
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<number[]>([]);
  const [editingStrategyId, setEditingStrategyId] = useState<number | null>(null);
  const [strategyForm, setStrategyForm] = useState<StrategyFormState>(emptyStrategy);
  const [tagInput, setTagInput] = useState("");

  const [performanceStrategyId, setPerformanceStrategyId] = useState<number | null>(null);
  const [performanceData, setPerformanceData] = useState<StrategyPerformance | null>(null);

  const [articles, setArticles] = useState<AcademyArticle[]>([]);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [articleForm, setArticleForm] = useState<AcademyArticleCreateRequest>(emptyArticle);
  const [articleSearch, setArticleSearch] = useState("");

  const [users, setUsers] = useState<AdminUserListResponse | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");

  const [trades, setTrades] = useState<AdminTradeListResponse | null>(null);
  const [tradeSearch, setTradeSearch] = useState("");
  const [tradeStatusFilter, setTradeStatusFilter] = useState("all");
  const [manualClosePrice, setManualClosePrice] = useState<Record<number, string>>({});

  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationCategory, setNotificationCategory] = useState("admin");

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLogListResponse | null>(null);
  const [auditSeverity, setAuditSeverity] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filteredArticles = useMemo(
    () => articles.filter((item) => item.title.toLowerCase().includes(articleSearch.toLowerCase()) || item.slug.toLowerCase().includes(articleSearch.toLowerCase())),
    [articles, articleSearch],
  );

  const strategyPreview = useMemo(() => {
    const points = strategyForm.chart_points
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item));
    const avg = points.length ? points.reduce((sum, item) => sum + item, 0) / points.length : 0;
    return {
      points,
      avg,
      roi: Number(strategyForm.roi_percent || 0),
      winRate: Number(strategyForm.win_rate_percent || 0),
    };
  }, [strategyForm]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const me = await api.get<UserProfile>("/auth/me");
      if (me.data.role !== "admin") {
        setError("Admin privileges are required.");
        setLoading(false);
        return;
      }
      setProfile(me.data);

      const [
        metricsRes,
        growthRes,
        activitiesRes,
        strategiesRes,
        articlesRes,
        usersRes,
        tradesRes,
        settingsRes,
        logsRes,
      ] = await Promise.all([
        api.get<AdminDashboardMetrics>("/admin/metrics"),
        api.get<ChartPoint[]>("/admin/growth"),
        api.get<ActivityItem[]>("/admin/activities"),
        api.get<StrategyCard[]>("/admin/strategies"),
        api.get<AcademyArticle[]>("/admin/academy/articles"),
        api.get<AdminUserListResponse>("/admin/users", { params: { page: 1, page_size: 20 } }),
        api.get<AdminTradeListResponse>("/admin/trades", { params: { page: 1, page_size: 20 } }),
        api.get<PlatformSettings>("/admin/platform-settings"),
        api.get<AuditLogListResponse>("/admin/audit-logs", { params: { page: 1, page_size: 20 } }),
      ]);

      setMetrics(metricsRes.data);
      setGrowth(growthRes.data);
      setActivities(activitiesRes.data);
      setStrategies(strategiesRes.data);
      setArticles(articlesRes.data);
      setUsers(usersRes.data);
      setTrades(tradesRes.data);
      setPlatformSettings(settingsRes.data);
      setAuditLogs(logsRes.data);

      if (strategiesRes.data.length > 0) {
        setPerformanceStrategyId(strategiesRes.data[0].id);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearTokens();
        router.push("/login");
        return;
      }
      setError(getApiErrorMessage(err, "Failed to load admin data."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    void loadAll();
  }, [loadAll, router]);

  useEffect(() => {
    const loadPerformance = async () => {
      if (!performanceStrategyId) {
        setPerformanceData(null);
        return;
      }
      try {
        const res = await api.get<StrategyPerformance>(`/admin/strategies/${performanceStrategyId}/performance`);
        setPerformanceData(res.data);
      } catch {
        setPerformanceData(null);
      }
    };
    void loadPerformance();
  }, [performanceStrategyId]);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    const wsUrl = getAdminWebSocketUrl();
    if (!wsUrl) {
      return;
    }

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          metrics?: AdminDashboardMetrics;
          activities?: ActivityItem[];
        };
        if (payload.type !== "admin.live_update") {
          return;
        }

        if (payload.metrics) {
          setMetrics(payload.metrics);
        }
        if (payload.activities) {
          setActivities(payload.activities);
        }
      } catch {
        return;
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const loadUsers = async () => {
    const params: Record<string, string | number> = { page: 1, page_size: 20 };
    if (userSearch) params.search = userSearch;
    if (kycFilter !== "all") params.kyc_status = kycFilter;
    const res = await api.get<AdminUserListResponse>("/admin/users", { params });
    setUsers(res.data);
  };

  const loadTrades = async () => {
    const params: Record<string, string | number> = { page: 1, page_size: 20 };
    if (tradeSearch) params.search = tradeSearch;
    if (tradeStatusFilter !== "all") params.status_filter = tradeStatusFilter;
    const res = await api.get<AdminTradeListResponse>("/admin/trades", { params });
    setTrades(res.data);
  };

  const loadAudit = async () => {
    const params: Record<string, string | number> = { page: 1, page_size: 20 };
    if (auditSeverity !== "all") params.severity = auditSeverity;
    const res = await api.get<AuditLogListResponse>("/admin/audit-logs", { params });
    setAuditLogs(res.data);
  };

  const searchStrategies = async () => {
    try {
      const params: Record<string, string> = {};
      if (strategySearch) params.search = strategySearch;
      const res = await api.get<StrategyCard[]>("/admin/strategies", { params });
      setStrategies(res.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to search strategies"));
    }
  };

  const startEditStrategy = (item: StrategyCard) => {
    setEditingStrategyId(item.id);
    setStrategyForm({
      name: item.name,
      description: item.description ?? "",
      strategy_tag: item.strategy_tag,
      exchange: item.exchange,
      risk_level: item.risk_level,
      logo_url: item.logo_url ?? "",
      image_url: item.image_url ?? "",
      tags: item.tags ? item.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      followers: item.followers,
      recommended_margin: item.recommended_margin,
      mdd_percent: item.mdd_percent,
      win_rate_percent: item.win_rate_percent,
      pnl: item.pnl,
      roi_percent: item.roi_percent,
      chart_points: item.chart_points ? item.chart_points.split(",").map((point) => point.trim()) : ["0"],
      academy_slugs: item.academy_slugs ? item.academy_slugs.split(",").map((slug) => slug.trim()) : [],
      is_public: item.is_public,
      is_featured: item.is_featured,
    });
    setActiveTab("strategies");
  };

  const resetStrategyForm = () => {
    setEditingStrategyId(null);
    setStrategyForm(emptyStrategy);
    setTagInput("");
  };

  const saveStrategy = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...strategyForm,
        description: strategyForm.description || null,
        logo_url: strategyForm.logo_url || null,
        image_url: strategyForm.image_url || null,
      };
      if (editingStrategyId) {
        const res = await api.patch<StrategyCard>(`/admin/strategies/${editingStrategyId}`, payload);
        setStrategies((prev) => prev.map((item) => (item.id === editingStrategyId ? res.data : item)));
        setMessage("Strategy updated.");
      } else {
        const res = await api.post<StrategyCard>("/admin/strategies", payload);
        setStrategies((prev) => [res.data, ...prev]);
        setMessage("Strategy created.");
      }
      resetStrategyForm();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to save strategy."));
    } finally {
      setSaving(false);
    }
  };

  const deleteStrategy = async (strategyId: number) => {
    if (!window.confirm("Delete strategy permanently?")) return;
    try {
      await api.delete(`/admin/strategies/${strategyId}`);
      setStrategies((prev) => prev.filter((item) => item.id !== strategyId));
      if (editingStrategyId === strategyId) resetStrategyForm();
      setMessage("Strategy deleted.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete strategy."));
    }
  };

  const runBulkAction = async (action: "publish" | "unpublish" | "feature" | "unfeature" | "delete" | "duplicate") => {
    if (selectedStrategyIds.length === 0) {
      setError("Select at least one strategy first.");
      return;
    }
    try {
      await api.post("/admin/strategies/bulk", { strategy_ids: selectedStrategyIds, action });
      await searchStrategies();
      setSelectedStrategyIds([]);
      setMessage(`Bulk action completed: ${action}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to run bulk action."));
    }
  };

  const saveArticle = async () => {
    try {
      if (editingArticleId) {
        const payload: AcademyArticleUpdateRequest = articleForm;
        const res = await api.patch<AcademyArticle>(`/admin/academy/articles/${editingArticleId}`, payload);
        setArticles((prev) => prev.map((item) => (item.id === editingArticleId ? res.data : item)));
        setMessage("Article updated.");
      } else {
        const res = await api.post<AcademyArticle>("/admin/academy/articles", articleForm);
        setArticles((prev) => [res.data, ...prev]);
        setMessage("Article created.");
      }
      setEditingArticleId(null);
      setArticleForm(emptyArticle);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to save article."));
    }
  };

  const removeArticle = async (id: number) => {
    if (!window.confirm("Delete this article?")) return;
    try {
      await api.delete(`/admin/academy/articles/${id}`);
      setArticles((prev) => prev.filter((item) => item.id !== id));
      setMessage("Article deleted.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete article."));
    }
  };

  const banToggleUser = async (userId: number, isActive: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/ban`, { is_active: !isActive });
      await loadUsers();
      setMessage(`User ${isActive ? "banned" : "unbanned"}.`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to update user status."));
    }
  };

  const manualCloseTrade = async (tradeId: number) => {
    const price = manualClosePrice[tradeId];
    if (!price) {
      setError("Enter close price first.");
      return;
    }
    try {
      await api.post(`/admin/trades/${tradeId}/manual-close`, { close_price: price });
      await loadTrades();
      setMessage("Trade closed manually.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to close trade."));
    }
  };

  const syncTrades = async () => {
    try {
      await api.post("/admin/trades/sync");
      setMessage("Trade sync queued.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to queue trade sync."));
    }
  };

  const broadcastNotification = async () => {
    try {
      await api.post("/admin/notifications/broadcast", {
        title: notificationTitle,
        message: notificationMessage,
        category: notificationCategory,
      });
      setNotificationTitle("");
      setNotificationMessage("");
      setMessage("Notification broadcast sent.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to send notification."));
    }
  };

  const saveSettings = async () => {
    if (!platformSettings) return;
    try {
      const payload: PlatformSettingsUpdateRequest = {
        site_name: platformSettings.site_name,
        support_email: platformSettings.support_email,
        fee_percent: platformSettings.fee_percent,
        profit_share_percent: platformSettings.profit_share_percent,
        maintenance_mode: platformSettings.maintenance_mode,
        telegram_alerts_enabled: platformSettings.telegram_alerts_enabled,
        telegram_chat_id: platformSettings.telegram_chat_id,
        exchange_api_key: platformSettings.exchange_api_key,
        exchange_api_secret: platformSettings.exchange_api_secret,
      };
      const res = await api.patch<PlatformSettings>("/admin/platform-settings", payload);
      setPlatformSettings(res.data);
      setMessage("Platform settings updated.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to save settings."));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#030507] text-[#ECF2FF]">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse rounded-3xl border border-[#1A2330] bg-[#0C1420]/70 p-8 backdrop-blur">
            <div className="h-8 w-56 rounded bg-[#1B2738]" />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="h-28 rounded-2xl bg-[#121C2A]" />
              <div className="h-28 rounded-2xl bg-[#121C2A]" />
              <div className="h-28 rounded-2xl bg-[#121C2A]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,#04070D_0%,#04060A_100%)] text-[#ECF2FF]">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-[#1D2A3A] bg-[#0C1522]/80 p-5 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#90A9C7]">Mirror Trading Admin</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#F6FAFF]">Command Center</h1>
              <p className="mt-1 text-sm text-[#A9BDD5]">Unified control panel for strategy publishing, compliance, users, risk, and live operations.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push("/dashboard")} className="rounded-xl border border-[#2E4057] px-4 py-2 text-sm text-[#D5E4F7] hover:bg-[#132133]">Trader Dashboard</button>
              <button onClick={onLogout} className="rounded-xl border border-[#2E4057] px-4 py-2 text-sm text-[#D5E4F7] hover:bg-[#132133]">Sign Out</button>
            </div>
          </div>
          <div className="mt-4 text-sm text-[#A6BCD6]">Logged in as {profile?.full_name} ({profile?.email})</div>
        </header>

        {error ? <p className="mt-4 rounded-xl border border-[#66313A] bg-[#2A1219] px-4 py-2 text-sm text-[#FFB3C0]">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl border border-[#315E4A] bg-[#10251D] px-4 py-2 text-sm text-[#B9F6D2]">{message}</p> : null}

        <nav className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#1D2A3A] bg-[#0B1320]/70 p-2 backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${activeTab === tab.id ? "bg-[#1A2F4A] text-[#ECF5FF]" : "text-[#9CB2CA] hover:bg-[#121E30]"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" ? (
          <section className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.1em] text-[#88A4C6]">Total Users</p>
                <p className="mt-3 text-3xl font-semibold">{metrics?.total_users ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.1em] text-[#88A4C6]">Active Traders</p>
                <p className="mt-3 text-3xl font-semibold">{metrics?.active_traders ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.1em] text-[#88A4C6]">Revenue</p>
                <p className="mt-3 text-3xl font-semibold">${formatCurrency(metrics?.revenue ?? "0")}</p>
              </div>
              <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.1em] text-[#88A4C6]">Profit Share</p>
                <p className="mt-3 text-3xl font-semibold">${formatCurrency(metrics?.profit_share ?? "0")}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
                <h2 className="text-lg font-semibold">Growth Chart (Trades)</h2>
                <div className="mt-4 flex h-44 items-end gap-2">
                  {growth.map((point) => {
                    const max = Math.max(...growth.map((item) => Number(item.value || 0)), 1);
                    const height = (Number(point.value || 0) / max) * 100;
                    return (
                      <div key={point.label} className="group flex flex-1 flex-col items-center gap-1">
                        <div className="w-full rounded-md bg-gradient-to-t from-[#2563EB] to-[#22D3EE] transition group-hover:from-[#38BDF8] group-hover:to-[#34D399]" style={{ height: `${Math.max(height, 8)}%` }} />
                        <span className="text-[10px] text-[#87A1BF]">{point.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
                <h2 className="text-lg font-semibold">Recent Activities</h2>
                <div className="mt-4 max-h-52 space-y-2 overflow-auto pr-1">
                  {activities.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#26384C] bg-[#101D2F] px-3 py-2">
                      <p className="text-sm font-medium text-[#DDE9F7]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#8EA6C3]">{item.category} - {formatDate(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "strategies" ? (
          <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Strategy Management</h2>
                  <div className="flex gap-2">
                    <input value={strategySearch} onChange={(e) => setStrategySearch(e.target.value)} placeholder="Search strategy" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm" />
                    <button onClick={searchStrategies} className="rounded-lg border border-[#2E4762] px-3 py-2 text-sm hover:bg-[#18283C]">Search</button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => runBulkAction("publish")} className="rounded-md border border-[#2B4A62] px-3 py-1 text-xs">Publish</button>
                  <button onClick={() => runBulkAction("unpublish")} className="rounded-md border border-[#2B4A62] px-3 py-1 text-xs">Unpublish</button>
                  <button onClick={() => runBulkAction("feature")} className="rounded-md border border-[#2B4A62] px-3 py-1 text-xs">Feature</button>
                  <button onClick={() => runBulkAction("duplicate")} className="rounded-md border border-[#2B4A62] px-3 py-1 text-xs">Duplicate</button>
                  <button onClick={() => runBulkAction("delete")} className="rounded-md border border-[#65313C] px-3 py-1 text-xs text-[#FFC2CC]">Delete</button>
                </div>

                <div className="mt-4 max-h-[440px] space-y-2 overflow-auto pr-1">
                  {strategies.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#27384D] bg-[#0F1D2F] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedStrategyIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStrategyIds((prev) => [...prev, item.id]);
                              } else {
                                setSelectedStrategyIds((prev) => prev.filter((id) => id !== item.id));
                              }
                            }}
                          />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-[#8EA9C9]">{item.strategy_tag} - {item.risk_level.toUpperCase()} - ROI {item.roi_percent}%</p>
                          </div>
                        </label>
                        <div className="flex gap-2">
                          <button onClick={() => startEditStrategy(item)} className="rounded-md border border-[#335174] px-2 py-1 text-xs">Edit</button>
                          <button onClick={() => deleteStrategy(item.id)} className="rounded-md border border-[#5C2A35] px-2 py-1 text-xs text-[#FFBAC8]">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
                <h3 className="text-lg font-semibold">{editingStrategyId ? "Edit Strategy" : "Create Strategy"}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input value={strategyForm.name} onChange={(e) => setStrategyForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.strategy_tag} onChange={(e) => setStrategyForm((prev) => ({ ...prev, strategy_tag: e.target.value }))} placeholder="Strategy Tag" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.exchange} onChange={(e) => setStrategyForm((prev) => ({ ...prev, exchange: e.target.value }))} placeholder="Exchange" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <select value={strategyForm.risk_level} onChange={(e) => setStrategyForm((prev) => ({ ...prev, risk_level: e.target.value as "low" | "medium" | "high" }))} className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input value={strategyForm.logo_url} onChange={(e) => setStrategyForm((prev) => ({ ...prev, logo_url: e.target.value }))} placeholder="Logo URL" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.image_url} onChange={(e) => setStrategyForm((prev) => ({ ...prev, image_url: e.target.value }))} placeholder="Cover Image URL" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.recommended_margin} onChange={(e) => setStrategyForm((prev) => ({ ...prev, recommended_margin: e.target.value }))} placeholder="Recommended Margin" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.roi_percent} onChange={(e) => setStrategyForm((prev) => ({ ...prev, roi_percent: e.target.value }))} placeholder="ROI %" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.win_rate_percent} onChange={(e) => setStrategyForm((prev) => ({ ...prev, win_rate_percent: e.target.value }))} placeholder="Win Rate %" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.mdd_percent} onChange={(e) => setStrategyForm((prev) => ({ ...prev, mdd_percent: e.target.value }))} placeholder="MDD %" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.pnl} onChange={(e) => setStrategyForm((prev) => ({ ...prev, pnl: e.target.value }))} placeholder="PNL" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input type="number" min={0} value={strategyForm.followers} onChange={(e) => setStrategyForm((prev) => ({ ...prev, followers: Number(e.target.value) }))} placeholder="Followers" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                </div>

                <textarea value={strategyForm.description} onChange={(e) => setStrategyForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={3} className="mt-3 w-full rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input value={strategyForm.chart_points.join(",")} onChange={(e) => setStrategyForm((prev) => ({ ...prev, chart_points: e.target.value.split(",").map((item) => item.trim()) }))} placeholder="Chart points comma separated" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                  <input value={strategyForm.academy_slugs.join(",")} onChange={(e) => setStrategyForm((prev) => ({ ...prev, academy_slugs: e.target.value.split(",").map((item) => item.trim()) }))} placeholder="Linked academy slugs" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm" />
                  <button
                    onClick={() => {
                      const normalized = tagInput.trim().toLowerCase();
                      if (!normalized) return;
                      if (!strategyForm.tags.includes(normalized)) {
                        setStrategyForm((prev) => ({ ...prev, tags: [...prev.tags, normalized] }));
                      }
                      setTagInput("");
                    }}
                    className="rounded-lg border border-[#2A3B50] px-3 py-2 text-sm"
                  >
                    Add Tag
                  </button>
                  <div className="flex flex-wrap gap-1">
                    {strategyForm.tags.map((tag) => (
                      <button key={tag} onClick={() => setStrategyForm((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))} className="rounded-full border border-[#33485F] px-2 py-1 text-xs text-[#A9C3DE]">#{tag}</button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-[#A9C3DE]">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={strategyForm.is_public} onChange={(e) => setStrategyForm((prev) => ({ ...prev, is_public: e.target.checked }))} />Public</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={strategyForm.is_featured} onChange={(e) => setStrategyForm((prev) => ({ ...prev, is_featured: e.target.checked }))} />Featured</label>
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={saveStrategy} disabled={saving} className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : editingStrategyId ? "Update Strategy" : "Create Strategy"}</button>
                  {editingStrategyId ? <button onClick={resetStrategyForm} className="rounded-xl border border-[#2E4762] px-4 py-2 text-sm">Cancel</button> : null}
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
              <h3 className="text-lg font-semibold">Real-Time Card Preview</h3>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#2A3D55] bg-[#111E31]">
                {strategyForm.image_url ? (
                  <div className="relative h-36 w-full">
                    <Image src={strategyForm.image_url} alt="strategy-cover" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="h-36 bg-gradient-to-r from-[#1E3A8A] via-[#0EA5E9] to-[#10B981]" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {strategyForm.logo_url ? (
                      <Image src={strategyForm.logo_url} alt="strategy-logo" width={44} height={44} className="h-11 w-11 rounded-xl border border-[#35506E] object-cover" unoptimized />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#35506E] bg-[#13243A] text-xs text-[#A8C0DB]">LOGO</div>
                    )}
                    <div>
                      <p className="font-semibold">{strategyForm.name || "Strategy Name"}</p>
                      <p className="text-xs text-[#9AB4CF]">{strategyForm.strategy_tag || "strategy-tag"}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[#A7C0D9]">{strategyForm.description || "Strategy description preview appears here."}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg border border-[#35506E] bg-[#0C1624] p-2"><p className="text-[#80A8CE]">ROI</p><p className="mt-1 font-semibold">{strategyPreview.roi.toFixed(2)}%</p></div>
                    <div className="rounded-lg border border-[#35506E] bg-[#0C1624] p-2"><p className="text-[#80A8CE]">Win Rate</p><p className="mt-1 font-semibold">{strategyPreview.winRate.toFixed(2)}%</p></div>
                    <div className="rounded-lg border border-[#35506E] bg-[#0C1624] p-2"><p className="text-[#80A8CE]">Avg Curve</p><p className="mt-1 font-semibold">{strategyPreview.avg.toFixed(2)}</p></div>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        ) : null}

        {activeTab === "performance" ? (
          <section className="mt-5 rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Strategy Performance</h2>
              <select value={performanceStrategyId ?? ""} onChange={(e) => setPerformanceStrategyId(Number(e.target.value))} className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm">
                {strategies.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>

            {performanceData ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[#29415A] bg-[#101D2E] p-4">
                  <h3 className="font-medium">Equity Curve</h3>
                  <div className="mt-3 flex h-36 items-end gap-2">
                    {performanceData.equity_curve.map((point) => {
                      const max = Math.max(...performanceData.equity_curve.map((item) => Number(item.value || 0)), 1);
                      const height = (Number(point.value) / max) * 100;
                      return <div key={point.label} className="flex-1 rounded bg-gradient-to-t from-[#0EA5E9] to-[#22D3EE]" style={{ height: `${Math.max(height, 8)}%` }} />;
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-[#29415A] bg-[#101D2E] p-4">
                  <h3 className="font-medium">Drawdown Curve</h3>
                  <div className="mt-3 flex h-36 items-end gap-2">
                    {performanceData.drawdown_curve.map((point) => {
                      const max = Math.max(...performanceData.drawdown_curve.map((item) => Number(item.value || 0)), 1);
                      const height = (Number(point.value) / max) * 100;
                      return <div key={point.label} className="flex-1 rounded bg-gradient-to-t from-[#EF4444] to-[#F97316]" style={{ height: `${Math.max(height, 8)}%` }} />;
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-[#29415A] bg-[#101D2E] p-4">
                  <p className="text-sm text-[#90ADCA]">Win/Loss Ratio</p>
                  <p className="mt-2 text-2xl font-semibold">{performanceData.win_loss_ratio}</p>
                </div>
                <div className="rounded-xl border border-[#29415A] bg-[#101D2E] p-4">
                  <p className="text-sm text-[#90ADCA]">Average RR</p>
                  <p className="mt-2 text-2xl font-semibold">{performanceData.average_rr}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#8DA7C5]">No performance data yet.</p>
            )}
          </section>
        ) : null}

        {activeTab === "academy" ? (
          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
              <h2 className="text-lg font-semibold">Academy CMS</h2>
              <div className="mt-3 space-y-3">
                <input value={articleForm.title} onChange={(e) => setArticleForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Article Title" className="w-full rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <input value={articleForm.slug} onChange={(e) => setArticleForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="SEO Slug" className="w-full rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <input value={articleForm.category} onChange={(e) => setArticleForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" className="w-full rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <textarea value={articleForm.summary} onChange={(e) => setArticleForm((prev) => ({ ...prev, summary: e.target.value }))} placeholder="Summary" rows={2} className="w-full rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <textarea value={articleForm.content_markdown} onChange={(e) => setArticleForm((prev) => ({ ...prev, content_markdown: e.target.value }))} placeholder="Markdown content" rows={8} className="w-full rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 font-mono text-sm" />
                <label className="flex items-center gap-2 text-sm text-[#A8C2DE]"><input type="checkbox" checked={articleForm.is_published} onChange={(e) => setArticleForm((prev) => ({ ...prev, is_published: e.target.checked }))} />Publish</label>
                <div className="flex gap-2">
                  <button onClick={saveArticle} className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] px-4 py-2 text-sm font-semibold">{editingArticleId ? "Update" : "Create"} Article</button>
                  {editingArticleId ? <button onClick={() => { setEditingArticleId(null); setArticleForm(emptyArticle); }} className="rounded-xl border border-[#2E4762] px-4 py-2 text-sm">Cancel</button> : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Articles</h3>
                <input value={articleSearch} onChange={(e) => setArticleSearch(e.target.value)} placeholder="Search articles" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm" />
              </div>
              <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
                {filteredArticles.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[#27384D] bg-[#0F1D2F] p-3">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-[#8EA8C7]">{item.slug} - {item.is_published ? "Published" : "Draft"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingArticleId(item.id); setArticleForm({ title: item.title, slug: item.slug, category: item.category, summary: item.summary, content_markdown: item.content_markdown, is_published: item.is_published }); }} className="rounded-md border border-[#315375] px-2 py-1 text-xs">Edit</button>
                        <button onClick={() => removeArticle(item.id)} className="rounded-md border border-[#5C2A35] px-2 py-1 text-xs text-[#FFB9C7]">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "users" ? (
          <section className="mt-5 rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Users Management</h2>
              <div className="flex gap-2">
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm" />
                <select value={kycFilter} onChange={(e) => setKycFilter(e.target.value)} className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm">
                  <option value="all">All KYC</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => void loadUsers()} className="rounded-lg border border-[#2E4762] px-3 py-2 text-sm">Apply</button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A3C53] text-left text-xs uppercase tracking-[0.08em] text-[#8CA7C6]">
                    <th className="px-2 py-2">User</th>
                    <th className="px-2 py-2">KYC</th>
                    <th className="px-2 py-2">Subscription</th>
                    <th className="px-2 py-2">Wallet</th>
                    <th className="px-2 py-2">Exchanges</th>
                    <th className="px-2 py-2">Followers</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.items.map((item) => (
                    <tr key={item.id} className="border-b border-[#1E2D40]">
                      <td className="px-2 py-3"><p className="font-medium">{item.full_name}</p><p className="text-xs text-[#89A4C3]">{item.email}</p></td>
                      <td className="px-2 py-3">{item.kyc_status}</td>
                      <td className="px-2 py-3">{item.subscription_status}</td>
                      <td className="px-2 py-3">${formatCurrency(item.wallet_balance)}</td>
                      <td className="px-2 py-3">{item.linked_exchange_accounts}</td>
                      <td className="px-2 py-3">{item.followers}</td>
                      <td className="px-2 py-3"><button onClick={() => banToggleUser(item.id, item.is_active)} className={`rounded-md border px-2 py-1 text-xs ${item.is_active ? "border-[#6A2F39] text-[#FFC3CE]" : "border-[#2E6153] text-[#C4FCE2]"}`}>{item.is_active ? "Ban" : "Unban"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "trades" ? (
          <section className="mt-5 rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Trades Management</h2>
              <div className="flex gap-2">
                <input value={tradeSearch} onChange={(e) => setTradeSearch(e.target.value)} placeholder="Search symbol/strategy" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm" />
                <select value={tradeStatusFilter} onChange={(e) => setTradeStatusFilter(e.target.value)} className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm">
                  <option value="all">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button onClick={() => void loadTrades()} className="rounded-lg border border-[#2E4762] px-3 py-2 text-sm">Apply</button>
                <button onClick={syncTrades} className="rounded-lg border border-[#2E6153] px-3 py-2 text-sm text-[#C4FCE2]">Sync Exchange</button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {trades?.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#24384E] bg-[#101D30] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.symbol} {item.side} - {item.status}</p>
                      <p className="text-xs text-[#89A5C6]">Qty {item.quantity} @ {item.price} | PNL {item.pnl} | {formatDate(item.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={manualClosePrice[item.id] ?? ""} onChange={(e) => setManualClosePrice((prev) => ({ ...prev, [item.id]: e.target.value }))} placeholder="Close price" className="w-28 rounded-md border border-[#2A3B50] bg-[#0F1B2B] px-2 py-1 text-xs" />
                      <button onClick={() => manualCloseTrade(item.id)} className="rounded-md border border-[#315375] px-2 py-1 text-xs">Manual Close</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "notifications" ? (
          <section className="mt-5 rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Notifications & Alerts</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} placeholder="Alert title" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
              <select value={notificationCategory} onChange={(e) => setNotificationCategory(e.target.value)} className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2">
                <option value="admin">Admin</option>
                <option value="system">System</option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
              </select>
            </div>
            <textarea value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} placeholder="Notification message" rows={4} className="mt-3 w-full rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
            <button onClick={broadcastNotification} className="mt-3 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#10B981] px-4 py-2 text-sm font-semibold">Broadcast to Users</button>
          </section>
        ) : null}

        {activeTab === "settings" ? (
          <section className="mt-5 rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Platform Settings</h2>
            {platformSettings ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input value={platformSettings.site_name} onChange={(e) => setPlatformSettings((prev) => (prev ? { ...prev, site_name: e.target.value } : prev))} placeholder="Site name" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <input value={platformSettings.support_email} onChange={(e) => setPlatformSettings((prev) => (prev ? { ...prev, support_email: e.target.value } : prev))} placeholder="Support email" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <input type="number" value={platformSettings.fee_percent} onChange={(e) => setPlatformSettings((prev) => (prev ? { ...prev, fee_percent: Number(e.target.value) } : prev))} placeholder="Fee %" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <input type="number" value={platformSettings.profit_share_percent} onChange={(e) => setPlatformSettings((prev) => (prev ? { ...prev, profit_share_percent: Number(e.target.value) } : prev))} placeholder="Profit share %" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <input value={platformSettings.exchange_api_key ?? ""} onChange={(e) => setPlatformSettings((prev) => (prev ? { ...prev, exchange_api_key: e.target.value } : prev))} placeholder="Exchange API key" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <input value={platformSettings.exchange_api_secret ?? ""} onChange={(e) => setPlatformSettings((prev) => (prev ? { ...prev, exchange_api_secret: e.target.value } : prev))} placeholder="Exchange API secret" className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2" />
                <label className="flex items-center gap-2 text-sm text-[#A8C2DE]"><input type="checkbox" checked={platformSettings.telegram_alerts_enabled} onChange={(e) => setPlatformSettings((prev) => (prev ? { ...prev, telegram_alerts_enabled: e.target.checked } : prev))} />Telegram Alerts</label>
                <label className="flex items-center gap-2 text-sm text-[#A8C2DE]"><input type="checkbox" checked={platformSettings.maintenance_mode} onChange={(e) => setPlatformSettings((prev) => (prev ? { ...prev, maintenance_mode: e.target.checked } : prev))} />Maintenance Mode</label>
              </div>
            ) : null}
            <button onClick={saveSettings} className="mt-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] px-4 py-2 text-sm font-semibold">Save Settings</button>
          </section>
        ) : null}

        {activeTab === "security" ? (
          <section className="mt-5 rounded-2xl border border-[#1E2A39] bg-[#0D1725]/70 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Audit & Security Logs</h2>
              <div className="flex gap-2">
                <select value={auditSeverity} onChange={(e) => setAuditSeverity(e.target.value)} className="rounded-lg border border-[#2A3B50] bg-[#0F1B2B] px-3 py-2 text-sm">
                  <option value="all">All severity</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                <button onClick={() => void loadAudit()} className="rounded-lg border border-[#2E4762] px-3 py-2 text-sm">Filter</button>
              </div>
            </div>

            <div className="mt-4 max-h-[460px] space-y-2 overflow-auto pr-1">
              {auditLogs?.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#27384D] bg-[#0F1D2F] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{item.action}</p>
                    <span className={`rounded-full px-2 py-1 text-xs ${item.severity === "warning" ? "bg-[#44212A] text-[#FFB7C7]" : item.severity === "error" ? "bg-[#4E1E1E] text-[#FFB8B8]" : "bg-[#17314A] text-[#B5D8FF]"}`}>{item.severity}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#8CA7C8]">{item.target_type} #{item.target_id ?? "n/a"} | actor {item.actor_user_id ?? "system"}</p>
                  <p className="mt-1 text-xs text-[#728CAA]">{formatDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
