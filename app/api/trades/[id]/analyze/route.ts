import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, TRADE_ANALYSIS_MODEL } from "@/lib/anthropic/client";
import { extractText } from "@/lib/anthropic/text";
import { summarizeTrade } from "@/lib/trades/summarize";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .single();

  if (tradeError || !trade) {
    return NextResponse.json({ error: "trade not found" }, { status: 404 });
  }

  const message = await anthropic.messages.create({
    model: TRADE_ANALYSIS_MODEL,
    max_tokens: 500,
    system:
      "You are a trading coach reviewing a single closed or open trade from a trader's journal. " +
      "Give specific, actionable feedback on execution quality, risk management, and whether the " +
      "stated strategy and notes are consistent with the entry/exit. Keep it under 200 words, no headers.",
    messages: [
      {
        role: "user",
        content: JSON.stringify(summarizeTrade(trade)),
      },
    ],
  });

  const content = extractText(message);

  const { error: insertError } = await supabase.from("ai_feedback").insert({
    trade_id: trade.id,
    user_id: user.id,
    model: TRADE_ANALYSIS_MODEL,
    content,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ content });
}
