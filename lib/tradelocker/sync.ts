import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto/token";
import {
  fetchFilledOrders,
  fetchInstruments,
  type TradeLockerFilledOrder,
  type TradeLockerInstrumentSpec,
} from "@/lib/tradelocker/client";
import { getInstrumentSpecs } from "@/lib/tradelocker/instrument-cache";
import type { BrokerConnection } from "@/lib/supabase/types";

// Assumes a USD-denominated account, true for both connections set up so far.
const ACCOUNT_CURRENCY = "USD";

function convertPnlToAccountCurrency(
  rawPnl: number,
  spec: TradeLockerInstrumentSpec,
  exitPrice: number
): number {
  if (spec.quotingCurrency === ACCOUNT_CURRENCY) return rawPnl;
  if (spec.baseCurrency === ACCOUNT_CURRENCY) {
    // e.g. USDJPY: price is JPY-per-USD, so raw P&L (in JPY) / price = USD.
    // Confirmed live: USDJPY raw P&L of 1590 was actually ~$10, not $1,590.
    return rawPnl / exitPrice;
  }
  // Cross pair where neither leg is the account currency (e.g. EURGBP on a
  // USD account) — no conversion rate available from data we have. Not seen
  // in this account's history yet; leave unconverted rather than apply a
  // made-up rate, but this is a known gap if such a pair shows up.
  return rawPnl;
}

function buildTradeRows(
  connection: BrokerConnection,
  filledOrders: TradeLockerFilledOrder[],
  instrumentNameById: Map<number, string>,
  specById: Map<number, TradeLockerInstrumentSpec>
) {
  const byPosition = new Map<string, TradeLockerFilledOrder[]>();
  for (const order of filledOrders) {
    const group = byPosition.get(order.positionId) ?? [];
    group.push(order);
    byPosition.set(order.positionId, group);
  }

  const rows = [];

  for (const [positionId, fills] of byPosition) {
    fills.sort((a, b) => a.createdDate - b.createdDate);
    const openingSide = fills[0].side;

    let runningQty = 0;
    let openQty = 0;
    let openNotional = 0;
    let closeQty = 0;
    let closeNotional = 0;
    let exitTimestamp: number | null = null;

    for (const fill of fills) {
      const opening = fill.side === openingSide;
      const before = runningQty;
      runningQty += opening ? fill.qty : -fill.qty;

      if (opening) {
        openQty += fill.qty;
        openNotional += fill.qty * fill.price;
      } else {
        closeQty += fill.qty;
        closeNotional += fill.qty * fill.price;
      }

      if (before !== 0 && runningQty === 0) {
        exitTimestamp = fill.createdDate;
      }
    }

    // Skip positions that haven't fully closed — no round trip to journal yet.
    if (exitTimestamp === null || closeQty === 0) continue;

    const entryPrice = openNotional / openQty;
    const exitPrice = closeNotional / closeQty;
    const side = openingSide === "buy" ? "long" : "short";
    const direction = side === "long" ? 1 : -1;
    // qty is in lots, not raw units — e.g. XAUUSD confirmed lotSize 100, so
    // a $1.01 move on 10 lots is a $1,010 P&L, not $10.10.
    const spec = specById.get(fills[0].tradableInstrumentId) ?? {
      lotSize: 1,
      baseCurrency: ACCOUNT_CURRENCY,
      quotingCurrency: ACCOUNT_CURRENCY,
    };
    const rawPnl = (exitPrice - entryPrice) * closeQty * spec.lotSize * direction;

    rows.push({
      user_id: connection.user_id,
      broker_connection_id: connection.id,
      source: "tradelocker" as const,
      environment: connection.environment,
      broker_trade_id: positionId,
      symbol:
        instrumentNameById.get(fills[0].tradableInstrumentId) ??
        String(fills[0].tradableInstrumentId),
      side: side as "long" | "short",
      quantity: closeQty,
      entry_price: entryPrice,
      exit_price: exitPrice,
      entry_time: new Date(fills[0].createdDate).toISOString(),
      exit_time: new Date(exitTimestamp).toISOString(),
      fees: 0,
      pnl: convertPnlToAccountCurrency(rawPnl, spec, exitPrice),
    });
  }

  return rows;
}

export async function syncTradeLockerConnection(connection: BrokerConnection) {
  const supabase = createServiceClient();

  if (
    !connection.access_token_encrypted ||
    !connection.broker_account_id ||
    !connection.broker_account_number
  ) {
    throw new Error("Broker connection is missing required TradeLocker fields");
  }

  const accessToken = decryptToken(connection.access_token_encrypted);
  const accNum = Number(connection.broker_account_number);
  const environment = connection.environment;
  const accountId = connection.broker_account_id;

  const [filledOrders, instruments] = await Promise.all([
    fetchFilledOrders(environment, accessToken, accNum, accountId),
    fetchInstruments(environment, accessToken, accNum, accountId),
  ]);

  const instrumentNameById = new Map(
    instruments.map((i) => [i.tradableInstrumentId, i.name])
  );
  const tradeRouteById = new Map(
    instruments.map((i) => [
      i.tradableInstrumentId,
      i.routes.find((r) => r.type === "TRADE")?.id,
    ])
  );

  const tradedInstrumentIds = [...new Set(filledOrders.map((o) => o.tradableInstrumentId))];
  const specById = await getInstrumentSpecs(
    environment,
    accessToken,
    accNum,
    tradedInstrumentIds,
    tradeRouteById,
    instrumentNameById
  );

  const rows = buildTradeRows(connection, filledOrders, instrumentNameById, specById);

  if (rows.length > 0) {
    const { error } = await supabase
      .from("trades")
      .upsert(rows, { onConflict: "user_id,broker_connection_id,broker_trade_id" });
    if (error) throw error;
  }

  await supabase
    .from("broker_connections")
    .update({ last_synced_at: new Date().toISOString(), status: "connected", last_error: null })
    .eq("id", connection.id);

  return { imported: rows.length };
}
