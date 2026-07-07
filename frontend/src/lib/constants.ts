import type { ContractConfig } from "./types";

export const DEFAULT_CONTRACTS: ContractConfig = {
  network_passphrase: "Test SDF Network ; September 2015",
  rpc_url: "https://soroban-testnet.stellar.org",
  contracts: {
    agent_registry: {
      id: "CCGU7AL3TEY4437642KZ35VRKDGI3HLVNIGA2MRI4X3ADNUVD4SGSWPR",
      name: "Agent Registry",
    },
    budget_policy: {
      id: "CCXOG3GGOPRPWX2ICTNOT6EVE73YPLC6SVQJNIY4KKXF5IMDT6ONFODA",
      name: "Budget Policy",
    },
    payment: {
      id: "CA6LGV5R6R4YLBXCEZM5D5FZJBOOH3UHR3OCHRPDTJPAMY3MUZQLCHKJ",
      name: "Payment",
    },
  },
};

export const TESTNET_NETWORK = "TESTNET";
export const TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

export const NETWORK = {
  rpc: TESTNET_RPC_URL,
  passphrase: TESTNET_NETWORK_PASSPHRASE,
  network: TESTNET_NETWORK,
} as const;
