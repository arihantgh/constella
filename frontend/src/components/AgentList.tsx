"use client";

import type { AgentInfo } from "@/lib/types";
import { queryAgent } from "@/lib/soroban";
import { useEffect, useState, useCallback } from "react";

interface Props {
  knownAgents: string[];
  onRefresh?: () => void;
  onAddAgent?: (id: string) => void;
  walletAddress?: string;
  onDeactivate?: (agentId: string) => Promise<void>;
}

export function AgentList({ knownAgents, onAddAgent, walletAddress, onDeactivate }: Props) {
  const [agents, setAgents] = useState<Record<string, AgentInfo | null>>({});
  const [loading, setLoading] = useState(false);
  const [lookupId, setLookupId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (knownAgents.length === 0) return;
    setLoading(true);
    const results: Record<string, AgentInfo | null> = {};
    await Promise.all(
      knownAgents.map(async (id) => {
        try {
          results[id] = await queryAgent(id);
        } catch {
          results[id] = null;
        }
      }),
    );
    setAgents(results);
    setLoading(false);
  }, [knownAgents]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAddLookup = () => {
    const trimmed = lookupId.trim();
    setAddError(null);
    if (!trimmed) return;
    if (!trimmed.startsWith("G") || trimmed.length !== 56) {
      setAddError("Invalid Stellar public key");
      return;
    }
    if (!onAddAgent) return;
    onAddAgent(trimmed);
    setLookupId("");
  };

  const handleDeactivate = async (agentId: string) => {
    if (!onDeactivate) return;
    setDeactivating(agentId);
    try {
      await onDeactivate(agentId);
      await new Promise((r) => setTimeout(r, 3000));
      fetchAgents();
    } catch {
      // error handled upstream
    } finally {
      setDeactivating(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Always show lookup bar */}
      <div className="flex gap-2">
        <input
          value={lookupId}
          onChange={(e) => { setLookupId(e.target.value); setAddError(null); }}
          placeholder="Paste agent G... address to look up"
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleAddLookup()}
        />
        <button
          onClick={handleAddLookup}
          disabled={!lookupId.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium transition hover:bg-blue-500 disabled:opacity-50"
        >
          Lookup
        </button>
      </div>
      {addError && (
        <p className="text-xs text-red-400">{addError}</p>
      )}

      {/* Empty state */}
      {knownAgents.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-400 mb-1">No agents loaded</p>
          <p className="text-xs text-gray-500">
            Register a new agent using the form, or paste an existing agent&apos;s address above and click Lookup.
          </p>
        </div>
      )}

      {/* Header */}
      {knownAgents.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {knownAgents.length} agent{knownAgents.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={fetchAgents}
            disabled={loading}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      )}

      {/* Agent cards */}
      {knownAgents.map((id) => {
        const agent = agents[id];
        const isOwner = walletAddress && agent && agent.owner === walletAddress;
        return (
          <div
            key={id}
            className="rounded-lg border border-gray-800 bg-gray-900/50 p-4"
          >
            {agent === undefined && loading ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
                <span className="text-xs text-gray-500">Fetching {id.slice(0, 8)}...</span>
              </div>
            ) : agent === null ? (
              <p className="text-xs text-gray-500">Unable to fetch agent {id.slice(0, 8)}...</p>
            ) : agent ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">
                    {typeof agent.metadata === "string"
                      ? agent.metadata
                      : agent.metadata instanceof Uint8Array
                        ? new TextDecoder().decode(agent.metadata)
                        : Array.isArray(agent.metadata)
                          ? new TextDecoder().decode(new Uint8Array(agent.metadata as unknown as number[]))
                          : id.slice(0, 8) + "..."}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      agent.active
                        ? "bg-green-900/50 text-green-300"
                        : "bg-red-900/50 text-red-300"
                    }`}
                  >
                    {agent.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>
                    <span className="text-gray-400">Agent:</span>{" "}
                    <span className="font-mono">{id.slice(0, 8)}...{id.slice(-4)}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Owner:</span>{" "}
                    <span className="font-mono">{agent.owner.slice(0, 8)}...{agent.owner.slice(-4)}</span>
                  </p>
                </div>
                {isOwner && agent.active && onDeactivate && (
                  <div className="pt-2 border-t border-gray-800">
                    <button
                      onClick={() => handleDeactivate(id)}
                      disabled={deactivating === id}
                      className="rounded bg-red-900/30 border border-red-800 px-3 py-1 text-xs text-red-300 transition hover:bg-red-900/50 disabled:opacity-50"
                    >
                      {deactivating === id ? "Deactivating..." : "Deactivate"}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
