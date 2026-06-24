#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Budget {
    pub agent_id: Address,
    pub per_tx_limit: i128,
    pub daily_limit: i128,
    pub spent_today: i128,
    pub day_window_start: u64,
}

const BUDGET_KEY: Symbol = symbol_short!("BUDGET");

#[contract]
pub struct BudgetPolicy;

#[contractimpl]
impl BudgetPolicy {
    pub fn set_budget(
        env: Env,
        agent_id: Address,
        _owner: Address,
        per_tx_limit: i128,
        daily_limit: i128,
    ) {
        if per_tx_limit <= 0 || daily_limit <= 0 {
            panic!("limits must be positive");
        }

        let budget = Budget {
            agent_id: agent_id.clone(),
            per_tx_limit,
            daily_limit,
            spent_today: 0,
            day_window_start: env.ledger().timestamp(),
        };

        let key = (BUDGET_KEY, agent_id.clone());
        env.storage().instance().set(&key, &budget);

        env.events().publish(
            (symbol_short!("bdgt_set"), agent_id),
            (per_tx_limit, daily_limit),
        );
    }

    pub fn check_and_reserve(env: Env, agent_id: Address, amount: i128) -> bool {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let key = (BUDGET_KEY, agent_id.clone());
        let mut budget: Budget = match env.storage().instance().get(&key) {
            Some(b) => b,
            None => return false,
        };

        if amount > budget.per_tx_limit {
            env.events().publish(
                (symbol_short!("bdgt_exc"), agent_id),
                (amount, budget.per_tx_limit),
            );
            return false;
        }

        let current_ts = env.ledger().timestamp();
        let day_seconds: u64 = 86400;
        if current_ts > budget.day_window_start + day_seconds {
            budget.spent_today = 0;
            budget.day_window_start = current_ts;
        }

        if budget.spent_today + amount > budget.daily_limit {
            env.events().publish(
                (symbol_short!("bdgt_exc"), agent_id),
                (budget.spent_today + amount, budget.daily_limit),
            );
            return false;
        }

        budget.spent_today += amount;
        env.storage().instance().set(&key, &budget);

        env.events().publish(
            (symbol_short!("bdgt_res"), agent_id),
            (amount, budget.spent_today),
        );

        true
    }

    pub fn get_budget(env: Env, agent_id: Address) -> Budget {
        let key = (BUDGET_KEY, agent_id);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("budget not found for agent"))
    }
}
mod test;
