import type { ContractConfig } from "./types";
import { DEFAULT_CONTRACTS, TESTNET_RPC_URL, TESTNET_NETWORK_PASSPHRASE } from "./constants";

export function getConfig(): ContractConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("contracts");
      if (stored) {
        const parsed = JSON.parse(stored) as ContractConfig;
        if (parsed.contracts?.agent_registry?.id) return parsed;
      }
    } catch {
      // fall through
    }
  }

  const hasEnvContracts =
    process.env.NEXT_PUBLIC_AGENT_REGISTRY_ID &&
    process.env.NEXT_PUBLIC_BUDGET_POLICY_ID &&
    process.env.NEXT_PUBLIC_PAYMENT_ID;

  if (hasEnvContracts) {
    return {
      network_passphrase: TESTNET_NETWORK_PASSPHRASE,
      rpc_url: TESTNET_RPC_URL,
      contracts: {
        agent_registry: {
          id: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ID!,
          name: "Agent Registry",
        },
        budget_policy: {
          id: process.env.NEXT_PUBLIC_BUDGET_POLICY_ID!,
          name: "Budget Policy",
        },
        payment: {
          id: process.env.NEXT_PUBLIC_PAYMENT_ID!,
          name: "Payment",
        },
      },
    };
  }

  return DEFAULT_CONTRACTS;
}

export function setConfig(config: ContractConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("contracts", JSON.stringify(config));
  }
}
