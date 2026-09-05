import "server-only";
import type { Quote } from "@/lib/market/types";

// Public, unauthenticated, no rate-limit concerns at our polling volume.
// Uses binance.us, not binance.com — the .com API returns 451 (geo-blocked)
// from US IPs/regions, which would break this in production (Vercel's
// region is US-based). Same response shape on both, confirmed live.
export async function fetchCryptoQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const url = new URL("https://api.binance.us/api/v3/ticker/24hr");
  url.searchParams.set("symbols", JSON.stringify(symbols));

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Binance quote request failed: ${res.status} ${await res.text()}`);
  }

  const body: {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    quoteVolume: string;
  }[] = await res.json();

  return body.map((entry) => ({
    assetClass: "crypto" as const,
    symbol: entry.symbol,
    price: Number(entry.lastPrice),
    percentChange: Number(entry.priceChangePercent),
    volume: Number(entry.quoteVolume),
  }));
}
