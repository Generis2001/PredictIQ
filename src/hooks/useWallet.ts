"use client";
import { useState, useCallback, useEffect } from "react";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

const STUDIONET_CHAIN = {
  chainId: "0xF22F", // 61999
  chainName: "Genlayer Studio Network",
  rpcUrls: ["https://studio.genlayer.com/api"],
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  blockExplorerUrls: ["https://genlayer-explorer.vercel.app"],
};

async function ensureStudionet(ethereum: EthereumProvider) {
  try {
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [STUDIONET_CHAIN],
    });
  } catch {
    // Already added — try switching explicitly
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: STUDIONET_CHAIN.chainId }],
      });
    } catch {
      // Ignore — if it's already on studionet the switch succeeds silently
    }
  }
}

export function useWallet() {
  const [account, setAccount] = useState<`0x${string}` | undefined>(undefined);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setError("MetaMask not detected. Please install MetaMask.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts.length > 0) {
        await ensureStudionet(ethereum);
        setAccount(accounts[0] as `0x${string}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(undefined);
  }, []);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts[0] as `0x${string}` | undefined);
    };

    ethereum.on("accountsChanged", handleAccountsChanged);

    ethereum.request({ method: "eth_accounts" }).then(async (res) => {
      const accs = res as string[];
      if (accs.length > 0) {
        await ensureStudionet(ethereum);
        setAccount(accs[0] as `0x${string}`);
      }
    });

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  return { account, connecting, error, connect, disconnect };
}
