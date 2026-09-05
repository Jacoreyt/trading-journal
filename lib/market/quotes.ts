import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCryptoQuotes } from "@/lib/market/crypto";
import { fetchForexQuotes } from "@/lib/market/forex";
import type { Quote } from "@/lib/market/types";
import type { WatchlistItem } from "@/lib/supabase/types";

const FOREX_CACHE_TTL_MS = 60_000;

// Market data is shared across all users (not per-account), so the cache
// lives in a global table rather than being scoped per request. This keeps
// Twelve Data usage bounded regardless of how many users/tabs are polling.
async function getForexQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - FOREX_CACHE_TTL_MS).toISOString();

  const { data: cached, error } = await supabase
    .from("market_quote_cache")
    .select("*")
    .eq("asset_class", "forex")
    .in("symbol", symbols)
    .gte("updated_at", cutoff);
  if (error) throw error;

  const freshSymbols = new Set(cached.map((row) => row.symbol));
  const staleSymbols = symbols.filter((symbol) => !freshSymbols.has(symbol));

  let refetched: Quote[] = [];
  if (staleSymbols.length > 0) {
    refetched = await fetchForexQuotes(staleSymbols);
    if (refetched.length > 0) {
      await supabase.from("market_quote_cache").upsert(
        refetched.map((quote) => ({
          asset_class: "forex" as const,
          symbol: quote.symbol,
          price: quote.price,
          percent_change: quote.percentChange,
          volume: quote.volume,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "asset_class,symbol" }
      );
    }
  }

  const cachedQuotes: Quote[] = cached.map((row) => ({
    assetClass: "forex",
    symbol: row.symbol,
    price: row.price,
    percentChange: row.percent_change,
    volume: row.volume,
  }));

  return [...cachedQuotes, ...refetched];
}

export async function getQuotes(items: WatchlistItem[]): Promise<Quote[]> {
  const cryptoSymbols = items.filter((i) => i.asset_class === "crypto").map((i) => i.symbol);
  const forexSymbols = items.filter((i) => i.asset_class === "forex").map((i) => i.symbol);
  // Futures quotes aren't implemented yet — pending Tradovate API access,
  // which will also supply the market-data feed for this asset class.

  const [cryptoQuotes, forexQuotes] = await Promise.all([
    fetchCryptoQuotes(cryptoSymbols),
    getForexQuotes(forexSymbols),
  ]);

  return [...cryptoQuotes, ...forexQuotes];
}
