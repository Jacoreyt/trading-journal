import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/market/quotes";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: items, error } = await supabase
    .from("watchlist_items")
    .select("*")
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const quotes = await getQuotes(items);
    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("[market quotes]", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 502 });
  }
}
