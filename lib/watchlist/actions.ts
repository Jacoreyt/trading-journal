"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSymbol } from "@/lib/market/symbols";
import type { AssetClass } from "@/lib/supabase/types";

export async function addWatchlistItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const assetClass = formData.get("asset_class") as AssetClass;
  const rawSymbol = String(formData.get("symbol") || "");
  const symbol = normalizeSymbol(assetClass, rawSymbol);
  const label = String(formData.get("label") || "").trim() || symbol;

  if (!symbol) return;

  const { error } = await supabase.from("watchlist_items").upsert(
    { user_id: user.id, asset_class: assetClass, symbol, label },
    { onConflict: "user_id,asset_class,symbol", ignoreDuplicates: true }
  );
  if (error) throw error;

  revalidatePath("/markets");
}

export async function removeWatchlistItem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/markets");
}
