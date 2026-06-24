"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface SorobanEvent {
  type: string;
  contract_id: string;
  topic: string[];
  data: any;
  ledger: number;
  tx_hash: string;
  timestamp: string;
}

const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || "ws://localhost:8787";

export function useEventFeed() {
  const [events, setEvents] = useState<SorobanEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(RELAY_URL);

      ws.onopen = () => setConnected(true);

      ws.onmessage = (msg) => {
        try {
          const parsed: SorobanEvent[] = JSON.parse(msg.data);
          setEvents((prev) => [...parsed, ...prev].slice(0, 200));
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Auto-reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    } catch {
      // WebSocket not supported or relay unreachable
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return { events, connected, reconnect: connect };
}
