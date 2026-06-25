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

See the full guide at [`docs/running-and-deploying.md`](docs/running-and-deploying.md) for detailed steps covering local dev, Testnet deployment, Cloudflare Workers, and production.

```bash
# ── 1. Build & test contracts ─────────────────────────
cd contracts
cargo build --release --target wasm32v1-none
cargo test                                    # 21 tests

# ── 2. Install & run frontend ─────────────────────────
cd ../frontend
npm install
cp .env.example .env.local                    # edit with contract IDs
npm run dev                                   # http://localhost:3000

# ── 3. Deploy to Testnet ──────────────────────────────
cd ../scripts
./deploy.sh --source-account <YOUR_PUBLIC_KEY> # writes contracts.json

# ── 4. Run agent simulator ────────────────────────────
node simulate.mjs --secret <SECRET> --profile aggressive

# ── 5. Set up event relay ─────────────────────────────
cd ../relay
npm install
cp .env.example .dev.vars                      # edit CONTRACT_IDS
npx wrangler dev                               # http://localhost:8787
```

## Project Structure

```
constella/
├── .github/workflows/
│   ├── ci.yml                # Contracts + frontend + e2e
│   ├── deploy.yml            # Manual contract redeploy
│   └── contract-tests.yml    # Legacy (superseded by ci.yml)
├── contracts/
│   ├── agent-registry/       # Agent identity contract
│   ├── budget-policy/        # Budget enforcement contract
│   └── payment/              # Payment escrow contract
├── docs/
│   ├── architecture.md       # Contract interface reference
│   ├── demo-script.md        # Narrated walkthrough
│   └── running-and-deploying.md  # <-- Full setup guide
├── frontend/                 # Next.js dashboard
│   ├── vercel.json           # Vercel deployment config
│   └── src/
│       ├── app/              # Pages + layout
│       ├── components/       # AgentForm, BudgetForm, PaymentFeed, etc.
│       ├── hooks/            # useWallet, useEventFeed
│       └── lib/              # soroban.ts, config, types, constants
├── relay/                    # Cloudflare Workers event relay
│   ├── wrangler.toml         # Worker + DO + cron config
│   └── src/
│       ├── index.ts          # Worker (cron poller + WS handler)
│       ├── logger.ts         # Structured JSON logger
│       └── types.ts
├── scripts/
│   ├── deploy.sh             # Testnet deployment
│   ├── simulate.sh           # Agent simulator (bash wrapper)
│   └── simulate.mjs          # Agent simulator (Node.js)
└── README.md
```

## Deployed Contracts (Testnet)

All three contracts are deployed to Stellar Testnet and can be viewed on [Stellar Expert](https://stellar.expert/explorer/testnet/) or the [Stellar Lab](https://lab.stellar.org/).

| Contract | Address | Stellar Expert | Deploy TX |
|---|---|---|---|
| **Agent Registry** | `CCGU7AL3TEY4437642KZ35VRKDGI3HLVNIGA2MRI4X3ADNUVD4SGSWPR` | [View](https://stellar.expert/explorer/testnet/contract/CCGU7AL3TEY4437642KZ35VRKDGI3HLVNIGA2MRI4X3ADNUVD4SGSWPR) | [`430d8f60...`](https://stellar.expert/explorer/testnet/tx/430d8f60990757cc961080b9268dbcc6b0d4ad0b272eb6c81bb1a29ac27a9df2) |
| **Budget Policy** | `CCXOG3GGOPRPWX2ICTNOT6EVE73YPLC6SVQJNIY4KKXF5IMDT6ONFODA` | [View](https://stellar.expert/explorer/testnet/contract/CCXOG3GGOPRPWX2ICTNOT6EVE73YPLC6SVQJNIY4KKXF5IMDT6ONFODA) | [`af35d9c5...`](https://stellar.expert/explorer/testnet/tx/af35d9c516e932c1d4746adefbc935ae53594a7898fa8e06e3092d9aa88cc970) |
| **Payment** | `CA6LGV5R6R4YLBXCEZM5D5FZJBOOH3UHR3OCHRPDTJPAMY3MUZQLCHKJ` | [View](https://stellar.expert/explorer/testnet/contract/CA6LGV5R6R4YLBXCEZM5D5FZJBOOH3UHR3OCHRPDTJPAMY3MUZQLCHKJ) | [`4e706ffe...`](https://stellar.expert/explorer/testnet/tx/4e706ffe5e2d9f062531994839088694f02c8b028727270e900dca5f47c522f9) |

These addresses are also written to `scripts/contracts.json`. To use them locally, copy them into `frontend/.env.local`:

```
NEXT_PUBLIC_AGENT_REGISTRY_ID=CCGU7AL3TEY4437642KZ35VRKDGI3HLVNIGA2MRI4X3ADNUVD4SGSWPR
NEXT_PUBLIC_BUDGET_POLICY_ID=CCXOG3GGOPRPWX2ICTNOT6EVE73YPLC6SVQJNIY4KKXF5IMDT6ONFODA
NEXT_PUBLIC_PAYMENT_ID=CA6LGV5R6R4YLBXCEZM5D5FZJBOOH3UHR3OCHRPDTJPAMY3MUZQLCHKJ
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
