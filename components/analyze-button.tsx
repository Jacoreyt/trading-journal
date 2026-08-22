"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnalyzeButton({
  tradeId,
  hasFeedback,
}: {
  tradeId: string;
  hasFeedback: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const res = await fetch(`/api/trades/${tradeId}/analyze`, {
      method: "POST",
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
    >
      {pending ? "Analyzing…" : hasFeedback ? "Re-analyze" : "Analyze with AI"}
    </button>
  );
}
