#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, MuxedAddress, Symbol,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PaymentStatus {
    Pending,
    Executed,
    Refunded,
    Rejected,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRecord {
    pub id: u64,
    pub from_agent: Address,
    pub to_agent: Address,
    pub amount: i128,
    pub token: Address,
    pub task_ref: Bytes,
    pub status: PaymentStatus,
    pub created_at: u64,
}

const PAYMENT_KEY: Symbol = symbol_short!("PAYMENT");
const NEXT_ID_KEY: Symbol = symbol_short!("NEXT_ID");

#[contract]
pub struct Payment;

#[contractimpl]
impl Payment {
    pub fn create_payment(
        env: Env,
        from_agent: Address,
        to_agent: Address,
        amount: i128,
        token: Address,
        task_ref: Bytes,
    ) -> u64 {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let payment_id = Self::get_next_id(&env);
        Self::increment_next_id(&env);

        let record = PaymentRecord {
            id: payment_id,
            from_agent: from_agent.clone(),
            to_agent: to_agent.clone(),
            amount,
            token: token.clone(),
            task_ref: task_ref.clone(),
            status: PaymentStatus::Pending,
            created_at: env.ledger().timestamp(),
        };

        let key = (PAYMENT_KEY, payment_id);
        env.storage().instance().set(&key, &record);

        env.events().publish(
            (symbol_short!("pay_creat"), payment_id),
            (from_agent, to_agent, amount),
        );

        payment_id
    }

    pub fn execute_payment(
        env: Env,
        payment_id: u64,
        agent_registry_id: Address,
        budget_policy_id: Address,
        token_id: Address,
    ) -> bool {
        let key = (PAYMENT_KEY, payment_id);
        let mut record: PaymentRecord = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("payment not found"));

        if record.status != PaymentStatus::Pending {
            panic!("payment is not in pending state");
        }

        let registry_client = agent_registry::Client::new(&env, &agent_registry_id);
        if !registry_client.is_active(&record.from_agent) {
            record.status = PaymentStatus::Rejected;
            env.storage().instance().set(&key, &record);
            env.events().publish(
                (symbol_short!("pay_rejct"), payment_id),
                (symbol_short!("inactive"), record.from_agent),
            );
            return false;
        }

        if !registry_client.is_active(&record.to_agent) {
            record.status = PaymentStatus::Rejected;
            env.storage().instance().set(&key, &record);
            env.events().publish(
                (symbol_short!("pay_rejct"), payment_id),
                (symbol_short!("inactive"), record.to_agent),
            );
            return false;
        }

        let budget_client = budget_policy::Client::new(&env, &budget_policy_id);
        if !budget_client.check_and_reserve(&record.from_agent, &record.amount) {
            record.status = PaymentStatus::Rejected;
            env.storage().instance().set(&key, &record);
            env.events().publish(
                (symbol_short!("pay_rejct"), payment_id),
                (symbol_short!("bdgt_exc"), record.amount),
            );
            return false;
        }

        // Require auth from the sender so the token contract accepts the transfer
        record.from_agent.require_auth();

        let token_client = soroban_sdk::token::Client::new(&env, &token_id);
        let to_muxed: MuxedAddress = record.to_agent.clone().into();
        token_client.transfer(&record.from_agent, &to_muxed, &record.amount);

        record.status = PaymentStatus::Executed;
        env.storage().instance().set(&key, &record);

        env.events().publish(
            (symbol_short!("pay_exec"), payment_id),
            (record.from_agent, record.to_agent, record.amount),
        );

        true
    }

    pub fn refund_payment(env: Env, payment_id: u64, caller: Address) -> bool {
        let key = (PAYMENT_KEY, payment_id);
        let mut record: PaymentRecord = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("payment not found"));

        if record.status != PaymentStatus::Executed {
            panic!("only executed payments can be refunded");
        }

        if record.from_agent != caller {
            panic!("only the sender can refund");
        }

        record.status = PaymentStatus::Refunded;
        env.storage().instance().set(&key, &record);

        env.events().publish(
            (symbol_short!("pay_refnd"), payment_id),
            (record.from_agent, record.to_agent, record.amount),
        );

        true
    }

    pub fn get_payment(env: Env, payment_id: u64) -> PaymentRecord {
        let key = (PAYMENT_KEY, payment_id);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("payment not found"))
    }

    fn get_next_id(env: &Env) -> u64 {
        let val: Option<u64> = env.storage().instance().get(&NEXT_ID_KEY);
        val.unwrap_or(1u64)
    }

    fn increment_next_id(env: &Env) {
        let next = Self::get_next_id(env) + 1;
        env.storage().instance().set(&NEXT_ID_KEY, &next);
    }
}

mod agent_registry {
    soroban_sdk::contractimport!(file = "../target/wasm32v1-none/release/agent_registry.wasm");
}

mod budget_policy {
    soroban_sdk::contractimport!(file = "../target/wasm32v1-none/release/budget_policy.wasm");
}

mod test;
