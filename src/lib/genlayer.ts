import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export const MARKET_FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_MARKET_FACTORY_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const PREDICTION_MARKET_ADDRESS =
  (process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const RESOLVER_ADDRESS =
  (process.env.NEXT_PUBLIC_RESOLVER_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const REWARD_DISTRIBUTOR_ADDRESS =
  (process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const USER_PROFILE_ADDRESS =
  (process.env.NEXT_PUBLIC_USER_PROFILE_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export function getReadClient() {
  return createClient({ chain: studionet });
}

export function getWriteClient(account: `0x${string}`) {
  return createClient({ chain: studionet, account });
}

export { TransactionStatus };

const STUDIONET_RPC = "https://studio.genlayer.com/api";

export async function pollForFinalized(
  hash: string,
  onAccepted?: () => void,
  maxAttempts = 120
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(STUDIONET_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [hash],
        id: 1,
      }),
    });
    const body = await res.json();
    const tx = body.result;
    if (!tx) continue;
    if (tx.status === "ACCEPTED" || tx.status === "FINALIZED") {
      onAccepted?.();
      return;
    }
    if (tx.status === "CANCELED" || tx.status === "UNDETERMINED") {
      throw new Error(`Transaction ${tx.status}`);
    }
  }
  throw new Error("Transaction timed out after 10 minutes");
}
