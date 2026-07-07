"use client";

import { useState } from "react";
import { queryPayment } from "@/lib/soroban";
import type { PaymentRecord } from "@/lib/types";
import { PaymentStatus } from "@/lib/types";

interface Props {
  onCreatePayment: (
    fromAgent: string,
    toAgent: string,
    amount: string,
    taskRef: string,
  ) => Promise<string | null>;
  onExecutePayment: (paymentId: number) => Promise<string | null>;
  onRefundPayment: (paymentId: number) => Promise<string | null>;
}

type SubTab = "create" | "execute" | "refund";

export function PaymentForm({ onCreatePayment, onExecutePayment, onRefundPayment }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("create");

  // Create form state
  const [fromAgent, setFromAgent] = useState("");
  const [toAgent, setToAgent] = useState("");
  const [amount, setAmount] = useState("");
  const [taskRef, setTaskRef] = useState("");

  // Execute / Refund state
  const [paymentId, setPaymentId] = useState("");
  const [queriedPayment, setQueriedPayment] = useState<PaymentRecord | null>(null);
  const [queryingPayment, setQueryingPayment] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultTx, setResultTx] = useState<string | null>(null);

  const clearResult = () => {
    setError(null);
    setResultTx(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAgent || !toAgent || !amount) return;

    setSubmitting(true);
    clearResult();

    try {
      const hash = await onCreatePayment(fromAgent, toAgent, amount, taskRef);
      if (hash) setResultTx(hash);
      setFromAgent("");
      setToAgent("");
      setAmount("");
      setTaskRef("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupPayment = async () => {
    const id = parseInt(paymentId, 10);
    if (isNaN(id) || id <= 0) {
      setError("Invalid payment ID");
      return;
    }
    setQueryingPayment(true);
    clearResult();
    setQueriedPayment(null);
    try {
      const record = await queryPayment(id);
      if (!record) {
        setError(`Payment #${id} not found on-chain.`);
      }
      setQueriedPayment(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setQueryingPayment(false);
    }
  };

  const handleExecute = async () => {
    const id = parseInt(paymentId, 10);
    if (isNaN(id)) return;
    setSubmitting(true);
    clearResult();
    try {
      const hash = await onExecutePayment(id);
      if (hash) setResultTx(hash);
      setQueriedPayment(null);
      setPaymentId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = async () => {
    const id = parseInt(paymentId, 10);
    if (isNaN(id)) return;
    setSubmitting(true);
    clearResult();
    try {
      const hash = await onRefundPayment(id);
      if (hash) setResultTx(hash);
      setQueriedPayment(null);
      setPaymentId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (s: PaymentStatus) => {
    switch (s) {
      case PaymentStatus.Pending: return "Pending";
      case PaymentStatus.Executed: return "Executed";
      case PaymentStatus.Refunded: return "Refunded";
      case PaymentStatus.Rejected: return "Rejected";
      default: return String(s);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900/70 p-1">
        {(["create", "execute", "refund"] as SubTab[]).map((st) => (
          <button
            key={st}
            onClick={() => { setSubTab(st); clearResult(); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              subTab === st
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {st === "create" ? "Create" : st === "execute" ? "Execute" : "Refund"}
          </button>
        ))}
      </div>

      {/* --- Create Payment --- */}
      {subTab === "create" && (
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">From Agent</label>
            <input
              value={fromAgent}
              onChange={(e) => setFromAgent(e.target.value)}
              placeholder="G..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">To Agent</label>
            <input
              value={toAgent}
              onChange={(e) => setToAgent(e.target.value)}
              placeholder="G..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="1"
              placeholder="100"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Task Reference (optional)</label>
            <input
              value={taskRef}
              onChange={(e) => setTaskRef(e.target.value)}
              placeholder="task-001"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !fromAgent || !toAgent || !amount}
            className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Payment"}
          </button>
        </form>
      )}

      {/* --- Execute / Refund --- */}
      {(subTab === "execute" || subTab === "refund") && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={paymentId}
              onChange={(e) => { setPaymentId(e.target.value); setQueriedPayment(null); clearResult(); }}
              placeholder="Payment ID (number)"
              type="number"
              min="1"
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleLookupPayment}
              disabled={!paymentId || queryingPayment}
              className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium transition hover:bg-gray-600 disabled:opacity-50"
            >
              {queryingPayment ? "..." : "Lookup"}
            </button>
          </div>

          {queriedPayment && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-gray-200">{statusLabel(queriedPayment.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">From</span>
                <span className="font-mono text-gray-200">{queriedPayment.from_agent.slice(0, 8)}...{queriedPayment.from_agent.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">To</span>
                <span className="font-mono text-gray-200">{queriedPayment.to_agent.slice(0, 8)}...{queriedPayment.to_agent.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span className="text-gray-200">{queriedPayment.amount}</span>
              </div>
              {queriedPayment.task_ref && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Task Ref</span>
                  <span className="text-gray-200">{queriedPayment.task_ref}</span>
                </div>
              )}
            </div>
          )}

          {subTab === "execute" && (
            <button
              onClick={handleExecute}
              disabled={submitting || !queriedPayment || queriedPayment.status !== PaymentStatus.Pending}
              className="min-h-[44px] w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-medium transition hover:bg-green-600 disabled:opacity-50"
            >
              {submitting ? "Executing..." : "Execute Payment"}
            </button>
          )}

          {subTab === "refund" && (
            <button
              onClick={handleRefund}
              disabled={submitting || !queriedPayment || queriedPayment.status !== PaymentStatus.Executed}
              className="min-h-[44px] w-full rounded-lg bg-yellow-700 px-4 py-2 text-sm font-medium transition hover:bg-yellow-600 disabled:opacity-50"
            >
              {submitting ? "Refunding..." : "Refund Payment"}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {resultTx && (
        <div className="rounded-lg border border-green-800 bg-green-900/30 px-3 py-2 text-sm text-green-300">
          Transaction submitted: <span className="font-mono">{resultTx.slice(0, 12)}...{resultTx.slice(-8)}</span>
        </div>
      )}
    </div>
  );
}
