"use client";

import { useState } from "react";

interface Props {
  onSetBudget: (agentId: string, perTxLimit: string, dailyLimit: string) => Promise<void>;
  onSetTaskBudget?: (agentId: string, limit: string) => void;
}

export function BudgetForm({ onSetBudget, onSetTaskBudget }: Props) {
  const [agentId, setAgentId] = useState("");
  const [perTxLimit, setPerTxLimit] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [taskBudgetLimit, setTaskBudgetLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !perTxLimit || !dailyLimit) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await onSetBudget(agentId, perTxLimit, dailyLimit);
      if (taskBudgetLimit && onSetTaskBudget) {
        onSetTaskBudget(agentId, taskBudgetLimit);
      }
      setSuccess(true);
      setPerTxLimit("");
      setDailyLimit("");
      setTaskBudgetLimit("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set budget");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Agent ID
        </label>
        <input
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          placeholder="G..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Per-Tx Limit
          </label>
          <input
            value={perTxLimit}
            onChange={(e) => setPerTxLimit(e.target.value)}
            type="number"
            min="1"
            placeholder="1000"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Daily Limit
          </label>
          <input
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            type="number"
            min="1"
            placeholder="10000"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Per-Task Budget Limit (optional)
        </label>
        <input
          value={taskBudgetLimit}
          onChange={(e) => setTaskBudgetLimit(e.target.value)}
          type="number"
          min="1"
          placeholder="500"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional cap for a single task reference, tracked alongside on-chain per-tx limits.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-800 bg-green-900/30 px-3 py-2 text-sm text-green-300">
          Budget configured successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !agentId || !perTxLimit || !dailyLimit}
        className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? "Setting Budget..." : "Set Budget"}
      </button>
    </form>
  );
}
