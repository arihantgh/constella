"use client";

import { useState } from "react";

interface Props {
  onRegister: (agentId: string, owner: string, metadata: string) => Promise<void>;
  defaultOwner?: string;
}

export function AgentRegistrationForm({ onRegister, defaultOwner }: Props) {
  const [agentId, setAgentId] = useState("");
  const [owner, setOwner] = useState(defaultOwner || "");
  const [metadata, setMetadata] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !owner) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await onRegister(agentId, owner, metadata);
      setSuccess(true);
      setAgentId("");
      setOwner("");
      setMetadata("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Agent ID (Stellar public key)
        </label>
        <input
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          placeholder="G..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Owner (Stellar public key)
        </label>
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="G..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Metadata (optional)
        </label>
        <input
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder="agent-name or description"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-800 bg-green-900/30 px-3 py-2 text-sm text-green-300">
          Agent registered successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !agentId || !owner}
        className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? "Registering..." : "Register Agent"}
      </button>
    </form>
  );
}
