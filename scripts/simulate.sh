#!/usr/bin/env bash
set -euo pipefail

# constella — Agent Simulator
# Creates two agents, funds them, sets budgets, and fires periodic
# payments. Uses a Node.js script under the hood so we can talk to
# Soroban RPC directly.
#
# Usage:
#   ./scripts/simulate.sh \
#     --secret KEYPAIR_SECRET \
#     [--rpc https://soroban-testnet.stellar.org] \
#     [--interval 30]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Forward all args to the Node.js runner
exec node scripts/simulate.mjs "$@"
