# constella

**Autonomous AI agent payment system on the Stellar network via Soroban smart contracts.**

Agents register on-chain, get assigned budgets, and execute peer-to-peer payments autonomously. A dashboard provides wallet-connected management, and an event relay streams live on-chain activity to the UI.

## Demo
<img width="1582" height="1035" alt="Screenshot 2026-06-29 at 12 38 50 PM" src="https://github.com/user-attachments/assets/25ce6a3e-ac82-4650-8bc7-da7f2c535c35" />
<img width="1582" height="1035" alt="Screenshot 2026-06-29 at 12 30 19 PM" src="https://github.com/user-attachments/assets/4afa1f97-6414-423c-9ab9-22877a7b962e" />
<img width="472" height="744" alt="Screenshot 2026-06-29 at 12 28 52 PM" src="https://github.com/user-attachments/assets/9cb94e70-58b1-4e68-96d4-502e1617c562" />
<img width="1582" height="1035" alt="Screenshot 2026-06-29 at 12 28 30 PM" src="https://github.com/user-attachments/assets/6f7ce9bc-b0e5-47fa-8d76-749f7aaba2e9" />
<img width="1582" height="1035" alt="Screenshot 2026-06-29 at 1 38 58 PM" src="https://github.com/user-attachments/assets/3a0337ee-39be-4e4a-b292-ef959402e53c" />
<img width="1582" height="1035" alt="Screenshot 2026-06-29 at 2 25 54 PM" src="https://github.com/user-attachments/assets/dee77127-9a1d-4bf8-a232-648c111e92de" />
<img width="1582" height="1035" alt="Screenshot 2026-06-29 at 2 27 50 PM" src="https://github.com/user-attachments/assets/66f06994-77c8-49ea-bec4-ba8775eef47d" />
<img width="1582" height="1035" alt="Screenshot 2026-06-29 at 2 27 45 PM" src="https://github.com/user-attachments/assets/11986eab-3f09-4459-bcdb-50851c36e6db" />


## Mobile Responsive
<img width="330" height="716" alt="image" src="https://github.com/user-attachments/assets/f3325713-9c96-46f3-abc5-b597e05e79b2" />
<img width="331" height="715" alt="image" src="https://github.com/user-attachments/assets/16897168-60d7-43ba-8b84-c86e5863d284" />
<img width="333" height="716" alt="image" src="https://github.com/user-attachments/assets/db63f9d5-2bf7-4a72-9c01-4a77d7baff30" />

## Pitch Deck
https://docs.google.com/presentation/d/18Rx1JHoFXN1AoS-dSEJ_WXQQwHU9fijN/edit?usp=sharing&ouid=104832495897645338011&rtpof=true&sd=true

## CI/CD
<img width="1460" height="885" alt="image" src="https://github.com/user-attachments/assets/31eb55cb-cb5a-4ae5-9d3b-bc3ee92c4831" />

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

## Quick Start — From Zero to Running

These steps take you from a fresh clone to seeing autonomous agent payments in your browser. Each step lists exactly what to do and how to verify it worked.

### 1. Install Dependencies

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target for Soroban smart contracts
rustup target add wasm32v1-none

# Install Soroban CLI
cargo install soroban-cli --features opt

# Install Node.js 20+ (via nvm recommended)
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
# nvm install 22
```

**Verify**: `rustc --version`, `soroban --version`, `node --version`, `npm --version` all succeed.

### 2. Install Freighter (Browser Wallet)

Install the [Freighter browser extension](https://www.freighter.app/) for Chrome or Firefox. Open it after installing:

- Click the Freighter icon → **Create a new wallet** (or import existing)
- Go to **Settings** → **Network** → select **Testnet**
- Fund your account: copy your public key, go to the [Stellar Lab](https://lab.stellar.org/account/create), paste it, and click **Get test network funds**

**Verify**: You see a 10,000 XLM balance in Freighter.

### 3. Clone and Build

```bash
# Clone the repo
git clone git@github.com:arihantgh/constella.git
cd constella

# Build all three smart contracts
cd contracts
cargo build --release --target wasm32v1-none

# Run contract tests (21 tests across 3 contracts)
cargo test
```

**Verify**: `Finished release` with no errors, `cargo test` shows 7/9/7 tests passing (21 total).

### 4. Install Frontend

```bash
cd ../frontend
npm install
```

Copy the environment template and open it in your editor:

```bash
cp .env.example .env.local
```

Open `.env.local` and set these values (contract IDs are already deployed — see the [Deployed Contracts](#deployed-contracts-testnet) section):

```
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_RELAY_URL=ws://localhost:8787
NEXT_PUBLIC_AGENT_REGISTRY_ID=CCGU7AL3TEY4437642KZ35VRKDGI3HLVNIGA2MRI4X3ADNUVD4SGSWPR
NEXT_PUBLIC_BUDGET_POLICY_ID=CCXOG3GGOPRPWX2ICTNOT6EVE73YPLC6SVQJNIY4KKXF5IMDT6ONFODA
NEXT_PUBLIC_PAYMENT_ID=CA6LGV5R6R4YLBXCEZM5D5FZJBOOH3UHR3OCHRPDTJPAMY3MUZQLCHKJ
```

### 5. Start the Frontend

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. You should see the constella dashboard with a **Connect Wallet** button.

**Verify**: Page loads without errors. Clicking **Connect Wallet** opens a Freighter popup.

### 6. Start the Event Relay (for live feed)

Open a second terminal:

```bash
cd relay
npm install
cp .env.example .dev.vars
```

Edit `.dev.vars` and set:

```
RPC_URL=https://soroban-testnet.stellar.org
CONTRACT_IDS=CCGU7AL3TEY4437642KZ35VRKDGI3HLVNIGA2MRI4X3ADNUVD4SGSWPR,CCXOG3GGOPRPWX2ICTNOT6EVE73YPLC6SVQJNIY4KKXF5IMDT6ONFODA,CA6LGV5R6R4YLBXCEZM5D5FZJBOOH3UHR3OCHRPDTJPAMY3MUZQLCHKJ
POLL_INTERVAL_MS=30000
```

```bash
npx wrangler dev
```

**Verify**: `http://localhost:8787/health` returns `{"status":"healthy",...}`.

### 7. Use the Application

Now follow the steps the [Usage](#usage) section below to connect your wallet, register agents, set budgets, and create payments. Open the agent simulator in a third terminal for autonomous payments.

> See [`docs/running-and-deploying.md`](docs/running-and-deploying.md) for deploying contracts yourself, deploying the relay to Cloudflare Workers, and the frontend to Vercel.

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

## Usage

This walkthrough covers the full flow: wallet connect, agent registration, budget config, payment creation, live event feed, and the autonomous simulator. See the [detailed demo script](docs/demo-script.md) for a narrated version with screenshots and negative paths.

### 1. Connect Wallet

1. Open `http://localhost:3000` after starting the frontend.
2. Click **Connect Wallet**.
3. Freighter extension prompts you → approve with a Testnet account.
4. **Verified**: Header shows your truncated public key with a green dot. Three tabs appear: **Agents**, **Budgets**, **Payments**.

> ⚠️ If you see "Wrong network", open Freighter → Settings → Network → switch to **Testnet**.

### 2. Register Agents

Navigate to the **Agents** tab. Fill in the **Register Agent** form:

| Field | Value |
|-------|-------|
| Agent ID | A Stellar public key (e.g., from a second Testnet account) |
| Owner | Your Freighter public key (auto-filled) |
| Metadata | A label like `alice-demo` or `bob-demo` |

Click **Register Agent** → approve the transaction in Freighter. The agent appears in the **Registered Agents** list with a green **Active** badge. Register at least two agents so you can send payments between them.

### 3. Set Budgets

Navigate to the **Budgets** tab. Enter an agent's public key and set limits:

| Field | Suggested Value |
|-------|----------------|
| Agent ID | Public key of the agent from step 2 |
| Per-Tx Limit | `1000` (max XLM per single payment) |
| Daily Limit | `10000` (max XLM per rolling 24h period) |

Click **Set Budget** → approve in Freighter. Repeat for each agent.

### 4. Create a Payment

Navigate to the **Payments** tab. Fill in the **Create Payment** form:

| Field | Value |
|-------|-------|
| From Agent | Alice's agent ID |
| To Agent | Bob's agent ID |
| Amount | `100` (must be ≤ per-tx limit) |
| Task Reference | A unique ID like `demo-payment-001` |

Click **Create Payment** → approve in Freighter. The form shows the transaction hash on success.

### 5. Live Payment Feed

The **Live Payment Feed** panel (bottom of the Payments tab) displays on-chain events in real time:
- A **blue** card → Payment Created
- A **green** card → Payment Executed
- A **red** card → Payment Rejected (budget exceeded, agent inactive)
- A **yellow** card → Payment Refunded

The feed updates automatically via WebSocket. If it shows **Disconnected**, the relay isn't running — start it with `npx wrangler dev` in `relay/`.

### 6. Run the Agent Simulator (Autonomous Payments)

Open a separate terminal to demonstrate "no human approval per transaction":

```bash
cd scripts
node simulate.mjs --secret <YOUR_DEPLOYER_SECRET> --profile conservative
```

The simulator creates two agents (Alice, Bob), registers them, sets budgets, and fires periodic payments autonomously. Switch back to the dashboard — each payment appears in the live feed within seconds.

Try the different profiles (see [`scripts/simulate.mjs`](scripts/simulate.mjs)):
- `conservative` — 100 XLM every 60s
- `aggressive` — 500 XLM every 15s
- `over-limit` — deliberately exceeds budget every 3rd payment (demonstrates rejection)

### 7. Verify Budget Enforcement

Try creating a payment that exceeds the per-tx budget (e.g., amount `5000` when the limit is `1000`). The contract rejects it and the live feed shows a red **Payment Rejected** card — proving the guardrail works on-chain, not just in the UI.

## License

MIT
