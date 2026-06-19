"use client";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getWriteClient, PREDICTION_MARKET_ADDRESS, pollForFinalized } from "@/lib/genlayer";
import type { TransactionState } from "@/types";

export function useTrading(account: `0x${string}` | undefined) {
  const qc = useQueryClient();
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      functionName: string,
      args: (string | number | bigint)[],
      value: bigint = BigInt(0)
    ) => {
      if (!account) throw new Error("Wallet not connected");
      setTxState("pending");
      setError(null);
      setTxHash(null);
      try {
        const client = getWriteClient(account);
        const hash = (await client.writeContract({
          address: PREDICTION_MARKET_ADDRESS,
          functionName,
          args: args as never,
          value,
        })) as string;
        setTxHash(hash);
        setTxState("proposing");

        await pollForFinalized(hash, () => setTxState("accepted"));
        setTxState("finalized");
        await qc.invalidateQueries({ queryKey: ["markets"] });
        await qc.invalidateQueries({ queryKey: ["market"] });
        await qc.invalidateQueries({ queryKey: ["portfolio"] });
        await qc.invalidateQueries({ queryKey: ["protocol"] });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Transaction failed";
        setError(msg);
        setTxState("error");
      }
    },
    [account, qc]
  );

  const buyYes = useCallback(
    (marketId: number, amount: bigint) =>
      execute("buy_yes", [marketId], amount),
    [execute]
  );

  const buyNo = useCallback(
    (marketId: number, amount: bigint) =>
      execute("buy_no", [marketId], amount),
    [execute]
  );

  const sellYes = useCallback(
    (marketId: number, shares: bigint) =>
      execute("sell_yes", [marketId, shares]),
    [execute]
  );

  const sellNo = useCallback(
    (marketId: number, shares: bigint) =>
      execute("sell_no", [marketId, shares]),
    [execute]
  );

  const claimReward = useCallback(
    (marketId: number) => execute("claim_reward", [marketId]),
    [execute]
  );

  const reset = useCallback(() => {
    setTxState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  return { txState, txHash, error, buyYes, buyNo, sellYes, sellNo, claimReward, reset };
}
