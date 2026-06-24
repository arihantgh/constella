import { Contract, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import type { ContractConfig, AgentInfo, Budget } from "./types";
import { DEFAULT_CONTRACTS, TESTNET_RPC_URL } from "./constants";

function getConfig(): ContractConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("contracts");
      if (stored) return JSON.parse(stored) as ContractConfig;
    } catch {
      // fall through
    }
  }
  return DEFAULT_CONTRACTS;
}

async function rpcCall(
  contractId: string,
  method: string,
  args: any[]
): Promise<any> {
  const contract = new Contract(contractId);
  const scValArgs = args.map((a) => {
    if (typeof a === "string") return nativeToScVal(a, { type: "address" });
    if (typeof a === "number" || typeof a === "bigint")
      return nativeToScVal(a.toString(), { type: "i128" });
    if (a instanceof Uint8Array)
      return nativeToScVal(Buffer.from(a).toString("hex"), {
        type: "bytes",
      });
    return nativeToScVal(a);
  });

  const xdr = contract.call(method, ...scValArgs).toXDR("base64");

  const response = await fetch(TESTNET_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: {
        transaction: xdr,
      },
    }),
  });

  const result = await response.json();
  return result?.result;
}

export async function queryAgent(agentId: string): Promise<AgentInfo | null> {
  try {
    const config = getConfig();
    const data = await rpcCall(config.contracts.agent_registry.id, "get_agent", [
      agentId,
    ]);
    if (data?.retval) return scValToNative(data.retval) as AgentInfo;
    return null;
  } catch {
    return null;
  }
}

export async function queryBudget(agentId: string): Promise<Budget | null> {
  try {
    const config = getConfig();
    const data = await rpcCall(config.contracts.budget_policy.id, "get_budget", [
      agentId,
    ]);
    if (data?.retval) return scValToNative(data.retval) as Budget;
    return null;
  } catch {
    return null;
  }
}
