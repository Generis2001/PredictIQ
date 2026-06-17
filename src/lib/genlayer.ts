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

export function getReadClient() {
  return createClient({ chain: studionet });
}

export function getWriteClient(account: `0x${string}`) {
  return createClient({ chain: studionet, account });
}

export { TransactionStatus };
