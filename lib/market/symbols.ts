import type { AssetClass } from "@/lib/supabase/types";

// Normalizes user input into the format each provider expects: Binance
// wants "BTCUSDT" (no separator), Twelve Data wants "EUR/USD" (slash).
export function normalizeSymbol(assetClass: AssetClass, raw: string): string {
  const upper = raw.trim().toUpperCase();

  if (assetClass === "forex") {
    if (upper.includes("/")) return upper;
    if (upper.length === 6) return `${upper.slice(0, 3)}/${upper.slice(3)}`;
    return upper;
  }

  return upper.replace(/[^A-Z0-9]/g, "");
}
