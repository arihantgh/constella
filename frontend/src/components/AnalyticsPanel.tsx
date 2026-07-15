"use client";

import { useMemo } from "react";
import { useEventFeed } from "@/hooks/useEventFeed";

function useKnownAgentCount() {
  if (typeof window === "undefined") return 0;
  try {
    const stored = localStorage.getItem("knownAgents");
    return stored ? JSON.parse(stored).length : 0;
  } catch {
    return 0;
  }
}

export function AnalyticsPanel() {
  const { events } = useEventFeed();
  const agentCount = useKnownAgentCount();

  const stats = useMemo(() => {
    const executed = events.filter((e) => e.topic[0] === "pay_exec").length;
    const rejected = events.filter((e) => e.topic[0] === "pay_rejct").length;
    const created = events.filter((e) => e.topic[0] === "pay_creat").length;
    const total = executed + rejected || 1;
    return { executed, rejected, created, successRate: Math.round((executed / total) * 100) };
  }, [events]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <h3 className="mb-4 text-lg font-semibold">Analytics</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-800/50 p-3">
          <p className="text-xs text-gray-400">Payments Created</p>
          <p className="text-xl font-semibold text-white">{stats.created}</p>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-3">
          <p className="text-xs text-gray-400">Payments Executed</p>
          <p className="text-xl font-semibold text-green-400">{stats.executed}</p>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-3">
          <p className="text-xs text-gray-400">Success Rate</p>
          <p className="text-xl font-semibold text-blue-400">{stats.successRate}%</p>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-3">
          <p className="text-xs text-gray-400">Tracked Agents</p>
          <p className="text-xl font-semibold text-white">{agentCount}</p>
        </div>
      </div>
    </div>
  );
}
