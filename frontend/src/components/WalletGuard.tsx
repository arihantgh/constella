"use client";

import type { ReactNode } from "react";
import { BrowserHint } from "@/components/BrowserHint";

interface Props {
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  onConnect: () => void;
  children: ReactNode;
}

export function WalletGuard({
  isConnected,
  address,
  isLoading,
  error,
  onConnect,
  children,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          <span className="text-sm text-gray-400">Connecting wallet...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isMissingFreighter = error.toLowerCase().includes("freighter not detected");
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
        <p className="text-sm text-red-300">{error}</p>
        <button
          onClick={onConnect}
          className="mt-3 min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Retry
        </button>
        {isMissingFreighter && <BrowserHint />}
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 text-center">
        <p className="text-sm text-gray-400">
          Connect your Freighter wallet to interact with the network.
        </p>
        <button
          onClick={onConnect}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
