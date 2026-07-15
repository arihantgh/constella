"use client";

interface Props {
  agentCount: number;
}

export function GettingStarted({ agentCount }: Props) {
  const steps = [
    { label: "Connect your Freighter wallet", done: true },
    { label: "Register at least two agents", done: agentCount >= 2 },
    { label: "Set a per-tx and daily budget", done: false },
    { label: "Create your first agent-to-agent payment", done: false },
  ];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-200">Getting Started</h3>
      <ul className="space-y-2">
        {steps.map((step, idx) => (
          <li key={idx} className="flex items-center gap-3 text-sm text-gray-300">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                step.done ? "bg-green-600 text-white" : "border border-gray-600 text-gray-500"
              }`}
            >
              {step.done ? "✓" : idx + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
