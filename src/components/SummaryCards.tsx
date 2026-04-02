import type { DashboardSummary } from "@/lib/types";

type Props = {
  summary: DashboardSummary;
};

export function SummaryCards({ summary }: Props) {
  const cards = [
    { label: "Estimated Balance", value: "--", hint: "Connect broker to view balance" },
    { label: "Open Position", value: "--", hint: "Connect broker to view positions" },
    { label: "P&L", value: summary.cumulative_pnl, hint: "Realized strategy PnL" },
    { label: "Win Rate", value: `${summary.total_trades ? Math.round((summary.winning_trades / summary.total_trades) * 100) : 0}%`, hint: "All closed trades" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-[#8B95A1]">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-[#F6FAFF]">{card.value}</p>
          <p className="mt-2 text-xs text-[#6F7A87]">{card.hint}</p>
        </article>
      ))}
    </section>
  );
}
