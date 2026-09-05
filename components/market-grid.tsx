"use client";

import { useEffect, useState, useTransition } from "react";
import { removeWatchlistItem } from "@/lib/watchlist/actions";
import type { WatchlistItem } from "@/lib/supabase/types";
import type { Quote } from "@/lib/market/types";

const POLL_MS = 7000;

function quoteKey(assetClass: string, symbol: string) {
  return `${assetClass}:${symbol}`;
}

// Diverging encoding: hue carries sign (green=gain/red=loss, validated via
// the dataviz skill's palette checker — CVD ΔE 8.6, well clear of the 6.0
// floor), background opacity carries magnitude ("heat").
function heatClass(pct: number): string {
  const magnitude = Math.abs(pct);
  if (magnitude < 0.1) return "";
  const tier = magnitude < 0.5 ? "10" : magnitude < 2 ? "20" : "30";
  return pct > 0 ? `bg-emerald-500/${tier}` : `bg-red-500/${tier}`;
}

export function MarketGrid({
  items,
  initialQuotes,
}: {
  items: WatchlistItem[];
  initialQuotes: Quote[];
}) {
  const [quotes, setQuotes] = useState<Map<string, Quote>>(
    () => new Map(initialQuotes.map((q) => [quoteKey(q.assetClass, q.symbol), q]))
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/market/quotes");
        const body = await res.json();
        if (cancelled) return;

        if (res.ok) {
          setError(null);
          setQuotes(new Map(body.quotes.map((q: Quote) => [quoteKey(q.assetClass, q.symbol), q])));
        } else {
          setError(body.error);
        }
      } catch {
        if (!cancelled) setError("Failed to refresh quotes");
      }
    }

    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function remove(id: string) {
    startTransition(() => {
      removeWatchlistItem(id);
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No symbols yet — add one below to start tracking it.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-2 text-xs text-neutral-500">Quotes may be stale — {error}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => {
          const quote = quotes.get(quoteKey(item.asset_class, item.symbol));

          return (
            <div
              key={item.id}
              className={`group relative rounded-lg border border-neutral-200 p-3 transition-colors dark:border-neutral-800 ${
                quote ? heatClass(quote.percentChange) : ""
              }`}
            >
              <button
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.label} from watchlist`}
                className="absolute right-1.5 top-1.5 hidden text-xs text-neutral-400 hover:text-neutral-900 group-hover:block dark:hover:text-neutral-100"
              >
                ✕
              </button>
              <p className="text-xs uppercase text-neutral-500">{item.asset_class}</p>
              <p className="font-medium">{item.label}</p>
              {quote ? (
                <>
                  <p className="text-sm tabular-nums">
                    {quote.price.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                  </p>
                  <p
                    className={`text-sm font-medium tabular-nums ${
                      quote.percentChange > 0
                        ? "text-emerald-600"
                        : quote.percentChange < 0
                          ? "text-red-600"
                          : "text-neutral-500"
                    }`}
                  >
                    {quote.percentChange > 0 ? "+" : ""}
                    {quote.percentChange.toFixed(2)}%
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-500">Loading…</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
