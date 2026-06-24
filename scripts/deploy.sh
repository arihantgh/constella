#!/usr/bin/env bash
set -euo pipefail

# constella — Testnet deployment script
# Deploys all three Soroban contracts to Stellar Testnet and writes
# contract addresses to contracts.json.
#
# Prerequisites:
#   - soroban CLI installed
#   - Freighter or source account funded on Testnet
#   - soroban config directory set up (or use --source-account flag)
#
# Usage:
#   ./scripts/deploy.sh [--source-account <ACCOUNT_ID>] [--rpc-url <URL>] [--network-passphrase <PASSPHRASE>]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$PROJECT_DIR/contracts"
OUTPUT_FILE="$PROJECT_DIR/scripts/contracts.json"

# Default Testnet config
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-}"
RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"

# Parse CLI args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --source-account) SOURCE_ACCOUNT="$2"; shift 2;;
        --rpc-url) RPC_URL="$2"; shift 2;;
        --network-passphrase) NETWORK_PASSPHRASE="$2"; shift 2;;
        *) echo "Unknown option: $1"; exit 1;;
    esac
done

if [[ -z "$SOURCE_ACCOUNT" ]]; then
    echo "Error: --source-account is required"
    echo "Usage: ./scripts/deploy.sh --source-account <ACCOUNT_ID>"
    exit 1
fi

SOROBAN_ARGS=(
    --source-account "$SOURCE_ACCOUNT"
    --rpc-url "$RPC_URL"
    --network-passphrase "$NETWORK_PASSPHRASE"
)

echo "🚀 constella — Testnet Deployment"
echo "   RPC:  $RPC_URL"
echo "   Network: $NETWORK_PASSPHRASE"
echo "   Source: $SOURCE_ACCOUNT"
echo ""

# Step 1: Build contracts
echo "🔨 Building contracts..."
cd "$CONTRACTS_DIR"
soroban contract build --package agent-registry
soroban contract build --package budget-policy
soroban contract build --package payment

# Step 2: Deploy Agent Registry
echo ""
echo "📦 Deploying Agent Registry..."
REGISTRY_ADDRESS=$(soroban contract deploy \
    "${SOROBAN_ARGS[@]}" \
    --wasm "$CONTRACTS_DIR/target/wasm32v1-none/release/agent_registry.wasm"
)
echo "   Agent Registry: $REGISTRY_ADDRESS"

# Step 3: Deploy Budget Policy
echo ""
echo "📦 Deploying Budget Policy..."
BUDGET_ADDRESS=$(soroban contract deploy \
    "${SOROBAN_ARGS[@]}" \
    --wasm "$CONTRACTS_DIR/target/wasm32v1-none/release/budget_policy.wasm"
)
echo "   Budget Policy: $BUDGET_ADDRESS"

# Step 4: Deploy Payment
echo ""
echo "📦 Deploying Payment..."
PAYMENT_ADDRESS=$(soroban contract deploy \
    "${SOROBAN_ARGS[@]}" \
    --wasm "$CONTRACTS_DIR/target/wasm32v1-none/release/payment.wasm"
)
echo "   Payment: $PAYMENT_ADDRESS"

# Step 5: Initialize contracts (no-arg constructors — no init needed for these)
# All contracts use default initialization. Writes below for future use.

# Step 6: Write contracts.json
echo ""
echo "📝 Writing $OUTPUT_FILE..."
cat > "$OUTPUT_FILE" <<EOF
{
  "network_passphrase": "$NETWORK_PASSPHRASE",
  "rpc_url": "$RPC_URL",
  "contracts": {
    "agent_registry": {
      "id": "$REGISTRY_ADDRESS",
      "name": "Agent Registry"
    },
    "budget_policy": {
      "id": "$BUDGET_ADDRESS",
      "name": "Budget Policy"
    },
    "payment": {
      "id": "$PAYMENT_ADDRESS",
      "name": "Payment"
    }
  },
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "✅ Deployment complete!"
echo ""
echo "📋 Summary:"
echo "   Agent Registry: $REGISTRY_ADDRESS"
echo "   Budget Policy:  $BUDGET_ADDRESS"
echo "   Payment:        $PAYMENT_ADDRESS"
echo ""
echo "   Addresses written to: $OUTPUT_FILE"
