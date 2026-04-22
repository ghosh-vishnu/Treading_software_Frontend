"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useMounted } from "@/lib/useMounted";

export default function RegisterPage() {
  const router = useRouter();
  const mounted = useMounted();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailChallengeId, setEmailChallengeId] = useState<string | null>(null);
  const [phoneChallengeId, setPhoneChallengeId] = useState<string | null>(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [debugEmailOtp, setDebugEmailOtp] = useState<string | null>(null);
  const [debugPhoneOtp, setDebugPhoneOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) return null;
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-z]/.test(pwd)) return "Password must include a lowercase letter.";
    if (!/[A-Z]/.test(pwd)) return "Password must include an uppercase letter.";
    if (!/\d/.test(pwd)) return "Password must include a number.";
    if (!/[^\w\s]/.test(pwd)) return "Password must include a special character (!@#$%^&*).";
    return null;
  };

  const passwordError = validatePassword(password);
  const confirmError = confirmPassword && confirmPassword !== password ? "Passwords do not match." : null;

  const extractErrorMessage = (err: unknown): string => {
    if (typeof err === "object" && err && "response" in err) {
      const response = (err as { response?: { data?: unknown } }).response;
      const data = response?.data;
      if (typeof data === "object" && data) {
        if ("detail" in data && typeof (data as { detail?: unknown }).detail === "string") {
          return (data as { detail: string }).detail;
        }
        if ("errors" in data && Array.isArray((data as { errors?: unknown }).errors)) {
          const errors = (data as { errors: Array<{ msg?: unknown }> }).errors;
          const joined = errors
            .map((e) => (typeof e?.msg === "string" ? e.msg : ""))
            .filter(Boolean)
            .join(" ");
          if (joined) return joined;
        }
      }
    }
    return "Registration failed. Please verify details and retry.";
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (confirmError) {
      setError(confirmError);
      return;
    }

    setLoading(true);

    try {
      if (!emailChallengeId || !phoneChallengeId) {
        const { data } = await api.post("/auth/signup/send-otp", { email, phone });
        setEmailChallengeId(data.email_challenge_id);
        setPhoneChallengeId(data.phone_challenge_id);
        setDebugEmailOtp(data.debug_email_otp ?? null);
        setDebugPhoneOtp(data.debug_phone_otp ?? null);
        return;
      }

      const { data } = await api.post("/auth/signup", {
        email,
        full_name: fullName,
        username,
        password,
        confirm_password: confirmPassword,
        phone,
        terms_accepted: termsAccepted,
        email_challenge_id: emailChallengeId,
        email_otp: emailOtp,
        phone_challenge_id: phoneChallengeId,
        phone_otp: phoneOtp,
      });
      setTokens(data.tokens.access_token, data.tokens.refresh_token);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetOtpFlow = () => {
    setEmailChallengeId(null);
    setPhoneChallengeId(null);
    setEmailOtp("");
    setPhoneOtp("");
    setDebugEmailOtp(null);
    setDebugPhoneOtp(null);
    setError("");
  };

  if (!mounted) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050607] px-4 text-[#E8ECEF]">
      <section className="w-full max-w-md rounded-3xl border border-[#1A1E23] bg-[#090B0F] p-8 shadow-[0_0_0_1px_rgba(153,255,0,0.04)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8B95A1]">Algo Trading</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#F6FAFF]">{emailChallengeId ? "Complete Signup" : "Create Account"}</h1>
        <p className="mt-2 text-sm text-[#9AA5B1]">
          {emailChallengeId
            ? "Enter the OTPs and finish creating your account."
            : "Start executing trades, following leaders, and connecting brokers."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
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
            type="text"
            placeholder="Phone (E.164, e.g. +919999999999)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            required
            disabled={!!emailChallengeId}
          />
          <input
            className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
            type="text"
            placeholder="Username (lowercase, a-z0-9 . _ -)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            className={`w-full rounded-lg border px-4 py-3 outline-none ring-primary/30 focus:ring ${
              passwordError && password
                ? "border-red-400 bg-[#1B1014]"
                : "border-[#242C35] bg-[#0E141B]"
            }`}
            type="password"
            placeholder="Password (min 8 chars, uppercase, number, special char)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <input
            className={`w-full rounded-lg border px-4 py-3 outline-none ring-primary/30 focus:ring ${
              confirmError ? "border-red-400 bg-[#1B1014]" : "border-[#242C35] bg-[#0E141B]"
            }`}
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          {passwordError && password ? (
            <p className="text-sm text-red-400">{passwordError}</p>
          ) : null}
          {confirmError ? <p className="text-sm text-red-400">{confirmError}</p> : null}

          {!emailChallengeId ? null : (
            <>
              <div className="grid grid-cols-1 gap-3">
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
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-sm text-[#C7D0DB]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                />
                <span>I agree to the Terms & Conditions and Privacy Policy.</span>
              </label>
            </>
          )}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            className="w-full rounded-lg bg-[#9BFF00] px-4 py-3 font-semibold text-[#11140D] transition hover:bg-[#B7FF45] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading || !!passwordError || !!confirmError}
          >
            {loading ? "Please wait..." : emailChallengeId ? "Create Account" : "Send OTP"}
          </button>
          {emailChallengeId ? (
            <button
              type="button"
              className="w-full rounded-lg border border-[#242C35] bg-transparent px-4 py-3 text-sm font-semibold text-[#E8ECEF] transition hover:bg-[#0E141B]"
              onClick={resetOtpFlow}
              disabled={loading}
            >
              Back
            </button>
          ) : null}
        </form>
        <p className="mt-6 text-sm text-[#9AA5B1]">
          Already registered? <a href="/login" className="font-semibold text-[#9BFF00]">Sign in</a>
        </p>
      </section>
    </main>
  );
}
