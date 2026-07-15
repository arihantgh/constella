"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function NetworkSelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
      aria-label="Select network"
    >
      <option value="testnet">Stellar Testnet</option>
      <option value="mainnet">Stellar Mainnet (coming soon)</option>
    </select>
  );
}
