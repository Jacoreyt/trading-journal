import type { EnvironmentFilter } from "@/lib/supabase/types";

export function parseEnvironmentFilter(value: string | undefined): EnvironmentFilter {
  return value === "demo" || value === "live" ? value : "all";
}
