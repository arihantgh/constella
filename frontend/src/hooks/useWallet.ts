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
  TESTNET_RPC_URL,
} from "@/lib/constants";

async function pollForTx(hash: string, maxTries = 20): Promise<void> {
  for (let i = 0; i < maxTries; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(TESTNET_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: { hash },
      }),
    });
    const data = await res.json();
    const status = data.result?.status;
    if (status === "SUCCESS") return;
    if (status === "FAILED") throw new Error(`Transaction failed: ${hash}`);
  }
  throw new Error("Transaction not confirmed within timeout");
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

      const signResult = await signTransaction(xdr, {
        networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
      });

      if (signResult.error) {
        throw new Error(
          typeof signResult.error === "string"
            ? signResult.error
            : signResult.error.message || JSON.stringify(signResult.error),
        );
      }

      const signedXdr = signResult.signedTxXdr;
      if (!signedXdr) throw new Error("Failed to sign transaction");

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
      if (result.error) {
        throw new Error(
          result.error.message || JSON.stringify(result.error),
        );
      }

      const hash = result.result?.hash;
      if (hash) {
        await pollForTx(hash);
      }
      return hash || signedXdr;
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
