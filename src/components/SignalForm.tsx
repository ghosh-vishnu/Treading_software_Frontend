"use client";

import { FormEvent, useState } from "react";

import { api } from "@/lib/api";

type Props = {
  onSignalAccepted?: () => void;
};

export function SignalForm({ onSignalAccepted }: Props) {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [confidence, setConfidence] = useState("0.80");
  const [strategyTag, setStrategyTag] = useState("momentum-v1");
  const [broker, setBroker] = useState<"delta" | "zerodha" | "binance">("delta");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await api.post("/strategy/signal", {
        symbol,
        side,
        confidence: Number(confidence),
        strategy_tag: strategyTag,
        broker,
        order_type: "MARKET",
      });
      setMessage("Signal sent. Auto-execution will trigger if confidence is high enough.");
      onSignalAccepted?.();
    } catch {
      setMessage("Signal submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.1em] text-[#7C8794]">Automation</p>
        <h3 className="mt-1 text-lg font-semibold text-[#F3F7FB]">Strategy Signal</h3>
      </div>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className="rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol" />
        <select className="rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" value={side} onChange={(e) => setSide(e.target.value as "BUY" | "SELL")}>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        <input className="rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" type="number" min="0" max="1" step="0.01" value={confidence} onChange={(e) => setConfidence(e.target.value)} />
        <select className="rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" value={broker} onChange={(e) => setBroker(e.target.value as typeof broker)}>
          <option value="delta">Delta</option>
          <option value="zerodha">Zerodha</option>
          <option value="binance">Binance</option>
        </select>
        <input className="sm:col-span-2 rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" value={strategyTag} onChange={(e) => setStrategyTag(e.target.value)} placeholder="strategy_tag" />
        <button className="sm:col-span-2 rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#10130D] transition hover:bg-[#B7FF45] disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Signal"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-[#AAB4C0]">{message}</p> : null}
    </section>
  );
}