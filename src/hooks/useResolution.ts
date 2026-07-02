"use client";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReadClient, getWriteClient, RESOLVER_ADDRESS, pollForFinalized } from "@/lib/genlayer";
import type { Resolution, TransactionState } from "@/types";

export function useResolution(marketId: number | null) {
  return useQuery<Resolution | null>({
    queryKey: ["resolution", marketId],
    queryFn: async () => {
      if (marketId === null) return null;
      const client = getReadClient();
      const result = await client.readContract({
        address: RESOLVER_ADDRESS,
        functionName: "get_resolution",
        args: [marketId],
      });
      const r = (result as unknown) as Record<string, unknown>;
      if (!r || typeof r !== "object" || !("outcome" in r)) return null;
      return r as unknown as Resolution;
    },
    enabled: marketId !== null,
    refetchInterval: 30_000,
  });
}

export function useAllResolutions() {
  return useQuery<{ market_id: number; resolution: Resolution }[]>({
    queryKey: ["resolutions", "all"],
    queryFn: async () => {
      const client = getReadClient();
      const result = await client.readContract({
        address: RESOLVER_ADDRESS,
        functionName: "get_all_resolutions",
        args: [],
      });
      return ((result as unknown) as { market_id: number; resolution: Resolution }[]) ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useResolveMarket(account: `0x${string}` | undefined) {
  const qc = useQueryClient();
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveMarket = useCallback(
    async (marketId: number, question: string, resolutionCriteria: string, sources: string[]) => {
      if (!account) throw new Error("Wallet not connected");
      setTxState("pending");
      setError(null);
      setTxHash(null);
      try {
        const client = getWriteClient(account);
        const hash = (await client.writeContract({
          address: RESOLVER_ADDRESS,
          functionName: "resolve_market",
          args: [marketId, question, resolutionCriteria, sources] as never,
          value: BigInt(0),
        })) as string;
        setTxHash(hash);
        setTxState("proposing");
        await pollForFinalized(hash, () => setTxState("accepted"));
        setTxState("finalized");
        await qc.invalidateQueries({ queryKey: ["markets"] });
        await qc.invalidateQueries({ queryKey: ["market", marketId] });
        await qc.invalidateQueries({ queryKey: ["resolution", marketId] });
        await qc.invalidateQueries({ queryKey: ["resolutions"] });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Resolution failed");
        setTxState("error");
      }
    },
    [account, qc]
  );

  const reset = useCallback(() => {
    setTxState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  return { txState, txHash, error, resolveMarket, reset };
}
