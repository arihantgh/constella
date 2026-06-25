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
  CONTRACT_IDS: string;
  POLL_INTERVAL_MS: string;
}

// ── KV-backed cursor tracking ────────────────────────────────
// Stores the last successfully polled ledger so we can resume
// from where we left off instead of re-fetching old events.

const CURSOR_KEY = "last_ledger_cursor";
const BACKOFF_KEY = "backoff_until";

async function getCursor(env: Env): Promise<number> {
  const doId = env.EventRoom.idFromName("cursor");
  const stub = env.EventRoom.get(doId);
  const res = await stub.fetch("http://dummy/cursor", {
    method: "GET",
  });
  const data: any = await res.json();
  return data?.cursor || 0;
}

async function setCursor(env: Env, ledger: number): Promise<void> {
  const doId = env.EventRoom.idFromName("cursor");
  const stub = env.EventRoom.get(doId);
  await stub.fetch("http://dummy/cursor", {
    method: "POST",
    body: JSON.stringify({ cursor: ledger }),
  });
}

async function rpcFetch(
  env: Env,
  method: string,
  params: Record<string, any>,
): Promise<any> {
  const res = await fetch(env.RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  if (!res.ok) {
    throw new Error(`RPC ${method} returned ${res.status}`);
  }
  return res.json();
}

// ── Worker ────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const id = env.EventRoom.idFromName("global");
      const stub = env.EventRoom.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === "/health") {
      return new Response("OK", { headers: { "Content-Type": "text/plain" } });
    }

    return new Response("Not Found", { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const contractIds =
      env.CONTRACT_IDS?.split(",").map((s) => s.trim()).filter(Boolean) || [];

    if (contractIds.length === 0) return;

    // Check if we're in a backoff period after a failure
    try {
      const backoffData: any = await rpcFetch(env, "getLatestLedger", {});
      const latestLedger = backoffData?.result?.sequence;
      if (!latestLedger) return;

      // Get cursor (last successfully polled ledger)
      const cursor = await getCursor(env);
      const startLedger = cursor > 0 ? cursor + 1 : Math.max(1, latestLedger - 10);

      if (startLedger >= latestLedger) return; // nothing new

      const allEvents: SorobanEvent[] = [];

      for (const contractId of contractIds) {
        try {
          const eventsData = await rpcFetch(env, "getEvents", {
            startLedger,
            filters: [
              {
                contractIds: [contractId],
                type: "contract",
              },
            ],
            pagination: { limit: 100 },
          });

          const events = eventsData?.result?.events || [];
          for (const event of events) {
            allEvents.push(normalizeEvent(event, contractId));
          }
        } catch (err) {
          // Per-contract failures don't block others
        }
      }

      if (allEvents.length > 0) {
        const doId = env.EventRoom.idFromName("global");
        const stub = env.EventRoom.get(doId);
        await stub.fetch("http://dummy/broadcast", {
          method: "POST",
          body: JSON.stringify({
            events: allEvents,
            lastLedger: latestLedger,
          }),
        });
      }

      // Advance cursor to latest ledger on success
      await setCursor(env, latestLedger);
    } catch {
      // Polling failed; silent retry on next cron cycle.
      // The cursor stays put so we retry from the same position.
    }
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
