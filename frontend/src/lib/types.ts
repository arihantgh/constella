export interface ContractEntry {
  id: string;
  name: string;
}

export interface ContractConfig {
  network_passphrase: string;
  rpc_url: string;
  contracts: {
    agent_registry: ContractEntry;
    budget_policy: ContractEntry;
    payment: ContractEntry;
  };
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  network: string | null;
}

export interface AgentInfo {
  agent_id: string;
  owner: string;
  metadata: string;
  active: boolean;
  created_at: number;
}

export interface Budget {
  agent_id: string;
  per_tx_limit: string;
  daily_limit: string;
  spent_today: string;
  day_window_start: number;
}

export enum PaymentStatus {
  Pending = "Pending",
  Executed = "Executed",
  Refunded = "Refunded",
  Rejected = "Rejected",
}

export interface PaymentRecord {
  id: string;
  from_agent: string;
  to_agent: string;
  amount: string;
  token: string;
  task_ref: string;
  status: PaymentStatus;
  created_at: number;
}
