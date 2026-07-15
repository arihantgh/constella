export function GuardrailsInfo() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-200">Autonomous Payment Guardrails</h3>
      <ul className="list-inside list-disc space-y-1 text-xs text-gray-400">
        <li>Agents pay each other automatically — no per-payment human approval.</li>
        <li>Per-transaction and daily budget limits are enforced on-chain.</li>
        <li>Inactive agents cannot create or receive payments.</li>
        <li>Every rule is auditable on the Stellar ledger.</li>
      </ul>
    </div>
  );
}
