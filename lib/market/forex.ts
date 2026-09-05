import "server-only";
import type { Quote } from "@/lib/market/types";

// Confirmed via docs: POST /quote with {symbols: [...], apikey}, response is
// an object keyed by symbol (or a single flat object if only one symbol was
// requested). A symbol Twelve Data couldn't resolve comes back as
// {status: "error", ...} instead of quote fields — skip those rather than
// crash the whole batch. Free tier is 8 req/min, 800/day, so this is only
// ever called for cache-miss symbols — see lib/market/quotes.ts.
export async function fetchForexQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY is not set");

  const res = await fetch("https://api.twelvedata.com/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols, apikey: apiKey }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Twelve Data quote request failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  const entries = symbols.length === 1 ? { [symbols[0]]: body } : body;

  const quotes: Quote[] = [];
  for (const symbol of symbols) {
    const entry = entries[symbol];
    if (!entry || entry.status === "error" || entry.close === undefined) continue;

    quotes.push({
      assetClass: "forex",
      symbol,
      price: Number(entry.close),
      percentChange: Number(entry.percent_change),
      volume: entry.volume ? Number(entry.volume) : null,
    });
  }

  return quotes;
}
