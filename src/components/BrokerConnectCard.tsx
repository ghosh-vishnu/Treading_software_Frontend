"use client";

import { FormEvent, useState } from "react";

import { api } from "@/lib/api";
import { extractApiErrorMessage } from "@/lib/errors";
import type { BrokerAccount } from "@/lib/types";

type Props = {
  onConnected: (account: BrokerAccount) => void;
};

export function BrokerConnectCard({ onConnected }: Props) {
  const [brokerName, setBrokerName] = useState<"delta" | "zerodha" | "binance">("delta");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.post<BrokerAccount>(
        "/broker/connect",
        {
          broker_name: brokerName,
          api_key: apiKey,
          api_secret: apiSecret,
          passphrase: passphrase || null,
        },
        { timeout: 30000 }
      );
      onConnected(data);
      setMessage("Broker connected successfully.");
    } catch (error: unknown) {
      setMessage(extractApiErrorMessage(error, "Broker connection failed. Check credentials and try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[#7C8794]">Broker Integration</p>
          <h3 className="mt-1 text-lg font-semibold text-[#F3F7FB]">Connect Broker</h3>
        </div>
        <span className="rounded-full border border-[#24303A] px-3 py-1 text-xs text-[#AAB4C0]">Delta / Zerodha / Binance</span>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <select className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" value={brokerName} onChange={(e) => setBrokerName(e.target.value as typeof brokerName)}>
          <option value="delta">Delta Exchange</option>
          <option value="zerodha">Zerodha Kite</option>
          <option value="binance">Binance</option>
        </select>
        <input className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" required />
        <input className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="API Secret" required />
        <input className="w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Passphrase / optional" />
        <button className="w-full rounded-lg bg-[#9BFF00] px-4 py-2 font-semibold text-[#10130D] transition hover:bg-[#B7FF45] disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Connect Broker"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-[#AAB4C0]">{message}</p> : null}
    </section>
  );
}