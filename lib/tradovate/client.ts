import "server-only";

// Field names below follow Tradovate's public REST API as of this writing.
// Verify against the live OpenAPI spec at https://api.tradovate.com/ once
// API access is approved — Tradovate does not publish a stable schema doc.

export interface TradovateCredentials {
  name: string;
  password: string;
}

export interface TradovateAccessToken {
  accessToken: string;
  expirationTime: string;
  userId: number;
}

export interface TradovateFillPair {
  id: number;
  contractId: number;
  buyFillId: number;
  sellFillId: number;
  buyPrice: number;
  sellPrice: number;
  qty: number;
  pnl: number | null;
}

export interface TradovateFill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  action: "Buy" | "Sell";
  qty: number;
  price: number;
}

export interface TradovateContract {
  id: number;
  name: string;
}

function baseUrl() {
  return process.env.TRADOVATE_API_URL ?? "https://demo.tradovateapi.com/v1";
}

export async function requestAccessToken(
  credentials: TradovateCredentials
): Promise<TradovateAccessToken> {
  const res = await fetch(`${baseUrl()}/auth/accesstokenrequest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: credentials.name,
      password: credentials.password,
      appId: process.env.TRADOVATE_APP_ID,
      appVersion: process.env.TRADOVATE_APP_VERSION ?? "1.0",
      cid: process.env.TRADOVATE_CID,
      sec: process.env.TRADOVATE_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tradovate auth failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function tradovateGet<T>(
  accessToken: string,
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Tradovate request failed: ${path} ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export function fetchFillPairs(accessToken: string) {
  return tradovateGet<TradovateFillPair[]>(accessToken, "/fillPair/list");
}

export function fetchFills(accessToken: string) {
  return tradovateGet<TradovateFill[]>(accessToken, "/fill/list");
}

export function fetchContracts(accessToken: string) {
  return tradovateGet<TradovateContract[]>(accessToken, "/contract/list");
}
