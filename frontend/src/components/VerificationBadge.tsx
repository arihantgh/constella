import { DEFAULT_CONTRACTS } from "@/lib/constants";

function ExplorerLink({ label, id }: { label: string; id: string }) {
  return (
    <a
      href={`https://stellar.expert/explorer/testnet/contract/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-green-800 bg-green-900/20 px-2.5 py-1 text-xs text-green-300 hover:bg-green-900/30"
      title={`Verify ${label} on Stellar Expert`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      {label} verified on-chain
    </a>
  );
}

export function VerificationBadge() {
  const { budget_policy } = DEFAULT_CONTRACTS.contracts;
  return (
    <div className="flex flex-wrap gap-2">
      <ExplorerLink label="Budget Policy" id={budget_policy.id} />
    </div>
  );
}
