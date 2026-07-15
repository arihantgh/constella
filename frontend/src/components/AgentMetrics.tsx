"use client";

import { useEventFeed } from "@/hooks/useEventFeed";

interface Props {
  knownAgents: string[];
}

export function AgentMetrics({ knownAgents }: Props) {
  const { events } = useEventFeed();
  const executed = events.filter((e) => e.topic[0] === "pay_exec").length;
  const rejected = events.filter((e) => e.topic[0] === "pay_rejct").length;
  const total = executed + rejected || 1;
  const successRate = Math.round((executed / total) * 100);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-200">Agent Metrics</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-800/50 p-2">
          <p className="text-xs text-gray-400">Tracked Agents</p>
          <p className="text-lg font-semibold text-white">{knownAgents.length}</p>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-2">
          <p className="text-xs text-gray-400">Payments Made</p>
          <p className="text-lg font-semibold text-white">{executed}</p>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-2">
          <p className="text-xs text-gray-400">Success Rate</p>
          <p className="text-lg font-semibold text-green-400">{successRate}%</p>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-2">
          <p className="text-xs text-gray-400">Rejected</p>
          <p className="text-lg font-semibold text-red-400">{rejected}</p>
        </div>
      </div>
    </div>
  );
}
