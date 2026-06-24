"use client";

import type { AgentInfo } from "@/lib/types";
import { queryAgent } from "@/lib/soroban";
import { useEffect, useState, useCallback } from "react";

interface Props {
  knownAgents: string[];
  onRefresh?: () => void;
}

export function AgentList({ knownAgents, onRefresh }: Props) {
  const [agents, setAgents] = useState<Record<string, AgentInfo | null>>({});
  const [loading, setLoading] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const results: Record<string, AgentInfo | null> = {};
    await Promise.all(
      knownAgents.map(async (id) => {
        results[id] = await queryAgent(id);
      }),
    );
    setAgents(results);
    setLoading(false);
  }, [knownAgents]);

  useEffect(() => {
    if (knownAgents.length > 0) fetchAgents();
  }, [knownAgents, fetchAgents]);

  if (knownAgents.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No agents registered yet. Use the form above to register your first agent.
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      {knownAgents.map((id) => {
        const agent = agents[id];
        return (
          <div
            key={id}
            className="rounded-lg border border-gray-800 bg-gray-900/50 p-4"
          >
            {agent === null && !loading ? (
              <p className="text-xs text-gray-500">Unable to fetch agent {id.slice(0, 8)}...</p>
            ) : !agent && loading ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            ) : agent ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">
                    {agent.metadata
                      ? String(agent.metadata)
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
                    {id.slice(0, 8)}...{id.slice(-4)}
                  </p>
                  <p>
                    <span className="text-gray-400">Owner:</span>{" "}
                    {agent.owner.slice(0, 8)}...{agent.owner.slice(-4)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
