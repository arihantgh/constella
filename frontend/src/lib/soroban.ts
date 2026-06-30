import {
  nativeToScVal,
  scValToNative,
  Operation,
  TransactionBuilder,
  rpc,
  Account,
} from "@stellar/stellar-sdk";
import type { ContractConfig, AgentInfo, Budget } from "./types";
import { TESTNET_RPC_URL, TESTNET_NETWORK_PASSPHRASE } from "./constants";
import { getConfig } from "./config";

const server = new rpc.Server(TESTNET_RPC_URL);

function getConfigOrThrow(): ContractConfig {
  const c = getConfig();
  if (!c.contracts.agent_registry.id) throw new Error("Contracts not configured");
  return c;
}

function scValFor(a: any): any {
  if (typeof a === "string") a = a.trim();
  if (typeof a === "string" && (a.startsWith("G") || a.startsWith("C")) && a.length === 56)
    return nativeToScVal(a, { type: "address" });
  if (typeof a === "number")
    return nativeToScVal(String(a), { type: "i128" });
  if (a instanceof Uint8Array)
    return nativeToScVal(a, { type: "bytes" });
  if (typeof a === "string")
    return nativeToScVal(a, { type: "symbol" });
  return nativeToScVal(a);
}

/** Build contract call ScVal args. */
function buildArgs(args: any[]) {
  return args.map(scValFor);
}

function makeSimulationTx(contractId: string, method: string, args: any[]) {
  // For simulation, we don't need a real funded account — any valid source works.
  // Use a well-known Testnet account as the dummy source.
  const DUMMY_SOURCE = "GB3KJPLFUYN5VL6R3GU3EGCGVCKFDSD7BEDX42HWG5BWFKB3KQGJJRMA";
  return new TransactionBuilder(
    new Account(DUMMY_SOURCE, "0"),
    { fee: "100", networkPassphrase: TESTNET_NETWORK_PASSPHRASE },
  )
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: method,
        args: buildArgs(args),
      }),
    )
    .setTimeout(30)
    .build();
}

// --- Queries (read-only) ---

export async function queryAgent(agentId: string): Promise<AgentInfo | null> {
  try {
    const config = getConfigOrThrow();
    const tx = makeSimulationTx(config.contracts.agent_registry.id, "get_agent", [agentId]);
    const sim = await server.simulateTransaction(tx);
    if ("error" in sim) return null;
    if (!sim.result?.retval) return null;
    const raw = scValToNative(sim.result.retval);
    return raw as AgentInfo;
  } catch {
    return null;
  }
}

export async function queryBudget(agentId: string): Promise<Budget | null> {
  try {
    const config = getConfigOrThrow();
    const tx = makeSimulationTx(config.contracts.budget_policy.id, "get_budget", [agentId]);
    const sim = await server.simulateTransaction(tx);
    if ("error" in sim) throw new Error(typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error));
    if (sim.result?.retval) return scValToNative(sim.result.retval) as Budget;
    return null;
  } catch {
    return null;
  }
}

// --- Writes (prepare → return XDR for signing) ---

export async function buildWriteTx(
  source: string,
  contractId: string,
  method: string,
  args: any[],
  networkPassphrase: string,
): Promise<string> {
  const account = await server.getAccount(source);
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: method,
        args: buildArgs(args),
      }),
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}
