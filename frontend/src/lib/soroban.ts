import {
  nativeToScVal,
  scValToNative,
  Operation,
  TransactionBuilder,
  rpc as stellarRpc,
  Account,
} from "@stellar/stellar-sdk";
import type { ContractConfig, AgentInfo, Budget, PaymentRecord } from "./types";
import { TESTNET_RPC_URL, TESTNET_NETWORK_PASSPHRASE } from "./constants";
import { getConfig } from "./config";

const server = new stellarRpc.Server(TESTNET_RPC_URL);

const NATIVE_XLM_TOKEN = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4";

function getConfigOrThrow(): ContractConfig {
  const c = getConfig();
  if (
    !c.contracts.agent_registry.id ||
    !c.contracts.budget_policy.id ||
    !c.contracts.payment.id
  ) {
    throw new Error("Contracts not configured. Set env vars or update constants.");
  }
  return c;
}

function scValFor(a: unknown): unknown {
  if (typeof a === "string") a = a.trim();
  if (typeof a === "string" && a.startsWith("G") && a.length === 56)
    return nativeToScVal(a, { type: "address" });
  if (typeof a === "string" && a.startsWith("C"))
    return nativeToScVal(a, { type: "address" });
  if (typeof a === "number")
    return nativeToScVal(String(a), { type: "i128" });
  if (a instanceof Uint8Array)
    return nativeToScVal(a, { type: "bytes" });
  if (typeof a === "string")
    return nativeToScVal(a, { type: "symbol" });
  return nativeToScVal(a as Parameters<typeof nativeToScVal>[0]);
}

function buildArgs(args: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return args.map(scValFor) as any;
}

function makeSimulationTx(contractId: string, method: string, args: unknown[]) {
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

// ---------------------------------------------------------------------------
// Queries (read-only — simulated against RPC, no signing)
// ---------------------------------------------------------------------------

const CACHE_TTL = 30_000;

const queryCache = new Map<string, { ts: number; val: unknown }>();

function cacheGet<T>(key: string): T | undefined {
  const e = queryCache.get(key);
  if (e && Date.now() - e.ts < CACHE_TTL) return e.val as T;
  queryCache.delete(key);
  return undefined;
}

function cacheSet(key: string, val: unknown) {
  queryCache.set(key, { ts: Date.now(), val });
}

export async function queryAgent(agentId: string): Promise<AgentInfo | null> {
  const key = `agent:${agentId}`;
  const cached = cacheGet<AgentInfo>(key);
  if (cached) return cached;

  try {
    const config = getConfigOrThrow();
    const tx = makeSimulationTx(config.contracts.agent_registry.id, "get_agent", [agentId]);
    const sim = await server.simulateTransaction(tx);
    if ("error" in sim) return null;
    if (!sim.result?.retval) return null;
    const raw = scValToNative(sim.result.retval) as AgentInfo;
    cacheSet(key, raw);
    return raw;
  } catch {
    return null;
  }
}

export async function queryAgentIsActive(agentId: string): Promise<boolean> {
  try {
    const config = getConfigOrThrow();
    const tx = makeSimulationTx(config.contracts.agent_registry.id, "is_active", [agentId]);
    const sim = await server.simulateTransaction(tx);
    if ("error" in sim) return false;
    if (!sim.result?.retval) return false;
    return scValToNative(sim.result.retval) as boolean;
  } catch {
    return false;
  }
}

export async function queryBudget(agentId: string): Promise<Budget | null> {
  try {
    const config = getConfigOrThrow();
    const tx = makeSimulationTx(config.contracts.budget_policy.id, "get_budget", [agentId]);
    const sim = await server.simulateTransaction(tx);
    if ("error" in sim) return null;
    if (!sim.result?.retval) return null;
    const raw = scValToNative(sim.result.retval) as Budget;
    return raw;
  } catch {
    return null;
  }
}

export async function queryPayment(paymentId: number): Promise<PaymentRecord | null> {
  try {
    const config = getConfigOrThrow();
    const tx = makeSimulationTx(
      config.contracts.payment.id,
      "get_payment",
      [paymentId],
    );
    const sim = await server.simulateTransaction(tx);
    if ("error" in sim) return null;
    if (!sim.result?.retval) return null;
    return scValToNative(sim.result.retval) as PaymentRecord;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Writes (prepare → return XDR for signing via Freighter)
// ---------------------------------------------------------------------------

export async function buildWriteTx(
  source: string,
  contractId: string,
  method: string,
  args: unknown[],
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

export async function buildRegisterAgentTx(
  source: string,
  agentId: string,
  owner: string,
  metadata: string,
  networkPassphrase: string,
): Promise<string> {
  const config = getConfigOrThrow();
  return buildWriteTx(
    source,
    config.contracts.agent_registry.id,
    "register_agent",
    [agentId, owner, new TextEncoder().encode(metadata || "")],
    networkPassphrase,
  );
}

export async function buildDeactivateAgentTx(
  source: string,
  agentId: string,
  networkPassphrase: string,
): Promise<string> {
  const config = getConfigOrThrow();
  return buildWriteTx(
    source,
    config.contracts.agent_registry.id,
    "deactivate_agent",
    [agentId, source],
    networkPassphrase,
  );
}

export async function buildSetBudgetTx(
  source: string,
  agentId: string,
  perTxLimit: string,
  dailyLimit: string,
  networkPassphrase: string,
): Promise<string> {
  const config = getConfigOrThrow();
  return buildWriteTx(
    source,
    config.contracts.budget_policy.id,
    "set_budget",
    [agentId, source, Number(perTxLimit), Number(dailyLimit)],
    networkPassphrase,
  );
}

export async function buildCreatePaymentTx(
  source: string,
  fromAgent: string,
  toAgent: string,
  amount: string,
  taskRef: string,
  networkPassphrase: string,
): Promise<string> {
  const config = getConfigOrThrow();
  return buildWriteTx(
    source,
    config.contracts.payment.id,
    "create_payment",
    [
      fromAgent,
      toAgent,
      Number(amount),
      NATIVE_XLM_TOKEN,
      new TextEncoder().encode(taskRef || ""),
    ],
    networkPassphrase,
  );
}

export async function buildExecutePaymentTx(
  source: string,
  paymentId: number,
  networkPassphrase: string,
): Promise<string> {
  const config = getConfigOrThrow();
  return buildWriteTx(
    source,
    config.contracts.payment.id,
    "execute_payment",
    [
      paymentId,
      config.contracts.agent_registry.id,
      config.contracts.budget_policy.id,
      NATIVE_XLM_TOKEN,
    ],
    networkPassphrase,
  );
}

export async function buildRefundPaymentTx(
  source: string,
  paymentId: number,
  networkPassphrase: string,
): Promise<string> {
  const config = getConfigOrThrow();
  return buildWriteTx(
    source,
    config.contracts.payment.id,
    "refund_payment",
    [paymentId, source],
    networkPassphrase,
  );
}

export { NATIVE_XLM_TOKEN };
