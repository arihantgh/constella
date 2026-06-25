# Demo Script

This walkthrough demonstrates all key features of constella end-to-end.

**Prerequisites**: Freighter (Testnet), funded account, contracts deployed, frontend running at `http://localhost:3000`, relay running at `ws://localhost:8787`.

---

## 1. Connect Wallet

1. Open the app at `http://localhost:3000`.
2. Click **Connect Wallet**.
3. Freighter popup appears → select your Testnet account and approve.
4. **Expected**: The header shows your truncated public key with a green dot. The three tabs (Agents, Budgets, Payments) become visible.

**Negative path**: Try connecting while Freighter is on Public network. The app shows a "Wrong network" error with instructions to switch to Testnet.

---

## 2. Register Two Agents

1. Navigate to the **Agents** tab.
2. In the **Register Agent** form:
   - **Agent ID**: Enter the public key of a new or existing Stellar account (e.g., the one funded via Friendbot).
   - **Owner**: Enter your own Freighter public key.
   - **Metadata**: `alice-demo-agent`.
3. Click **Register Agent**. Freighter prompts you to sign the transaction → approve.
4. **Expected**: The form shows "Agent registered successfully!" and the agent appears in the **Registered Agents** list with a green "Active" badge.
5. Repeat with a second agent (use a different key pair, metadata: `bob-demo-agent`).

---

## 3. Set Budgets

1. Navigate to the **Budgets** tab.
2. Enter Alice's agent ID in the **Agent ID** field.
3. Set **Per-Tx Limit** to `1000` and **Daily Limit** to `10000`.
4. Click **Set Budget**. Sign the transaction in Freighter.
5. **Expected**: "Budget configured successfully!" message.
6. Repeat for Bob with the same limits.

---

## 4. Create a Payment

1. Navigate to the **Payments** tab.
2. In the **Create Payment** form:
   - **From Agent**: Alice's agent ID.
   - **To Agent**: Bob's agent ID.
   - **Amount**: `100`.
   - **Task Reference**: `demo-payment-001`.
3. Click **Create Payment**. Sign in Freighter.
4. **Expected**: The form shows the transaction hash as confirmation.

---

## 5. Live Payment Feed

1. With the Payments tab still open, the **Live Payment Feed** should show the event almost immediately.
2. **Expected**: A blue card appears saying "Payment Created" with Alice → Bob, the amount, and the truncated transaction hash.
3. If the relay is running (`wrangler dev`), events appear within ~5 seconds of on-chain confirmation.

---

## 6. Agent Simulator (Autonomous Payment)

1. Open a new terminal.
2. Run the agent simulator:

```bash
node scripts/simulate.mjs \
  --secret <DEPLOYER_SECRET> \
  --interval 10
```

3. **Expected**: The simulator logs:
   - Registration of Alice and Bob agents
   - Budget configuration for both
   - Periodic payments every 10 seconds: `Payment #1: Alice → Bob (amount: 100)`
4. Switch back to the dashboard → each payment appears in the live feed within seconds.

---

## 7. Over-Limit Rejection (Negative Path)

1. The simulator uses default budgets (per-tx: 1000, daily: 10000).
2. If a payment exceeds the per-tx limit (e.g., try creating a payment of `5000` in the UI), the contract rejects it.
3. **Expected**: The live feed shows a **red** "Payment Rejected" card with the budget exceeded reason.

---

## 8. Deactivate an Agent

1. Navigate to the **Agents** tab (requires the contract management UI to expose deactivation).
2. Attempting to pay from a deactivated agent should produce a "Payment Rejected" event with reason "inactive agent".

---

## Key Things to Highlight

- **No human approves individual payments**: The agent simulator makes payments autonomously. The human only registered agents and set budgets upfront.
- **Budget guardrails work**: Over-limit payments are rejected by the contract, not just blocked in the UI.
- **Real-time via relay**: Events appear in the feed without manual refresh, proving the event relay works end-to-end.
- **Cross-contract atomicity**: A single `execute_payment` call checks registry + budget + token transfer atomically. If any check fails, the whole thing reverts.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Freighter not detected" | Extension not installed | Install Freighter from `https://freighter.app` |
| "Wrong network" | Freighter on Public | Switch to Testnet in Freighter settings |
| No events in feed | Relay not running | Start with `npx wrangler dev` in `relay/` |
| Payment rejected | Budget exceeded or agent inactive | Check agent status and budget limits |
| Contract not found | Contracts not deployed | Run `./scripts/deploy.sh` |
