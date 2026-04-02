"use client";

import { FormEvent, useState } from "react";

import { api } from "@/lib/api";
import type { CopyLeaderStats } from "@/lib/types";

type Props = {
  stats?: CopyLeaderStats | null;
  onFollowChange?: () => void;
};

export function CopyTradingPanel({ stats, onFollowChange }: Props) {
  const [leaderId, setLeaderId] = useState("1");
  const [message, setMessage] = useState("");

  const follow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    try {
      await api.post("/copy/subscribe", { leader_id: Number(leaderId) });
      setMessage("Now following trader.");
      onFollowChange?.();
    } catch {
      setMessage("Could not follow trader.");
    }
  };

  const unfollow = async () => {
    setMessage("");
    try {
      await api.post("/copy/unsubscribe", { leader_id: Number(leaderId) });
      setMessage("Unfollowed trader.");
      onFollowChange?.();
    } catch {
      setMessage("Could not unfollow trader.");
    }
  };

  return (
    <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[#7C8794]">Copy Trading</p>
          <h3 className="mt-1 text-lg font-semibold text-[#F3F7FB]">Leader Stats</h3>
        </div>
        {stats ? <span className="text-xs text-[#AAB4C0]">Win rate {stats.win_rate.toFixed(2)}%</span> : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#242C35] bg-[#0E141B] p-3">
          <p className="text-xs text-[#7C8794]">Followers</p>
          <p className="mt-1 text-2xl font-semibold text-[#F6FAFF]">{stats?.followers ?? 0}</p>
        </div>
        <div className="rounded-xl border border-[#242C35] bg-[#0E141B] p-3">
          <p className="text-xs text-[#7C8794]">Copied Trades</p>
          <p className="mt-1 text-2xl font-semibold text-[#F6FAFF]">{stats?.total_copied_trades ?? 0}</p>
        </div>
      </div>

      <form onSubmit={follow} className="mt-4 space-y-3">
        <input className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" type="number" min="1" value={leaderId} onChange={(e) => setLeaderId(e.target.value)} placeholder="Leader ID" />
        <div className="flex gap-3">
          <button className="flex-1 rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#10130D] transition hover:bg-[#B7FF45]" type="submit">Follow</button>
          <button className="flex-1 rounded-lg border border-[#242C35] bg-[#0E141B] px-4 py-2 font-semibold text-[#E8ECEF]" type="button" onClick={unfollow}>Unfollow</button>
        </div>
      </form>
      {message ? <p className="mt-3 text-sm text-[#AAB4C0]">{message}</p> : null}
    </section>
  );
}