"use client";

import { useState } from "react";

interface Props {
  onCreatePayment: (
    fromAgent: string,
    toAgent: string,
    amount: string,
    taskRef: string,
  ) => Promise<string | null>;
}

export function PaymentForm({ onCreatePayment }: Props) {
  const [fromAgent, setFromAgent] = useState("");
  const [toAgent, setToAgent] = useState("");
  const [amount, setAmount] = useState("");
  const [taskRef, setTaskRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAgent || !toAgent || !amount) return;

    setSubmitting(true);
    setError(null);
    setPaymentId(null);

    try {
      const pid = await onCreatePayment(fromAgent, toAgent, amount, taskRef);
      if (pid) setPaymentId(pid);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          From Agent
        </label>
        <input
          value={fromAgent}
          onChange={(e) => setFromAgent(e.target.value)}
          placeholder="G..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          To Agent
        </label>
        <input
          value={toAgent}
          onChange={(e) => setToAgent(e.target.value)}
          placeholder="G..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Amount
        </label>
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
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Task Reference (optional)
        </label>
        <input
          value={taskRef}
          onChange={(e) => setTaskRef(e.target.value)}
          placeholder="task-001"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {paymentId && (
        <div className="rounded-lg border border-green-800 bg-green-900/30 px-3 py-2 text-sm text-green-300">
          Payment created — ID: {paymentId}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !fromAgent || !toAgent || !amount}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? "Creating Payment..." : "Create Payment"}
      </button>
    </form>
  );
}
