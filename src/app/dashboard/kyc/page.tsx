"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import { extractApiErrorMessage } from "@/lib/errors";
import type { KYCRecord, KYCSubmitRequest } from "@/lib/types";

const DEFAULT_FORM: KYCSubmitRequest = {
  document_type: "PAN",
  document_id: "",
  notes: "",
};

export default function KYCPage() {
  const router = useRouter();
  const [kyc, setKyc] = useState<KYCRecord | null>(null);
  const [form, setForm] = useState<KYCSubmitRequest>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get<KYCRecord | null>("/kyc/status");
      setKyc(res.data);
    } catch {
      setError("Unable to load KYC status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    void loadStatus();
  }, [router]);

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.post<KYCRecord>("/kyc/submit", form);
      setKyc(res.data);
      setMessage("KYC submitted successfully.");
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "KYC submit failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050607] text-[#E8ECEF]">
      <div className="mx-auto w-full max-w-[960px] px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-[#1A1E23] bg-[#090B0F] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#8B95A1]">Compliance</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#F6FAFF]">KYC Verification</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/dashboard")} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Dashboard</button>
            <button onClick={onLogout} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Sign Out</button>
          </div>
        </header>

        {loading ? <p className="text-sm text-[#9AA5B1]">Loading KYC status...</p> : null}
        {error ? <p className="mb-3 rounded-lg border border-[#4F2A2A] bg-[#2A1414] px-3 py-2 text-sm text-[#FFB4B4]">{error}</p> : null}
        {message ? <p className="mb-3 rounded-lg border border-[#31503A] bg-[#142419] px-3 py-2 text-sm text-[#AEE7B8]">{message}</p> : null}

        <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <h2 className="text-lg font-semibold text-[#F3F7FB]">Current Status</h2>
          <p className="mt-2 text-sm text-[#AEB9C6]">{kyc ? `Status: ${kyc.status.toUpperCase()} (${kyc.document_type})` : "No KYC record yet"}</p>
          {kyc ? <p className="mt-1 text-xs text-[#7F8A97]">Last updated: {new Date(kyc.updated_at).toLocaleString()}</p> : null}
        </section>

        <section className="mt-5 rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <h2 className="text-lg font-semibold text-[#F3F7FB]">Submit / Update KYC</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[#9AA5B1]">
              Document Type
              <select value={form.document_type} onChange={(e) => setForm((p) => ({ ...p, document_type: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2">
                <option value="PAN">PAN</option>
                <option value="AADHAR">AADHAR</option>
                <option value="PASSPORT">PASSPORT</option>
                <option value="DRIVING_LICENSE">DRIVING_LICENSE</option>
              </select>
            </label>

            <label className="text-sm text-[#9AA5B1]">
              Document ID
              <input value={form.document_id} onChange={(e) => setForm((p) => ({ ...p, document_id: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" />
            </label>

            <label className="text-sm text-[#9AA5B1] sm:col-span-2">
              Notes
              <textarea rows={3} value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" />
            </label>
          </div>

          <button onClick={submit} disabled={saving || !form.document_id.trim()} className="mt-5 rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] disabled:opacity-60">{saving ? "Submitting..." : "Submit KYC"}</button>
        </section>
      </div>
    </main>
  );
}
