"use client";

import { useWallet } from "@/hooks/useWallet";

export default function Home() {
  const {
    address,
    isConnected,
    network,
    isLoading,
    error,
    connect,
    disconnect,
  } = useWallet();

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
          {isConnected && address ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full bg-green-900/50 px-3 py-1 text-sm text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <button
                onClick={disconnect}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition hover:border-gray-500"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isConnected ? (
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold">Welcome to constella</h2>
          <p className="text-sm text-gray-400">
            Connect your Freighter wallet (Testnet) to register agents, set
            budgets, and monitor autonomous agent-to-agent payments.
          </p>
        </section>
      ) : (
        <div className="grid gap-6">
          <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold">Dashboard</h2>
            <p className="text-sm text-gray-400">
              Connected as {address!.slice(0, 6)}...{address!.slice(-4)} on{" "}
              {network === "TESTNET" ? "Testnet" : network}.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Agent management and live payment feed coming soon.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
