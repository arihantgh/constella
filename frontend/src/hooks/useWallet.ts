"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import {
  requestAccess,
  getAddress,
  getNetwork,
  isConnected,
  signTransaction,
  isAllowed,
  setAllowed,
  WatchWalletChanges,
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
  const [isAllowedState, setIsAllowedState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watcherRef = useRef<WatchWalletChanges | null>(null);

  const stopWatching = useCallback(() => {
    if (watcherRef.current) {
      watcherRef.current.stop();
      watcherRef.current = null;
    }
  }, []);

  const startWatching = useCallback(() => {
    stopWatching();
    try {
      const watcher = new WatchWalletChanges(500);
      watcherRef.current = watcher;
      watcher.watch(({ address, network, error: watchErr }) => {
        if (watchErr) {
          setError(watchErr.message || "Wallet watch error");
          return;
        }
        setState((prev) => {
          if (network !== TESTNET_NETWORK) {
            setError(
              `Network changed to ${network}. Please switch to Testnet.`,
            );
            return { ...prev, network };
          }
          return {
            address: address || prev.address,
            isConnected: !!address,
            network: network || prev.network,
          };
        });
      });
    } catch {
      // WatchWalletChanges unavailable (non-browser or unsupported version)
    }
  }, [stopWatching]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { isConnected: freighterConnected } = await isConnected();
      if (!freighterConnected) {
        throw new Error(
          "Freighter not detected. Please install the Freighter browser extension.",
        );
      }

      const { address, error: accessError } = await requestAccess();
      if (accessError || !address) {
        throw new Error(accessError || "Failed to connect wallet");
      }

      const networkDetails = await getNetwork();

      if (networkDetails.network !== TESTNET_NETWORK) {
        throw new Error(
          `Wrong network: ${networkDetails.network}. Please switch to Testnet in Freighter.`,
        );
      }

      const allowed = await isAllowed();
      setIsAllowedState(!!allowed.isAllowed);

      await setAllowed();
      setIsAllowedState(true);

      setState({
        address,
        isConnected: true,
        network: networkDetails.network,
      });

      startWatching();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      setState({ address: null, isConnected: false, network: null });
    } finally {
      setIsLoading(false);
    }
  }, [startWatching]);

  const disconnect = useCallback(() => {
    stopWatching();
    setState({ address: null, isConnected: false, network: null });
    setIsAllowedState(false);
    setError(null);
  }, [stopWatching]);

  const fetchAddress = useCallback(async (): Promise<string | null> => {
    if (!state.isConnected) return null;
    try {
      const { address } = await getAddress();
      return address;
    } catch {
      return null;
    }
  }, [state.isConnected]);

  const signAndSend = useCallback(
    async (xdr: string): Promise<string> => {
      if (!state.address) throw new Error("Wallet not connected");

      const signResult = await signTransaction(xdr, {
        networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
      });

      if (signResult.error) {
        const msg =
          typeof signResult.error === "string"
            ? signResult.error
            : signResult.error.message || JSON.stringify(signResult.error);
        throw new Error(msg);
      }

      const signedXdr = signResult.signedTxXdr;
      if (!signedXdr) throw new Error("Failed to sign transaction");

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
        },
      );

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error.message || JSON.stringify(result.error));
      }

      const hash = result.result?.hash;
      if (hash) {
        await pollForTx(hash);
      }
      return hash || signedXdr;
    },
    [state.address],
  );

  // Re-check connection on mount
  useEffect(() => {
    async function check() {
      try {
        const { isConnected: freighterConnected } = await isConnected();
        if (freighterConnected) {
          const { address } = await getAddress();
          if (address) {
            const networkDetails = await getNetwork();
            if (networkDetails.network === TESTNET_NETWORK) {
              setState({
                address,
                isConnected: true,
                network: networkDetails.network,
              });
              const allowed = await isAllowed();
              setIsAllowedState(!!allowed.isAllowed);
              startWatching();
            }
          }
        }
      } catch {
        // Freighter not available or user not connected
      }
    }
    check();

    return () => {
      stopWatching();
    };
  }, [startWatching, stopWatching]);

  return {
    ...state,
    isLoading,
    error,
    isAllowed: isAllowedState,
    connect,
    disconnect,
    signAndSend,
    getAddress: fetchAddress,
  };
}
