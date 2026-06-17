"use client";
import { useQuery } from "@tanstack/react-query";
import { getReadClient, RESOLVER_ADDRESS } from "@/lib/genlayer";
import type { Resolution } from "@/types";

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
