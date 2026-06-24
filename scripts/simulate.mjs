#!/usr/bin/env node

/**
 * constella — Agent Simulator
 *
 * Creates two agents (Alice, Bob), funds them, sets budgets,
 * and fires periodic payments between them on Stellar Testnet.
 *
 * Usage:
 *   node scripts/simulate.mjs \
 *     --secret <KEYPAIR_SECRET> \
 *     [--rpc https://soroban-testnet.stellar.org] \
 *     [--interval 30]
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

// ── CLI args ──────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) =>
    a.startsWith("--") ? [a.slice(2), arr[i + 1] ?? ""] : []
  ).filter(([k]) => k)
);

const SECRET = args.secret || args.s || "";
const RPC_URL = args.rpc || "https://soroban-testnet.stellar.org";
const INTERVAL = parseInt(args.interval || args.i || "30", 10);
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
      const raw = readFileSync(p, "utf-8");
      return JSON.parse(raw).contracts;
    }
  }
  console.error(
    "Warning: contracts.json not found. Using placeholder addresses."
  );
  return {
    agent_registry: { id: "" },
    budget_policy: { id: "" },
    payment: { id: "" },
  };
}

const contracts = loadContracts();
const server = new rpc.Server(RPC_URL);

// ── Agent identities ──────────────────────────────────────────

const source = Keypair.fromSecret(SECRET);
const alice = Keypair.random();
const bob = Keypair.random();

console.log("┌─ constella Agent Simulator ─────────────────────────┐");
console.log(`│ Source:  ${source.publicKey().slice(0, 16)}...`);
console.log(`│ Alice:   ${alice.publicKey().slice(0, 16)}...`);
console.log(`│ Bob:     ${bob.publicKey().slice(0, 16)}...`);
console.log(`│ RPC:     ${RPC_URL}`);
console.log(`│ Interval: ${INTERVAL}s`);
console.log("└──────────────────────────────────────────────────────┘");

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
    { fee: "100", networkPassphrase: NETWORK }
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
        return poll;
      }
      if (poll.status === "FAILED") {
        log("❌", `tx ${hash.slice(0, 12)}... failed`);
        return poll;
      }
      attempts++;
    }
    log("⚠️", `tx ${hash.slice(0, 12)}... still pending after 60s`);
    return sendResult;
  }
  log("❌", `send failed: ${JSON.stringify(sendResult)}`);
  return sendResult;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main simulation loop ──────────────────────────────────────

async function run() {
  // Step 1: Register Alice
  log("🤖", `Registering Alice...`);
  await submitOperation(
    source,
    contracts.agent_registry.id,
    "register_agent",
    [
      nativeToScVal(alice.publicKey(), { type: "address" }),
      nativeToScVal(source.publicKey(), { type: "address" }),
      nativeToScVal(
        Buffer.from("alice-sim-agent").toString("hex"),
        { type: "bytes" }
      ),
    ]
  );

  // Step 2: Register Bob
  log("🤖", `Registering Bob...`);
  await submitOperation(
    source,
    contracts.agent_registry.id,
    "register_agent",
    [
      nativeToScVal(bob.publicKey(), { type: "address" }),
      nativeToScVal(source.publicKey(), { type: "address" }),
      nativeToScVal(
        Buffer.from("bob-sim-agent").toString("hex"),
        { type: "bytes" }
      ),
    ]
  );

  // Step 3: Set Alice's budget
  log("💰", `Setting Alice's budget (per-tx: 1000, daily: 10000)...`);
  await submitOperation(
    source,
    contracts.budget_policy.id,
    "set_budget",
    [
      nativeToScVal(alice.publicKey(), { type: "address" }),
      nativeToScVal(source.publicKey(), { type: "address" }),
      nativeToScVal("1000", { type: "i128" }),
      nativeToScVal("10000", { type: "i128" }),
    ]
  );

  // Step 4: Set Bob's budget
  log("💰", `Setting Bob's budget (per-tx: 1000, daily: 10000)...`);
  await submitOperation(
    source,
    contracts.budget_policy.id,
    "set_budget",
    [
      nativeToScVal(bob.publicKey(), { type: "address" }),
      nativeToScVal(source.publicKey(), { type: "address" }),
      nativeToScVal("1000", { type: "i128" }),
      nativeToScVal("10000", { type: "i128" }),
    ]
  );

  log("✅", "Initialization complete. Starting payment loop...");
  let paymentCount = 0;

  // Step 5: Periodic payment loop
  while (true) {
    paymentCount++;
    log("💸", `Payment #${paymentCount}: Alice → Bob (amount: 100)`);

    await submitOperation(
      source,
      contracts.payment.id,
      "create_payment",
      [
        nativeToScVal(alice.publicKey(), { type: "address" }),
        nativeToScVal(bob.publicKey(), { type: "address" }),
        nativeToScVal("100", { type: "i128" }),
        nativeToScVal(
          "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4",
          { type: "address" }
        ),
        nativeToScVal(
          Buffer.from(`sim-payment-${paymentCount}`).toString("hex"),
          { type: "bytes" }
        ),
      ]
    );

    log("⏰", `Next payment in ${INTERVAL}s...`);
    await sleep(INTERVAL * 1000);
  }
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
