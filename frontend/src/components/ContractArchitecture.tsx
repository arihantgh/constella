import { DEFAULT_CONTRACTS } from "@/lib/constants";

const contracts = DEFAULT_CONTRACTS.contracts;

export function ContractArchitecture() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-200">Contract Architecture</h3>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span className="rounded bg-gray-800 px-2 py-1">{contracts.agent_registry.name}</span>
        <span>→</span>
        <span className="rounded bg-gray-800 px-2 py-1">{contracts.budget_policy.name}</span>
        <span>→</span>
        <span className="rounded bg-gray-800 px-2 py-1">{contracts.payment.name}</span>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Payment verifies the agent through the registry, checks budget through the policy, then transfers tokens via the Stellar Asset Contract.
      </p>
    </div>
  );
}
