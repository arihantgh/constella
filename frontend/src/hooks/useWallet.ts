"use client";

import { useEffect, useCallback, useState } from "react";
import type { WalletState } from "@/lib/types";
import {
  TESTNET_NETWORK,
  TESTNET_NETWORK_PASSPHRASE,
} from "@/lib/constants";

declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<{ isConnected: boolean }>;
      getPublicKey: () => Promise<string>;
      getNetwork: () => Promise<string>;
      signTransaction: (
        xdr: string,
        opts?: { networkPassphrase?: string }
      ) => Promise<string>;
    };
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    network: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.freighter) {
        throw new Error(
          "Freighter not detected. Please install the Freighter browser extension."
        );
      }

      const { isConnected } = await window.freighter.isConnected();
      if (!isConnected) {
        // Freighter will prompt the user to connect
      }

      const address = await window.freighter.getPublicKey();
      const network = await window.freighter.getNetwork();

      if (network !== TESTNET_NETWORK) {
        throw new Error(
          `Wrong network: ${network}. Please switch to Testnet in Freighter.`
        );
      }

      setState({ address, isConnected: true, network });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, isConnected: false, network: null });
    setError(null);
  }, []);

  const signAndSend = useCallback(
    async (xdr: string): Promise<string> => {
      if (!state.address) throw new Error("Wallet not connected");

      const signedXdr = await window.freighter!.signTransaction(xdr, {
        networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
      });

      // Submit to Soroban RPC
      const response = await fetch(
        process.env.NEXT_PUBLIC_RPC_URL ||
          "https://soroban-testnet.stellar.org",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: { transaction: signedXdr },
          }),
        }
      );

      const result = await response.json();
      return result.result?.hash || signedXdr;
    },
    [state.address]
  );

  // Re-check connection on mount
  useEffect(() => {
    async function check() {
      if (window.freighter) {
        try {
          const { isConnected } = await window.freighter.isConnected();
          if (isConnected) {
            const address = await window.freighter.getPublicKey();
            const network = await window.freighter.getNetwork();
            setState({ address, isConnected: true, network });
          }
        } catch {
          // Freighter not available or user not connected
        }
      }
    }
    check();
  }, []);

  return { ...state, isLoading, error, connect, disconnect, signAndSend };
}
