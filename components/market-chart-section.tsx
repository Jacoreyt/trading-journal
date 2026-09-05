"use client";

import { useState } from "react";
import { TradingViewChart } from "@/components/tradingview-chart";
import { toTradingViewSymbol } from "@/lib/market/tradingview";
import type { WatchlistItem } from "@/lib/supabase/types";

export function MarketChartSection({ items }: { items: WatchlistItem[] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (!selected) return null;

  return (
    <div className="space-y-2">
      <select
        value={selected.id}
        onChange={(e) => setSelectedId(e.target.value)}
        className="input w-auto"
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <TradingViewChart symbol={toTradingViewSymbol(selected)} />
    </div>
  );
}
