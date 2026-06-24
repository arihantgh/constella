# Product Requirements Document (PRD)

## constella — Autonomous AI Agent Payment System on Stellar

---

## 1. Executive Summary

**constella** is a full-stack decentralized application that lets autonomous AI agents pay each other (or pay services) for work, data, or compute — without a human approving every transaction. Payments are executed on the Stellar network via Soroban smart contracts, with spending governed by on-chain budget policies so agents can act autonomously but never overspend.

A human operator connects a **Freighter wallet** (Testnet) to register agents, fund them, set spending policies, and watch a **live dashboard** of agent-to-agent transactions as they happen — powered by on-chain event streaming.

This PRD defines the product scope, architecture, smart contract design, functional/non-functional requirements, delivery pipeline, testing strategy, and the git/commit workflow needed to ship a production-grade demo.

---

## 2. Problem Statement

AI agents increasingly need to transact with other agents or services autonomously — e.g., one agent pays another for a dataset, pays an API-providing agent per call, or pays for compute time — without a human in the loop for every micropayment. Traditional payment rails (cards, bank transfers, even most crypto UX) assume a human is present to authorize each transaction. This creates friction for:

- **Agent-to-agent micropayments** (sub-cent/low-value, high-frequency)
- **Programmable spending limits** (an agent should never be allowed to drain a wallet)
- **Verifiable, auditable transaction history** (every agent payment must be traceable on-chain)
- **Real-time visibility** for the human operator overseeing a fleet of agents

Stellar/Soroban is well suited to this problem: fast finality (~5s), low fees, native asset support, and Rust-based smart contracts (Soroban) that can enforce programmable spending rules.

---

## 3. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Demonstrate autonomous agent-to-agent payments on-chain | ≥1 end-to-end payment flow executed without human signing per-transaction |
| Enforce programmable spending limits | Budget contract rejects an over-limit payment in a demo scenario |
| Real-time observability | Dashboard reflects a new on-chain event within ~2-5s of confirmation |
| Production-readiness | CI green on main, deployed preview + production URLs live |
| Code quality & history | 20+ meaningful, atomic git commits with clear messages |
| Usability | Wallet connect/disconnect works reliably on Freighter Testnet; UI fully responsive on mobile |

### Non-goals (explicitly out of scope for v1)
- Mainnet deployment (Testnet only)
- Real fiat on/off-ramps
- Multi-wallet support beyond Freighter (Albedo, xBull, etc. can be a stretch goal)
- Agent "intelligence" itself (LLM reasoning/planning) — this PRD covers the **payment rail and infrastructure** an agent uses, with a simple rule-based or scripted "agent" simulator to trigger payments for demo purposes
- Cross-chain bridging

---

## 4. Target Users / Personas

1. **Operator (Human-in-the-loop admin)** — connects Freighter, registers agents under their account, sets budgets, monitors the dashboard.
2. **Agent (Autonomous actor)** — a backend-simulated or scripted entity with its own Stellar account (created/funded via Friendbot on Testnet) that initiates payments according to policy, without per-transaction human approval.
3. **Recipient Agent/Service** — receives payment, confirms a task, and emits a fulfillment event.
4. **Developer/Reviewer** (secondary persona) — judges or engineers reviewing the repo, CI pipeline, contracts, and demo for evaluation purposes.

---

## 5. Scope

### In scope
- Soroban smart contracts: Agent Registry, Payment/Escrow, Budget Policy
- Freighter wallet connect/disconnect (Testnet)
- Frontend dashboard: agent management, live transaction feed, budget controls
- Event indexing/streaming service for real-time UI updates
- CI/CD via GitHub Actions → Vercel/Cloudflare
- Contract deployment scripts/workflow for Testnet
- Unit + integration tests for contracts and frontend
- Responsive (mobile-first) UI
- Documentation (README, architecture docs, API reference) + recorded demo script

### Out of scope (see Non-goals above)

---

## 6. System Architecture Overview

```
                          ┌──────────────────────────────┐
                          │        Freighter Wallet        │
                          │      (Browser Extension)       │
                          └───────────────┬────────────────┘
                                          │ sign tx (testnet)
                                          ▼
┌───────────────────┐   REST/RPC   ┌─────────────────────────────┐
│   Frontend (Next.js) │◄──────────►│  Soroban RPC Node (Testnet)   │
│  - Wallet connect UI  │             │  (public testnet RPC)        │
│  - Agent dashboard     │             └───────────────┬───────────────┘
│  - Budget controls      │                             │ contract invoke
│  - Live feed (WS/SSE)    │                             ▼
└────────┬───────────────┘             ┌─────────────────────────────┐
         │ subscribe                    │      Soroban Smart Contracts  │
         │ events                        │  ┌─────────────────────────┐ │
         ▼                               │  │ Agent Registry Contract  │ │
┌───────────────────┐                    │  └────────────┬─────────────┘ │
│  Event Relay/Indexer │  getEvents()    │               │ inter-contract │
│  Service (Workers/     │◄───────────────┤               ▼ call           │
│  Durable Objects or    │                │  ┌─────────────────────────┐ │
│  Node service)          │                │  │ Payment / Escrow Contract│ │
│  - polls Soroban RPC     │                │  └────────────┬─────────────┘ │
│  - normalizes events      │               │               │ inter-contract │
│  - pushes via WS/SSE        │             │               ▼ call           │
└───────────────────────────┘              │  ┌─────────────────────────┐ │
                                            │  │ Budget Policy Contract  │ │
                                            │  └─────────────────────────┘ │
                                            └─────────────────────────────┘
```

### Components

| Component | Responsibility | Hosting |
|---|---|---|
| **Frontend** (Next.js + TypeScript + Tailwind) | Wallet connect/disconnect, agent CRUD UI, budget config, live transaction feed, responsive layout | Vercel **or** Cloudflare Pages |
| **Event Relay Service** | Polls Soroban RPC `getEvents`, normalizes/decodes XDR event payloads, fans out via WebSocket/SSE to connected frontend clients | Cloudflare Workers + Durable Objects (for WS) **or** a small Node service on Vercel Edge/Fly.io if persistent sockets are required (see §11.4 for tradeoffs) |
| **Soroban Contracts** (Rust) | On-chain logic: agent registry, payments/escrow, budget enforcement | Stellar Testnet via Soroban CLI |
| **Agent Simulator** | A lightweight script/cron (Node or Rust) that role-plays an "autonomous agent" triggering payments per a schedule/rule, to demonstrate the no-human-in-the-loop flow | Local script + optional scheduled Cloudflare Worker (cron trigger) |
| **CI/CD** | Lint, build, test contracts + frontend; deploy frontend; run contract deployment workflow on demand | GitHub Actions |

---

## 7. Smart Contract Design (Soroban / Rust)

Three contracts, designed to call each other (inter-contract communication is a core requirement).

### 7.1 Agent Registry Contract

Tracks which agents exist, who owns them (the human operator's address), and whether they're active.

```rust
pub struct AgentInfo {
    pub agent_id: Address,
    pub owner: Address,
    pub metadata: BytesN<64>,   // e.g., hash of off-chain agent profile
    pub active: bool,
    pub created_at: u64,
}

// Public functions
fn register_agent(env: Env, agent_id: Address, owner: Address, metadata: BytesN<64>) -> bool;
fn deactivate_agent(env: Env, agent_id: Address, caller: Address);
fn is_active(env: Env, agent_id: Address) -> bool;     // called by Payment contract
fn get_agent(env: Env, agent_id: Address) -> AgentInfo;
```

Emits: `AgentRegistered`, `AgentDeactivated`

### 7.2 Budget Policy Contract

Holds per-agent spending rules and tracks running spend. Called by the Payment contract **before** funds move (inter-contract call) — this is the core "autonomy with guardrails" mechanic.

```rust
pub struct Budget {
    pub agent_id: Address,
    pub per_tx_limit: i128,
    pub daily_limit: i128,
    pub spent_today: i128,
    pub day_window_start: u64,
}

fn set_budget(env: Env, agent_id: Address, owner: Address, per_tx_limit: i128, daily_limit: i128);
fn check_and_reserve(env: Env, agent_id: Address, amount: i128) -> bool; // called cross-contract
fn get_budget(env: Env, agent_id: Address) -> Budget;
```

Emits: `BudgetSet`, `BudgetExceeded`, `BudgetReserved`

### 7.3 Payment / Escrow Contract

Orchestrates the actual transfer. Demonstrates **inter-contract communication** by calling Agent Registry (`is_active`) and Budget Policy (`check_and_reserve`) before invoking the token transfer.

```rust
pub struct PaymentRecord {
    pub id: u64,
    pub from_agent: Address,
    pub to_agent: Address,
    pub amount: i128,
    pub token: Address,        // Stellar Asset Contract address (e.g. native XLM SAC on testnet)
    pub task_ref: BytesN<32>,  // hash referencing the off-chain task/invoice
    pub status: PaymentStatus, // Pending | Executed | Refunded | Rejected
    pub created_at: u64,
}

fn create_payment(env: Env, from_agent: Address, to_agent: Address, amount: i128, token: Address, task_ref: BytesN<32>) -> u64;
fn execute_payment(env: Env, payment_id: u64) -> bool;   // -> calls registry.is_active() + budget.check_and_reserve() -> token.transfer()
fn refund_payment(env: Env, payment_id: u64, caller: Address) -> bool;
fn get_payment(env: Env, payment_id: u64) -> PaymentRecord;
```

Emits: `PaymentCreated`, `PaymentExecuted`, `PaymentRejected`, `PaymentRefunded`

### 7.4 Inter-Contract Call Graph

```
Frontend ──invoke──► Payment.execute_payment()
                          │
                          ├──cross-call──► AgentRegistry.is_active(from_agent)
                          ├──cross-call──► AgentRegistry.is_active(to_agent)
                          ├──cross-call──► BudgetPolicy.check_and_reserve(from_agent, amount)
                          └──cross-call──► TokenContract.transfer(from, to, amount)   // Stellar Asset Contract
```

This satisfies the **inter-contract communication** requirement end-to-end: a single user/agent action triggers three other contracts to be invoked atomically (the whole call reverts if any check fails — Soroban's atomic invocation guarantees this).

---

## 8. Functional Requirements

Each requirement below includes acceptance criteria for engineering sign-off.

### FR1 — Freighter Wallet Connect / Disconnect (Testnet)
- FR1.1: "Connect Wallet" button detects Freighter extension; if absent, shows install link.
- FR1.2: On connect, app requests public key + network via Freighter API, verifies network = Testnet, and rejects/warns if user is on Public/Futurenet.
- FR1.3: Connected state persists across page reload (re-check via Freighter API, not localStorage of secrets).
- FR1.4: "Disconnect" clears app-level session state and visibly returns UI to logged-out state (Freighter itself has no "disconnect" API call — app must clear its own session).
- FR1.5: All contract-invoking transactions are signed via Freighter's `signTransaction`; no private key ever touches the app.
- **Acceptance:** Manual + automated test connects, performs one signed action, disconnects, and confirms UI state resets correctly.

### FR2 — Deployable on Cloudflare/Vercel
- FR2.1: Frontend builds as a static/SSR Next.js app deployable to **either** Vercel or Cloudflare Pages with no code changes (env-var driven config only).
- FR2.2: `vercel.json` / `wrangler.toml` configs committed to repo.
- FR2.3: Preview deployments generated per PR.
- **Acceptance:** One-click deploy works on a fresh Vercel project and a fresh Cloudflare Pages project from the same repo.

### FR3 — Inter-Contract Communication
- FR3.1: Payment contract calls Agent Registry + Budget Policy contracts during `execute_payment` (see §7.4).
- FR3.2: Failure in any sub-call atomically reverts the whole transaction (no partial state).
- **Acceptance:** Integration test proves a payment from a deactivated agent or over-budget agent fails and reverts cleanly.

### FR4 — Event Streaming & Real-Time Updates
- FR4.1: All contracts emit structured events for state changes (§7.1–7.3).
- FR4.2: Relay service polls Soroban RPC `getEvents` (or subscribes if/when push support is available) and decodes XDR into JSON.
- FR4.3: Frontend dashboard subscribes (WebSocket or SSE) and updates the live feed without manual refresh.
- FR4.4: Reconnection logic if the stream drops.
- **Acceptance:** Triggering a payment via the agent simulator updates the dashboard within ~5 seconds without a page reload.

### FR5 — CI/CD Pipeline Setup
- FR5.1: GitHub Actions workflow runs on every PR: `cargo test` for contracts, `cargo clippy`/`fmt` check, frontend `lint`, `typecheck`, `test`, `build`.
- FR5.2: On merge to `main`, frontend auto-deploys to production (Vercel/Cloudflare).
- FR5.3: Contract deployment is a separate, manually-triggered workflow (not auto-deployed on every merge, to avoid redeploying live contract addresses accidentally).
- **Acceptance:** A failing test blocks merge; a passing PR shows a green check and a deploy preview link.

### FR6 — Smart Contract Deployment Workflow
- FR6.1: Reproducible deployment script (`scripts/deploy.sh` or Soroban CLI Makefile) that: builds WASM, optimizes, deploys to Testnet, initializes contracts, wires contract addresses together (Payment contract needs Registry + Budget addresses), and writes addresses to a `contracts.json` consumed by the frontend.
- FR6.2: Deployment workflow is idempotent and documented (re-running doesn't double-deploy by accident).
- FR6.3: A GitHub Actions workflow (`workflow_dispatch`) can run this on demand.
- **Acceptance:** A clean checkout + one command deploys all 3 contracts to Testnet and produces a working `contracts.json`.

### FR7 — Mobile Responsive Frontend
- FR7.1: All views (connect screen, agent list, agent detail, budget editor, live feed) are usable down to 360px width.
- FR7.2: Touch-friendly tap targets (≥44px), no horizontal scroll, collapsible nav on mobile.
- FR7.3: Live feed gracefully degrades to a scrollable card list on small screens (vs. table on desktop).
- **Acceptance:** Manual QA pass + automated viewport screenshot tests at 360px, 768px, 1280px.

### FR8 — Error Handling & Loading States
- FR8.1: Every async action (wallet connect, contract invoke, event fetch) has explicit loading, success, and error UI states.
- FR8.2: Contract errors (e.g., `BudgetExceeded`, inactive agent) are mapped to human-readable messages, not raw XDR/error codes.
- FR8.3: Network/RPC failures show retry affordances, not silent failure.
- FR8.4: Global error boundary catches unhandled UI exceptions.
- **Acceptance:** Forcing each failure mode (deny wallet popup, simulate RPC timeout, trigger budget rejection) shows the correct UI state, verified by tests.

### FR9 — Testing (Contracts + Frontend)
- FR9.1: Soroban contract unit tests for every public function, including failure paths (`cargo test` using `soroban-sdk` testutils).
- FR9.2: Integration test simulating the full inter-contract call chain (§7.4).
- FR9.3: Frontend unit tests (Jest + React Testing Library) for components and hooks (wallet hook, contract-call hook).
- FR9.4: Frontend e2e tests (Playwright) for the connect → register agent → make payment → see live update flow, against deployed Testnet contracts or a mocked RPC.
- **Acceptance:** `cargo test` and `npm test` both pass in CI with meaningful coverage of happy + failure paths.

### FR10 — Production-Ready Architecture Practices
- FR10.1: Environment-based config (`.env.example` committed; secrets never committed).
- FR10.2: Typed contract bindings generated from contract specs (Soroban TS bindings) rather than hand-written XDR parsing.
- FR10.3: Structured logging in the relay service; no `console.log` debugging left in production code.
- FR10.4: Rate-limiting/backoff on RPC polling to avoid hammering the public Testnet RPC.
- FR10.5: Code organized as a monorepo (`/contracts`, `/frontend`, `/relay`, `/scripts`) with clear module boundaries.
- **Acceptance:** Architecture review checklist (in `/docs/architecture.md`) signed off before "v1" tag.

### FR11 — Documentation & Demo Presentation
- FR11.1: `README.md` — project overview, setup, run locally, deploy.
- FR11.2: `/docs/architecture.md` — diagrams + contract interface reference (source of this PRD's §6–7).
- FR11.3: `/docs/demo-script.md` — step-by-step narration for a live or recorded demo (connect wallet → register 2 agents → set budget → trigger autonomous payment → show live feed → show a rejected over-budget payment).
- FR11.4: Recorded demo video/GIF linked in README.
- **Acceptance:** A new developer can clone, follow README, and run the full demo locally within 15 minutes.

### FR12 — Git Workflow / Commit Discipline
- FR12.1: Commit after every meaningful change (not just at the end) — see §13 for the planned commit sequence.
- FR12.2: Minimum **20 commits**, each scoped to one logical change, with descriptive messages following Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`).
- FR12.3: No single giant "initial commit with everything" — history must show incremental, reviewable progress.
- FR12.4: Feature branches + PRs into `main` (even solo) to exercise the CI gate per FR5.
- **Acceptance:** `git log --oneline` shows ≥20 commits with clear, atomic messages; CI ran on each PR.

---

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | No private keys handled by the app (Freighter-only signing); input validation on all contract call params; budget contract is the sole authority on spend limits (not enforced client-side only) |
| **Performance** | Dashboard event latency target ≤5s from chain confirmation to UI update; frontend Lighthouse performance score ≥85 on mobile |
| **Reliability** | Relay service auto-reconnects to RPC on failure; frontend shows stale-data indicator if the event stream disconnects |
| **Scalability (demo-scope)** | Architecture should not preclude scaling to many agents — registry/payment lookups should be O(1) by `Address` key, not iterate all agents |
| **Maintainability** | Typed end-to-end (Rust contracts + TS bindings + TypeScript frontend); linting enforced in CI |
| **Accessibility** | Color contrast AA, keyboard-navigable wallet connect flow |

---

## 10. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Smart contracts | **Rust + Soroban SDK** | Stellar's native smart contract platform |
| Contract tooling | **Soroban CLI**, `soroban-sdk` testutils | Build, deploy, test |
| Frontend framework | **Next.js (App Router) + TypeScript** | SSR/static export compatible with both Vercel and Cloudflare Pages |
| Styling | **Tailwind CSS** | Fast, consistent, responsive-first |
| Wallet integration | **`@stellar/freighter-api`** (or `stellar-wallets-kit` for future multi-wallet support) | Connect/disconnect/sign |
| Stellar SDK | **`@stellar/stellar-sdk`** | Build/submit transactions, decode XDR |
| Event relay | **Cloudflare Workers + Durable Objects** (WS) or lightweight Node/Express on Fly.io if persistent sockets are mandatory | See §11.4 tradeoffs |
| Realtime transport | **WebSocket** (primary) with **SSE polling fallback** | Graceful degradation |
| Testing (contracts) | `cargo test`, `soroban-sdk` testutils | |
| Testing (frontend) | **Jest + React Testing Library** (unit), **Playwright** (e2e) | |
| CI/CD | **GitHub Actions** | |
| Hosting (frontend) | **Vercel** or **Cloudflare Pages** | Pick one as primary; document both |
| Hosting (relay) | **Cloudflare Workers** | |

---

## 11. Key Design Decisions & Tradeoffs

### 11.1 Why three contracts instead of one monolith?
Separation of concerns (registry / budget / payment) is what makes "inter-contract communication" a real architectural requirement rather than a checkbox — and it mirrors how a real agent-economy system would be modularized (you'd want to upgrade budget policy logic independently of payment logic).

### 11.2 Atomicity of cross-contract calls
Soroban guarantees that a top-level invocation and all its nested cross-contract calls either fully succeed or fully revert. This is what makes the budget check trustworthy — there's no race condition where a payment executes before the budget check completes.

### 11.3 Where does "autonomy" live?
For the v1 demo, the **Agent Simulator** is a script (not a full LLM agent) that calls `execute_payment` on a schedule/rule basis, signed by an agent's own Stellar keypair (funded via Friendbot), *not* by the human's Freighter wallet. The human's Freighter wallet is used for **operator actions** (registering agents, setting budgets) — not for the agent's own autonomous payments. This is the cleanest way to demonstrate "no human approval per transaction" while keeping Freighter's role scoped to what it's actually for (human-controlled signing).

### 11.4 Event streaming hosting tradeoff
- **Cloudflare Workers + Durable Objects**: scales well, fits the "deployable on Cloudflare" requirement directly, but Durable Objects WebSocket hibernation adds complexity.
- **Vercel**: serverless functions don't hold persistent WebSocket connections well; if Vercel is the primary frontend host, prefer **SSE with short server-side polling** or **client-side polling** of a `/api/events` route, or host the relay separately (Cloudflare Workers) regardless of where the frontend lives.
- **Recommendation:** Decouple relay hosting from frontend hosting — relay always on Cloudflare Workers (good WS support), frontend on either Vercel or Cloudflare Pages.

---

## 12. User Flows

### 12.1 Operator Connects Wallet
1. User clicks **Connect Wallet**.
2. Freighter popup → user approves.
3. App checks network == Testnet; if not, shows a "Switch to Testnet" notice with instructions.
4. App stores public key in session state; UI shows connected address (truncated) + **Disconnect** button.

### 12.2 Register an Agent
1. Operator clicks **+ New Agent**, enters metadata (name/description).
2. App calls `AgentRegistry.register_agent` — Freighter prompts signature.
3. Loading state → success toast → new agent appears in list (via event stream, not just optimistic UI).

### 12.3 Set a Budget
1. Operator opens agent detail → **Budget** tab.
2. Sets per-tx and daily limits → signs `BudgetPolicy.set_budget`.
3. UI reflects new limits once `BudgetSet` event is observed.

### 12.4 Autonomous Payment (no human signature)
1. Agent Simulator (running independently, using the **agent's own keypair**) decides — per its scripted rule — to pay another agent for a "task."
2. Calls `Payment.create_payment` then `Payment.execute_payment`, signed by the agent's key.
3. Contract internally checks `AgentRegistry.is_active` + `BudgetPolicy.check_and_reserve`, then transfers tokens.
4. `PaymentExecuted` event emitted → relay picks it up → dashboard live feed updates for the (human) operator, who took no action.

### 12.5 Budget Rejection (negative path demo)
1. Agent Simulator attempts a payment exceeding its daily limit.
2. `BudgetPolicy.check_and_reserve` returns false → `Payment.execute_payment` reverts → `PaymentRejected` event.
3. Dashboard shows the rejected attempt distinctly (e.g., red badge) — proving the guardrail works.

### 12.6 Disconnect
1. Operator clicks **Disconnect**.
2. App clears session state, returns to logged-out landing view. (No on-chain action; Freighter itself stays "available" for next connect.)

---

## 13. Git Commit Plan (≥20 Meaningful Commits)

Work proceeds on feature branches merged via PR (so CI gates every merge). Suggested commit sequence — each is one PR/commit, in rough chronological order:

1. `chore: scaffold monorepo structure (contracts/frontend/relay/scripts)`
2. `feat(contracts): initialize Soroban workspace + Agent Registry skeleton`
3. `feat(contracts): implement register_agent / get_agent / deactivate_agent`
4. `test(contracts): unit tests for Agent Registry happy + failure paths`
5. `feat(contracts): implement Budget Policy contract (set_budget, check_and_reserve)`
6. `test(contracts): unit tests for Budget Policy incl. limit-exceeded path`
7. `feat(contracts): implement Payment contract (create_payment, execute_payment)`
8. `feat(contracts): wire inter-contract calls — Payment -> Registry + Budget`
9. `test(contracts): integration test for full cross-contract payment flow`
10. `chore(scripts): testnet deployment script + contracts.json generator`
11. `feat(frontend): scaffold Next.js app + Tailwind + base layout`
12. `feat(frontend): implement Freighter wallet connect flow`
13. `feat(frontend): implement wallet disconnect + session state handling`
14. `feat(frontend): agent list + agent registration UI`
15. `feat(frontend): budget configuration UI`
16. `feat(relay): Soroban event polling service (getEvents -> normalized JSON)`
17. `feat(relay): WebSocket fan-out via Cloudflare Durable Objects`
18. `feat(frontend): live transaction feed with WebSocket subscription + SSE fallback`
19. `feat(frontend): error handling + loading states across all async actions`
20. `feat(frontend): mobile-responsive layout pass (nav, feed, forms)`
21. `feat(agent-sim): autonomous agent simulator script triggering scheduled payments`
22. `test(frontend): unit tests for wallet hook + contract-call hooks`
23. `test(e2e): Playwright flow — connect, register, fund, pay, observe live update`
24. `ci: GitHub Actions workflow — contract tests + frontend lint/test/build`
25. `ci: deployment workflow for Vercel/Cloudflare on main`
26. `ci: manual workflow_dispatch for contract (re)deployment`
27. `docs: architecture.md + contract interface reference`
28. `docs: README with setup, run, deploy instructions`
29. `docs: demo script + recorded walkthrough link`
30. `chore: production-readiness pass (logging, rate-limit backoff, env config audit)`

> 30 logical commits are listed to give headroom above the 20+ requirement; in practice some will split further (e.g., bug-fix commits found during testing), which is expected and healthy.

---

## 14. CI/CD Pipeline Design

```
PR opened ──► GitHub Actions: "ci.yml"
                 ├── job: contracts
                 │     ├── cargo fmt --check
                 │     ├── cargo clippy -- -D warnings
                 │     └── cargo test
                 ├── job: frontend
                 │     ├── npm ci
                 │     ├── npm run lint
                 │     ├── npm run typecheck
                 │     ├── npm run test
                 │     └── npm run build
                 └── job: e2e (optional gate, can run on main only)
                       └── playwright test (against staging contracts)

Merge to main ──► GitHub Actions: "deploy.yml"
                      └── deploy frontend to Vercel/Cloudflare (production)

Manual trigger ──► GitHub Actions: "deploy-contracts.yml" (workflow_dispatch)
                      └── build + deploy Soroban contracts to Testnet
                      └── update contracts.json, open PR with new addresses
```

---

## 15. Testing Strategy Summary

| Layer | Tool | Coverage Target |
|---|---|---|
| Contracts (unit) | `cargo test` + `soroban-sdk` testutils | Every public function, happy + failure path |
| Contracts (integration) | `cargo test` with multi-contract test harness | Full cross-contract payment flow incl. rejection |
| Frontend (unit) | Jest + React Testing Library | Wallet hook, contract-call hooks, key components |
| Frontend (e2e) | Playwright | Full user journey incl. mobile viewport |
| Manual QA | Checklist in `/docs/qa-checklist.md` | Cross-browser (Chrome/Firefox w/ Freighter), 3 breakpoints |

---

## 16. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Public Testnet RPC rate limits/instability | Backoff + caching in relay service; document fallback RPC endpoints |
| Freighter API changes/breaking updates | Pin SDK version; abstract wallet calls behind a single hook/adapter |
| WebSocket hosting complexity on serverless platforms | Decouple relay (Workers) from frontend hosting (§11.4) |
| Scope creep (multi-wallet, mainnet, real AI agent reasoning) | Explicit non-goals section (§3); track stretch goals separately |
| Demo flakiness (live testnet during presentation) | Pre-recorded demo video as backup (FR11.4) + seeded/deterministic agent simulator script |

---

## 17. Milestones (Suggested Phasing)

| Phase | Scope | Maps to commits |
|---|---|---|
| **Phase 1 — Contracts Core** | Registry, Budget, Payment contracts + unit/integration tests + deploy script | 1–10 |
| **Phase 2 — Frontend Core** | Wallet connect/disconnect, agent + budget UI | 11–15 |
| **Phase 3 — Realtime Layer** | Event relay + live feed + agent simulator | 16–21 |
| **Phase 4 — Quality & Polish** | Tests, error/loading states, responsive pass | 19, 22–23 |
| **Phase 5 — Delivery** | CI/CD, docs, demo | 24–30 |

---

## 18. Open Questions / Assumptions

- **Assumption:** "Inter-contract communication" is satisfied by the Payment → Registry/Budget call chain (§7.4); confirm this matches evaluator expectations if this is for a hackathon/assignment rubric.
- **Assumption:** Vercel is selected as the primary frontend host (with Cloudflare Pages documented as the alternate) — flag if Cloudflare should instead be primary.
- **Open question:** Does the agent simulator need to run continuously (e.g., as a deployed cron Worker) for the live demo, or is a local script sufficient?
- **Open question:** Is a single test asset (native XLM testnet token) sufficient, or should the demo support a custom Soroban token too?

---

## 19. Appendix — Glossary

- **Soroban**: Stellar's smart contract platform (Rust/WASM).
- **Freighter**: Browser extension wallet for Stellar.
- **Horizon / Soroban RPC**: Stellar's API layers for submitting transactions and querying chain state/events.
- **XDR**: External Data Representation — Stellar's binary serialization format for transactions/events.
- **SAC (Stellar Asset Contract)**: The Soroban-compatible contract wrapper around a classic Stellar asset (e.g., native XLM), enabling token-style `transfer` calls from other contracts.
- **Friendbot**: Testnet faucet service used to fund test accounts.

---

*End of PRD.*