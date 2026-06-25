/**
 * Typed Soroban contract bindings for constella.
 *
 * These mirror the Rust contract interfaces (see docs/architecture.md)
 * and should be kept in sync with contracts/*/src/lib.rs.
 *
 * Generated from contract source — update when contract interfaces change.
 */

// ── Agent Registry ───────────────────────────────────────────

export interface AgentInfo {
  agent_id: string;
  owner: string;
  metadata: string;
  active: boolean;
  created_at: number;
}

export type AgentRegistryMethod =
  | "register_agent"
  | "deactivate_agent"
  | "is_active"
  | "get_agent";

export type AgentRegistryArgs = {
  register_agent: [agentId: string, owner: string, metadata: string];
  deactivate_agent: [agentId: string, caller: string];
  is_active: [agentId: string];
  get_agent: [agentId: string];
};

// ── Budget Policy ────────────────────────────────────────────

export interface Budget {
  agent_id: string;
  per_tx_limit: bigint;
  daily_limit: bigint;
  spent_today: bigint;
  day_window_start: number;
}

export type BudgetPolicyMethod =
  | "set_budget"
  | "check_and_reserve"
  | "get_budget";

export type BudgetPolicyArgs = {
  set_budget: [
    agentId: string,
    owner: string,
    perTxLimit: string,
    dailyLimit: string,
  ];
  check_and_reserve: [agentId: string, amount: string];
  get_budget: [agentId: string];
};

// ── Payment / Escrow ─────────────────────────────────────────

export type PaymentStatus =
  | "Pending"
  | "Executed"
  | "Refunded"
  | "Rejected";

export interface PaymentRecord {
  id: number;
  from_agent: string;
  to_agent: string;
  amount: bigint;
  token: string;
  task_ref: string;
  status: PaymentStatus;
  created_at: number;
}

export type PaymentMethod =
  | "create_payment"
  | "execute_payment"
  | "refund_payment"
  | "get_payment";

export type PaymentArgs = {
  create_payment: [
    fromAgent: string,
    toAgent: string,
    amount: string,
    token: string,
    taskRef: string,
  ];
  execute_payment: [
    paymentId: number,
    agentRegistryId: string,
    budgetPolicyId: string,
    tokenId: string,
  ];
  refund_payment: [paymentId: number, caller: string];
  get_payment: [paymentId: number];
};

// ── Event types (matching Soroban event topics) ──────────────

export type ContractEvent =
  | { topic: "agent_reg"; data: [owner: string, metadata: string] }
  | { topic: "agent_dea"; data: [] }
  | { topic: "bdgt_set"; data: [perTxLimit: bigint, dailyLimit: bigint] }
  | { topic: "bdgt_res"; data: [amount: bigint, spentToday: bigint] }
  | { topic: "bdgt_exc"; data: [attempted: bigint, limit: bigint] }
  | { topic: "pay_creat"; data: [from: string, to: string, amount: bigint] }
  | {
      topic: "pay_exec";
      data: [from: string, to: string, amount: bigint];
    }
  | { topic: "pay_rejct"; data: [reason: string, detail: string] }
  | { topic: "pay_refnd"; data: [from: string, to: string, amount: bigint] };
