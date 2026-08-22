import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto/token";
import {
  fetchContracts,
  fetchFillPairs,
  fetchFills,
} from "@/lib/tradovate/client";
import type { BrokerConnection } from "@/lib/supabase/types";

export async function syncTradovateConnection(connection: BrokerConnection) {
  const supabase = createServiceClient();

  if (!connection.access_token_encrypted) {
    throw new Error("Broker connection has no stored access token");
  }
  const accessToken = decryptToken(connection.access_token_encrypted);

  const [fillPairs, fills, contracts] = await Promise.all([
    fetchFillPairs(accessToken),
    fetchFills(accessToken),
    fetchContracts(accessToken),
  ]);

  const fillById = new Map(fills.map((fill) => [fill.id, fill]));
  const contractNameById = new Map(contracts.map((c) => [c.id, c.name]));

  const rows = fillPairs
    .map((pair) => {
      const buyFill = fillById.get(pair.buyFillId);
      const sellFill = fillById.get(pair.sellFillId);
      if (!buyFill || !sellFill) return null;

      // Whichever fill happened first opened the position; the other closed it.
      const isLong = new Date(buyFill.timestamp) <= new Date(sellFill.timestamp);
      const entryFill = isLong ? buyFill : sellFill;
      const exitFill = isLong ? sellFill : buyFill;

      return {
        user_id: connection.user_id,
        broker_connection_id: connection.id,
        source: "tradovate" as const,
        environment: connection.environment,
        broker_trade_id: String(pair.id),
        symbol: contractNameById.get(pair.contractId) ?? String(pair.contractId),
        side: (isLong ? "long" : "short") as "long" | "short",
        quantity: pair.qty,
        entry_price: isLong ? pair.buyPrice : pair.sellPrice,
        exit_price: isLong ? pair.sellPrice : pair.buyPrice,
        entry_time: entryFill.timestamp,
        exit_time: exitFill.timestamp,
        fees: 0,
        pnl: pair.pnl,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

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
