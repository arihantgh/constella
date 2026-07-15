"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { AgentRegistrationForm } from "@/components/AgentRegistrationForm";
import { AgentList } from "@/components/AgentList";
import { BudgetForm } from "@/components/BudgetForm";
import { PaymentFeed } from "@/components/PaymentFeed";
import { PaymentForm } from "@/components/PaymentForm";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WalletGuard } from "@/components/WalletGuard";
import { SatisfactionWidget } from "@/components/SatisfactionWidget";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { GettingStarted } from "@/components/GettingStarted";
import { FeedbackPrompt } from "@/components/FeedbackPrompt";
import { VerificationBadge } from "@/components/VerificationBadge";
import { GuardrailsInfo } from "@/components/GuardrailsInfo";
import { ContractArchitecture } from "@/components/ContractArchitecture";
import { ReconciliationExport } from "@/components/ReconciliationExport";
import { TxDebugLog } from "@/components/TxDebugLog";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { NetworkSelector } from "@/components/NetworkSelector";
import { MainnetBanner } from "@/components/MainnetBanner";
import {
  buildRegisterAgentTx,
  buildDeactivateAgentTx,
  buildSetBudgetTx,
  buildCreatePaymentTx,
  buildExecutePaymentTx,
  buildRefundPaymentTx,
} from "@/lib/soroban";
import { TESTNET_NETWORK_PASSPHRASE } from "@/lib/constants";
import { SEED_AGENT_ADDRESSES } from "@/lib/seed-agents";

type Tab = "agents" | "budgets" | "payments";

export default function Home() {
  const { address, isConnected, isLoading, error, connect, disconnect, signAndSend } = useWallet();
  const [tab, setTab] = useState<Tab>("agents");
  const [previewNetwork, setPreviewNetwork] = useState("testnet");
  const [knownAgents, setKnownAgents] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("knownAgents");
        const parsed: string[] = stored ? JSON.parse(stored) : [];
        const merged = [...new Set([...parsed, ...SEED_AGENT_ADDRESSES])];
        if (merged.length !== parsed.length) {
          localStorage.setItem("knownAgents", JSON.stringify(merged));
        }
        return merged;
      } catch {}
    }
    return SEED_AGENT_ADDRESSES;
  });

  const addKnownAgent = (agentId: string) => {
    setKnownAgents((prev) => {
      const next = prev.includes(agentId) ? prev : [...prev, agentId];
      try { localStorage.setItem("knownAgents", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleRegister = async (agentId: string, owner: string, metadata: string) => {
    if (!address) throw new Error("Wallet not connected");
    const xdr = await buildRegisterAgentTx(address, agentId, owner, metadata, TESTNET_NETWORK_PASSPHRASE);
    await signAndSend(xdr);
    addKnownAgent(agentId);
  };

  const handleDeactivate = async (agentId: string) => {
    if (!address) throw new Error("Wallet not connected");
    const xdr = await buildDeactivateAgentTx(address, agentId, TESTNET_NETWORK_PASSPHRASE);
    await signAndSend(xdr);
  };

  const handleSetBudget = async (agentId: string, perTxLimit: string, dailyLimit: string) => {
    if (!address) throw new Error("Wallet not connected");
    const xdr = await buildSetBudgetTx(address, agentId, perTxLimit, dailyLimit, TESTNET_NETWORK_PASSPHRASE);
    await signAndSend(xdr);
  };

  const handleSetTaskBudget = (agentId: string, limit: string) => {
    try {
      const key = `taskBudget:${agentId}`;
      localStorage.setItem(key, limit);
    } catch {
      // ignore storage errors
    }
  };

  const handleCreatePayment = async (
    fromAgent: string,
    toAgent: string,
    amount: string,
    taskRef: string,
  ): Promise<string | null> => {
    if (!address) throw new Error("Wallet not connected");
    const xdr = await buildCreatePaymentTx(address, fromAgent, toAgent, amount, taskRef, TESTNET_NETWORK_PASSPHRASE);
    const hash = await signAndSend(xdr);
    return hash;
  };

  const handleExecutePayment = async (
    paymentId: number,
  ): Promise<string | null> => {
    if (!address) throw new Error("Wallet not connected");
    const xdr = await buildExecutePaymentTx(address, paymentId, TESTNET_NETWORK_PASSPHRASE);
    const hash = await signAndSend(xdr);
    return hash;
  };

  const handleRefundPayment = async (
    paymentId: number,
  ): Promise<string | null> => {
    if (!address) throw new Error("Wallet not connected");
    const xdr = await buildRefundPaymentTx(address, paymentId, TESTNET_NETWORK_PASSPHRASE);
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
        <div className="flex items-center gap-3">
          <NetworkSelector value={previewNetwork} onChange={setPreviewNetwork} />
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

      <WalletGuard
        isConnected={isConnected}
        address={address}
        isLoading={isLoading}
        error={error}
        onConnect={connect}
      >
        {isConnected && knownAgents.length < 2 && <OnboardingWizard />}
        {previewNetwork === "mainnet" && (
          <div className="mb-4">
            <MainnetBanner />
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SatisfactionWidget />
          <GettingStarted agentCount={knownAgents.length} />
          <FeedbackPrompt />
        </div>

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
                <AgentRegistrationForm onRegister={handleRegister} defaultOwner={address ?? undefined} />
              </section>
              <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h2 className="mb-4 text-lg font-semibold">Registered Agents</h2>
                <AgentList
                  knownAgents={knownAgents}
                  onAddAgent={addKnownAgent}
                  walletAddress={address ?? undefined}
                  onDeactivate={handleDeactivate}
                />
              </section>
            </div>
          </ErrorBoundary>
        )}

        {tab === "budgets" && (
          <ErrorBoundary>
            <section className="mx-auto max-w-lg space-y-4">
              <div className="flex justify-center">
                <VerificationBadge />
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h2 className="mb-4 text-lg font-semibold">Set Budget</h2>
                <BudgetForm onSetBudget={handleSetBudget} onSetTaskBudget={handleSetTaskBudget} />
              </div>
            </section>
          </ErrorBoundary>
        )}

        {tab === "payments" && (
          <ErrorBoundary>
            <div className="mb-6">
              <AnalyticsPanel />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-6">
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <h2 className="mb-4 text-lg font-semibold">Create Payment</h2>
                  <PaymentForm
                    onCreatePayment={handleCreatePayment}
                    onExecutePayment={handleExecutePayment}
                    onRefundPayment={handleRefundPayment}
                  />
                </div>
                <GuardrailsInfo />
                <ReconciliationExport />
                <TxDebugLog />
              </section>
              <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h2 className="mb-4 text-lg font-semibold">Live Payment Feed</h2>
                <PaymentFeed />
              </section>
            </div>
          </ErrorBoundary>
        )}
      </WalletGuard>

      <footer className="mt-12">
        <ContractArchitecture />
      </footer>
    </main>
  );
}
