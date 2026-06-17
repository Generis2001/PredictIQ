"use client";
import { useQuery } from "@tanstack/react-query";
import { getReadClient, MARKET_FACTORY_ADDRESS } from "@/lib/genlayer";
import type { Market, ProtocolStats } from "@/types";

export function useAllMarkets() {
  return useQuery<Market[]>({
    queryKey: ["markets", "all"],
    queryFn: async () => {
      const client = getReadClient();
      const result = await client.readContract({
        address: MARKET_FACTORY_ADDRESS,
        functionName: "get_all_markets",
        args: [],
      });
      return ((result as unknown) as Market[]) ?? [];
    },
    refetchInterval: 15_000,
  });
}

export function useMarket(id: number | null) {
  return useQuery<Market | null>({
    queryKey: ["market", id],
    queryFn: async () => {
      if (id === null) return null;
      const client = getReadClient();
      const result = await client.readContract({
        address: MARKET_FACTORY_ADDRESS,
        functionName: "get_market",
        args: [id],
      });
      const m = (result as unknown) as Market;
      if (!m || typeof m !== "object" || !("id" in m)) return null;
      return m;
    },
    enabled: id !== null,
    refetchInterval: 10_000,
  });
}

export function useProtocolStats() {
  return useQuery<ProtocolStats>({
    queryKey: ["protocol", "stats"],
    queryFn: async () => {
      const client = getReadClient();
      const result = await client.readContract({
        address: MARKET_FACTORY_ADDRESS,
        functionName: "get_protocol_stats",
        args: [],
      });
      return (result as unknown) as ProtocolStats;
    },
    refetchInterval: 30_000,
  });
}

export function useMarketsByCategory(category: string) {
  return useQuery<Market[]>({
    queryKey: ["markets", "category", category],
    queryFn: async () => {
      const client = getReadClient();
      const result = await client.readContract({
        address: MARKET_FACTORY_ADDRESS,
        functionName: "get_markets_by_category",
        args: [category],
      });
      return ((result as unknown) as Market[]) ?? [];
    },
    refetchInterval: 15_000,
  });
}
