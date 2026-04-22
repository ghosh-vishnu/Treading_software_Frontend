"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import { extractApiErrorMessage } from "@/lib/errors";
import type { AppNotification, CreateNotificationRequest } from "@/lib/types";

const DEFAULT_FORM: CreateNotificationRequest = {
  category: "system",
  title: "",
  message: "",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [form, setForm] = useState<CreateNotificationRequest>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get<AppNotification[]>("/notifications");
      setItems(res.data);
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    void loadNotifications();
  }, [router]);

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const createNotification = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.post<AppNotification>("/notifications", form);
      setItems((current) => [res.data, ...current]);
      setMessage("Notification created.");
      setForm(DEFAULT_FORM);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Failed to create notification."));
    } finally {
      setSaving(false);
    }
  };

  const markAllRead = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.post("/notifications/mark-all-read");
      await loadNotifications();
      setMessage("All notifications marked as read.");
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Failed to mark all read."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050607] text-[#E8ECEF]">
      <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-[#1A1E23] bg-[#090B0F] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#8B95A1]">Notifications</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#F6FAFF]">Alerts & Updates</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/dashboard")} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Dashboard</button>
            <button onClick={onLogout} className="rounded-lg border border-[#2A313A] px-3 py-2 text-sm text-[#C1CBD8]">Sign Out</button>
          </div>
        </header>

        {error ? <p className="mb-3 rounded-lg border border-[#4F2A2A] bg-[#2A1414] px-3 py-2 text-sm text-[#FFB4B4]">{error}</p> : null}
        {message ? <p className="mb-3 rounded-lg border border-[#31503A] bg-[#142419] px-3 py-2 text-sm text-[#AEE7B8]">{message}</p> : null}

        <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F3F7FB]">Create Notification</h2>
            <button onClick={markAllRead} disabled={saving} className="rounded-lg border border-[#2A313A] px-3 py-2 text-xs text-[#C1CBD8]">Mark all read</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[#9AA5B1]">Category<input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
            <label className="text-sm text-[#9AA5B1]">Title<input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
            <label className="text-sm text-[#9AA5B1] sm:col-span-2">Message<textarea rows={3} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#26303B] bg-[#0E141B] px-3 py-2" /></label>
          </div>
          <button onClick={createNotification} disabled={saving || !form.title || !form.message} className="mt-4 rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] disabled:opacity-60">{saving ? "Saving..." : "Create"}</button>
        </section>

        <section className="mt-5 rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <h2 className="text-lg font-semibold text-[#F3F7FB]">Inbox</h2>
          {loading ? <p className="mt-3 text-sm text-[#9AA5B1]">Loading...</p> : null}
          <div className="mt-3 space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#24303A] bg-[#0D131B] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-[#EFF4FA]">{item.title}</h3>
                    <p className="text-xs text-[#8D9AAA]">{item.category} • {new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${item.is_read ? "bg-[#19222D] text-[#8FA0B2]" : "bg-[#24391E] text-[#9BFF00]"}`}>{item.is_read ? "Read" : "Unread"}</span>
                </div>
                <p className="mt-2 text-sm text-[#B8C2CF]">{item.message}</p>
              </article>
            ))}
            {!loading && items.length === 0 ? <p className="text-sm text-[#7F8A97]">No notifications yet.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
