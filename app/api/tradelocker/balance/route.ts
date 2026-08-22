import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAccountState } from "@/lib/tradelocker/client";
import { decryptToken } from "@/lib/crypto/token";
import { errorMessage } from "@/lib/errors";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const environment = new URL(request.url).searchParams.get("environment");
  if (environment !== "demo" && environment !== "live") {
    return NextResponse.json({ error: "invalid environment" }, { status: 400 });
  }

  const { data: connection, error } = await supabase
    .from("broker_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("broker", "tradelocker")
    .eq("environment", environment)
    .maybeSingle();

  if (error || !connection || !connection.access_token_encrypted || !connection.broker_account_number) {
    return NextResponse.json({ error: "no broker connection" }, { status: 404 });
  }

  try {
    const accessToken = decryptToken(connection.access_token_encrypted);
    const state = await fetchAccountState(
      connection.environment,
      accessToken,
      Number(connection.broker_account_number),
      connection.broker_account_id!
    );
    return NextResponse.json(state);
  } catch (err) {
    console.error("[tradelocker balance]", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 502 });
  }
}
