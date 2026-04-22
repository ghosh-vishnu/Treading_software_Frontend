"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const mounted = useMounted();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailChallengeId, setEmailChallengeId] = useState<string | null>(null);
  const [phoneChallengeId, setPhoneChallengeId] = useState<string | null>(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [debugEmailOtp, setDebugEmailOtp] = useState<string | null>(null);
  const [debugPhoneOtp, setDebugPhoneOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const extractErrorMessage = (err: unknown): string => {
    if (typeof err === "object" && err && "response" in err) {
      const response = (err as { response?: { data?: unknown } }).response;
      const data = response?.data;
      if (typeof data === "object" && data && "detail" in data && typeof (data as { detail?: unknown }).detail === "string") {
        return (data as { detail: string }).detail;
      }
    }
    return "Reset failed. Please verify details and retry.";
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!emailChallengeId || !phoneChallengeId) {
        const { data } = await api.post("/auth/forgot-password", { email, phone });
        setEmailChallengeId(data.email_challenge_id || null);
        setPhoneChallengeId(data.phone_challenge_id || null);
        setDebugEmailOtp(data.debug_email_otp ?? null);
        setDebugPhoneOtp(data.debug_phone_otp ?? null);
        return;
      }

      await api.post("/auth/reset-password", {
        email,
        phone,
        email_challenge_id: emailChallengeId,
        email_otp: emailOtp,
        phone_challenge_id: phoneChallengeId,
        phone_otp: phoneOtp,
        new_password: newPassword,
      });
      setDone(true);
      setTimeout(() => router.replace("/login"), 800);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setEmailChallengeId(null);
    setPhoneChallengeId(null);
    setEmailOtp("");
    setPhoneOtp("");
    setDebugEmailOtp(null);
    setDebugPhoneOtp(null);
    setNewPassword("");
    setDone(false);
    setError("");
  };

  if (!mounted) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050607] px-4 text-[#E8ECEF]">
      <section className="w-full max-w-md rounded-3xl border border-[#1A1E23] bg-[#090B0F] p-8 shadow-[0_0_0_1px_rgba(153,255,0,0.04)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8B95A1]">Algo Trading</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#F6FAFF]">Reset Password</h1>
        <p className="mt-2 text-sm text-[#9AA5B1]">
          {emailChallengeId ? "Enter OTPs and set a new password." : "We’ll send OTPs to confirm it’s you."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={!!emailChallengeId}
          />
          <input
            className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
            type="text"
            placeholder="Phone (E.164, e.g. +919999999999)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            required
            disabled={!!emailChallengeId}
          />

          {!emailChallengeId ? null : (
            <>
              <input
                className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
                type="text"
                placeholder="Email OTP"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
              {debugEmailOtp ? (
                <p className="rounded-lg border border-[#243000] bg-[#121A08] px-3 py-2 text-xs text-[#B7FF45]">
                  Dev email OTP: <span className="font-semibold">{debugEmailOtp}</span>
                </p>
              ) : null}
              <input
                className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
                type="text"
                placeholder="Phone OTP"
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
              {debugPhoneOtp ? (
                <p className="rounded-lg border border-[#243000] bg-[#121A08] px-3 py-2 text-xs text-[#B7FF45]">
                  Dev phone OTP: <span className="font-semibold">{debugPhoneOtp}</span>
                </p>
              ) : null}
              <input
                className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </>
          )}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {done ? <p className="text-sm text-[#B7FF45]">Password updated. Redirecting…</p> : null}

          <button
            className="w-full rounded-lg bg-[#9BFF00] px-4 py-3 font-semibold text-[#11140D] transition hover:bg-[#B7FF45] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Please wait..." : emailChallengeId ? "Reset Password" : "Send OTPs"}
          </button>

          {emailChallengeId ? (
            <button
              type="button"
              className="w-full rounded-lg border border-[#242C35] bg-transparent px-4 py-3 text-sm font-semibold text-[#E8ECEF] transition hover:bg-[#0E141B]"
              onClick={resetFlow}
              disabled={loading}
            >
              Back
            </button>
          ) : null}
        </form>

        <p className="mt-6 text-sm text-[#9AA5B1]">
          Remembered? <a href="/login" className="font-semibold text-[#9BFF00]">Go to login</a>
        </p>
      </section>
    </main>
  );
}

