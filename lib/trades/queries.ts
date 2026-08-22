import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EnvironmentFilter, Trade } from "@/lib/supabase/types";

export async function getTrades(environment: EnvironmentFilter = "all"): Promise<Trade[]> {
  const supabase = await createClient();
  let query = supabase.from("trades").select("*").order("entry_time", { ascending: false });
  if (environment !== "all") query = query.eq("environment", environment);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTradesSince(
  days: number,
  environment: EnvironmentFilter = "all"
): Promise<Trade[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  let query = supabase
    .from("trades")
    .select("*")
    .gte("entry_time", since)
    .order("entry_time", { ascending: false });
  if (environment !== "all") query = query.eq("environment", environment);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTrade(id: string): Promise<Trade | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
