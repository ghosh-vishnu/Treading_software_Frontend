"use client";

import { FormEvent, useState } from "react";

import { api } from "@/lib/api";
import type { Trade } from "@/lib/types";

type Props = {
  onTradeCreated: (trade: Trade) => void;
};

export function TradeForm({ onTradeCreated }: Props) {
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("100");
  const [strategyTag, setStrategyTag] = useState("manual");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const { data } = await api.post<Trade>("/trades/execute", {
        symbol,
        side,
        quantity,
        price,
        strategy_tag: strategyTag,
      });
      onTradeCreated(data);
      setStatus("Trade executed successfully.");
    } catch {
      setStatus("Trade execution failed. Check input values.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-6">
      <h2 className="text-xl font-semibold text-[#F3F7FB]">Execute Trade</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className="rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol" required />
        <select className="rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring" value={side} onChange={(e) => setSide(e.target.value as "BUY" | "SELL") }>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        <input className="rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring" type="number" min="0.0001" step="0.0001" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" required />
        <input className="rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring" type="number" min="0.0001" step="0.0001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" required />
        <input className="sm:col-span-2 rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF] outline-none ring-[#9BFF00]/30 focus:ring" value={strategyTag} onChange={(e) => setStrategyTag(e.target.value)} placeholder="Strategy tag" />
        <button className="sm:col-span-2 rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#11140D] transition hover:bg-[#B7FF45] disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? "Executing..." : "Execute"}
        </button>
      </form>
      {status ? <p className="mt-3 text-sm text-[#A8B3C0]">{status}</p> : null}
    </section>
  );
}
