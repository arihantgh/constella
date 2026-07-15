"use client";

import { useEffect, useState } from "react";
import { getDebugLog, clearDebugLog, type DebugEntry } from "@/lib/tx-debug-log";

function statusColor(status: DebugEntry["status"]) {
  return status === "success" ? "text-green-400" : "text-red-400";
}

export function TxDebugLog() {
  const [logs, setLogs] = useState<DebugEntry[]>([]);

  const refresh = () => setLogs(getDebugLog());

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Transaction Debug Log</h3>
        {logs.length > 0 && (
          <button
            onClick={() => { clearDebugLog(); refresh(); }}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>
      {logs.length === 0 ? (
        <p className="text-xs text-gray-500">No transaction errors logged yet.</p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
          {logs.map((log) => (
            <li key={log.id} className="rounded bg-gray-800/50 p-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-300">{log.action}</span>
                <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className={`mt-1 ${statusColor(log.status)}`}>{log.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
