"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useMounted } from "@/lib/useMounted";

export default function LoginPage() {
  const router = useRouter();
  const mounted = useMounted();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpChannel, setOtpChannel] = useState<"email" | "phone" | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!mounted) {
    return null;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!challengeId) {
        const { data } = await api.post("/auth/login", { identifier, password });
        setChallengeId(data.challenge_id);
        setOtpChannel(data.channel ?? null);
        setDebugOtp(data.debug_otp ?? null);
        return;
      }

      const { data } = await api.post("/auth/login/verify-otp", { challenge_id: challengeId, otp });
      setTokens(data.tokens.access_token, data.tokens.refresh_token);
      router.replace(data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError(challengeId ? "Invalid OTP. Please try again." : "Login failed. Please check credentials and retry.");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setChallengeId(null);
    setOtp("");
    setOtpChannel(null);
    setDebugOtp(null);
    setError("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050607] px-4 text-[#E8ECEF]">
      <section className="w-full max-w-md rounded-3xl border border-[#1A1E23] bg-[#090B0F] p-8 shadow-[0_0_0_1px_rgba(153,255,0,0.04)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8B95A1]">Algo Trading</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#F6FAFF]">{challengeId ? "Verify OTP" : "Sign In"}</h1>
        <p className="mt-2 text-sm text-[#9AA5B1]">
          {challengeId
            ? `We sent an OTP to your ${otpChannel ?? "registered"} channel.`
            : "Access the trading dashboard, broker connect, and copy engine."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {!challengeId ? (
            <>
              <input
                className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
                type="text"
                placeholder="Email or phone (E.164, e.g. +919999999999)"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
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
            </>
          ) : (
            <>
              <input
                className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
              {debugOtp ? (
                <p className="rounded-lg border border-[#243000] bg-[#121A08] px-3 py-2 text-xs text-[#B7FF45]">
                  Dev OTP: <span className="font-semibold">{debugOtp}</span>
                </p>
              ) : null}
            </>
          )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            className="w-full rounded-lg bg-[#9BFF00] px-4 py-3 font-semibold text-[#11140D] transition hover:bg-[#B7FF45] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Please wait..." : challengeId ? "Verify & Continue" : "Send OTP"}
          </button>
          {challengeId ? (
            <button
              type="button"
              className="w-full rounded-lg border border-[#242C35] bg-transparent px-4 py-3 text-sm font-semibold text-[#E8ECEF] transition hover:bg-[#0E141B]"
              onClick={resetFlow}
              disabled={loading}
            >
              Back to login
            </button>
          ) : null}
        </form>
        <p className="mt-6 text-sm text-[#9AA5B1]">
          New user? <a href="/register" className="font-semibold text-[#9BFF00]">Create an account</a>
        </p>
        <p className="mt-2 text-sm text-[#9AA5B1]">
          Forgot password? <a href="/forgot-password" className="font-semibold text-[#9BFF00]">Reset it</a>
        </p>
      </section>
    </main>
  );
}
