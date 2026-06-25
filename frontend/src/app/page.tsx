"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { AgentRegistrationForm } from "@/components/AgentRegistrationForm";
import { AgentList } from "@/components/AgentList";
import { BudgetForm } from "@/components/BudgetForm";
import { PaymentFeed } from "@/components/PaymentFeed";
import { PaymentForm } from "@/components/PaymentForm";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { buildWriteTx } from "@/lib/soroban";
import { getConfig } from "@/lib/config";
import { TESTNET_NETWORK_PASSPHRASE } from "@/lib/constants";

type Tab = "agents" | "budgets" | "payments";

export default function Home() {
  const { address, isConnected, network, isLoading, error, connect, disconnect, signAndSend } = useWallet();
  const [tab, setTab] = useState<Tab>("agents");
  const [knownAgents, setKnownAgents] = useState<string[]>([]);

  const handleRegister = async (agentId: string, owner: string, metadata: string) => {
    if (!address) throw new Error("Wallet not connected");
    const config = getConfig();
    const xdr = await buildWriteTx(
      address,
      config.contracts.agent_registry.id,
      "register_agent",
      [agentId, owner, metadata],
      TESTNET_NETWORK_PASSPHRASE,
    );
    await signAndSend(xdr);
    setKnownAgents((prev) => (prev.includes(agentId) ? prev : [...prev, agentId]));
  };

  const handleSetBudget = async (agentId: string, perTxLimit: string, dailyLimit: string) => {
    if (!address) throw new Error("Wallet not connected");
    const config = getConfig();
    const xdr = await buildWriteTx(
      address,
      config.contracts.budget_policy.id,
      "set_budget",
      [agentId, address, perTxLimit, dailyLimit],
      TESTNET_NETWORK_PASSPHRASE,
    );
    await signAndSend(xdr);
  };

  const handleCreatePayment = async (
    fromAgent: string,
    toAgent: string,
    amount: string,
    taskRef: string,
  ): Promise<string | null> => {
    if (!address) throw new Error("Wallet not connected");
    const config = getConfig();

    // Find the token address from the from-agent's budget
    // (in production, the frontend would let the user pick the token)
    const paymentId = await new Promise<string | null>((resolve) => {
      // For now, the payment is created via the contract
      resolve(null);
    });

    // Use native token for simplicity
    const nativeToken = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4";
    const xdr = await buildWriteTx(
      address,
      config.contracts.payment.id,
      "create_payment",
      [fromAgent, toAgent, amount, nativeToken, taskRef],
      TESTNET_NETWORK_PASSPHRASE,
    );
    const hash = await signAndSend(xdr);
    return hash;
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "agents", label: "Agents" },
    { key: "budgets", label: "Budgets" },
    { key: "payments", label: "Payments" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">constella</h1>
          <p className="text-sm text-gray-400">Autonomous Agent Payments on Stellar</p>
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
                className="min-h-[44px] rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition hover:border-gray-500"
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
            Connect your Freighter wallet (Testnet) to register agents, set budgets, and monitor
            autonomous agent-to-agent payments.
          </p>
        </section>
      ) : (
        <>
          {/* Tab bar */}
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/50 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`min-h-[44px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${
                  tab === t.key
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "agents" && (
            <ErrorBoundary>
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <h2 className="mb-4 text-lg font-semibold">Register Agent</h2>
                  <AgentRegistrationForm onRegister={handleRegister} />
                </section>
                <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <h2 className="mb-4 text-lg font-semibold">Registered Agents</h2>
                  <AgentList knownAgents={knownAgents} />
                </section>
              </div>
            </ErrorBoundary>
          )}

          {tab === "budgets" && (
            <ErrorBoundary>
              <section className="mx-auto max-w-lg rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h2 className="mb-4 text-lg font-semibold">Set Budget</h2>
                <BudgetForm onSetBudget={handleSetBudget} />
              </section>
            </ErrorBoundary>
          )}

          {tab === "payments" && (
            <ErrorBoundary>
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <h2 className="mb-4 text-lg font-semibold">Create Payment</h2>
                  <PaymentForm onCreatePayment={handleCreatePayment} />
                </section>
                <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <h2 className="mb-4 text-lg font-semibold">Live Payment Feed</h2>
                  <PaymentFeed />
                </section>
              </div>
            </ErrorBoundary>
          )}
        </>
      )}
    </main>
  );
}
