"use client";

import { useState, useMemo } from "react";
import { useEventFeed, type SorobanEvent } from "@/hooks/useEventFeed";

function eventLabel(event: SorobanEvent): string {
  const topic = event.topic[1] || event.topic[0] || "";
  if (typeof topic === "string") return `#${topic.slice(0, 8)}`;
  if (typeof topic === "number") return `#${topic}`;
  return "";
}

function eventSummary(event: SorobanEvent): string {
  const name = event.topic[0] || "";
  if (typeof name !== "string") return "Event";

  const labels: Record<string, string> = {
    pay_creat: "Payment Created",
    pay_exec: "Payment Executed",
    pay_refnd: "Payment Refunded",
    pay_rejct: "Payment Rejected",
    bdgt_res: "Budget Reserved",
    agent_reg: "Agent Registered",
    policy_up: "Budget Updated",
  };

  return labels[name] || name;
}

function eventColor(event: SorobanEvent): string {
  const name = event.topic[0] || "";
  if (name === "pay_exec") return "border-green-700 bg-green-900/20";
  if (name === "pay_rejct") return "border-red-700 bg-red-900/20";
  if (name === "pay_creat") return "border-blue-700 bg-blue-900/20";
  if (name === "pay_refnd") return "border-yellow-700 bg-yellow-900/20";
  return "border-gray-700 bg-gray-900/30";
}

export function PaymentFeed() {
  const { events, connected, reconnect } = useEventFeed();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const lastEventAt = events.length > 0 ? events[0].timestamp : null;

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesType = filter === "all" || e.topic[0] === filter;
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        e.tx_hash.toLowerCase().includes(term) ||
        e.contract_id.toLowerCase().includes(term) ||
        eventSummary(e).toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [events, filter, search]);

  return (
    <div className="space-y-3">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "Connected" : "Disconnected"}
          </span>
          {lastEventAt && (
            <span className="text-xs text-gray-500">
              · Last event {new Date(lastEventAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        {!connected && (
          <button
            onClick={reconnect}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All events</option>
          <option value="pay_creat">Created</option>
          <option value="pay_exec">Executed</option>
          <option value="pay_rejct">Rejected</option>
          <option value="pay_refnd">Refunded</option>
          <option value="agent_reg">Agent Reg.</option>
          <option value="policy_up">Budget Upd.</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tx, contract, or event..."
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Event list */}
      {filteredEvents.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No events yet. Events will appear here as they happen on-chain.
        </div>
      ) : (
        <div className="max-h-[600px] space-y-2 overflow-y-auto">
          {filteredEvents.map((event, i) => (
            <div
              key={`${event.tx_hash}-${i}`}
              className={`rounded-lg border-l-4 px-4 py-3 ${eventColor(event)}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">
                  {eventSummary(event)}
                </span>
                <span className="text-xs text-gray-500">
                  {eventLabel(event)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                <span>
                  {event.contract_id.slice(0, 6)}...
                  {event.contract_id.slice(-4)}
                </span>
                <span>Ledger {event.ledger}</span>
                <span className="truncate">{event.tx_hash.slice(0, 12)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
