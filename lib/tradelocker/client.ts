import "server-only";

// Field names below follow TradeLocker's public REST API, confirmed against
// public-api.tradelocker.com and github.com/TradeLocker/tradelocker-python.

export interface TradeLockerCredentials {
  email: string;
  password: string;
  server: string;
}

export interface TradeLockerTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TradeLockerAccount {
  id: string;
  accNum: number;
  name: string;
}

export class TradeLockerHttpError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "TradeLockerHttpError";
  }
}

export type TradeLockerSide = "buy" | "sell";

export interface TradeLockerFilledOrder {
  id: string;
  tradableInstrumentId: number;
  side: TradeLockerSide;
  qty: number;
  price: number;
  createdDate: number; // epoch ms
  positionId: string;
}

// /executions turned out to be unreliable — it intermittently returns an
// empty list even for a demo account with real closed trades (confirmed by
// hitting it repeatedly against the same account). /ordersHistory reliably
// returned full history in every check, so that's the source of truth here.
// Row order confirmed live via GET /trade/config -> d.ordersHistoryConfig.columns:
// [id, tradableInstrumentId, routeId, qty, side, type, status, filledQty,
//  avgPrice, price, stopPrice, validity, expireDate, createdDate,
//  lastModified, isOpen, positionId, stopLoss, stopLossType, takeProfit,
//  takeProfitType, strategyId]
// id/positionId are >2^53 and must stay strings to avoid precision loss.
function parseOrderHistoryRow(row: unknown[]): TradeLockerFilledOrder | null {
  const [
    id,
    tradableInstrumentId,
    ,
    ,
    side,
    ,
    status,
    filledQty,
    avgPrice,
    ,
    ,
    ,
    ,
    ,
    lastModified,
    ,
    positionId,
  ] = row as [
    string,
    string,
    string,
    string,
    TradeLockerSide,
    string,
    string,
    string | null,
    string | null,
    string,
    string,
    string,
    string | null,
    string,
    string,
    string,
    string,
  ];

  if (status !== "Filled" || filledQty === null || avgPrice === null) return null;

  return {
    id,
    tradableInstrumentId: Number(tradableInstrumentId),
    side,
    qty: Number(filledQty),
    price: Number(avgPrice),
    // lastModified is the fill trigger time; createdDate is when a
    // stop/limit order was placed, which can be well before it fills.
    createdDate: Number(lastModified),
    positionId,
  };
}

export interface TradeLockerInstrument {
  tradableInstrumentId: number;
  name: string;
  routes: { id: number; type: string }[];
}

export interface TradeLockerAccountState {
  balance: number;
  availableFunds: number;
  todayNet: number;
  openNetPnL: number;
  positionsCount: number;
}

// The state endpoint returns one positional tuple under accountDetailsData.
// Column order confirmed live via GET /trade/config -> d.accountDetailsConfig.columns:
// [balance, projectedBalance, availableFunds, blockedBalance, cashBalance,
//  unsettledCash, withdrawalAvailable, stocksValue, optionValue, initialMarginReq,
//  maintMarginReq, marginWarningLevel, blockedForStocks, stockOrdersReq,
//  stopOutLevel, warningMarginReq, marginBeforeWarning, todayGross, todayNet,
//  todayFees, todayVolume, todayTradesCount, openGrossPnL, openNetPnL,
//  positionsCount, ordersCount]
function parseAccountStateRow(row: number[]): TradeLockerAccountState {
  return {
    balance: row[0],
    availableFunds: row[2],
    todayNet: row[18],
    openNetPnL: row[23],
    positionsCount: row[24],
  };
}

function baseUrl(environment: "demo" | "live") {
  const host = environment === "live" ? "live.tradelocker.com" : "demo.tradelocker.com";
  return `https://${host}/backend-api`;
}

export async function requestTokens(
  environment: "demo" | "live",
  credentials: TradeLockerCredentials
): Promise<TradeLockerTokens> {
  const res = await fetch(`${baseUrl(environment)}/auth/jwt/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    throw new Error(`TradeLocker auth failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function listAccounts(
  environment: "demo" | "live",
  accessToken: string
): Promise<TradeLockerAccount[]> {
  const res = await fetch(`${baseUrl(environment)}/auth/jwt/all-accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`TradeLocker list accounts failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  return body.accounts;
}

// /trade/accounts/{id}/* endpoints wrap their payload as { s: "ok", d: { <resourceName>: [...] } }.
async function tradeGet<T>(
  environment: "demo" | "live",
  accessToken: string,
  accNum: number,
  path: string,
  resourceKey: string
): Promise<T> {
  const res = await fetch(`${baseUrl(environment)}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accNum: String(accNum),
    },
  });

  if (!res.ok) {
    throw new Error(`TradeLocker request failed: ${path} ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  return body.d[resourceKey];
}

export async function fetchFilledOrders(
  environment: "demo" | "live",
  accessToken: string,
  accNum: number,
  accountId: string
): Promise<TradeLockerFilledOrder[]> {
  const rows = await tradeGet<unknown[][]>(
    environment,
    accessToken,
    accNum,
    `/trade/accounts/${accountId}/ordersHistory`,
    "ordersHistory"
  );
  return rows
    .map(parseOrderHistoryRow)
    .filter((order): order is TradeLockerFilledOrder => order !== null);
}

export function fetchInstruments(
  environment: "demo" | "live",
  accessToken: string,
  accNum: number,
  accountId: string
) {
  return tradeGet<TradeLockerInstrument[]>(
    environment,
    accessToken,
    accNum,
    `/trade/accounts/${accountId}/instruments`,
    "instruments"
  );
}

export interface TradeLockerInstrumentSpec {
  lotSize: number;
  baseCurrency: string;
  quotingCurrency: string;
}

// P&L must be multiplied by the instrument's lotSize — e.g. XAUUSD (gold)
// confirmed live at lotSize 100, meaning qty is in lots, not raw ounces.
// baseCurrency/quotingCurrency are needed too: P&L is realized in the
// quoting currency, e.g. USDJPY P&L comes out in JPY, not USD — confirmed
// live (baseCurrency "USD", quotingCurrency "JPY" for USDJPY).
// This endpoint needs the instrument's TRADE route id as a query param;
// /trade/instruments/{id} alone 400s without it.
export async function fetchInstrumentSpec(
  environment: "demo" | "live",
  accessToken: string,
  accNum: number,
  tradableInstrumentId: number,
  routeId: number
): Promise<TradeLockerInstrumentSpec> {
  const url = new URL(`${baseUrl(environment)}/trade/instruments/${tradableInstrumentId}`);
  url.searchParams.set("routeId", String(routeId));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accNum: String(accNum),
    },
  });

  if (!res.ok) {
    throw new TradeLockerHttpError(
      `TradeLocker instrument detail failed: ${tradableInstrumentId} ${res.status} ${await res.text()}`,
      res.status
    );
  }

  const body = await res.json();
  return {
    lotSize: body.d.lotSize,
    baseCurrency: body.d.baseCurrency,
    quotingCurrency: body.d.quotingCurrency,
  };
}

export async function fetchAccountState(
  environment: "demo" | "live",
  accessToken: string,
  accNum: number,
  accountId: string
): Promise<TradeLockerAccountState> {
  const row = await tradeGet<number[]>(
    environment,
    accessToken,
    accNum,
    `/trade/accounts/${accountId}/state`,
    "accountDetailsData"
  );
  return parseAccountStateRow(row);
}
