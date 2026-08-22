import { getLatestInsight } from "@/lib/insights/queries";
import { InsightPanel } from "@/components/insight-panel";
import { EnvironmentToggle } from "@/components/environment-toggle";
import { parseEnvironmentFilter } from "@/lib/environment-filter";

export default async function GamePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ env?: string }>;
}) {
  const environment = parseEnvironmentFilter((await searchParams).env);

  const [daily, weekly] = await Promise.all([
    getLatestInsight("game_plan_daily", environment),
    getLatestInsight("game_plan_weekly", environment),
  ]);

  return (
    <main className="mx-auto max-w-2xl flex-1 space-y-6 p-6">
      <h1 className="text-xl font-semibold">Game Plan</h1>

      <EnvironmentToggle current={environment} />

      <InsightPanel
        key={`daily-${environment}`}
        kind="game_plan_daily"
        environmentFilter={environment}
        title="Today"
        initialContent={daily?.content ?? null}
        initialGeneratedAt={daily?.created_at ?? null}
        buttonLabel="Generate Today's Plan"
      />

      <InsightPanel
        key={`weekly-${environment}`}
        kind="game_plan_weekly"
        environmentFilter={environment}
        title="This Week"
        initialContent={weekly?.content ?? null}
        initialGeneratedAt={weekly?.created_at ?? null}
        buttonLabel="Generate This Week's Plan"
      />
    </main>
  );
}
