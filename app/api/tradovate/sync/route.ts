import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncTradovateConnection } from "@/lib/tradovate/sync";
import { errorMessage } from "@/lib/errors";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: connection, error } = await supabase
    .from("broker_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("broker", "tradovate")
    .maybeSingle();

  if (error || !connection) {
    return NextResponse.json({ error: "no broker connection" }, { status: 404 });
  }

  try {
    const result = await syncTradovateConnection(connection);
    return NextResponse.json(result);
  } catch (err) {
    const message = errorMessage(err);
    console.error("[tradovate sync]", err);
    await supabase
      .from("broker_connections")
      .update({ status: "error", last_error: message })
      .eq("id", connection.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
