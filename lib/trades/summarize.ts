import type { Trade } from "@/lib/supabase/types";

export function summarizeTrade(trade: Trade) {
  return {
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price,
    entry_time: trade.entry_time,
    exit_time: trade.exit_time,
    fees: trade.fees,
    pnl: trade.pnl,
    strategy: trade.strategy,
    notes: trade.notes,
    environment: trade.environment,
  };
}
