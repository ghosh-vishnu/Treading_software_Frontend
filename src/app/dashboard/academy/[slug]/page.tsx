"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import { extractApiErrorMessage } from "@/lib/errors";
import type { AcademyArticle } from "@/lib/types";

export default function AcademyArticleDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [article, setArticle] = useState<AcademyArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sourceTag = useMemo(() => searchParams.get("from"), [searchParams]);

  const loadArticle = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<AcademyArticle>(`/academy/articles/${params.slug}`);
      setArticle(response.data);
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
      if (status === 404) {
        setError("This academy article is not available right now.");
      } else {
        setError(extractApiErrorMessage(err, "Unable to load article details."));
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

    if (!params.slug) {
      setError("Invalid article slug.");
      setLoading(false);
      return;
    }

    void loadArticle();
  }, [params.slug, router]);

  return (
    <main className="min-h-screen bg-[#050607] text-[#E8ECEF]">
      <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6">
        <header className="mb-5 rounded-2xl border border-[#1A1E23] bg-[#090B0F] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[#8B95A1]">Academy Article</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#F6FAFF]">{article?.title ?? "Loading..."}</h1>
            </div>
            <div className="flex items-center gap-2">
              {sourceTag ? (
                <button onClick={() => router.push("/dashboard/strategies")} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">
                  Back to Strategy
                </button>
              ) : null}
              <button onClick={() => router.push("/dashboard/academy")} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">
                Academy List
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-[#9AA5B1]">
            {article ? `${article.category} • ${article.slug}` : "Fetching details..."}
          </p>
        </header>

        {loading ? <p className="rounded-lg border border-[#1A1E23] bg-[#0A0D13] px-4 py-4 text-[#9AA5B1]">Loading article...</p> : null}
        {error ? <p className="rounded-lg border border-[#4F2A2A] bg-[#2A1414] px-4 py-3 text-sm text-[#FFB4B4]">{error}</p> : null}

        {article && !loading ? (
          <article className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
            <p className="mb-4 text-sm text-[#AAB5C2]">{article.summary}</p>
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-[#24303A] bg-[#0D131B] p-4 text-sm text-[#D9E1EA]">
              {article.content_markdown}
            </pre>
          </article>
        ) : null}
      </div>
    </main>
  );
}
