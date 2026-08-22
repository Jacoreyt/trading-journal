"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TradeSide } from "@/lib/supabase/types";

function computePnl(
  side: TradeSide,
  quantity: number,
  entryPrice: number,
  exitPrice: number | null,
  fees: number
) {
  if (exitPrice === null) return null;
  const direction = side === "long" ? 1 : -1;
  return (exitPrice - entryPrice) * quantity * direction - fees;
}

export async function createTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const side = formData.get("side") as TradeSide;
  const quantity = Number(formData.get("quantity"));
  const entryPrice = Number(formData.get("entry_price"));
  const exitPriceRaw = formData.get("exit_price");
  const exitPrice = exitPriceRaw ? Number(exitPriceRaw) : null;
  const fees = Number(formData.get("fees") || 0);

  const { data, error } = await supabase
    .from("trades")
    .insert({
      user_id: user.id,
      source: "manual",
      environment: "live",
      symbol: String(formData.get("symbol")).toUpperCase(),
      side,
      quantity,
      entry_price: entryPrice,
      exit_price: exitPrice,
      entry_time: String(formData.get("entry_time")),
      exit_time: (formData.get("exit_time") as string) || null,
      fees,
      pnl: computePnl(side, quantity, entryPrice, exitPrice, fees),
      strategy: (formData.get("strategy") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath("/journal");
  redirect(`/journal/${data.id}`);
}

export async function updateTradeJournal(tradeId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("trades")
    .update({
      strategy: (formData.get("strategy") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .eq("id", tradeId);

  if (error) throw error;

  revalidatePath(`/journal/${tradeId}`);
}
