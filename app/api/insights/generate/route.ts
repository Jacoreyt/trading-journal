import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInsight } from "@/lib/insights/generate";
import { errorMessage } from "@/lib/errors";
import type { EnvironmentFilter, InsightKind } from "@/lib/supabase/types";

const VALID_KINDS: InsightKind[] = [
  "strategy_insights",
  "strategy_playbook",
  "game_plan_daily",
  "game_plan_weekly",
];
const VALID_ENVIRONMENTS: EnvironmentFilter[] = ["all", "demo", "live"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { kind, environment } = await request.json();
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }
  if (!VALID_ENVIRONMENTS.includes(environment)) {
    return NextResponse.json({ error: "invalid environment" }, { status: 400 });
  }

  try {
    const content = await generateInsight(user.id, kind, environment);
    return NextResponse.json({ content });
  } catch (err) {
    console.error("[insights generate]", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
