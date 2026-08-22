"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EnvironmentFilter } from "@/lib/supabase/types";

const OPTIONS: { value: EnvironmentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "demo", label: "Demo" },
];

export function EnvironmentToggle({ current }: { current: EnvironmentFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(value: EnvironmentFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("env");
    } else {
      params.set("env", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="inline-flex rounded-md border border-neutral-200 p-0.5 text-sm dark:border-neutral-800">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => select(option.value)}
          className={`rounded px-3 py-1 ${
            current === option.value
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
