"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type { AcademyArticle, AcademyArticleCreateRequest } from "@/lib/types";

const DEFAULT_ARTICLE: AcademyArticleCreateRequest = {
  title: "",
  slug: "",
  category: "general",
  summary: "",
  content_markdown: "",
  is_published: true,
};

export default function AcademyPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<AcademyArticle[]>([]);
  const [form, setForm] = useState<AcademyArticleCreateRequest>(DEFAULT_ARTICLE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get<AcademyArticle[]>("/academy/articles");
      setArticles(res.data);
    } catch {
      setError("Unable to load academy articles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    void loadArticles();
  }, [router]);

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const createArticle = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post<AcademyArticle>("/academy/articles", form);
      setArticles((current) => [res.data, ...current]);
      setMessage("Article created.");
      setForm(DEFAULT_ARTICLE);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create article.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050607] text-[#E8ECEF]">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-[#1A1E23] bg-[#090B0F] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#8B95A1]">Academy</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#F6FAFF]">Learning Resources</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/dashboard")} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Dashboard</button>
            <button onClick={onLogout} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Sign Out</button>
          </div>
        </header>

        {error ? <p className="mb-3 rounded-lg border border-[#4F2A2A] bg-[#2A1414] px-3 py-2 text-sm text-[#FFB4B4]">{error}</p> : null}
        {message ? <p className="mb-3 rounded-lg border border-[#31503A] bg-[#142419] px-3 py-2 text-sm text-[#AEE7B8]">{message}</p> : null}

        <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <h2 className="text-lg font-semibold text-[#F3F7FB]">Create Article</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[#9AA5B1]">Title<input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
            <label className="text-sm text-[#9AA5B1]">Slug<input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
            <label className="text-sm text-[#9AA5B1]">Category<input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
            <label className="text-sm text-[#9AA5B1]">Published<label className="mt-2 block"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} /></label></label>
            <label className="text-sm text-[#9AA5B1] sm:col-span-2">Summary<textarea rows={2} value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
            <label className="text-sm text-[#9AA5B1] sm:col-span-2">Content (Markdown)<textarea rows={5} value={form.content_markdown} onChange={(e) => setForm((p) => ({ ...p, content_markdown: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
          </div>
          <button onClick={createArticle} disabled={saving || !form.title || !form.slug || !form.summary || !form.content_markdown} className="mt-5 rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] disabled:opacity-60">{saving ? "Saving..." : "Create Article"}</button>
        </section>

        <section className="mt-5 rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <h2 className="text-lg font-semibold text-[#F3F7FB]">Published Articles</h2>
          {loading ? <p className="mt-3 text-sm text-[#9AA5B1]">Loading...</p> : null}
          <div className="mt-3 space-y-3">
            {articles.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#24303A] bg-[#0D131B] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-[#EFF4FA]">{item.title}</h3>
                    <p className="text-xs text-[#8D9AAA]">{item.category} • {item.slug}</p>
                  </div>
                  <span className="rounded-full border border-[#2A313A] px-2 py-1 text-xs text-[#AAB4C0]">{item.is_published ? "Published" : "Draft"}</span>
                </div>
                <p className="mt-2 text-sm text-[#B8C2CF]">{item.summary}</p>
              </article>
            ))}
            {!loading && articles.length === 0 ? <p className="text-sm text-[#7F8A97]">No academy articles yet.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
