#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::Env;

#[test]
fn test_set_and_get_budget() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);
    let per_tx: i128 = 100;
    let daily: i128 = 1000;

    client.set_budget(&agent_id, &owner, &per_tx, &daily);

    let budget = client.get_budget(&agent_id);
    assert_eq!(budget.agent_id, agent_id);
    assert_eq!(budget.per_tx_limit, per_tx);
    assert_eq!(budget.daily_limit, daily);
    assert_eq!(budget.spent_today, 0);
}

#[test]
fn test_check_and_reserve_within_limits() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);

    client.set_budget(&agent_id, &owner, &500, &2000);
    assert!(client.check_and_reserve(&agent_id, &300));

    let budget = client.get_budget(&agent_id);
    assert_eq!(budget.spent_today, 300);
}

#[test]
fn test_check_and_reserve_exceeds_per_tx_limit() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);

    client.set_budget(&agent_id, &owner, &100, &1000);
    assert!(!client.check_and_reserve(&agent_id, &200));
}

#[test]
fn test_check_and_reserve_exceeds_daily_limit() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);

    client.set_budget(&agent_id, &owner, &500, &200);
    assert!(!client.check_and_reserve(&agent_id, &300));
}

#[test]
fn test_check_and_reserve_no_budget_set() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    assert!(!client.check_and_reserve(&agent_id, &100));
}

#[test]
fn test_multiple_reservations_within_daily_limit() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);

    client.set_budget(&agent_id, &owner, &300, &500);

    assert!(client.check_and_reserve(&agent_id, &200));
    assert!(client.check_and_reserve(&agent_id, &200));
    assert!(!client.check_and_reserve(&agent_id, &200));
}

#[test]
fn test_daily_limit_resets_after_window() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);

    // Set initial timestamp
    env.ledger().set_timestamp(1000);
    client.set_budget(&agent_id, &owner, &500, &200);

    // Spend 150
    assert!(client.check_and_reserve(&agent_id, &150));
    let budget = client.get_budget(&agent_id);
    assert_eq!(budget.spent_today, 150);

    // Advance time past the 24h window
    env.ledger().set_timestamp(1000 + 86401);

    // Should be allowed again because daily spend resets
    assert!(client.check_and_reserve(&agent_id, &150));
    let budget = client.get_budget(&agent_id);
    assert_eq!(budget.spent_today, 150);
}

#[test]
fn test_set_budget_with_zero_limits_panics() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.set_budget(&agent_id, &owner, &0, &1000);
    }));
    assert!(result.is_err());
}

#[test]
fn test_check_and_reserve_with_zero_amount_panics() {
    let env = Env::default();
    let contract_id = env.register(BudgetPolicy, ());
    let client = BudgetPolicyClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);

    client.set_budget(&agent_id, &owner, &500, &1000);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.check_and_reserve(&agent_id, &0);
    }));
    assert!(result.is_err());
}
