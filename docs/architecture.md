# Architecture

## System Overview

```
┌───────────────────┐    Soroban RPC    ┌─────────────────────────────┐
│  Next.js Frontend  │◄─────────────────│   Stellar Testnet Network    │
│  (Freighter Wallet) │                  │  ┌─────────────────────────┐│
│                     │                  │  │  Agent Registry         ││
│  Agents  Budgets    │                  │  │  Budget Policy          ││
│  Payments  Feed     │                  │  │  Payment/Escrow         ││
│                     │                  │  └─────────────────────────┘│
└────────┬────────────┘                  └─────────────────────────────┘
         │ WS
         ▼
┌───────────────────┐
│  Event Relay       │  Cloudflare Worker + Durable Object
│  (polls getEvents  │
│   → WS broadcast)  │
└───────────────────┘
```

## Smart Contracts

### Agent Registry

Contracts the identity layer for autonomous agents.

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `register_agent` | `(agent_id: Address, owner: Address, metadata: Bytes)` | `bool` | Registers a new agent under the owner's control |
| `deactivate_agent` | `(agent_id: Address, caller: Address)` | — | Deactivates an agent (caller must be owner) |
| `is_active` | `(agent_id: Address)` | `bool` | Returns whether the agent is currently active |
| `get_agent` | `(agent_id: Address)` | `AgentInfo` | Returns full agent record |

**Structs**

```rust
pub struct AgentInfo {
    pub agent_id: Address,
    pub owner: Address,
    pub metadata: Bytes,
    pub active: bool,
    pub created_at: u64,
}
```

**Events**

| Topic | Data | Fired |
|-------|------|-------|
| `agent_reg` | `(owner, metadata)` | On `register_agent` |
| `agent_dea` | — | On `deactivate_agent` |

### Budget Policy

Enforces per-agent spending limits — the core guardrail that prevents agents from overspending.

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `set_budget` | `(agent_id, owner, per_tx_limit, daily_limit)` | — | Configure or update an agent's budget |
| `check_and_reserve` | `(agent_id, amount)` | `bool` | Check limits and atomically reserve spend |
| `get_budget` | `(agent_id)` | `Budget` | Get current budget state |

**Structs**

```rust
pub struct Budget {
    pub agent_id: Address,
    pub per_tx_limit: i128,
    pub daily_limit: i128,
    pub spent_today: i128,
    pub day_window_start: u64,
}
```

**Logic flow for `check_and_reserve`**:

1. Reject if `amount > per_tx_limit`
2. If the day window has passed (86400s), reset `spent_today` to 0
3. Reject if `spent_today + amount > daily_limit`
4. Otherwise, add `amount` to `spent_today`, persist, return `true`

**Events**

| Topic | Data | Fired |
|-------|------|-------|
| `bdgt_set` | `(per_tx_limit, daily_limit)` | On `set_budget` |
| `bdgt_res` | `(amount, spent_today)` | On successful `check_and_reserve` |
| `bdgt_exc` | `(attempted, limit)` | On budget limit exceeded |

### Payment / Escrow

Orchestrates the agent-to-agent payment flow with cross-contract validation.

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `create_payment` | `(from_agent, to_agent, amount, token, task_ref)` | `u64` | Create a new payment record |
| `execute_payment` | `(payment_id, agent_registry_id, budget_policy_id, token_id)` | `bool` | Validate and execute payment |
| `refund_payment` | `(payment_id, caller)` | `bool` | Refund an executed payment |
| `get_payment` | `(payment_id)` | `PaymentRecord` | Get payment status |

**Structs**

```rust
pub struct PaymentRecord {
    pub id: u64,
    pub from_agent: Address,
    pub to_agent: Address,
    pub amount: i128,
    pub token: Address,
    pub task_ref: Bytes,
    pub status: PaymentStatus,  // Pending | Executed | Refunded | Rejected
    pub created_at: u64,
}
```

**`execute_payment` call chain**

```
  execute_payment(payment_id)
    ├── is_active(from_agent)    → Agent Registry (cross-contract)
    ├── is_active(to_agent)      → Agent Registry (cross-contract)
    ├── check_and_reserve(amount)→ Budget Policy  (cross-contract)
    └── token.transfer(from, to, amount)  → Stellar Asset Contract
```

All calls are atomic — if any sub-call fails, the entire transaction reverts.

**Events**

| Topic | Data | Fired |
|-------|------|-------|
| `pay_creat` | `(from, to, amount)` | On `create_payment` |
| `pay_exec` | `(from, to, amount)` | On successful execution |
| `pay_rejct` | `(reason, detail)` | On validation failure |
| `pay_refnd` | `(from, to, amount)` | On refund |

## Frontend

### Component Tree

```
Home (page.tsx)
├── Header (wallet connect/disconnect + status)
├── ErrorBoundary (per-tab)
│   ├── Agents tab
│   │   ├── AgentRegistrationForm
│   │   └── AgentList
│   ├── Budgets tab
│   │   └── BudgetForm
│   └── Payments tab
│       ├── PaymentForm
│       └── PaymentFeed
└── WalletGuard (wraps contract-interaction forms)
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useWallet` | Freighter connect/disconnect, signAndSend, network detection |
| `useEventFeed` | WebSocket connection to relay, auto-reconnect, event buffer |

### Data Flow

1. User connects Freighter → `useWallet.connect()` verifies Testnet
2. User fills form and clicks submit → `buildWriteTx()` constructs the XDR
3. Freighter signs the transaction → `signAndSend()` submits to Soroban RPC
4. Contract processes the call and emits an event
5. Relay polls `getEvents` → broadcasts via WebSocket Durable Object
6. `useEventFeed` receives the event → `PaymentFeed` updates in real time

## Relay

| Component | Purpose |
|-----------|---------|
| `index.ts` (Worker) | Cron trigger (30s), POST event ingestion, WS upgrade handler |
| `eventRoom.ts` (Durable Object) | Manages WebSocket connections, broadcasts new events to all clients |
| `types.ts` | Event type definitions and decoders |

## Inter-Contract Dependencies

```
Payment.contractimport!("agent_registry.wasm")
Payment.contractimport!("budget_policy.wasm")
```

The Payment contract imports compiled WASM of the other two contracts at build time. During `execute_payment`, it creates contract clients using the deployed contract IDs passed as arguments and calls `is_active` / `check_and_reserve` via cross-contract invocation.
