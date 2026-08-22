import "server-only";
import { createClient } from "@/lib/supabase/server";
import { anthropic, TRADE_ANALYSIS_MODEL } from "@/lib/anthropic/client";
import { extractText } from "@/lib/anthropic/text";
import { summarizeTrade } from "@/lib/trades/summarize";
import { getTrades, getTradesSince } from "@/lib/trades/queries";
import { getLatestInsight } from "@/lib/insights/queries";
import { computeStrategyBreakdown } from "@/lib/insights/strategy-breakdown";
import type { EnvironmentFilter, InsightKind, Trade } from "@/lib/supabase/types";

const SYSTEM_PROMPTS: Record<InsightKind, string> = {
  strategy_insights:
    "You are a trading psychologist and coach reviewing a trader's full journal history. " +
    "Identify concrete behavioral patterns and tendencies you notice — timing, discipline, " +
    "strategy consistency, risk management. Be specific and cite what in the data supports each " +
    "observation. Do not just repeat the raw stats back; interpret them. If the trade set includes " +
    "demo trades, treat those as less indicative of real behavior than live trades and say so where " +
    "relevant. Under 350 words, no headers.",
  strategy_playbook:
    "You are a trading coach writing a concrete playbook for this trader based on their actual " +
    "journal history and, if provided, prior behavioral insights. Propose specific, actionable rules " +
    "(position sizing, setups to favor or avoid, session/timing guidance, risk limits). Ground every " +
    "rule in what the data shows actually worked or didn't. If the trade set includes demo trades, " +
    "weight live trades more heavily. Under 350 words, short numbered rules.",
  game_plan_daily:
    "You are a trading coach writing today's game plan for this trader based on their trades from the " +
    "last two weeks. Reference recent performance and patterns, then give focused, actionable guidance " +
    "for today: what to watch for, what to avoid repeating, a position-sizing reminder. If the trade set " +
    "includes demo trades, weight live trades more heavily. Under 250 words.",
  game_plan_weekly:
    "You are a trading coach writing this week's game plan for this trader based on their trades from " +
    "the last two months. Reference recent performance and patterns, then give focused, actionable " +
    "guidance for the week ahead: themes to focus on, what to avoid repeating, risk guidance. If the " +
    "trade set includes demo trades, weight live trades more heavily. Under 300 words.",
};

async function loadTrades(kind: InsightKind, environmentFilter: EnvironmentFilter): Promise<Trade[]> {
  switch (kind) {
    case "strategy_insights":
    case "strategy_playbook":
      return getTrades(environmentFilter);
    case "game_plan_daily":
      return getTradesSince(14, environmentFilter);
    case "game_plan_weekly":
      return getTradesSince(60, environmentFilter);
  }
}

export async function generateInsight(
  userId: string,
  kind: InsightKind,
  environmentFilter: EnvironmentFilter
): Promise<string> {
  const trades = await loadTrades(kind, environmentFilter);
  if (trades.length === 0) {
    throw new Error("No trades yet to generate this from.");
  }

  const priorInsights =
    kind === "strategy_playbook"
      ? await getLatestInsight("strategy_insights", environmentFilter)
      : null;

  const message = await anthropic.messages.create({
    model: TRADE_ANALYSIS_MODEL,
    max_tokens: 1200,
    system: SYSTEM_PROMPTS[kind],
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          today: new Date().toISOString(),
          tradeScope: environmentFilter,
          strategyBreakdown: computeStrategyBreakdown(trades),
          priorInsights: priorInsights?.content ?? undefined,
          trades: trades.map(summarizeTrade),
        }),
      },
    ],
  });

  const content = extractText(message);

  const supabase = await createClient();
  const { error } = await supabase.from("ai_insights").insert({
    user_id: userId,
    kind,
    model: TRADE_ANALYSIS_MODEL,
    content,
    environment_filter: environmentFilter,
  });

  if (error) throw error;

  return content;
}
