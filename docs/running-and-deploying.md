# Running & Deploying constella

Detailed step-by-step guide to run the full stack locally and deploy to production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone & Quick Start](#clone--quick-start)
3. [Contracts: Build, Test, Deploy](#contracts-build-test-deploy)
4. [Frontend: Run & Build](#frontend-run--build)
5. [Relay: Run Locally & Deploy to Cloudflare](#relay-run-locally--deploy-to-cloudflare)
6. [Agent Simulator: Run Autonomously](#agent-simulator-run-autonomously)
7. [Full Integration: Running Everything Together](#full-integration-running-everything-together)
8. [Production Deployment](#production-deployment)
9. [Environment Variables Reference](#environment-variables-reference)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Soroban CLI | latest | `cargo install soroban-cli --features opt` |
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) or `nvm install 22` |
| npm | 10+ | ships with Node.js |
| Docker | latest (optional) | for local Stellar QuickStart (see below) |
| Freighter | browser extension | [Download Freighter](https://www.freighter.app/) |

### WASM target

```bash
rustup target add wasm32v1-none
```

### Freighter setup

1. Install the [Freighter](https://www.freighter.app/) browser extension.
2. Open Freighter → **Settings** → **Network** → select **Testnet**.
3. Create or import a wallet. Fund it via the [Stellar Lab Friendbot](https://lab.stellar.org/account/create) (click "Get test network funds" after creating a keypair).

---

## Clone & Quick Start

```bash
git clone git@github.com:arihantgh/constella.git   # or your fork
cd constella

# ── 1. Build & test contracts ─────────────────────────
cd contracts
cargo build --release --target wasm32v1-none
cargo test
# Expected: 21 tests pass (7 + 9 + 7)

# ── 2. Install frontend deps ──────────────────────────
cd ../frontend
npm install
cp .env.example .env.local   # edit with your deployed contract IDs

# ── 3. Start frontend dev server ──────────────────────
npm run dev
# Open http://localhost:3000 → Connect Freighter (Testnet)

# ── 4. Install relay deps ─────────────────────────────
cd ../relay
npm install
```

---

## Contracts: Build, Test, Deploy

### Build

```bash
cd contracts

# Build all three contracts
cargo build --release --target wasm32v1-none

# Verify WASM files exist
ls -la target/wasm32v1-none/release/*.wasm
# → agent_registry.wasm, budget_policy.wasm, payment.wasm
```

### Test

```bash
# Run all contract tests
cargo test --verbose

# Check formatting
cargo fmt --check

# Run tests for a specific contract
cargo test -p agent-registry
cargo test -p budget-policy
cargo test -p payment
```

Expected output:

```
test result: ok. 7 passed; 0 failed  (agent-registry)
test result: ok. 9 passed; 0 failed  (budget-policy)
test result: ok. 7 passed; 0 failed  (payment)
```

### Deploy to Testnet

You need a funded Testnet account (see [Prerequisites](#prerequisites)).

```bash
# Make sure WASM files are built first
cd contracts && cargo build --release --target wasm32v1-none && cd ..

# Deploy all three contracts
./scripts/deploy.sh --source-account <YOUR_PUBLIC_KEY>
```

The script:

1. Builds each contract via `soroban contract build`
2. Deploys Agent Registry → captures address
3. Deploys Budget Policy → captures address
4. Deploys Payment → captures address
5. Writes all addresses to `scripts/contracts.json`

#### Output: `scripts/contracts.json`

```json
{
  "network_passphrase": "Test SDF Network ; September 2015",
  "rpc_url": "https://soroban-testnet.stellar.org",
  "contracts": {
    "agent_registry": { "id": "C...", "name": "Agent Registry" },
    "budget_policy":  { "id": "C...", "name": "Budget Policy" },
    "payment":        { "id": "C...", "name": "Payment" }
  },
  "deployed_at": "2026-06-25T..."
}
```

> **Important:** Every deployment creates new contract addresses. Update the frontend's `.env.local` and the relay's `.dev.vars`/wrangler.toml with the new IDs.

### Deploy via CI (GitHub Actions)

1. Go to your repo → **Actions** → **Deploy** workflow.
2. Click **Run workflow** → check "Redeploy Soroban contracts to Testnet".
3. The workflow builds WASM, deploys, and produces the new `contracts.json`.

Requires the following [GitHub Variables/Secrets](https://github.com/arihantgh/constella/settings/secrets/actions):

| Secret | Value |
|--------|-------|
| `SOURCE_ACCOUNT` | Your Testnet public key |
| `SOURCE_ACCOUNT_SECRET` | Your Testnet private key (for `soroban keys add`) |

---

## Frontend: Run & Build

### Environment

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_RELAY_URL=ws://localhost:8787
NEXT_PUBLIC_AGENT_REGISTRY_ID=<from contracts.json>
NEXT_PUBLIC_BUDGET_POLICY_ID=<from contracts.json>
NEXT_PUBLIC_PAYMENT_ID=<from contracts.json>
```

### Development

```bash
cd frontend
npm install     # first time only
npm run dev     # http://localhost:3000
```

### Testing

```bash
# Unit tests (Vitest + React Testing Library)
npm test
# Expected: 24 tests across 5 files

# Watch mode
npm run test:watch
```

### Production build

```bash
npm run build
npm run start   # serves the production build on http://localhost:3000
```

### E2E tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run e2e tests (starts dev server automatically)
npx playwright test --project=chromium
# Expected: 5 tests pass
```

The e2e tests mock the Freighter extension and Soroban RPC, so no wallet or network connection is needed.

---

## Relay: Run Locally & Deploy to Cloudflare

The relay is a Cloudflare Worker + Durable Object that polls the Soroban RPC for contract events and fans them out to WebSocket-connected clients.

### Local development

```bash
cd relay
npm install

# Create environment file
cp .env.example .dev.vars
```

Edit `.dev.vars`:

```
RPC_URL=https://soroban-testnet.stellar.org
CONTRACT_IDS=<comma-separated contract IDs from contracts.json>
POLL_INTERVAL_MS=30000
```

```bash
# Start local dev server (includes Durable Object support)
npx wrangler dev
# → http://localhost:8787
# → ws://localhost:8787/ws
```

### Endpoints

| Path | Description |
|------|-------------|
| `GET /health` | Health check with cursor, client count, uptime, version |
| `GET /ws` | WebSocket upgrade — subscribes to live contract events |
| `GET /` → 404 | All other paths |

#### `/health` response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptimeMs": 3600000,
  "cursor": 142857,
  "connectedClients": 3,
  "contractCount": 3,
  "pollIntervalMs": 30000
}
```

### Deploy to Cloudflare Workers

```bash
cd relay

# Deploy to Cloudflare
npx wrangler deploy

# Set environment variables
npx wrangler secret put RPC_URL
# → paste: https://soroban-testnet.stellar.org

npx wrangler secret put CONTRACT_IDS
# → paste: <comma-separated contract IDs>

# Set plain text vars
npx wrangler secret put POLL_INTERVAL_MS
# → paste: 30000
```

> **Note:** `CONTRACT_IDS` is stored as a secret so it can be updated without a full redeploy. Alternatively, set it in `wrangler.toml` under `[vars]`.

After deploying, verify:

```bash
curl https://constella-relay.<your-subdomain>.workers.dev/health
# → {"status":"healthy", ...}
```

### WebSocket fan-out architecture

```
Soroban RPC  ←─  Worker (cron, every 30s)
                      │
                      ▼
                Durable Object "EventRoom"
                   /              \
        WebSocket clients      WebSocket clients
```

- Cron trigger runs every 30s, fetches new events via `getEvents`.
- Events are normalized and broadcast to all connected WebSocket clients.
- Cursor (last processed ledger) is persisted in DO storage.
- Exponential backoff on RPC failure (doubles up to 5 min, resets on success).
- Rate limiting: max 5 concurrent WebSocket connections per IP (returns 429).

---

## Agent Simulator: Run Autonomously

The simulator creates two test agents (Alice & Bob), registers them, sets budgets, and fires periodic payments. It demonstrates the "no human approval per transaction" flow.

### Prerequisites

- Contracts deployed to Testnet (see [Deploy to Testnet](#deploy-to-testnet))
- `contracts.json` exists at `scripts/contracts.json` or the project root
- Deployer account funded on Testnet

### Basic usage

```bash
cd scripts
npm install

node simulate.mjs --secret <DEPLOYER_SECRET> --interval 30
```

### Profiles

The simulator supports three behavior profiles via the `--profile` flag:

| Profile | Interval | Amount | Behavior |
|---------|----------|--------|----------|
| `conservative` | 60s | 100 XLM | Small, infrequent payments (default) |
| `aggressive` | 15s | 500 XLM | Larger, rapid-fire payments |
| `over-limit` | 10s | 2000 XLM | Every 3rd payment exceeds the per-tx budget limit |

```bash
# Conservative (default)
node simulate.mjs --secret <SECRET>

# Aggressive
node simulate.mjs --secret <SECRET> --profile aggressive

# Over-limit rejection demo
node simulate.mjs --secret <SECRET> --profile over-limit
```

### What the simulator does

1. Generates random keypairs for two agents (Alice, Bob).
2. Registers both agents on-chain via `AgentRegistry.register_agent`.
3. Sets budgets via `BudgetPolicy.set_budget`.
4. Enters an infinite loop:
   - Creates a payment via `Payment.create_payment` (Alice → Bob).
   - Waits for confirmation (polls `getTransaction`).
   - Logs success or failure.
   - Sleeps for the configured interval.
   - In `over-limit` mode, every 3rd payment uses 2× the per-tx limit, triggering a rejection from the Budget Policy contract.

### Expected output

```
constella Agent Simulator
 Profile:  Over-Limit Demo
 Source:   GABC...1234
 Alice:    GDEF...5678
 Bob:      GHIJ...9012
 RPC:      https://soroban-testnet.stellar.org
 Interval: 10s

09:15:00 🤖 Registering Alice...
09:15:12 ✅ tx a1b2c3... confirmed
09:15:12 🤖 Registering Bob...
09:15:24 ✅ tx d4e5f6... confirmed
09:15:24 💰 Setting Alice's budget...
...
09:16:00 💸 Payment #1: Alice -> Bob (100 XLM)
09:16:12 ⏳ tx ... submitted, waiting...
09:16:14 ✅ tx ... confirmed
09:16:24 💸 Payment #3: Alice -> Bob (2000 XLM) (over-limit!)
09:16:36 ❌ tx ... failed (BudgetExceeded)
09:16:36 🛡️ Budget guardrail triggered! Over-limit payment rejected as expected.
```

---

## Full Integration: Running Everything Together

This is the order to run the full stack for a demo:

### Terminal 1 — Frontend

```bash
cd frontend
npm run dev
# http://localhost:3000
```

### Terminal 2 — Relay

```bash
cd relay
npx wrangler dev
# http://localhost:8787
# ws://localhost:8787/ws
```

### Terminal 3 — Agent Simulator (optional, for autonomous payments)

```bash
cd scripts
node simulate.mjs --secret <DEPLOYER_SECRET> --profile conservative
```

### Workflow

1. Open `http://localhost:3000` in your browser.
2. Click **Connect Wallet** → approve in Freighter popup (Testnet).
3. The dashboard shows the connected address and tab bar (Agents / Budgets / Payments).
4. **Agents tab**: Fill in agent ID and owner address, click **Register Agent**.
5. **Budgets tab**: Set per-tx and daily limits for the agent.
6. **Payments tab**: Create a payment from one agent to another.
7. The **Live Payment Feed** shows on-chain events in real time via the relay WebSocket.
8. (Optional) Start the simulator to see autonomous payments flow in without human interaction.

---

## Production Deployment

### Frontend → Vercel

The easiest way to deploy the frontend:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the frontend directory
cd frontend
vercel --prod
```

Or connect your GitHub repo to Vercel:

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your constella repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variables (see [Environment Variables Reference](#environment-variables-reference)).
4. Deploy — Vercel detects the Next.js framework automatically.

The `vercel.json` in the frontend root already configures:

- **Framework**: Next.js
- **Security headers**: CSP, X-Frame-Options, X-Content-Type-Options, etc.
- **Build command**: `npm run build`

> **Alternative — Cloudflare Pages:**
> Set the build command to `npm run build` and output directory to `.next`.
> Note: Pages does not support Next.js SSR out of the box; you may need
> `@cloudflare/next-on-pages` or `next export` for static export.

### Relay → Cloudflare Workers

```bash
cd relay
npx wrangler deploy
npx wrangler secret put RPC_URL
npx wrangler secret put CONTRACT_IDS
npx wrangler secret put POLL_INTERVAL_MS
```

The `wrangler.toml` configures:

- **Worker name**: `constella-relay`
- **Durable Object**: `EventRoom` for WebSocket fan-out and cursor storage
- **Cron trigger**: every 30 seconds
- **Compatibility date**: 2025-02-01

### CI/CD (GitHub Actions)

Three workflows are available:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | Push/PR to main | Build & test contracts, frontend lint/typecheck/test/build, e2e tests |
| `deploy.yml` | Manual (`workflow_dispatch`) | Deploy Soroban contracts to Testnet |
| `contract-tests.yml` | Push/PR (contracts path only) | Legacy — `ci.yml` supersedes this |

---

## Environment Variables Reference

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_RPC_URL` | Yes | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Yes | `"Test SDF Network ; September 2015"` | Stellar network passphrase |
| `NEXT_PUBLIC_RELAY_URL` | Yes | `ws://localhost:8787` | Relay WebSocket URL (prod: `wss://constella-relay.<sub>.workers.dev`) |
| `NEXT_PUBLIC_AGENT_REGISTRY_ID` | Yes | — | Deployed Agent Registry contract ID |
| `NEXT_PUBLIC_BUDGET_POLICY_ID` | Yes | — | Deployed Budget Policy contract ID |
| `NEXT_PUBLIC_PAYMENT_ID` | Yes | — | Deployed Payment contract ID |

### Relay (`relay/.dev.vars` or `wrangler.toml`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RPC_URL` | Yes | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint to poll |
| `CONTRACT_IDS` | Yes | — | Comma-separated contract IDs to watch for events |
| `POLL_INTERVAL_MS` | No | `30000` | Poll interval in milliseconds |
| `RELAY_VERSION` | No | `1.0.0` | Version reported by `/health` |

---

## Troubleshooting

### Contracts

**`cargo build` fails with wasm target error**

```bash
rustup target add wasm32v1-none
```

**`cargo test` fails — "contractimport! file not found"**

Build the dependent contracts first:

```bash
cargo build --release --target wasm32v1-none -p agent-registry -p budget-policy
cargo build --release --target wasm32v1-none -p payment
```

The Payment contract imports the Agent Registry and Budget Policy WASM files at compile time via `contractimport!`. They must be built first.

**Deploy script fails — "source account not found"**

Make sure your Testnet account is funded. Use the [Stellar Lab Friendbot](https://lab.stellar.org/account/create) to get test funds.

### Frontend

**Freighter not detected**

Make sure the Freighter extension is installed and the page is reloaded after installation. The app checks `window.freighter` on mount.

**"Wrong network: PUBLIC"**

Open Freighter → Settings → Network → switch to **Testnet**.

**WebSocket connection fails**

The frontend tries to connect to `NEXT_PUBLIC_RELAY_URL`. Make sure:
1. The relay is running (`npx wrangler dev` or deployed)
2. The URL is correct (use `wss://` for production, `ws://` for local)
3. CORS is not blocking the connection (local dev should work without issues)

### Relay

**Durable Object not found**

Make sure you've run `wrangler dev` (not just compiled the TypeScript). Durable Objects require the Wrangler runtime.

**No events showing in the feed**

1. Check that `CONTRACT_IDS` is set to the correct deployed contract addresses.
2. Verify the relay can reach the Soroban RPC: `curl https://soroban-testnet.stellar.org/health`
3. Check `/health` on the relay to see the cursor position and connection count.
4. Trigger a test event by executing one of the contract functions (e.g., register an agent from the dashboard).

**Rate limiting (429) on WebSocket**

If you see "Too many connections" errors, close other tabs or dev tools windows connected to the same relay. The limit is 5 concurrent connections per IP.
