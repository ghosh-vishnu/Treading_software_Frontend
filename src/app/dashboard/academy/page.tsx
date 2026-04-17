"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type { AcademyArticle, AcademyArticleCreateRequest, UserProfile } from "@/lib/types";

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
      const [articlesRes, profileRes] = await Promise.all([
        api.get<AcademyArticle[]>("/academy/articles"),
        api.get<UserProfile>("/auth/me"),
      ]);
      if (profileRes.data.role === "admin") {
        router.replace("/admin");
        return;
      }
      setArticles(articlesRes.data);
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
      const res = await api.post<AcademyArticle>("/admin/academy/articles", form);
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
          <h2 className="text-lg font-semibold text-[#F3F7FB]">Published Articles</h2>
          {loading ? <p className="mt-3 text-sm text-[#9AA5B1]">Loading...</p> : null}
          <div className="mt-3 space-y-3">
            {articles.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#24303A] bg-[#0D131B] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button onClick={() => router.push(`/dashboard/academy/${item.slug}`)} className="text-left text-lg font-semibold text-[#EFF4FA] hover:text-[#FFFFFF]">{item.title}</button>
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
