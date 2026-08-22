import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AiInsight, EnvironmentFilter, InsightKind } from "@/lib/supabase/types";

export async function getLatestInsight(
  kind: InsightKind,
  environmentFilter: EnvironmentFilter
): Promise<AiInsight | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("kind", kind)
    .eq("environment_filter", environmentFilter)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
