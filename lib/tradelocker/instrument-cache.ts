import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  fetchInstrumentSpec,
  TradeLockerHttpError,
  type TradeLockerInstrumentSpec,
} from "@/lib/tradelocker/client";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSpecWithRetry(
  environment: "demo" | "live",
  accessToken: string,
  accNum: number,
  tradableInstrumentId: number,
  routeId: number,
  attempt = 0
): Promise<TradeLockerInstrumentSpec> {
  try {
    return await fetchInstrumentSpec(
      environment,
      accessToken,
      accNum,
      tradableInstrumentId,
      routeId
    );
  } catch (err) {
    if (err instanceof TradeLockerHttpError && err.status === 429 && attempt < 4) {
      await sleep(1000 * 2 ** attempt);
      return fetchSpecWithRetry(
        environment,
        accessToken,
        accNum,
        tradableInstrumentId,
        routeId,
        attempt + 1
      );
    }
    throw err;
  }
}

// Instrument specs (lot size, currencies) are broker/environment-wide and
// effectively static, so they're cached in tradelocker_instrument_specs
// instead of being re-fetched on every sync — doing that in parallel per
// instrument was hitting TradeLocker's rate limit (429) on accounts with
// many distinct traded instruments. Cache misses are fetched sequentially
// with backoff.
export async function getInstrumentSpecs(
  environment: "demo" | "live",
  accessToken: string,
  accNum: number,
  instrumentIds: number[],
  tradeRouteById: Map<number, number | undefined>,
  nameById: Map<number, string>
): Promise<Map<number, TradeLockerInstrumentSpec>> {
  const supabase = createServiceClient();

  if (instrumentIds.length === 0) return new Map();

  const { data: cached, error } = await supabase
    .from("tradelocker_instrument_specs")
    .select("tradable_instrument_id, lot_size, base_currency, quoting_currency")
    .eq("environment", environment)
    .in("tradable_instrument_id", instrumentIds)
    .not("base_currency", "is", null)
    .not("quoting_currency", "is", null);
  if (error) throw error;

  const specById = new Map<number, TradeLockerInstrumentSpec>(
    cached.map((row) => [
      row.tradable_instrument_id,
      {
        lotSize: row.lot_size,
        baseCurrency: row.base_currency!,
        quotingCurrency: row.quoting_currency!,
      },
    ])
  );
  const missingIds = instrumentIds.filter((id) => !specById.has(id));

  for (const [index, id] of missingIds.entries()) {
    const routeId = tradeRouteById.get(id);
    if (!routeId) {
      specById.set(id, { lotSize: 1, baseCurrency: "USD", quotingCurrency: "USD" });
      continue;
    }

    const spec = await fetchSpecWithRetry(environment, accessToken, accNum, id, routeId);
    specById.set(id, spec);

    await supabase.from("tradelocker_instrument_specs").upsert(
      {
        environment,
        tradable_instrument_id: id,
        name: nameById.get(id) ?? String(id),
        lot_size: spec.lotSize,
        base_currency: spec.baseCurrency,
        quoting_currency: spec.quotingCurrency,
      },
      { onConflict: "environment,tradable_instrument_id" }
    );

    if (index < missingIds.length - 1) await sleep(300);
  }

  return specById;
}
