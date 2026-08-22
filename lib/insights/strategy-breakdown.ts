import type { Trade } from "@/lib/supabase/types";

export interface StrategyBreakdownRow {
  strategy: string;
  count: number;
  wins: number;
  winRate: number | null;
  totalPnl: number;
  avgPnl: number | null;
}

export function computeStrategyBreakdown(trades: Trade[]): StrategyBreakdownRow[] {
  const groups = new Map<string, Trade[]>();
  for (const trade of trades) {
    const key = trade.strategy?.trim() || "Untagged";
    const group = groups.get(key) ?? [];
    group.push(trade);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([strategy, group]) => {
      const closed = group.filter((t) => t.pnl !== null);
      const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
      const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
      return {
        strategy,
        count: group.length,
        wins,
        winRate: closed.length ? wins / closed.length : null,
        totalPnl,
        avgPnl: closed.length ? totalPnl / closed.length : null,
      };
    })
    .sort((a, b) => b.totalPnl - a.totalPnl);
}
