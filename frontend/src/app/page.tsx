"use client";

import { useState } from "react";

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">constella</h1>
          <p className="text-sm text-gray-400">
            Autonomous Agent Payments on Stellar
          </p>
        </div>
        <div>
          {address ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-900/50 px-3 py-1 text-sm text-green-300">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <button
                onClick={() => setAddress(null)}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition hover:border-gray-500"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500">
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-2 text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-gray-400">
          Connect your Freighter wallet to get started. Register agents, set
          budgets, and monitor agent-to-agent payments in real time.
        </p>
      </section>
    </main>
  );
}
