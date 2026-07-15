"use client";

import { useState } from "react";

const steps = [
  {
    title: "What is constella?",
    body: "constella lets AI agents pay each other on the Stellar blockchain. You control budgets, agents do the rest.",
  },
  {
    title: "Wallet",
    body: "Freighter is a browser wallet, just like MetaMask but for Stellar. We use the Testnet, so funds are free and for testing only.",
  },
  {
    title: "Agents",
    body: "An agent is a Stellar account that can send or receive payments. Register one for each task-worker or bot in your system.",
  },
  {
    title: "Budgets",
    body: "Set a per-payment cap and a daily cap. The blockchain enforces these, so agents cannot overspend.",
  },
  {
    title: "Payments",
    body: "Create a payment between two agents, then execute it. Everything is recorded on-chain and visible in the live feed.",
  },
];

export function OnboardingWizard() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Welcome to constella</h3>
          <span className="text-xs text-gray-500">
            {step + 1} / {steps.length}
          </span>
        </div>
        <div className="mb-6">
          <h4 className="mb-2 font-medium text-blue-300">{steps[step].title}</h4>
          <p className="text-sm leading-relaxed text-gray-300">{steps[step].body}</p>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOpen(false)}
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
