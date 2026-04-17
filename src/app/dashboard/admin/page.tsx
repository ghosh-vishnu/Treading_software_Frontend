"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type {
  AcademyArticle,
  AcademyArticleCreateRequest,
  AcademyArticleUpdateRequest,
  AdminDashboardSummary,
  AdminStrategyCreateRequest,
  AdminStrategyUpdateRequest,
  StrategyCard,
  UserProfile,
} from "@/lib/types";

const DEFAULT_STRATEGY: AdminStrategyCreateRequest = {
  name: "",
  description: null,
  strategy_tag: "",
  exchange: "Delta Exchange",
  followers: 0,
  recommended_margin: "1000",
  mdd_percent: "0",
  win_rate_percent: "0",
  pnl: "0",
  roi_percent: "0",
  chart_points: ["10", "20", "25", "18", "30", "34", "28"],
  academy_slugs: [],
  is_public: true,
  is_featured: false,
};

const DEFAULT_ARTICLE: AcademyArticleCreateRequest = {
  title: "",
  slug: "",
  category: "general",
  summary: "",
  content_markdown: "",
  is_published: true,
};

function strategyToFormValue(strategy: StrategyCard): AdminStrategyCreateRequest {
  return {
    name: strategy.name,
    description: strategy.description,
    strategy_tag: strategy.strategy_tag,
    exchange: strategy.exchange,
    followers: strategy.followers,
    recommended_margin: strategy.recommended_margin,
    mdd_percent: strategy.mdd_percent,
    win_rate_percent: strategy.win_rate_percent,
    pnl: strategy.pnl,
    roi_percent: strategy.roi_percent,
    chart_points: strategy.chart_points ? strategy.chart_points.split(",").map((item) => item.trim()).filter(Boolean) : ["10", "12"],
    academy_slugs: strategy.academy_slugs ? strategy.academy_slugs.split(",").map((item) => item.trim()).filter(Boolean) : [],
    is_public: strategy.is_public,
    is_featured: strategy.is_featured,
  };
}

function articleToFormValue(article: AcademyArticle): AcademyArticleCreateRequest {
  return {
    title: article.title,
    slug: article.slug,
    category: article.category,
    summary: article.summary,
    content_markdown: article.content_markdown,
    is_published: article.is_published,
  };
}

function getApiErrorMessage(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const combined = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) return String(item.msg);
        return "";
      })
      .filter(Boolean)
      .join("; ");

    if (combined) {
      return combined;
    }
  }

  if (detail && typeof detail === "object" && "msg" in detail) {
    return String((detail as { msg: unknown }).msg);
  }

  return fallback;
}

export default function AdminPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [strategies, setStrategies] = useState<StrategyCard[]>([]);
  const [articles, setArticles] = useState<AcademyArticle[]>([]);

  const [strategyForm, setStrategyForm] = useState<AdminStrategyCreateRequest>(DEFAULT_STRATEGY);
  const [articleForm, setArticleForm] = useState<AcademyArticleCreateRequest>(DEFAULT_ARTICLE);

  const [editingStrategyId, setEditingStrategyId] = useState<number | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);
  const [deletingStrategy, setDeletingStrategy] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const academySlugSuggestions = useMemo(
    () => articles.map((item) => item.slug).filter(Boolean),
    [articles],
  );

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);

    try {
      const profileRes = await api.get<UserProfile>("/auth/me");
      if (profileRes.data.role !== "admin") {
        setError("Only admin can access this panel.");
        setLoading(false);
        return;
      }

      setProfile(profileRes.data);

      const [summaryRes, strategyRes, articleRes] = await Promise.all([
        api.get<AdminDashboardSummary>("/admin/summary"),
        api.get<StrategyCard[]>("/admin/strategies"),
        api.get<AcademyArticle[]>("/admin/academy/articles"),
      ]);

      setSummary(summaryRes.data);
      setStrategies(strategyRes.data);
      setArticles(articleRes.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearTokens();
        router.push("/login");
        return;
      }
      if (err?.response?.status === 403) {
        setError("Admin privileges are required.");
      } else {
        setError(getApiErrorMessage(err, "Unable to load admin panel data."));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    void loadAdminData();
  }, [router]);

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const resetStrategyEditor = () => {
    setEditingStrategyId(null);
    setStrategyForm(DEFAULT_STRATEGY);
  };

  const resetArticleEditor = () => {
    setEditingArticleId(null);
    setArticleForm(DEFAULT_ARTICLE);
  };

  const saveStrategy = async () => {
    setSavingStrategy(true);
    setError(null);
    setMessage(null);

    try {
      if (!strategyForm.name || !strategyForm.strategy_tag || !strategyForm.recommended_margin) {
        setError("Please complete required strategy fields.");
        return;
      }

      const payload: AdminStrategyCreateRequest = {
        ...strategyForm,
        academy_slugs: strategyForm.academy_slugs.filter(Boolean),
        chart_points: strategyForm.chart_points.filter(Boolean),
      };

      if (editingStrategyId) {
        const updatePayload: AdminStrategyUpdateRequest = payload;
        const response = await api.patch<StrategyCard>(`/admin/strategies/${editingStrategyId}`, updatePayload);
        setStrategies((current) => current.map((item) => (item.id === editingStrategyId ? response.data : item)));
        setMessage("Strategy updated successfully.");
      } else {
        const response = await api.post<StrategyCard>("/admin/strategies", payload);
        setStrategies((current) => [response.data, ...current]);
        setMessage("Strategy uploaded successfully and available in Strategies tab.");
      }

      resetStrategyEditor();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to save strategy."));
    } finally {
      setSavingStrategy(false);
    }
  };

  const saveArticle = async () => {
    setSavingArticle(true);
    setError(null);
    setMessage(null);

    try {
      if (!articleForm.title || !articleForm.slug || !articleForm.summary || !articleForm.content_markdown) {
        setError("Please complete required academy fields.");
        return;
      }

      if (editingArticleId) {
        const payload: AcademyArticleUpdateRequest = articleForm;
        const response = await api.patch<AcademyArticle>(`/admin/academy/articles/${editingArticleId}`, payload);
        setArticles((current) => current.map((item) => (item.id === editingArticleId ? response.data : item)));
        setMessage("Academy article updated successfully.");
      } else {
        const response = await api.post<AcademyArticle>("/admin/academy/articles", articleForm);
        setArticles((current) => [response.data, ...current]);
        setMessage("Academy article uploaded successfully.");
      }

      resetArticleEditor();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to save academy article."));
    } finally {
      setSavingArticle(false);
    }
  };

  const removeStrategy = async () => {
    if (!editingStrategyId) {
      setError("Choose a strategy from list to delete.");
      return;
    }

    const ok = window.confirm("Delete selected strategy? This cannot be undone.");
    if (!ok) {
      return;
    }

    setDeletingStrategy(true);
    setError(null);
    setMessage(null);

    try {
      await api.delete(`/admin/strategies/${editingStrategyId}`);
      setStrategies((current) => current.filter((item) => item.id !== editingStrategyId));
      setMessage("Strategy deleted.");
      resetStrategyEditor();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to delete strategy."));
    } finally {
      setDeletingStrategy(false);
    }
  };

  const removeArticle = async () => {
    if (!editingArticleId) {
      setError("Choose an academy article from list to delete.");
      return;
    }

    const ok = window.confirm("Delete selected academy article? This cannot be undone.");
    if (!ok) {
      return;
    }

    setDeletingArticle(true);
    setError(null);
    setMessage(null);

    try {
      await api.delete(`/admin/academy/articles/${editingArticleId}`);
      setArticles((current) => current.filter((item) => item.id !== editingArticleId));
      setMessage("Academy article deleted.");
      resetArticleEditor();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to delete academy article."));
    } finally {
      setDeletingArticle(false);
    }
  };

  const updateChartPoint = (index: number, value: string) => {
    setStrategyForm((prev) => ({
      ...prev,
      chart_points: prev.chart_points.map((point, pointIndex) => (pointIndex === index ? value : point)),
    }));
  };

  const updateAcademySlug = (index: number, value: string) => {
    setStrategyForm((prev) => ({
      ...prev,
      academy_slugs: prev.academy_slugs.map((slug, slugIndex) => (slugIndex === index ? value : slug)),
    }));
  };

  return (
    <main className="min-h-screen bg-[#040608] text-[#E8ECEF]">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-[#1A1F26] bg-[#090C12] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#151B22] pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[#8B95A1]">Admin Console</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#F6FAFF]">Strategy + Academy Publisher</h1>
              <p className="mt-1 text-sm text-[#9AA5B1]">Create, edit, and delete strategy cards with linked academy content.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push("/dashboard/strategies")} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Open Strategies</button>
              <button onClick={onLogout} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Sign Out</button>
            </div>
          </div>
          <div className="mt-3 text-sm text-[#8F9BA8]">
            Logged in as {profile?.full_name ?? "Admin"} ({profile?.email ?? ""})
          </div>
        </header>

        {error ? <p className="mt-4 rounded-lg border border-[#4F2A2A] bg-[#2A1414] px-3 py-2 text-sm text-[#FFB4B4]">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg border border-[#31503A] bg-[#142419] px-3 py-2 text-sm text-[#AEE7B8]">{message}</p> : null}

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[#8995A3]">Total Customers</p>
            <p className="mt-3 text-[30px] font-semibold text-[#F0F5FA]">{summary?.total_customers ?? 0}</p>
            <p className="text-xs text-[#7C8794]">Active: {summary?.active_customers ?? 0}</p>
          </article>

          <article className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[#8995A3]">Strategies</p>
            <p className="mt-3 text-[30px] font-semibold text-[#F0F5FA]">{summary?.total_strategies ?? 0}</p>
            <p className="text-xs text-[#7C8794]">Public: {summary?.public_strategies ?? 0}</p>
          </article>

          <article className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[#8995A3]">Academy Articles</p>
            <p className="mt-3 text-[30px] font-semibold text-[#F0F5FA]">{summary?.total_academy_articles ?? 0}</p>
            <p className="text-xs text-[#7C8794]">Published: {summary?.published_academy_articles ?? 0}</p>
          </article>

          <article className="rounded-2xl border border-[#1A212A] bg-[#070A10] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[#8995A3]">Trades</p>
            <p className="mt-3 text-[30px] font-semibold text-[#F0F5FA]">{summary?.total_trades ?? 0}</p>
            <p className="text-xs text-[#7C8794]">Open: {summary?.open_trades ?? 0}</p>
          </article>
        </section>

        {loading ? (
          <p className="mt-5 rounded-xl border border-[#1A1E23] bg-[#090B0F] px-5 py-8 text-[#9AA5B1]">Loading admin panel...</p>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="space-y-5">
              <div className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-[#F3F7FB]">{editingStrategyId ? "Edit Strategy Card" : "Upload Strategy Card"}</h2>
                  {editingStrategyId ? <span className="text-xs text-[#9AA5B1]">Editing ID: {editingStrategyId}</span> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-[#9AA5B1]">Strategy Name<input value={strategyForm.name} onChange={(e) => setStrategyForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">Strategy Tag<input value={strategyForm.strategy_tag} onChange={(e) => setStrategyForm((p) => ({ ...p, strategy_tag: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">Exchange<input value={strategyForm.exchange} onChange={(e) => setStrategyForm((p) => ({ ...p, exchange: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">Followers<input type="number" min={0} value={strategyForm.followers} onChange={(e) => setStrategyForm((p) => ({ ...p, followers: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">Recommended Margin<input value={strategyForm.recommended_margin} onChange={(e) => setStrategyForm((p) => ({ ...p, recommended_margin: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">MDD %<input value={strategyForm.mdd_percent} onChange={(e) => setStrategyForm((p) => ({ ...p, mdd_percent: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">Win Rate %<input value={strategyForm.win_rate_percent} onChange={(e) => setStrategyForm((p) => ({ ...p, win_rate_percent: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">PNL<input value={strategyForm.pnl} onChange={(e) => setStrategyForm((p) => ({ ...p, pnl: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">ROI %<input value={strategyForm.roi_percent} onChange={(e) => setStrategyForm((p) => ({ ...p, roi_percent: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="text-sm text-[#9AA5B1]">Public<label className="mt-2 block"><input type="checkbox" checked={strategyForm.is_public} onChange={(e) => setStrategyForm((p) => ({ ...p, is_public: e.target.checked }))} /></label></label>
                  <label className="text-sm text-[#9AA5B1]">Featured<label className="mt-2 block"><input type="checkbox" checked={strategyForm.is_featured} onChange={(e) => setStrategyForm((p) => ({ ...p, is_featured: e.target.checked }))} /></label></label>
                  <label className="text-sm text-[#9AA5B1] sm:col-span-2">Description<textarea rows={3} value={strategyForm.description ?? ""} onChange={(e) => setStrategyForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#DDE5EE]">Chart Points</h3>
                    <button
                      onClick={() => setStrategyForm((p) => ({ ...p, chart_points: [...p.chart_points, "0"] }))}
                      className="rounded-lg border border-[#2A313A] px-2 py-1 text-xs text-[#C1CBD8]"
                    >
                      Add Point
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {strategyForm.chart_points.map((point, index) => (
                      <div key={`point-${index}`} className="flex items-center gap-1">
                        <input
                          value={point}
                          onChange={(e) => updateChartPoint(index, e.target.value)}
                          className="w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-2 py-2 text-sm"
                        />
                        <button
                          onClick={() => setStrategyForm((p) => ({ ...p, chart_points: p.chart_points.filter((_, i) => i !== index) }))}
                          className="rounded border border-[#303A46] px-1 py-1 text-xs text-[#C1CBD8]"
                          aria-label="Remove point"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#DDE5EE]">Linked Academy Slugs</h3>
                    <button onClick={() => setStrategyForm((p) => ({ ...p, academy_slugs: [...p.academy_slugs, ""] }))} className="rounded-lg border border-[#2A313A] px-2 py-1 text-xs text-[#C1CBD8]">Add Slug</button>
                  </div>
                  <div className="space-y-2">
                    {strategyForm.academy_slugs.map((slug, index) => (
                      <div key={`slug-${index}`} className="flex items-center gap-2">
                        <input
                          value={slug}
                          onChange={(e) => updateAcademySlug(index, e.target.value)}
                          placeholder="example: risk-control-basics"
                          className="w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2 text-sm"
                          list="academy-slugs"
                        />
                        <button
                          onClick={() => setStrategyForm((p) => ({ ...p, academy_slugs: p.academy_slugs.filter((_, i) => i !== index) }))}
                          className="rounded border border-[#303A46] px-2 py-2 text-xs text-[#C1CBD8]"
                          aria-label="Remove slug"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <datalist id="academy-slugs">
                      {academySlugSuggestions.map((slug) => (
                        <option key={slug} value={slug} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    onClick={saveStrategy}
                    disabled={savingStrategy}
                    className="rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] disabled:opacity-60"
                  >
                    {savingStrategy ? "Saving..." : editingStrategyId ? "Save Strategy Changes" : "Upload Strategy"}
                  </button>
                  {editingStrategyId ? (
                    <>
                      <button onClick={resetStrategyEditor} className="rounded-lg border border-[#2A313A] px-4 py-2 text-sm text-[#C1CBD8]">Cancel Edit</button>
                      <button onClick={removeStrategy} disabled={deletingStrategy} className="rounded-lg border border-[#4E2D2D] px-4 py-2 text-sm text-[#FFB4B4] disabled:opacity-60">{deletingStrategy ? "Deleting..." : "Delete Strategy"}</button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
                <h2 className="text-lg font-semibold text-[#F3F7FB]">Strategy Records</h2>
                <div className="mt-3 max-h-[320px] space-y-2 overflow-auto pr-1">
                  {strategies.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setEditingStrategyId(item.id);
                        setStrategyForm(strategyToFormValue(item));
                        setMessage(`Editing strategy: ${item.name}`);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${editingStrategyId === item.id ? "border-[#9BFF00] bg-[#111A0C]" : "border-[#24303A] bg-[#0D131B]"}`}
                    >
                      <p className="font-medium text-[#EFF4FA]">{item.name}</p>
                      <p className="text-xs text-[#8D9AAA]">{item.strategy_tag} • ROI {Number(item.roi_percent).toFixed(1)}% • Followers {item.followers}</p>
                    </button>
                  ))}
                  {strategies.length === 0 ? <p className="text-sm text-[#7F8A97]">No strategies yet.</p> : null}
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-[#F3F7FB]">{editingArticleId ? "Edit Academy Content" : "Upload Academy Content"}</h2>
                  {editingArticleId ? <span className="text-xs text-[#9AA5B1]">Editing ID: {editingArticleId}</span> : null}
                </div>
                <div className="space-y-3">
                  <label className="block text-sm text-[#9AA5B1]">Title<input value={articleForm.title} onChange={(e) => setArticleForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="block text-sm text-[#9AA5B1]">Slug<input value={articleForm.slug} onChange={(e) => setArticleForm((p) => ({ ...p, slug: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="block text-sm text-[#9AA5B1]">Category<input value={articleForm.category} onChange={(e) => setArticleForm((p) => ({ ...p, category: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="block text-sm text-[#9AA5B1]">Summary<textarea rows={2} value={articleForm.summary} onChange={(e) => setArticleForm((p) => ({ ...p, summary: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="block text-sm text-[#9AA5B1]">Markdown Content<textarea rows={4} value={articleForm.content_markdown} onChange={(e) => setArticleForm((p) => ({ ...p, content_markdown: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
                  <label className="flex items-center gap-2 text-sm text-[#9AA5B1]"><input type="checkbox" checked={articleForm.is_published} onChange={(e) => setArticleForm((p) => ({ ...p, is_published: e.target.checked }))} /> Publish now</label>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={saveArticle}
                    disabled={savingArticle}
                    className="rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] disabled:opacity-60"
                  >
                    {savingArticle ? "Saving..." : editingArticleId ? "Save Article Changes" : "Upload Academy Article"}
                  </button>
                  {editingArticleId ? (
                    <>
                      <button onClick={resetArticleEditor} className="rounded-lg border border-[#2A313A] px-4 py-2 text-sm text-[#C1CBD8]">Cancel Edit</button>
                      <button onClick={removeArticle} disabled={deletingArticle} className="rounded-lg border border-[#4E2D2D] px-4 py-2 text-sm text-[#FFB4B4] disabled:opacity-60">{deletingArticle ? "Deleting..." : "Delete Article"}</button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
                <h2 className="text-lg font-semibold text-[#F3F7FB]">Academy Records</h2>
                <div className="mt-3 max-h-[320px] space-y-2 overflow-auto pr-1">
                  {articles.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setEditingArticleId(item.id);
                        setArticleForm(articleToFormValue(item));
                        setMessage(`Editing academy article: ${item.title}`);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${editingArticleId === item.id ? "border-[#9BFF00] bg-[#111A0C]" : "border-[#24303A] bg-[#0D131B]"}`}
                    >
                      <p className="font-medium text-[#EFF4FA]">{item.title}</p>
                      <p className="text-xs text-[#8D9AAA]">{item.category} • {item.slug} • {item.is_published ? "Published" : "Draft"}</p>
                    </button>
                  ))}
                  {articles.length === 0 ? <p className="text-sm text-[#7F8A97]">No academy articles yet.</p> : null}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
