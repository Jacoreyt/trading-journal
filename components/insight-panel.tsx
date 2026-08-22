"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EnvironmentFilter, InsightKind } from "@/lib/supabase/types";

export function InsightPanel({
  kind,
  environmentFilter,
  title,
  initialContent,
  initialGeneratedAt,
  buttonLabel,
}: {
  kind: InsightKind;
  environmentFilter: EnvironmentFilter;
  title: string;
  initialContent: string | null;
  initialGeneratedAt: string | null;
  buttonLabel: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);

    const res = await fetch("/api/insights/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, environment: environmentFilter }),
    });
    const body = await res.json();

    setPending(false);
    if (res.ok) {
      setContent(body.content);
      setGeneratedAt(new Date().toISOString());
      router.refresh();
    } else {
      setError(body.error);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <button
          onClick={generate}
          disabled={pending}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          {pending ? "Generating…" : buttonLabel}
        </button>
      </div>

      {generatedAt && (
        <p className="text-xs text-neutral-500">
          Generated {new Date(generatedAt).toLocaleString()}
        </p>
      )}

      {content ? (
        <p className="whitespace-pre-wrap text-sm">{content}</p>
      ) : (
        <p className="text-sm text-neutral-500">Nothing generated yet.</p>
      )}

      {error && <p className="text-sm text-red-600">Failed: {error}</p>}
    </div>
  );
}
