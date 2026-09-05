import type { WatchlistItem } from "@/lib/supabase/types";

// TradingView's embed widget needs an exchange-prefixed symbol, distinct
// from the raw provider symbols we store (Binance/Twelve Data format).
export function toTradingViewSymbol(item: WatchlistItem): string {
  if (item.asset_class === "crypto") return `BINANCE:${item.symbol}`;
  if (item.asset_class === "forex") return `FX:${item.symbol.replace("/", "")}`;
  return item.symbol;
}
