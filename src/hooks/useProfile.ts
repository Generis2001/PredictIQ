"use client";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReadClient, getWriteClient, USER_PROFILE_ADDRESS, pollForFinalized } from "@/lib/genlayer";
import type { UserProfile, TransactionState } from "@/types";

export function useProfile(address: string | null | undefined) {
  return useQuery<UserProfile | null>({
    queryKey: ["profile", address],
    queryFn: async () => {
      if (!address) return null;
      const client = getReadClient();
      const result = await client.readContract({
        address: USER_PROFILE_ADDRESS,
        functionName: "get_profile",
        args: [address],
      });
      const p = (result as unknown) as UserProfile;
      if (!p || typeof p !== "object" || !("username" in p)) return null;
      return p;
    },
    enabled: !!address,
    refetchInterval: 30_000,
  });
}

export function useHasProfile(address: string | null | undefined) {
  return useQuery<boolean>({
    queryKey: ["profile", "exists", address],
    queryFn: async () => {
      if (!address) return false;
      const client = getReadClient();
      const result = await client.readContract({
        address: USER_PROFILE_ADDRESS,
        functionName: "has_profile",
        args: [address],
      });
      return Boolean(result);
    },
    enabled: !!address,
    refetchInterval: 30_000,
  });
}

export function useProfileActions(account: `0x${string}` | undefined) {
  const qc = useQueryClient();
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (functionName: string, args: string[]) => {
      if (!account) throw new Error("Wallet not connected");
      setTxState("pending");
      setError(null);
      setTxHash(null);
      try {
        const client = getWriteClient(account);
        const hash = (await client.writeContract({
          address: USER_PROFILE_ADDRESS,
          functionName,
          args: args as never,
          value: BigInt(0),
        })) as string;
        setTxHash(hash);
        setTxState("proposing");

        await pollForFinalized(hash, () => setTxState("accepted"));
        setTxState("finalized");

        await qc.invalidateQueries({ queryKey: ["profile"] });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transaction failed");
        setTxState("error");
      }
    },
    [account, qc]
  );

  const createProfile = useCallback(
    (username: string, bio: string, avatarUrl: string, twitterHandle: string) =>
      execute("create_profile", [username, bio, avatarUrl, twitterHandle]),
    [execute]
  );

  const updateProfile = useCallback(
    (bio: string, avatarUrl: string, twitterHandle: string) =>
      execute("update_profile", [bio, avatarUrl, twitterHandle]),
    [execute]
  );

  const reset = useCallback(() => {
    setTxState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  return { txState, txHash, error, createProfile, updateProfile, reset };
}
