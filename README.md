# constella

**Autonomous AI agent payment system on the Stellar network via Soroban smart contracts.**

Agents register on-chain, get assigned budgets, and execute peer-to-peer payments autonomously. A dashboard provides wallet-connected management, and an event relay streams live on-chain activity to the UI.

## Architecture

```
                   ┌─────────────┐
                   │   Freighter  │  (browser wallet)
                   └──────┬──────┘
                          │
              ┌───────────┴───────────┐
              │   Next.js Dashboard   │  frontend/
              │  (agents, budgets,    │
              │   payments, live feed)│
              └───────────┬───────────┘
                          │
              ┌───────────┴───────────┐
              │  Soroban RPC (Testnet)│
              └───┬───────┬───────┬───┘
                  │       │       │
        ┌─────────┘       │       └─────────┐
        ▼                 ▼                 ▼
  ┌────────────┐  ┌──────────────┐  ┌────────────┐
  │   Agent    │  │   Budget     │  │  Payment   │
  │  Registry  │  │   Policy     │  │  Escrow    │
  └────────────┘  └──────────────┘  └────────────┘

              ┌───────────────────────┐
              │  Event Relay (Worker) │  relay/
              │  polls RPC → WS fanout│
              └───────────────────────┘
```

### Smart Contracts (`contracts/`)

| Contract | Description |
|----------|-------------|
| **Agent Registry** | Register, lookup, and deactivate agent identities. Emits events on registration/deactivation. |
| **Budget Policy** | Per-agent budgets with per-tx and daily limits. `check_and_reserve` atomically checks limits and reserves spend. |
| **Payment** | Creates, executes, and refunds agent-to-agent payments. Validates agent activity (via Registry), checks budget (via Policy), then transfers tokens via the Stellar Asset Contract. |

### Frontend (`frontend/`)

Next.js 15 (App Router) dashboard with:
- **Freighter wallet** connect/disconnect (Testnet‑only)
- **Agent management** — register new agents, view registered agents with live status
- **Budget configuration** — set per-tx and daily limits for each agent
- **Payment creation** — create agent-to-agent payments
- **Live event feed** — WebSocket connection to the relay shows on-chain events in real time

### Relay (`relay/`)

Cloudflare Worker + Durable Object that polls Soroban RPC for contract events (cron: every 30s) and broadcasts them to connected WebSocket clients.

### Scripts (`scripts/`)

- **`deploy.sh`** — builds all contracts and deploys them to Stellar Testnet
- **`simulate.sh`** / **`simulate.mjs`** — agent simulator that creates two agents, sets budgets, and fires periodic payments

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Rust | stable (wasm32v1-none target) | Build Soroban contracts |
| Soroban CLI | latest | Deploy contracts to network |
| Node.js | 20+ | Frontend + scripts |
| npm | 10+ | Package management |
| Freighter | browser extension | Sign transactions (frontend) |

## Quick Start

### 1. Build and test contracts

```bash
cd contracts

# Install wasm target
rustup target add wasm32v1-none

# Build all contracts
cargo build --release --target wasm32v1-none

# Run all tests (21 total)
cargo test
```

### 2. Set up the frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 3. Deploy to Testnet

```bash
# Build WASM artifacts first
cd contracts && cargo build --release --target wasm32v1-none

# Deploy (requires a funded Testnet account)
cd ..
./scripts/deploy.sh --source-account <YOUR_PUBLIC_KEY>
```

The deploy script writes contract addresses to `scripts/contracts.json`.

### 4. Run the agent simulator

```bash
# Copy contracts.json from deployment step or provide addresses manually
node scripts/simulate.mjs \
  --secret <DEPLOYER_KEYPAIR_SECRET> \
  --interval 30
```

### 5. Set up the event relay

```bash
cd relay
npm install
# Update wrangler.toml with your contract IDs
npx wrangler dev
```

## Project Structure

```
constella/
├── .github/workflows/
│   ├── contract-tests.yml    # Runs tests on push
│   └── deploy.yml            # Manual contract redeploy
├── contracts/
│   ├── agent-registry/       # Agent identity contract
│   ├── budget-policy/        # Budget enforcement contract
│   └── payment/              # Payment escrow contract
├── frontend/                 # Next.js dashboard
│   └── src/
│       ├── app/              # Pages + layout
│       ├── components/       # AgentForm, BudgetForm, PaymentFeed, etc.
│       ├── hooks/            # useWallet, useEventFeed
│       └── lib/              # soroban.ts, config, types, constants
├── relay/                    # Cloudflare Workers event relay
│   └── src/
│       ├── index.ts          # Worker (cron poller + WS handler)
│       ├── eventRoom.ts      # Durable Object (WS fan-out)
│       └── types.ts
├── scripts/
│   ├── deploy.sh             # Testnet deployment
│   ├── simulate.sh           # Agent simulator (bash wrapper)
│   └── simulate.mjs          # Agent simulator (Node.js)
└── README.md
```

## Contract Details

### Agent Registry

- `register_agent(agent, owner, metadata)` — register a new agent
- `get_agent(agent)` — lookup agent details
- `deactivate_agent(agent, caller)` — deactivate an agent (caller must be owner)
- `is_active(agent)` — check if agent is active

### Budget Policy

- `set_budget(agent, owner, per_tx_limit, daily_limit)` — configure or update budget
- `check_and_reserve(agent, amount)` — check limits and reserve spend (returns bool)
- `get_budget(agent)` — get current budget state

### Payment

- `create_payment(from, to, amount, token, task_ref)` — create a payment record
- `execute_payment(payment_id, registry_id, policy_id, token_id)` — execute (validates + transfers)
- `refund_payment(payment_id, caller)` — refund an executed payment
- `get_payment(payment_id)` — get payment status

## License

MIT
