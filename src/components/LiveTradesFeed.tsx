"use client";

import { useEffect, useState } from "react";

type FeedItem = {
  type: string;
  symbol: string;
  price: string;
};

export function LiveTradesFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL;
    if (!wsBaseUrl) {
      return;
    }

    const socket = new WebSocket(wsBaseUrl.replace(/\/$/, "") + "/ws/live");

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as FeedItem;
        if (payload.type === "price_tick") {
          setItems((current) => [payload, ...current].slice(0, 8));
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => socket.close();
  }, []);

  return (
    <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[#7C8794]">Realtime</p>
          <h3 className="mt-1 text-lg font-semibold text-[#F3F7FB]">Live Price Feed</h3>
        </div>
        <span className="rounded-full border border-[#24303A] px-3 py-1 text-xs text-[#AAB4C0]">WebSocket</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? <p className="text-sm text-[#7C8794]">Waiting for live ticks...</p> : null}
        {items.map((item, index) => (
          <div key={`${item.symbol}-${index}`} className="flex items-center justify-between rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-sm">
            <span className="text-[#E8ECEF]">{item.symbol}</span>
            <span className="font-semibold text-[#9BFF00]">{item.price}</span>
          </div>
        ))}
      </div>
    </section>
  );
}