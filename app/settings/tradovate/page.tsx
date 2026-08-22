"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TradovateSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const res = await fetch("/api/tradovate/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    const body = await res.json();
    setPending(false);
    setStatus(res.ok ? "Connected." : `Failed: ${body.error}`);
  }

  async function sync() {
    setPending(true);
    setStatus(null);
    const res = await fetch("/api/tradovate/sync", { method: "POST" });
    const body = await res.json();
    setPending(false);
    setStatus(res.ok ? `Imported ${body.imported} trades.` : `Failed: ${body.error}`);
    if (res.ok) router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm flex-1 space-y-6 p-6">
      <h1 className="text-xl font-semibold">Connect Tradovate</h1>

      <form onSubmit={connect} className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-500">Username</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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

      {status && <p className="text-sm">{status}</p>}
    </main>
  );
}
