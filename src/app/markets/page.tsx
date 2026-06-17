"use client";
import { useState } from "react";
import { useAllMarkets } from "@/hooks/useMarkets";
import MarketCard from "@/components/MarketCard";
import { LoadingState, EmptyState } from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Link from "next/link";
import type { Market, MarketCategory } from "@/types";

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "crypto", label: "Crypto" },
  { id: "politics", label: "Politics" },
  { id: "sports", label: "Sports" },
  { id: "tech", label: "Tech" },
  { id: "business", label: "Business" },
  { id: "science", label: "Science" },
];

type SortMode = "newest" | "volume" | "closing_soon";

function sortMarkets(markets: Market[], sort: SortMode): Market[] {
  return [...markets].sort((a, b) => {
    if (sort === "newest") return b.created_at - a.created_at;
    if (sort === "volume") return b.total_volume - a.total_volume;
    if (sort === "closing_soon") return a.deadline - b.deadline;
    return 0;
  });
}

export default function MarketsPage() {
  const { data: markets, isLoading, error } = useAllMarkets();
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [showResolved, setShowResolved] = useState(false);

  const filtered = (markets ?? []).filter((m) => {
    if (!showResolved && m.resolved) return false;
    if (category !== "all" && m.category !== category) return false;
    return true;
  });

  const sorted = sortMarkets(filtered, sort);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Markets</h1>
          {markets && (
            <p className="text-sm text-muted mt-0.5">
              {filtered.length} market{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link href="/create">
          <Button size="sm">+ Create Market</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                category === id
                  ? "bg-electric-blue border-electric-blue text-white"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(["newest", "volume", "closing_soon"] as SortMode[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1 rounded text-xs border transition-colors ${
                  sort === s
                    ? "border-border bg-surface text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {s === "newest" ? "Newest" : s === "volume" ? "Volume" : "Closing Soon"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="accent-electric-blue"
            />
            Show resolved
          </label>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <LoadingState message="Loading markets from StudioNet..." />
      ) : error ? (
        <EmptyState
          title="Failed to load markets"
          description="Could not connect to GenLayer StudioNet. Check your network connection."
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No markets found"
          description={
            category !== "all"
              ? `No ${category} markets yet. Be the first to create one.`
              : "No active markets. Create the first prediction market."
          }
          action={
            <Link href="/create">
              <Button size="sm">Create Market</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
