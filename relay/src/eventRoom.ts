/**
 * EventRoom — Durable Object that maintains WebSocket connections,
 * broadcasts Soroban events, and persists the event cursor.
 */

import type { SorobanEvent } from "./types";

interface Env {
  EventRoom: DurableObjectNamespace;
}

export class EventRoom {
  private state: DurableObjectState;
  private sessions: Map<string, WebSocket> = new Map();
  private lastLedger: number = 0;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      const last = await this.state.storage?.get<number>("lastLedger");
      if (last) this.lastLedger = last;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);

      const id = crypto.randomUUID();
      this.sessions.set(id, server);

      server.addEventListener("message", () => {});

      server.addEventListener("close", () => {
        this.sessions.delete(id);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // POST /broadcast — push events to all connected WS clients
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const body: { events: SorobanEvent[]; lastLedger: number } =
        await request.json();

      this.lastLedger = body.lastLedger;
      await this.state.storage?.put("lastLedger", body.lastLedger);

      const message = JSON.stringify(body.events);
      let sent = 0;

      for (const [id, ws] of this.sessions) {
        try {
          ws.send(message);
          sent++;
        } catch {
          this.sessions.delete(id);
        }
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET /cursor — return the current cursor
    if (url.pathname === "/cursor" && request.method === "GET") {
      return new Response(JSON.stringify({ cursor: this.lastLedger }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST /cursor — persist the cursor
    if (url.pathname === "/cursor" && request.method === "POST") {
      const body: { cursor: number } = await request.json();
      this.lastLedger = body.cursor;
      await this.state.storage?.put("lastLedger", body.cursor);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }
}
