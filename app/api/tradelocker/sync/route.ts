import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncTradeLockerConnection } from "@/lib/tradelocker/sync";
import { errorMessage } from "@/lib/errors";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { environment } = await request.json();
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

  if (error || !connection) {
    return NextResponse.json({ error: "no broker connection" }, { status: 404 });
  }

  try {
    const result = await syncTradeLockerConnection(connection);
    return NextResponse.json(result);
  } catch (err) {
    const message = errorMessage(err);
    console.error("[tradelocker sync]", err);
    await supabase
      .from("broker_connections")
      .update({ status: "error", last_error: message })
      .eq("id", connection.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
