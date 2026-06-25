#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{token, Bytes, Env};

fn create_test_env() -> (
    Env,
    agent_registry::Client<'static>,
    budget_policy::Client<'static>,
    PaymentClient<'static>,
    Address,
    Address,
    Address,
    Address,
    Address,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let from_agent = Address::generate(&env);
    let from_owner = Address::generate(&env);
    let to_agent = Address::generate(&env);
    let to_owner = Address::generate(&env);

    let registry_id = env.register(agent_registry::WASM, ());
    let registry_client = agent_registry::Client::new(&env, &registry_id);

    let budget_id = env.register(budget_policy::WASM, ());
    let budget_client = budget_policy::Client::new(&env, &budget_id);

    let payment_id = env.register(Payment, ());
    let payment_client = PaymentClient::new(&env, &payment_id);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_id = sac.address();

    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    registry_client.register_agent(
        &from_agent,
        &from_owner,
        &Bytes::from_slice(&env, b"agent-a"),
    );
    registry_client.register_agent(&to_agent, &to_owner, &Bytes::from_slice(&env, b"agent-b"));
    budget_client.set_budget(&from_agent, &from_owner, &1000, &5000);
    token_admin_client.mint(&from_agent, &10000);

    (
        env,
        registry_client,
        budget_client,
        payment_client,
        registry_id,
        budget_id,
        payment_id,
        from_agent,
        to_agent,
        token_id,
    )
}

#[test]
fn test_create_and_get_payment() {
    let (_env, _rc, _bc, pc, _rid, _bid, _pid, from_agent, to_agent, token_id) = create_test_env();
    let task_ref = Bytes::from_slice(&_env, b"task-123");

    let pid = pc.create_payment(&from_agent, &to_agent, &500, &token_id, &task_ref);
    let record = pc.get_payment(&pid);

    assert_eq!(record.from_agent, from_agent);
    assert_eq!(record.to_agent, to_agent);
    assert_eq!(record.amount, 500);
    assert_eq!(record.task_ref, task_ref);
    assert_eq!(record.status, PaymentStatus::Pending);
}

#[test]
fn test_execute_payment_success() {
    let (_env, _rc, _bc, pc, rid, bid, _pid, from_agent, to_agent, token_id) = create_test_env();
    let task_ref = Bytes::from_slice(&_env, b"task-123");

    let pid = pc.create_payment(&from_agent, &to_agent, &500, &token_id, &task_ref);
    let result = pc.execute_payment(&pid, &rid, &bid, &token_id);
    assert!(result);

    let record = pc.get_payment(&pid);
    assert_eq!(record.status, PaymentStatus::Executed);
}

#[test]
fn test_execute_payment_budget_exceeded_rejected() {
    let (_env, _rc, _bc, pc, rid, bid, _pid, from_agent, to_agent, token_id) = create_test_env();
    let task_ref = Bytes::from_slice(&_env, b"task-123");

    let pid = pc.create_payment(&from_agent, &to_agent, &5000, &token_id, &task_ref);
    let result = pc.execute_payment(&pid, &rid, &bid, &token_id);
    assert!(!result);

    let record = pc.get_payment(&pid);
    assert_eq!(record.status, PaymentStatus::Rejected);
}

#[test]
fn test_execute_twice_panics() {
    let (_env, _rc, _bc, pc, rid, bid, _pid, from_agent, to_agent, token_id) = create_test_env();
    let task_ref = Bytes::from_slice(&_env, b"task-123");

    let pid = pc.create_payment(&from_agent, &to_agent, &500, &token_id, &task_ref);
    pc.execute_payment(&pid, &rid, &bid, &token_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        pc.execute_payment(&pid, &rid, &bid, &token_id);
    }));
    assert!(result.is_err());
}

#[test]
fn test_refund_payment() {
    let (_env, _rc, _bc, pc, rid, bid, _pid, from_agent, to_agent, token_id) = create_test_env();
    let task_ref = Bytes::from_slice(&_env, b"task-123");

    let pid = pc.create_payment(&from_agent, &to_agent, &500, &token_id, &task_ref);
    pc.execute_payment(&pid, &rid, &bid, &token_id);
    assert!(pc.refund_payment(&pid, &from_agent));

    let record = pc.get_payment(&pid);
    assert_eq!(record.status, PaymentStatus::Refunded);
}

#[test]
fn test_refund_by_non_sender_panics() {
    let (_env, _rc, _bc, pc, rid, bid, _pid, from_agent, to_agent, token_id) = create_test_env();
    let task_ref = Bytes::from_slice(&_env, b"task-123");
    let other = Address::generate(&_env);

    let pid = pc.create_payment(&from_agent, &to_agent, &500, &token_id, &task_ref);
    pc.execute_payment(&pid, &rid, &bid, &token_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        pc.refund_payment(&pid, &other);
    }));
    assert!(result.is_err());
}

#[test]
fn test_payment_events_emitted() {
    let (env, _rc, _bc, pc, rid, bid, _pid, from_agent, to_agent, token_id) = create_test_env();
    let task_ref = Bytes::from_slice(&env, b"task-123");

    let pid = pc.create_payment(&from_agent, &to_agent, &500, &token_id, &task_ref);
    pc.execute_payment(&pid, &rid, &bid, &token_id);

    let events = env.events().all();
    assert!(events.events().len() > 0);
}
