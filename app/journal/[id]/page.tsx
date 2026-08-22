import { notFound } from "next/navigation";
import { getTrade } from "@/lib/trades/queries";
import { updateTradeJournal } from "@/lib/trades/actions";
import { createClient } from "@/lib/supabase/server";
import { AnalyzeButton } from "@/components/analyze-button";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await getTrade(id);
  if (!trade) notFound();

  const supabase = await createClient();
  const { data: feedback } = await supabase
    .from("ai_feedback")
    .select("*")
    .eq("trade_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const updateJournal = updateTradeJournal.bind(null, trade.id);

  return (
    <main className="mx-auto max-w-2xl flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{trade.symbol}</h1>
          <p className="text-sm text-neutral-500">
            {trade.side} · {trade.quantity} · {trade.source}
          </p>
        </div>
        <AnalyzeButton tradeId={trade.id} hasFeedback={Boolean(feedback)} />
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <Detail label="Entry" value={trade.entry_price} />
        <Detail label="Exit" value={trade.exit_price ?? "open"} />
        <Detail
          label="Result"
          value={
            trade.pnl === null
              ? "open"
              : trade.pnl.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                })
          }
        />
        <Detail label="Fees" value={trade.fees} />
      </dl>

      {feedback && (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="mb-2 text-xs font-medium text-neutral-500">
            AI feedback
          </p>
          <p className="whitespace-pre-wrap text-sm">{feedback.content}</p>
        </div>
      )}

      <form action={updateJournal} className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-500">Strategy</span>
          <input
            name="strategy"
            defaultValue={trade.strategy ?? ""}
            placeholder="breakout"
            className="input"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-500">Notes</span>
          <textarea
            name="notes"
            defaultValue={trade.notes ?? ""}
            rows={5}
            placeholder="Strong volume."
            className="input"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Save journal
        </button>
      </form>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
