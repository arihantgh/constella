#!/usr/bin/env node

/**
 * constella — Agent Simulator
 *
 * Creates two agents (Alice, Bob), funds them, sets budgets,
 * and fires periodic payments on Stellar Testnet.
 *
 * FR6.2 — Configurable behavior profiles:
 *   - conservative:  small, infrequent payments (default)
 *   - aggressive:    larger, rapid-fire payments
 *   - over-limit:    deliberately exceeds budget for rejection demo
 *
 * Usage:
 *   node scripts/simulate.mjs --secret <secret> [--profile conservative]
 *   --secret     Keypair secret for the admin/source account (required)
 *   --rpc        Soroban RPC URL (default: soroban-testnet.stellar.org)
 *   --interval   Payment interval in seconds (default: per profile)
 *   --profile    Behavior profile (conservative | aggressive | over-limit)
 *   --token      Custom Stellar asset contract ID for payments (default: native XLM)
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  Keypair,
  nativeToScVal,
  TransactionBuilder,
  Contract,
} from "@stellar/stellar-sdk";
import { rpc } from "@stellar/stellar-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(__dirname, "..");

// ── Profiles ──────────────────────────────────────────────────

const PROFILES = {
  conservative: {
    label: "Conservative",
    interval: 60,
    perTxAmount: "100",
    perTxLimit: "1000",
    dailyLimit: "10000",
    occasionallyOverLimit: false,
    description: "Small, infrequent payments within budget",
  },
  aggressive: {
    label: "Aggressive",
    interval: 15,
    perTxAmount: "500",
    perTxLimit: "1000",
    dailyLimit: "50000",
    occasionallyOverLimit: false,
    description: "Larger, rapid-fire payments",
  },
  "over-limit": {
    label: "Over-Limit Demo",
    interval: 10,
    perTxAmount: "2000",
    perTxLimit: "1000",
    dailyLimit: "5000",
    occasionallyOverLimit: true,
    description: "Deliberately exceeds budget to demo rejection path",
  },
};

// ── CLI args ──────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2)
    .map((a, i, arr) => (a.startsWith("--") ? [a.slice(2), arr[i + 1] ?? ""] : []))
    .filter(([k]) => k),
);

const SECRET = args.secret || args.s || "";
const RPC_URL = args.rpc || args.r || "https://soroban-testnet.stellar.org";
const PROFILE_NAME = args.profile || args.p || "conservative";
const PROFILE = PROFILES[PROFILE_NAME] || PROFILES.conservative;
const INTERVAL = parseInt(args.interval || args.i || "0", 10) || PROFILE.interval;
const TOKEN_ID = args.token || args.t || process.env.TOKEN_ID || "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4";
const NETWORK = "Test SDF Network ; September 2015";

if (!SECRET) {
  console.error("Error: --secret is required (source account keypair secret)");
  process.exit(1);
}

// ── Load contracts ────────────────────────────────────────────

function loadContracts() {
  const paths = [
    join(PROJECT, "scripts/contracts.json"),
    join(PROJECT, "contracts.json"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf-8")).contracts;
    }
  }
  console.error("Warning: contracts.json not found. Using placeholder addresses.");
  return { agent_registry: { id: "" }, budget_policy: { id: "" }, payment: { id: "" } };
}

const contracts = loadContracts();
const server = new rpc.Server(RPC_URL);

// ── Agent identities ──────────────────────────────────────────

const source = Keypair.fromSecret(SECRET);
const alice = Keypair.random();
const bob = Keypair.random();

console.log("");
console.log("┌─ constella Agent Simulator ─────────────────────────┐");
console.log(`│ Profile:  ${PROFILE.label.padEnd(42)}│`);
console.log(`│ ${PROFILE.description.padEnd(52)}│`);
console.log(`│ Source:   ${source.publicKey().slice(0, 16)}...${"      │"}`);
console.log(`│ Alice:    ${alice.publicKey().slice(0, 16)}...${"      │"}`);
console.log(`│ Bob:      ${bob.publicKey().slice(0, 16)}...${"      │"}`);
console.log(`│ RPC:      ${RPC_URL}`);
console.log(`│ Interval: ${INTERVAL}s${" ".repeat(28)}│`);
console.log(`│ Amount:   ${PROFILE.perTxAmount.padEnd(24)}│`);
console.log(`│ Token:    ${TOKEN_ID.slice(0, 24).padEnd(24)}│`);
console.log(`│ Budget:   tx=${PROFILE.perTxLimit} daily=${PROFILE.dailyLimit}${" │"}`);
console.log("└──────────────────────────────────────────────────────┘");
console.log("");

// ── Helpers ───────────────────────────────────────────────────

function log(emoji, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`${ts} ${emoji} ${msg}`);
}

async function getAccountSeq(publicKey) {
  try {
    const acc = await server.getAccount(publicKey);
    return acc.sequenceNumber();
  } catch {
    return "0";
  }
}

async function submitOperation(sourceKp, contractId, method, scValArgs) {
  const contract = new Contract(contractId);
  const op = contract.call(method, ...scValArgs);
  const sourcePub = sourceKp.publicKey();
  const seq = await getAccountSeq(sourcePub);

  const tx = new TransactionBuilder(
    { accountId: () => sourcePub, sequenceNumber: () => seq },
    { fee: "100", networkPassphrase: NETWORK },
  )
    .addOperation(op)
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(sourceKp);

  const sendResult = await server.sendTransaction(prepared);
  if (sendResult.status === "PENDING" || sendResult.status === "DUPLICATE") {
    const { hash } = sendResult;
    log("⏳", `tx ${hash.slice(0, 12)}... submitted, waiting for confirmation...`);
    let attempts = 0;
    while (attempts < 30) {
      await sleep(2000);
      const poll = await server.getTransaction(hash);
      if (poll.status === "SUCCESS") {
        log("✅", `tx ${hash.slice(0, 12)}... confirmed`);
        return "SUCCESS";
      }
      if (poll.status === "FAILED") {
        log("❌", `tx ${hash.slice(0, 12)}... failed (${poll.resultXdr?.slice(0, 40) || "unknown"})`);
        return "FAILED";
      }
      attempts++;
    }
    log("⚠️", `tx ${hash.slice(0, 12)}... still pending after 60s`);
    return "TIMEOUT";
  }
  log("❌", `send failed: ${JSON.stringify(sendResult)}`);
  return "ERROR";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toBytes(hex) {
  return nativeToScVal(hex, { type: "bytes" });
}

function toAddress(pubKey) {
  return nativeToScVal(pubKey, { type: "address" });
}

function toI128(val) {
  return nativeToScVal(String(val), { type: "i128" });
}

// ── Main simulation loop ──────────────────────────────────────

async function run() {
  const { perTxAmount, perTxLimit, dailyLimit, occasionallyOverLimit } = PROFILE;

  // Step 1: Register Alice
  log("🤖", "Registering Alice...");
  await submitOperation(source, contracts.agent_registry.id, "register_agent", [
    toAddress(alice.publicKey()),
    toAddress(source.publicKey()),
    toBytes("alice-sim-agent"),
  ]);

  // Step 2: Register Bob
  log("🤖", "Registering Bob...");
  await submitOperation(source, contracts.agent_registry.id, "register_agent", [
    toAddress(bob.publicKey()),
    toAddress(source.publicKey()),
    toBytes("bob-sim-agent"),
  ]);

  // Step 3: Set budgets
  log("💰", `Setting Alice's budget (tx: ${perTxLimit}, daily: ${dailyLimit})...`);
  await submitOperation(source, contracts.budget_policy.id, "set_budget", [
    toAddress(alice.publicKey()),
    toAddress(source.publicKey()),
    toI128(perTxLimit),
    toI128(dailyLimit),
  ]);

  log("💰", `Setting Bob's budget (tx: ${perTxLimit}, daily: ${dailyLimit})...`);
  await submitOperation(source, contracts.budget_policy.id, "set_budget", [
    toAddress(bob.publicKey()),
    toAddress(source.publicKey()),
    toI128(perTxLimit),
    toI128(dailyLimit),
  ]);

  log("✅", "Initialization complete. Starting payment loop...\n");
  let paymentCount = 0;

  // Step 4: Periodic payment loop
  while (true) {
    paymentCount++;
    const amount =
      occasionallyOverLimit && paymentCount % 3 === 0
        ? String(Number(perTxLimit) * 2) // 2x the per-tx limit = rejection
        : perTxAmount;

    const label = Number(amount) > Number(perTxLimit) ? "(over-limit!)" : "";
    log("💸", `Payment #${paymentCount}: Alice → Bob (${amount} XLM) ${label}`);

    const result = await submitOperation(
      source,
      contracts.payment.id,
      "create_payment",
      [
        toAddress(alice.publicKey()),
        toAddress(bob.publicKey()),
        toI128(amount),
        toAddress(TOKEN_ID),
        toBytes(`sim-payment-${paymentCount}`),
      ],
    );

    if (result === "FAILED" && Number(amount) > Number(perTxLimit)) {
      log("🛡️", "Budget guardrail triggered! Over-limit payment rejected as expected.");
    }

    log("⏰", `Next payment in ${INTERVAL}s...\n`);
    await sleep(INTERVAL * 1000);
  }
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
