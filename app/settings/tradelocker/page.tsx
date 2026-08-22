"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TradeLockerAccountState } from "@/lib/tradelocker/client";

export default function TradeLockerSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [environment, setEnvironment] = useState<"demo" | "live">("demo");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [balance, setBalance] = useState<TradeLockerAccountState | null>(null);

  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const res = await fetch("/api/tradelocker/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, server, environment }),
    });
    const body = await res.json();
    setPending(false);
    setStatus(res.ok ? `Connected to ${body.account}.` : `Failed: ${body.error}`);
  }

  async function sync() {
    setPending(true);
    setStatus(null);
    const res = await fetch("/api/tradelocker/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environment }),
    });
    const body = await res.json();
    setPending(false);
    setStatus(res.ok ? `Imported ${body.imported} trades.` : `Failed: ${body.error}`);
    if (res.ok) router.refresh();
  }

  async function checkBalance() {
    setPending(true);
    setStatus(null);
    const res = await fetch(`/api/tradelocker/balance?environment=${environment}`);
    const body = await res.json();
    setPending(false);
    if (res.ok) {
      setBalance(body);
    } else {
      setStatus(`Failed: ${body.error}`);
    }
  }

  return (
    <main className="mx-auto max-w-sm flex-1 space-y-6 p-6">
      <h1 className="text-xl font-semibold">Connect TradeLocker</h1>

      <form onSubmit={connect} className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-500">
            Environment — also selects which connection Sync/Balance below act on
          </span>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as "demo" | "live")}
            className="input"
          >
            <option value="demo">Demo</option>
            <option value="live">Live</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-500">Server</span>
          <input
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder="Your broker's server name"
            required
            className="input"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-500">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          Connect
        </button>
      </form>

      <button
        onClick={sync}
        disabled={pending}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
      >
        Sync now
      </button>

      <button
        onClick={checkBalance}
        disabled={pending}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
      >
        Check Balance
      </button>

      {balance && (
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <div>
            <dt className="text-xs text-neutral-500">Balance</dt>
            <dd className="font-medium">
              {balance.balance.toLocaleString(undefined, { style: "currency", currency: "USD" })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Available Funds</dt>
            <dd className="font-medium">
              {balance.availableFunds.toLocaleString(undefined, { style: "currency", currency: "USD" })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Today&apos;s P&amp;L</dt>
            <dd className="font-medium">
              {balance.todayNet.toLocaleString(undefined, { style: "currency", currency: "USD" })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Open Positions</dt>
            <dd className="font-medium">{balance.positionsCount}</dd>
          </div>
        </dl>
      )}

      {status && <p className="text-sm">{status}</p>}
    </main>
  );
}
