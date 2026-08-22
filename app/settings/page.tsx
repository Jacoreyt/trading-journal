import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-sm flex-1 space-y-4 p-6">
      <h1 className="text-xl font-semibold">Broker Connections</h1>
      <ul className="space-y-2 text-sm">
        <li>
          <Link
            href="/settings/tradelocker"
            className="block rounded-md border border-neutral-200 px-3 py-2 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            TradeLocker
          </Link>
        </li>
        <li>
          <Link
            href="/settings/tradovate"
            className="block rounded-md border border-neutral-200 px-3 py-2 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            Tradovate
          </Link>
        </li>
      </ul>
    </main>
  );
}
