#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Bytes, Env};

#[test]
fn test_register_and_get_agent() {
    let env = Env::default();
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);
    let metadata = Bytes::from_slice(&env, b"test-agent-metadata");

    client.register_agent(&agent_id, &owner, &metadata);

    let info = client.get_agent(&agent_id);
    assert_eq!(info.agent_id, agent_id);
    assert_eq!(info.owner, owner);
    assert_eq!(info.metadata, metadata);
    assert!(info.active);
}

#[test]
fn test_is_active_for_registered_agent() {
    let env = Env::default();
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);
    let metadata = Bytes::from_slice(&env, b"test");

    client.register_agent(&agent_id, &owner, &metadata);
    assert!(client.is_active(&agent_id));
}

#[test]
fn test_is_active_for_unregistered_agent() {
    let env = Env::default();
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    assert!(!client.is_active(&agent_id));
}

#[test]
fn test_register_duplicate_agent_panics() {
    let env = Env::default();
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);
    let metadata = Bytes::from_slice(&env, b"test");

    client.register_agent(&agent_id, &owner, &metadata);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.register_agent(&agent_id, &owner, &metadata);
    }));
    assert!(result.is_err());
}

#[test]
fn test_deactivate_agent() {
    let env = Env::default();
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);
    let metadata = Bytes::from_slice(&env, b"test");

    client.register_agent(&agent_id, &owner, &metadata);
    client.deactivate_agent(&agent_id, &owner);

    assert!(!client.is_active(&agent_id));
    let info = client.get_agent(&agent_id);
    assert!(!info.active);
}

#[test]
fn test_deactivate_with_wrong_owner_panics() {
    let env = Env::default();
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let owner = Address::generate(&env);
    let wrong_caller = Address::generate(&env);
    let metadata = Bytes::from_slice(&env, b"test");

    client.register_agent(&agent_id, &owner, &metadata);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.deactivate_agent(&agent_id, &wrong_caller);
    }));
    assert!(result.is_err());
}

#[test]
fn test_get_nonexistent_agent_panics() {
    let env = Env::default();
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    let agent_id = Address::generate(&env);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.get_agent(&agent_id);
    }));
    assert!(result.is_err());
}
