"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/signup", {
        full_name: fullName,
        email,
        password,
        role,
      });
      setTokens(data.tokens.access_token, data.tokens.refresh_token);
      router.push("/dashboard");
    } catch (err: any) {
      let errorMsg = "Registration failed. Please verify details and retry.";
      
      if (err?.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err?.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          errorMsg = validationErrors.map((e: any) => e.msg).join(" ");
        }
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050607] px-4 text-[#E8ECEF]">
      <section className="w-full max-w-md rounded-3xl border border-[#1A1E23] bg-[#090B0F] p-8 shadow-[0_0_0_1px_rgba(153,255,0,0.04)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8B95A1]">Algo Trading</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#F6FAFF]">Create Account</h1>
        <p className="mt-2 text-sm text-[#9AA5B1]">Start executing trades, following leaders, and connecting brokers.</p>
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
          <select
            className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-3 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring"
            value={role}
            onChange={(e) => setRole(e.target.value as "user" | "admin")}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {passwordError && password ? (
            <p className="text-sm text-red-400">{passwordError}</p>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            className="w-full rounded-lg bg-[#9BFF00] px-4 py-3 font-semibold text-[#11140D] transition hover:bg-[#B7FF45] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading || !!passwordError}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-[#9AA5B1]">
          Already registered? <a href="/login" className="font-semibold text-[#9BFF00]">Sign in</a>
        </p>
      </section>
    </main>
  );
}
