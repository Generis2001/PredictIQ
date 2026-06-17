export type MarketCategory =
  | "crypto"
  | "politics"
  | "sports"
  | "tech"
  | "business"
  | "science";

export type MarketStatus = "active" | "resolved" | "expired";

export interface Market {
  id: number;
  creator: string;
  question: string;
  resolution_criteria: string;
  category: string;
  deadline: number;
  resolved: boolean;
  outcome: boolean | null;
  yes_pool: number;
  no_pool: number;
  total_volume: number;
  resolver_address: string;
  sources: string[];
  created_at: number;
}

export interface Position {
  market_id: number;
  yes_shares: number;
  no_shares: number;
  avg_yes_price: number;
  avg_no_price: number;
}

export interface Resolution {
  outcome: string;
  confidence: string;
  sources: string[];
  reasoning: string;
  resolved_at: string;
}

export interface ProtocolStats {
  total_markets: number;
  total_volume: number;
  total_resolved: number;
  total_traders: number;
}

export type TransactionState =
  | "idle"
  | "pending"
  | "proposing"
  | "committing"
  | "revealing"
  | "accepted"
  | "finalized"
  | "error";
