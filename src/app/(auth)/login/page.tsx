"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", { email, password });
      setTokens(data.tokens.access_token, data.tokens.refresh_token);
      router.push("/dashboard");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050607] px-4 text-[#E8ECEF]">
      <section className="w-full max-w-md rounded-3xl border border-[#1A1E23] bg-[#090B0F] p-8 shadow-[0_0_0_1px_rgba(153,255,0,0.04)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8B95A1]">Algo Trading</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#F6FAFF]">Sign In</h1>
        <p className="mt-2 text-sm text-[#9AA5B1]">Access the trading dashboard, broker connect, and copy engine.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            className="w-full rounded-lg bg-[#9BFF00] px-4 py-3 font-semibold text-[#11140D] transition hover:bg-[#B7FF45] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-sm text-[#9AA5B1]">
          New user? <a href="/register" className="font-semibold text-[#9BFF00]">Create an account</a>
        </p>
      </section>
    </main>
  );
}
