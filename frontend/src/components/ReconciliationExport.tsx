"use client";

import { useEventFeed } from "@/hooks/useEventFeed";

function escapeCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ReconciliationExport() {
  const { events } = useEventFeed();

  const download = () => {
    const headers = ["timestamp", "event", "contract", "ledger", "tx_hash"];
    const rows = events.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.topic[0] || "",
      e.contract_id,
      String(e.ledger),
      e.tx_hash,
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `constella-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={download}
      disabled={events.length === 0}
      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 disabled:opacity-50"
    >
      Download Reconciliation CSV
    </button>
  );
}
