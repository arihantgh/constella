import {
  nativeToScVal,
  scValToNative,
  Operation,
  SorobanDataBuilder,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { ContractConfig, AgentInfo, Budget } from "./types";
import { TESTNET_RPC_URL } from "./constants";
import { getConfig } from "./config";

function getConfigOrThrow(): ContractConfig {
  const c = getConfig();
  if (!c.contracts.agent_registry.id) throw new Error("Contracts not configured");
  return c;
}

function scValFor(a: any): any {
  if (typeof a === "string" && (a.startsWith("G") || a.startsWith("C")) && a.length === 56)
    return nativeToScVal(a, { type: "address" });
  if (typeof a === "number")
    return nativeToScVal(String(a), { type: "i128" });
  if (typeof a === "string")
    return nativeToScVal(a, { type: "symbol" });
  if (a instanceof Uint8Array) {
    const hex = Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
    return nativeToScVal(hex, { type: "bytes" });
  }
  return nativeToScVal(a);
}

/** Build a contract call operation XDR. */
function buildOp(contractId: string, method: string, args: any[]): string {
  return Operation.invokeContractFunction({
    contract: contractId,
    function: method,
    args: args.map(scValFor),
  }).toXDR("base64");
}

/** Submit an RPC request. */
async function rpc(method: string, params: any): Promise<any> {
  const res = await fetch(TESTNET_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

// --- Queries (read-only, simulate then discard) ---

async function simulateQuery(contractId: string, method: string, args: any[]): Promise<any> {
  const opXdr = buildOp(contractId, method, args);
  const result = await rpc("simulateTransaction", { transaction: opXdr });
  if (result.error) throw new Error(JSON.stringify(result.error));
  return result;
}

export async function queryAgent(agentId: string): Promise<AgentInfo | null> {
  try {
    const config = getConfigOrThrow();
    const data = await simulateQuery(config.contracts.agent_registry.id, "get_agent", [agentId]);
    if (data?.retval) return scValToNative(data.retval) as AgentInfo;
    return null;
  } catch {
    return null;
  }
}

export async function queryBudget(agentId: string): Promise<Budget | null> {
  try {
    const config = getConfigOrThrow();
    const data = await simulateQuery(config.contracts.budget_policy.id, "get_budget", [agentId]);
    if (data?.retval) return scValToNative(data.retval) as Budget;
    return null;
  } catch {
    return null;
  }
}

// --- Writes (simulate → build transaction → return XDR for signing) ---

/**
 * Build a signed XDR for a contract write call.
 * Returns the base64 XDR string ready for `sendTransaction`.
 */
export async function buildWriteTx(
  source: string,
  contractId: string,
  method: string,
  args: any[],
  networkPassphrase: string,
): Promise<string> {
  const opXdr = buildOp(contractId, method, args);

  // 1. Simulate to get footprint + resource fees
  const sim = await rpc("simulateTransaction", { transaction: opXdr });

  if (!sim) throw new Error("Simulation failed");

  // 2. Build the full transaction
  const seq = await getSeq(source);
  const data = new SorobanDataBuilder();
  if (sim.footprint) data.setFootprint(sim.footprint);
  data.setResourceFee(Number(sim.minResourceFee || "100"));

  const tx = new TransactionBuilder(
    { accountId: () => source, sequenceNumber: () => seq } as any,
    {
      fee: String(sim.minResourceFee || "100"),
      networkPassphrase,
      sorobanData: data.build(),
    },
  )
    .addOperation(Operation.invokeContractFunction({
      contract: contractId,
      function: method,
      args: args.map(scValFor),
    }))
    .setTimeout(30)
    .build();

  return tx.toXDR();
}

async function getSeq(source: string): Promise<string> {
  try {
    const result = await rpc("getLedgerEntries", {
      keys: [{ key: source, type: "account" }],
    });
    if (result?.entries?.[0]?.lastModifiedLedgerSeq) {
      return String(result.entries[0].lastModifiedLedgerSeq);
    }
  } catch {
    // fall through
  }
  return "0";
}
