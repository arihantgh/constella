#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, Symbol,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgentInfo {
    pub agent_id: Address,
    pub owner: Address,
    pub metadata: Bytes,
    pub active: bool,
    pub created_at: u64,
}

const AGENT_KEY: Symbol = symbol_short!("AGENT");

#[contract]
pub struct AgentRegistry;

#[contractimpl]
impl AgentRegistry {
    pub fn register_agent(env: Env, agent_id: Address, owner: Address, metadata: Bytes) -> bool {
        let key = (AGENT_KEY, agent_id.clone());
        if env.storage().instance().has(&key) {
            panic!("agent already registered");
        }

        let info = AgentInfo {
            agent_id: agent_id.clone(),
            owner: owner.clone(),
            metadata: metadata.clone(),
            active: true,
            created_at: env.ledger().timestamp(),
        };
        env.storage().instance().set(&key, &info);

        env.events()
            .publish((symbol_short!("agent_reg"), agent_id), (owner, metadata));
        true
    }

    pub fn deactivate_agent(env: Env, agent_id: Address, caller: Address) {
        let key = (AGENT_KEY, agent_id.clone());
        let mut info: AgentInfo = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("agent not found"));

        if info.owner != caller {
            panic!("only the owner can deactivate");
        }

        info.active = false;
        env.storage().instance().set(&key, &info);
        env.events()
            .publish((symbol_short!("agent_dea"), agent_id), ());
    }

    pub fn is_active(env: Env, agent_id: Address) -> bool {
        let key = (AGENT_KEY, agent_id);
        let info: Option<AgentInfo> = env.storage().instance().get(&key);
        match info {
            Some(info) => info.active,
            None => false,
        }
    }

    pub fn get_agent(env: Env, agent_id: Address) -> AgentInfo {
        let key = (AGENT_KEY, agent_id);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("agent not found"))
    }
}

mod test;
