import { getTrades } from "@/lib/trades/queries";
import { getLatestInsight } from "@/lib/insights/queries";
import { computeStrategyBreakdown } from "@/lib/insights/strategy-breakdown";
import { InsightPanel } from "@/components/insight-panel";
import { EnvironmentToggle } from "@/components/environment-toggle";
import { parseEnvironmentFilter } from "@/lib/environment-filter";

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ env?: string }>;
}) {
  const environment = parseEnvironmentFilter((await searchParams).env);

  const trades = await getTrades(environment);
  const breakdown = computeStrategyBreakdown(trades);

  const [insights, playbook] = await Promise.all([
    getLatestInsight("strategy_insights", environment),
    getLatestInsight("strategy_playbook", environment),
  ]);

  return (
    <main className="mx-auto max-w-2xl flex-1 space-y-6 p-6">
      <h1 className="text-xl font-semibold">Strategy</h1>

      <EnvironmentToggle current={environment} />

      <div className="space-y-2">
        <h2 className="font-medium">Performance by Strategy</h2>
        {breakdown.length === 0 ? (
          <p className="text-sm text-neutral-500">No trades yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
                  <th className="px-3 py-2 font-medium">Strategy</th>
                  <th className="px-3 py-2 font-medium">Trades</th>
                  <th className="px-3 py-2 font-medium">Win rate</th>
                  <th className="px-3 py-2 font-medium">Total P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr
                    key={row.strategy}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
                  >
                    <td className="px-3 py-2">{row.strategy}</td>
                    <td className="px-3 py-2">{row.count}</td>
                    <td className="px-3 py-2">
                      {row.winRate === null ? "—" : `${Math.round(row.winRate * 100)}%`}
                    </td>
                    <td
                      className={`px-3 py-2 ${
                        row.totalPnl > 0
                          ? "text-emerald-600"
                          : row.totalPnl < 0
                            ? "text-red-600"
                            : ""
                      }`}
                    >
                      {row.totalPnl.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InsightPanel
        key={`insights-${environment}`}
        kind="strategy_insights"
        environmentFilter={environment}
        title="Behavioral Insights"
        initialContent={insights?.content ?? null}
        initialGeneratedAt={insights?.created_at ?? null}
        buttonLabel="Generate Insights"
      />

      <InsightPanel
        key={`playbook-${environment}`}
        kind="strategy_playbook"
        environmentFilter={environment}
        title="Playbook"
        initialContent={playbook?.content ?? null}
        initialGeneratedAt={playbook?.created_at ?? null}
        buttonLabel="Generate Playbook"
      />
    </main>
  );
}
