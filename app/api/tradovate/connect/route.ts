import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestAccessToken } from "@/lib/tradovate/client";
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

  const { name, password } = await request.json();
  if (!name || !password) {
    return NextResponse.json({ error: "missing credentials" }, { status: 400 });
  }

  try {
    const token = await requestAccessToken({ name, password });
    const environment = process.env.TRADOVATE_API_URL?.includes("demo")
      ? "demo"
      : "live";

    const { error } = await supabase.from("broker_connections").upsert(
      {
        user_id: user.id,
        broker: "tradovate",
        environment,
        broker_account_id: String(token.userId),
        access_token_encrypted: encryptToken(token.accessToken),
        access_token_expires_at: token.expirationTime,
        status: "connected",
        last_error: null,
      },
      { onConflict: "user_id,broker,environment" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tradovate connect]", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 502 });
  }
}
