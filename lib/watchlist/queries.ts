import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { WatchlistItem } from "@/lib/supabase/types";

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}
