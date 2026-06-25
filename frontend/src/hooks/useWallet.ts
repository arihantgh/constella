"use client";

import { useEffect, useCallback, useState } from "react";
import {
  requestAccess,
  getAddress,
  getNetwork,
  isConnected,
  signTransaction,
} from "@stellar/freighter-api";
import type { WalletState } from "@/lib/types";
import {
  TESTNET_NETWORK,
  TESTNET_NETWORK_PASSPHRASE,
} from "@/lib/constants";

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
      // Check if Freighter extension is installed
      const { isConnected: freighterConnected } = await isConnected();
      if (!freighterConnected) {
        throw new Error(
          "Freighter not detected. Please install the Freighter browser extension."
        );
      }

      // Request access — prompts the Freighter popup
      const { address, error: accessError } = await requestAccess();
      if (accessError || !address) {
        throw new Error(accessError || "Failed to connect wallet");
      }

      const networkDetails = (await getNetwork()) as {
        network: string;
        networkPassphrase: string;
      };

      if (networkDetails.network !== TESTNET_NETWORK) {
        throw new Error(
          `Wrong network: ${networkDetails.network}. Please switch to Testnet in Freighter.`
        );
      }

      setState({
        address,
        isConnected: true,
        network: networkDetails.network,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      setState({ address: null, isConnected: false, network: null });
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

      const signedXdr = await signTransaction(xdr, {
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
      try {
        const { isConnected: freighterConnected } = await isConnected();
        if (freighterConnected) {
          const { address } = await getAddress();
          if (address) {
            const networkDetails = (await getNetwork()) as {
              network: string;
              networkPassphrase: string;
            };
            if (networkDetails.network === TESTNET_NETWORK) {
              setState({
                address,
                isConnected: true,
                network: networkDetails.network,
              });
            }
          }
        }
      } catch {
        // Freighter not available or user not connected
      }
    }
    check();
  }, []);

  return { ...state, isLoading, error, connect, disconnect, signAndSend };
}
