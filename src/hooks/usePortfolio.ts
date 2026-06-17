"use client";
import { useQuery } from "@tanstack/react-query";
import { getReadClient, PREDICTION_MARKET_ADDRESS } from "@/lib/genlayer";
import type { Position } from "@/types";

export function usePortfolio(account: string | undefined) {
  return useQuery<Position[]>({
    queryKey: ["portfolio", account],
    queryFn: async () => {
      const client = getReadClient();
      const result = await client.readContract({
        address: PREDICTION_MARKET_ADDRESS,
        functionName: "get_user_positions",
        args: [account!],
      });
      return ((result as unknown) as Position[]) ?? [];
    },
    enabled: !!account,
    refetchInterval: 15_000,
  });
}

export function useUserPosition(account: string | undefined, marketId: number | null) {
  return useQuery<Position | null>({
    queryKey: ["portfolio", account, marketId],
    queryFn: async () => {
      if (!account || marketId === null) return null;
      const client = getReadClient();
      const result = await client.readContract({
        address: PREDICTION_MARKET_ADDRESS,
        functionName: "get_position",
        args: [account, marketId],
      });
      return ((result as unknown) as Position) ?? null;
    },
    enabled: !!account && marketId !== null,
    refetchInterval: 15_000,
  });
}
