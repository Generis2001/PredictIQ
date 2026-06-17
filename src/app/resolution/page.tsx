"use client";
import { useAllResolutions } from "@/hooks/useResolution";
import { useAllMarkets } from "@/hooks/useMarkets";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LoadingState, EmptyState } from "@/components/ui/Spinner";
import { formatPercent } from "@/lib/format";
import Link from "next/link";
import type { Market, Resolution } from "@/types";

function ResolutionCard({
  marketId,
  resolution,
  market,
}: {
  marketId: number;
  resolution: Resolution;
  market: Market | undefined;
}) {
  const confidence = parseFloat(resolution.confidence);

  return (
    <Card className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Badge variant={resolution.outcome === "YES" ? "yes" : "no"}>
            {resolution.outcome}
          </Badge>
          <Badge variant="neutral">
            {formatPercent(confidence)} confidence
          </Badge>
          {market && <Badge variant="default">{market.category}</Badge>}
        </div>
        <Link
          href={`/market/${marketId}`}
          className="text-xs text-electric-blue hover:underline shrink-0"
        >
          View Market #{marketId} →
        </Link>
      </div>

      {/* Question */}
      {market && (
        <p className="text-sm font-medium text-foreground line-clamp-2">
          {market.question}
        </p>
      )}

      {/* Confidence Bar */}
      <div>
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>AI Confidence</span>
          <span>{formatPercent(confidence)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              confidence >= 0.8 ? "bg-yes" : confidence >= 0.6 ? "bg-yellow-400" : "bg-no"
            }`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Reasoning */}
      <div>
        <p className="text-xs text-muted uppercase tracking-wider mb-2">AI Reasoning</p>
        <p className="text-sm text-foreground leading-relaxed">{resolution.reasoning}</p>
      </div>

      {/* Sources */}
      {resolution.sources.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-2">
            Evidence Sources ({resolution.sources.length})
          </p>
          <ul className="flex flex-col gap-1">
            {resolution.sources.map((src, i) => (
              <li key={i}>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-electric-blue hover:underline truncate block"
                >
                  {src}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Validator Consensus Note */}
      <div className="p-3 rounded-lg bg-surface-2 border border-border">
        <p className="text-xs text-muted">
          <span className="text-cyan font-medium">Validator Consensus: </span>
          This outcome was determined by GenLayer&apos;s Optimistic Democracy — a leader validator proposed the resolution and peer validators independently verified the reasoning using the Equivalence Principle before finalization.
        </p>
      </div>

      <p className="text-xs text-muted">Resolved: {resolution.resolved_at}</p>
    </Card>
  );
}

export default function ResolutionPage() {
  const { data: resolutions, isLoading, error } = useAllResolutions();
  const { data: markets } = useAllMarkets();

  const marketMap = new Map<number, Market>(
    (markets ?? []).map((m) => [m.id, m])
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Resolution Center</h1>
        <p className="text-sm text-muted mt-1">
          AI reasoning reports and validator consensus records for resolved markets.
        </p>
      </div>

      {/* How Resolution Works */}
      <div className="p-4 rounded-xl border border-electric-blue/20 bg-electric-blue/5">
        <p className="text-xs text-electric-blue font-medium mb-1">How AI Resolution Works</p>
        <p className="text-xs text-muted leading-relaxed">
          When a market reaches its deadline, the PredictIQResolver Intelligent Contract gathers evidence from the specified sources using <code className="text-cyan">gl.nondet.web.get()</code>, runs reasoning via <code className="text-cyan">gl.nondet.exec_prompt()</code>, and determines an outcome. GenLayer&apos;s validator network independently verifies the reasoning using the Equivalence Principle — requiring that all validators independently agree on the same outcome before finalization.
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Loading resolution reports from StudioNet..." />
      ) : error ? (
        <EmptyState
          title="Failed to load resolutions"
          description="Could not connect to GenLayer StudioNet."
        />
      ) : !resolutions || resolutions.length === 0 ? (
        <EmptyState
          title="No resolutions yet"
          description="Resolution reports will appear here once markets are resolved by the AI. All reasoning, evidence, and confidence scores are stored on-chain."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            {resolutions.length} resolution{resolutions.length !== 1 ? "s" : ""} recorded on-chain
          </p>
          {resolutions.map(({ market_id, resolution }) => (
            <ResolutionCard
              key={market_id}
              marketId={market_id}
              resolution={resolution}
              market={marketMap.get(market_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
