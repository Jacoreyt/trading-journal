import { getWatchlist } from "@/lib/watchlist/queries";
import { getQuotes } from "@/lib/market/quotes";
import { addWatchlistItem } from "@/lib/watchlist/actions";
import { MarketGrid } from "@/components/market-grid";
import { MarketChartSection } from "@/components/market-chart-section";

export default async function MarketsPage() {
  const items = await getWatchlist();
  const quotes = await getQuotes(items);

  return (
    <main className="mx-auto max-w-4xl flex-1 space-y-8 p-6">
      <h1 className="text-xl font-semibold">Markets</h1>

      <div className="space-y-3">
        <h2 className="font-medium">Watchlist</h2>

        <form action={addWatchlistItem} className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="block text-neutral-500">Asset class</span>
            <select name="asset_class" defaultValue="crypto" className="input">
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-neutral-500">Symbol</span>
            <input name="symbol" placeholder="BTCUSDT or EURUSD" required className="input" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-neutral-500">Label (optional)</span>
            <input name="label" placeholder="BTC/USDT" className="input" />
          </label>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Add
          </button>
        </form>

        <MarketGrid items={items} initialQuotes={quotes} />
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium">Chart</h2>
          <MarketChartSection items={items} />
        </div>
      )}
    </main>
  );
}
