"use client";
import Link from "next/link";
import type { Market } from "@/types";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { formatVolume, formatTimeRemaining, calcYesPrice, formatPercent } from "@/lib/format";

const categoryColors: Record<string, string> = {
  crypto: "neutral",
  politics: "default",
  sports: "active",
  tech: "neutral",
  business: "default",
  science: "active",
};

export default function MarketCard({ market }: { market: Market }) {
  const yesPrice = calcYesPrice(market.yes_pool, market.no_pool);
  const noPrice = calcNoPrice(market.yes_pool, market.no_pool);
  const total = market.yes_pool + market.no_pool;

  return (
    <Link href={`/market/${market.id}`}>
      <Card hover className="flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={(categoryColors[market.category] || "default") as "default" | "yes" | "no" | "neutral" | "active" | "resolved"}>
            {market.category}
          </Badge>
          {market.resolved ? (
            <Badge variant="resolved">Resolved</Badge>
          ) : (
            <span className="text-xs text-muted">{formatTimeRemaining(market.deadline)}</span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-3">
          {market.question}
        </p>
        <div className="mt-auto">
          <div className="flex gap-2 mb-2">
            <div className="flex-1 bg-yes/10 rounded px-2 py-1.5 text-center">
              <div className="text-xs text-muted">YES</div>
              <div className="text-sm font-bold text-yes">{formatPercent(yesPrice)}</div>
            </div>
            <div className="flex-1 bg-no/10 rounded px-2 py-1.5 text-center">
              <div className="text-xs text-muted">NO</div>
              <div className="text-sm font-bold text-no">{formatPercent(noPrice)}</div>
            </div>
          </div>
          <div className="h-1 rounded-full bg-no overflow-hidden">
            <div
              className="h-full bg-yes rounded-full transition-all"
              style={{ width: `${yesPrice * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted">
            <span>Vol: {formatVolume(total)}</span>
            <span>#{market.id}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function calcNoPrice(yesPool: number, noPool: number): number {
  const total = yesPool + noPool;
  if (total === 0) return 0.5;
  return yesPool / total;
}
