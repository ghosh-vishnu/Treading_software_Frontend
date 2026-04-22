"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import { extractApiErrorMessage } from "@/lib/errors";
import type { UserSettings, UserSettingsUpdateRequest } from "@/lib/types";

const DEFAULT_FORM: UserSettingsUpdateRequest = {
  theme: "dark",
  accent_color: "lime",
  notify_trade_alerts: true,
  notify_strategy_alerts: true,
  notify_system_alerts: true,
  default_lot_size: 1,
  max_open_positions: 5,
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserSettingsUpdateRequest>(DEFAULT_FORM);
  const [riskForm, setRiskForm] = useState({ max_daily_loss: 500, max_trades_per_day: 50 });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    void api
      .get<UserSettings>("/settings")
      .then((res) => {
        const settings = res.data;
        setForm({
          theme: settings.theme,
          accent_color: settings.accent_color,
          notify_trade_alerts: settings.notify_trade_alerts,
          notify_strategy_alerts: settings.notify_strategy_alerts,
          notify_system_alerts: settings.notify_system_alerts,
          default_lot_size: Number(settings.default_lot_size),
          max_open_positions: settings.max_open_positions,
        });
      })
      .catch(() => setError("Unable to load settings."))
      .finally(() => setLoading(false));
  }, [router]);

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.patch<UserSettings>("/settings", form);
      setMessage("Settings updated.");
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Failed to update settings."));
    } finally {
      setSaving(false);
    }
  };

  const saveRisk = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.patch("/settings/risk", riskForm);
      setMessage("Risk settings updated.");
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Failed to update risk settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050607] text-[#E8ECEF]">
      <div className="mx-auto w-full max-w-[960px] px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-[#1A1E23] bg-[#090B0F] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#8B95A1]">Settings</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#F6FAFF]">Theme, Alerts & Risk</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/dashboard")} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Dashboard</button>
            <button onClick={onLogout} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Sign Out</button>
          </div>
        </header>

        {loading ? <p className="text-sm text-[#9AA5B1]">Loading settings...</p> : null}
        {error ? <p className="mb-3 rounded-lg border border-[#4F2A2A] bg-[#2A1414] px-3 py-2 text-sm text-[#FFB4B4]">{error}</p> : null}
        {message ? <p className="mb-3 rounded-lg border border-[#31503A] bg-[#142419] px-3 py-2 text-sm text-[#AEE7B8]">{message}</p> : null}

        <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <h2 className="text-lg font-semibold text-[#F3F7FB]">UI & Notifications</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[#9AA5B1]">
              Theme
              <select value={form.theme} onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value as "dark" | "light" }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>

            <label className="text-sm text-[#9AA5B1]">
              Accent Color
              <input value={form.accent_color} onChange={(e) => setForm((p) => ({ ...p, accent_color: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" />
            </label>

            <label className="text-sm text-[#9AA5B1]">
              Default Lot Size
              <input type="number" value={form.default_lot_size} min={0.0001} step="0.0001" onChange={(e) => setForm((p) => ({ ...p, default_lot_size: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" />
            </label>

            <label className="text-sm text-[#9AA5B1]">
              Max Open Positions
              <input type="number" value={form.max_open_positions} min={1} max={100} onChange={(e) => setForm((p) => ({ ...p, max_open_positions: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" />
            </label>
          </div>

          <div className="mt-4 space-y-2 text-sm text-[#C4CDD8]">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify_trade_alerts} onChange={(e) => setForm((p) => ({ ...p, notify_trade_alerts: e.target.checked }))} /> Trade alerts</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify_strategy_alerts} onChange={(e) => setForm((p) => ({ ...p, notify_strategy_alerts: e.target.checked }))} /> Strategy alerts</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify_system_alerts} onChange={(e) => setForm((p) => ({ ...p, notify_system_alerts: e.target.checked }))} /> System alerts</label>
          </div>

          <button onClick={saveSettings} disabled={saving} className="mt-5 rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] disabled:opacity-60">{saving ? "Saving..." : "Save Settings"}</button>
        </section>

        <section className="mt-5 rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <h2 className="text-lg font-semibold text-[#F3F7FB]">Risk Controls</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[#9AA5B1]">
              Max Daily Loss
              <input type="number" value={riskForm.max_daily_loss} min={1} onChange={(e) => setRiskForm((p) => ({ ...p, max_daily_loss: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" />
            </label>
            <label className="text-sm text-[#9AA5B1]">
              Max Trades Per Day
              <input type="number" value={riskForm.max_trades_per_day} min={1} onChange={(e) => setRiskForm((p) => ({ ...p, max_trades_per_day: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" />
            </label>
          </div>
          <button onClick={saveRisk} disabled={saving} className="mt-5 rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] disabled:opacity-60">Update Risk</button>
        </section>
      </div>
    </main>
  );
}
