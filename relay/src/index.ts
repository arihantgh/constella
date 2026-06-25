/**
 * constella relay — Soroban event polling + WebSocket fan-out.
 *
 * Fetches events from a Soroban RPC endpoint and pushes them
 * to connected clients via Durable Object WebSockets.
 *
 * FR4.3 — Rate limiting on WS connections
 * FR4.4 — /health endpoint with full status
 * FR10.3 — Structured logging (no console.log)
 * FR10.4 — RPC backoff and rate limiting
 */

import type { SorobanEvent } from "./types";
import { logger } from "./logger";

interface Env {
  EventRoom: DurableObjectNamespace;
  RPC_URL: string;
  CONTRACT_IDS: string;
  POLL_INTERVAL_MS: string;
  RELAY_VERSION?: string;
}

const CURSOR_KEY = "last_ledger_cursor";
const BACKOFF_KEY = "backoff_until";
const START_EPOCH = Date.now();
const MAX_CONCURRENT_WS_PER_IP = 5;

// ── Durable Object: cursor tracking + WS fan-out ──────────────

export class EventRoom {
  private state: DurableObjectState;
  private connections: Map<string, WebSocket> = new Map();
  private connectionCounts: Map<string, number> = new Map(); // ip → count

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";

    // ── WebSocket upgrade ─────────────────────────────
    if (url.pathname === "/ws") {
      const current = this.connectionCounts.get(ip) || 0;
      if (current >= MAX_CONCURRENT_WS_PER_IP) {
        logger.warn("rate_limit_exceeded", { ip, current });
        return new Response("Too many connections", { status: 429 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);
      const connId = crypto.randomUUID();
      this.connections.set(connId, server);
      this.connectionCounts.set(ip, current + 1);

      logger.info("ws_connected", { connId, ip, total: this.connections.size });

      // Clean up on close
      server.addEventListener("close", () => {
        this.connections.delete(connId);
        const updated = (this.connectionCounts.get(ip) || 1) - 1;
        if (updated <= 0) {
          this.connectionCounts.delete(ip);
        } else {
          this.connectionCounts.set(ip, updated);
        }
        logger.info("ws_disconnected", { connId, total: this.connections.size });
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // ── Cursor get/set ────────────────────────────────
    if (url.pathname === "/cursor") {
      if (request.method === "POST") {
        const body: any = await request.json();
        await this.state.storage.put(CURSOR_KEY, body.cursor);
        return new Response("OK");
      }
      const cursor: number = (await this.state.storage.get(CURSOR_KEY)) || 0;
      return new Response(JSON.stringify({ cursor }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Broadcast events to all connected clients ──────
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const body: any = await request.json();
      const { events, lastLedger } = body;
      const msg = JSON.stringify({ type: "events", events, cursor: lastLedger });

      let sent = 0;
      let failed = 0;
      for (const [connId, ws] of this.connections) {
        try {
          ws.send(msg);
          sent++;
        } catch {
          this.connections.delete(connId);
          failed++;
        }
      }
      logger.info("broadcast", { sent, failed, eventCount: events?.length });
      return new Response("OK");
    }

    // ── Health check for the DO ────────────────────────
    if (url.pathname === "/do-health") {
      const cursor: number = (await this.state.storage.get(CURSOR_KEY)) || 0;
      return new Response(
        JSON.stringify({
          ok: true,
          connections: this.connections.size,
          cursor,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("Not Found", { status: 404 });
  }
}

// ── Worker ────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── Health endpoint ────────────────────────────────
    if (url.pathname === "/health") {
      const doId = env.EventRoom.idFromName("cursor");
      const stub = env.EventRoom.get(doId);
      let doHealth = { ok: true, connections: 0, cursor: 0 };
      try {
        const res = await stub.fetch("http://dummy/do-health");
        doHealth = await res.json();
      } catch {
        doHealth = { ok: false, connections: 0, cursor: 0 };
      }

      return new Response(
        JSON.stringify({
          status: doHealth.ok ? "healthy" : "degraded",
          version: env.RELAY_VERSION || "1.0.0",
          uptimeMs: Date.now() - START_EPOCH,
          cursor: doHealth.cursor,
          connectedClients: doHealth.connections,
          contractCount: env.CONTRACT_IDS?.split(",").filter(Boolean).length || 0,
          pollIntervalMs: parseInt(env.POLL_INTERVAL_MS || "30000", 10),
        }),
        {
          status: doHealth.ok ? 200 : 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // ── WebSocket upgrade ──────────────────────────────
    if (url.pathname === "/ws") {
      const id = env.EventRoom.idFromName("global");
      const stub = env.EventRoom.get(id);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const contractIds =
      env.CONTRACT_IDS?.split(",").map((s) => s.trim()).filter(Boolean) || [];

    if (contractIds.length === 0) {
      logger.debug("poll_skip", { reason: "no_contracts_configured" });
      return;
    }

    // ── Check backoff ─────────────────────────────────
    let backoffUntil = 0;
    try {
      const doId = env.EventRoom.idFromName("cursor");
      const stub = env.EventRoom.get(doId);
      const d = await stub.fetch("http://dummy/cursor");
      const data: any = await d.json();
      backoffUntil = data?.backoffUntil || 0;
    } catch {
      // fall through
    }

    if (backoffUntil > Date.now()) {
      logger.debug("poll_backoff", { backoffUntil });
      return;
    }

    try {
      // ── Get latest ledger ────────────────────────────
      const ledgerData: any = await rpcFetch(env, "getLatestLedger", {});
      const latestLedger = ledgerData?.result?.sequence;
      if (!latestLedger) {
        logger.warn("poll_no_ledger");
        return;
      }

      // ── Get cursor ───────────────────────────────────
      const cursor = await getCursor(env);

      if (cursor >= latestLedger) {
        // Nothing new — poll stale check
        logger.debug("poll_stale", { cursor, latestLedger });
        return;
      }

      const startLedger = cursor > 0 ? cursor + 1 : Math.max(1, latestLedger - 10);
      const allEvents: SorobanEvent[] = [];
      let pollErrors = 0;

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
          pollErrors++;
          logger.error("poll_contract_error", {
            contractId,
            error: err instanceof Error ? err.message : String(err),
          });
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

      // ── Advance cursor ───────────────────────────────
      await setCursor(env, latestLedger);

      // ── Clear backoff on success ─────────────────────
      await clearBackoff(env);

      logger.info("poll_success", {
        newEvents: allEvents.length,
        cursor: latestLedger,
        pollErrors,
        contracts: contractIds.length,
      });
    } catch (err) {
      // ── Exponential backoff ──────────────────────────
      logger.error("poll_failed", {
        error: err instanceof Error ? err.message : String(err),
      });

      try {
        // Read current backoff, double it, cap at 5 min
        const currentBackoff: number = await getBackoff(env);
        const nextBackoff = Math.min(Math.max(currentBackoff * 2, 5000), 300_000);
        await setBackoff(env, Date.now() + nextBackoff);
        logger.warn("poll_backoff_set", { nextBackoffMs: nextBackoff });
      } catch {
        // don't fail if backoff storage itself errors
      }
    }
  },
};

// ── RPC helper ────────────────────────────────────────────────

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

// ── Cursor helpers ────────────────────────────────────────────

async function getCursor(env: Env): Promise<number> {
  const doId = env.EventRoom.idFromName("cursor");
  const stub = env.EventRoom.get(doId);
  const res = await stub.fetch("http://dummy/cursor");
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

// ── Backoff helpers ───────────────────────────────────────────

async function getBackoff(env: Env): Promise<number> {
  const doId = env.EventRoom.idFromName("cursor");
  const stub = env.EventRoom.get(doId);
  const res = await stub.fetch("http://dummy/cursor");
  const data: any = await res.json();
  return data?.backoffMs || 0;
}

async function setBackoff(env: Env, untilTs: number): Promise<void> {
  const doId = env.EventRoom.idFromName("cursor");
  const stub = env.EventRoom.get(doId);
  await stub.fetch("http://dummy/cursor", {
    method: "POST",
    body: JSON.stringify({ backoffUntil: untilTs }),
  });
}

async function clearBackoff(env: Env): Promise<void> {
  const doId = env.EventRoom.idFromName("cursor");
  const stub = env.EventRoom.get(doId);
  await stub.fetch("http://dummy/cursor", {
    method: "POST",
    body: JSON.stringify({ backoffUntil: 0, backoffMs: 0 }),
  });
}

// ── Event normalization ───────────────────────────────────────

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

export type { SorobanEvent };
