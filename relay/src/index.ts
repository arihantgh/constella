/**
 * constella relay — Soroban event polling + WebSocket fan-out.
 *
 * Fetches events from a Soroban RPC endpoint and pushes them
 * to connected clients via Durable Object WebSockets.
 */

import type { SorobanEvent } from "./types";

interface Env {
  EventRoom: DurableObjectNamespace;
  RPC_URL: string;
  CONTRACT_IDS: string; // comma-separated
  POLL_INTERVAL_MS: string;
}

// ── Worker ────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket connections are routed to the Durable Object
    if (url.pathname === "/ws") {
      const id = env.EventRoom.idFromName("global");
      const stub = env.EventRoom.get(id);
      return stub.fetch(request);
    }

    // GET /health — health check
    if (url.pathname === "/health") {
      return new Response("OK", { headers: { "Content-Type": "text/plain" } });
    }

    return new Response("Not Found", { status: 404 });
  },

  /**
   * Cron trigger (every 30s) — polls Soroban for new events
   * and pushes them to the Durable Object for broadcast.
   */
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const contractIds = env.CONTRACT_IDS?.split(",").map((s) => s.trim()).filter(Boolean) || [];

    // Get latest ledger
    const ledgerRes = await fetch(env.RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestLedger",
        params: {},
      }),
    });
    const ledgerData: any = await ledgerRes.json();
    const latestLedger = ledgerData?.result?.sequence;
    if (!latestLedger) return;

    // Get events for each contract
    const allEvents: SorobanEvent[] = [];

    for (const contractId of contractIds) {
      const eventsRes = await fetch(env.RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getEvents",
          params: {
            startLedger: Math.max(1, latestLedger - 10),
            filters: [
              {
                contractIds: [contractId],
                type: "contract",
              },
            ],
            pagination: { limit: 100 },
          },
        }),
      });
      const eventsData: any = await eventsRes.json();
      const events = eventsData?.result?.events || [];

      for (const event of events) {
        allEvents.push(normalizeEvent(event, contractId));
      }
    }

    if (allEvents.length === 0) return;

    // Push to Durable Object for broadcast
    const doId = env.EventRoom.idFromName("global");
    const stub = env.EventRoom.get(doId);
    await stub.fetch("http://dummy/broadcast", {
      method: "POST",
      body: JSON.stringify({
        events: allEvents,
        lastLedger: latestLedger,
      }),
    });
  },
};

// ── Helpers ───────────────────────────────────────────────────

function normalizeEvent(raw: any, contractId: string): SorobanEvent {
  return {
    type: raw.type || "contract",
    contract_id: contractId,
    topic: raw.topic || [],
    data: raw.value || raw.body || null,
    ledger: raw.ledger || 0,
    tx_hash: raw.txHash || "",
    timestamp: new Date().toISOString(),
  };
}

// ── Type exports for the client ──────────────────────────────

export type { SorobanEvent };
