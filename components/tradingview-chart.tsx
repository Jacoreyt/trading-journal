"use client";

import { useEffect, useRef } from "react";

export function TradingViewChart({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
    });
    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div ref={container} className="h-full w-full" />
    </div>
  );
}
