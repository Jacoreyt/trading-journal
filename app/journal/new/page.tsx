import { createTrade } from "@/lib/trades/actions";

export default function NewTradePage() {
  return (
    <main className="mx-auto max-w-lg flex-1 p-6">
      <h1 className="mb-6 text-xl font-semibold">New Trade</h1>
      <form action={createTrade} className="space-y-4">
        <Field label="Asset">
          <input
            name="symbol"
            required
            placeholder="BTC"
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Side">
            <select name="side" required className="input">
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </Field>
          <Field label="Quantity">
            <input
              name="quantity"
              type="number"
              step="any"
              required
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry price">
            <input
              name="entry_price"
              type="number"
              step="any"
              required
              className="input"
            />
          </Field>
          <Field label="Exit price">
            <input name="exit_price" type="number" step="any" className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry time">
            <input
              name="entry_time"
              type="datetime-local"
              required
              className="input"
            />
          </Field>
          <Field label="Exit time">
            <input name="exit_time" type="datetime-local" className="input" />
          </Field>
        </div>

        <Field label="Fees">
          <input
            name="fees"
            type="number"
            step="any"
            defaultValue={0}
            className="input"
          />
        </Field>

        <Field label="Strategy">
          <input name="strategy" placeholder="breakout" className="input" />
        </Field>

        <Field label="Notes">
          <textarea
            name="notes"
            rows={4}
            placeholder="Strong volume."
            className="input"
          />
        </Field>

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Save trade
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
