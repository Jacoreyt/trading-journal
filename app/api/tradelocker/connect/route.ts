import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestTokens, listAccounts } from "@/lib/tradelocker/client";
import { encryptToken } from "@/lib/crypto/token";
import { errorMessage } from "@/lib/errors";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { email, password, server, environment } = await request.json();
  if (!email || !password || !server || !environment) {
    return NextResponse.json({ error: "missing credentials" }, { status: 400 });
  }

  try {
    const tokens = await requestTokens(environment, { email, password, server });
    const accounts = await listAccounts(environment, tokens.accessToken);
    const account = accounts[0];
    if (!account) {
      return NextResponse.json({ error: "no trading accounts found" }, { status: 404 });
    }

    const { error } = await supabase.from("broker_connections").upsert(
      {
        user_id: user.id,
        broker: "tradelocker",
        environment,
        broker_account_id: account.id,
        broker_account_number: String(account.accNum),
        broker_server: server,
        access_token_encrypted: encryptToken(tokens.accessToken),
        refresh_token_encrypted: encryptToken(tokens.refreshToken),
        status: "connected",
        last_error: null,
      },
      { onConflict: "user_id,broker,environment" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true, account: account.name });
  } catch (err) {
    console.error("[tradelocker connect]", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 502 });
  }
}
