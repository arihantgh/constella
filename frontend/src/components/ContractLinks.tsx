import { DEFAULT_CONTRACTS } from "@/lib/constants";

export function ContractLinks() {
  const entries = Object.values(DEFAULT_CONTRACTS.contracts);
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-200">On-Chain Contracts</h3>
      <div className="space-y-2">
        {entries.map((contract) => (
          <a
            key={contract.id}
            href={`https://stellar.expert/explorer/testnet/contract/${contract.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800"
          >
            <span>{contract.name}</span>
            <span className="font-mono text-gray-500">
              {contract.id.slice(0, 6)}...{contract.id.slice(-4)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
