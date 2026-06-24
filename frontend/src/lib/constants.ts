import type { ContractConfig } from "./types";

// Default contract addresses — update after deploying to Testnet
// or set via NEXT_PUBLIC_CONTRACTS_JSON env var
export const DEFAULT_CONTRACTS: ContractConfig = {
  network_passphrase: "Test SDF Network ; September 2015",
  rpc_url: "https://soroban-testnet.stellar.org",
  contracts: {
    agent_registry: { id: "", name: "Agent Registry" },
    budget_policy: { id: "", name: "Budget Policy" },
    payment: { id: "", name: "Payment" },
  },
};

export const TESTNET_NETWORK = "TESTNET";
export const TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
