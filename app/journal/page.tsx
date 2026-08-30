import Link from "next/link";
import { getTrades } from "@/lib/trades/queries";
import { EnvironmentToggle } from "@/components/environment-toggle";
import { parseEnvironmentFilter } from "@/lib/environment-filter";
import type { Trade } from "@/lib/supabase/types";

function percentPnl(trade: Trade): number | null {
  if (trade.exit_price === null) return null;
  const direction = trade.side === "long" ? 1 : -1;
  return ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100 * direction;
}

function formatPrice(price: number): string {
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ env?: string }>;
}) {
  const environment = parseEnvironmentFilter((await searchParams).env);
  const trades = await getTrades(environment);

  const closed = trades.filter((t) => t.pnl !== null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : null;
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  return (
    <main className="mx-auto max-w-4xl flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Journal</h1>
        <Link
          href="/journal/new"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          New Trade
        </Link>
      </div>

      <div className="mb-6">
        <EnvironmentToggle current={environment} />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Trades" value={String(trades.length)} />
        <Stat label="Win rate" value={winRate === null ? "—" : `${winRate}%`} />
        <Stat
          label="Total P&L"
          value={totalPnl.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
          })}
          tone={totalPnl > 0 ? "positive" : totalPnl < 0 ? "negative" : "neutral"}
        />
      </div>

      {trades.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No trades yet. Add one manually, or connect a broker to import
          automatically.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {trades.map((trade) => {
            const pct = percentPnl(trade);

            return (
              <li key={trade.id}>
                <Link
                  href={`/journal/${trade.id}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm hover:opacity-70"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{trade.symbol}</span>
                      {trade.environment === "demo" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          demo
                        </span>
                      )}
                      {trade.strategy && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {trade.strategy}
                        </span>
                      )}
                    </div>
                    <span className="capitalize text-neutral-500">
                      {trade.side} · {trade.quantity}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Entry: {formatPrice(trade.entry_price)}
                      {trade.exit_price !== null && (
                        <> → Exit: {formatPrice(trade.exit_price)}</>
                      )}
                    </span>
                  </div>
                  <span
                    className={
                      pct === null
                        ? "text-neutral-500"
                        : pct > 0
                          ? "text-emerald-600"
                          : pct < 0
                            ? "text-red-600"
                            : "text-neutral-500"
                    }
                  >
                    {pct === null ? "open" : `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : "text-neutral-900 dark:text-neutral-100";

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
