"use client";
import { useAllMarkets, useProtocolStats } from "@/hooks/useMarkets";
import { useAllResolutions } from "@/hooks/useResolution";
import Card from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/Spinner";
import { formatVolume, formatPercent } from "@/lib/format";

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-1">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-black text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

function CategoryBar({
  category,
  count,
  total,
  volume,
}: {
  category: string;
  count: number;
  total: number;
  volume: number;
}) {
  const pct = total > 0 ? count / total : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-16 shrink-0 capitalize">{category}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full bg-electric-blue rounded-full"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="text-xs text-foreground w-8 text-right">{count}</span>
      <span className="text-xs text-muted w-20 text-right">{formatVolume(volume)}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: markets, isLoading: marketsLoading } = useAllMarkets();
  const { data: stats, isLoading: statsLoading } = useProtocolStats();
  const { data: resolutions, isLoading: resLoading } = useAllResolutions();

  const isLoading = marketsLoading || statsLoading || resLoading;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LoadingState message="Loading analytics from StudioNet..." />
      </div>
    );
  }

  const allMarkets = markets ?? [];
  const allResolutions = resolutions ?? [];

  const activeCount = allMarkets.filter((m) => !m.resolved).length;
  const resolvedCount = allMarkets.filter((m) => m.resolved).length;
  const totalVolume = allMarkets.reduce((sum, m) => sum + m.total_volume, 0);

  const yesCount = allResolutions.filter((r) => r.resolution.outcome === "YES").length;
  const noCount = allResolutions.filter((r) => r.resolution.outcome === "NO").length;
  const avgConfidence =
    allResolutions.length > 0
      ? allResolutions.reduce(
          (sum, r) => sum + parseFloat(r.resolution.confidence),
          0
        ) / allResolutions.length
      : null;

  const categoryStats = allMarkets.reduce(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = { count: 0, volume: 0 };
      acc[m.category].count++;
      acc[m.category].volume += m.total_volume;
      return acc;
    },
    {} as Record<string, { count: number; volume: number }>
  );

  const sortedCategories = Object.entries(categoryStats).sort(
    (a, b) => b[1].volume - a[1].volume
  );

  const topMarkets = [...allMarkets]
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, 5);

  if (allMarkets.length === 0 && allResolutions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted mt-1">Protocol statistics from GenLayer StudioNet</p>
        </div>
        <div className="p-12 rounded-xl border border-border bg-surface text-center">
          <p className="text-muted text-sm">
            Analytics will populate as markets are created and traded. All data is sourced directly from on-chain state.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted mt-1">Live protocol statistics from GenLayer StudioNet</p>
      </div>

      {/* Protocol Overview */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs text-muted uppercase tracking-widest">Protocol Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox
            label="Total Markets"
            value={String(allMarkets.length)}
            sub={`${activeCount} active · ${resolvedCount} resolved`}
          />
          <StatBox
            label="Total Volume"
            value={formatVolume(totalVolume)}
            sub="All-time trading volume"
          />
          <StatBox
            label="Markets Resolved"
            value={String(resolvedCount)}
            sub={allMarkets.length > 0 ? `${formatPercent(resolvedCount / allMarkets.length)} resolution rate` : undefined}
          />
          <StatBox
            label="Active Traders"
            value={stats ? String(stats.total_traders) : "—"}
            sub="Unique wallets"
          />
        </div>
      </section>

      {/* Resolution Stats */}
      {allResolutions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs text-muted uppercase tracking-widest">Resolution Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatBox
              label="YES Outcomes"
              value={String(yesCount)}
              sub={allResolutions.length > 0 ? formatPercent(yesCount / allResolutions.length) : undefined}
            />
            <StatBox
              label="NO Outcomes"
              value={String(noCount)}
              sub={allResolutions.length > 0 ? formatPercent(noCount / allResolutions.length) : undefined}
            />
            <StatBox
              label="Avg Confidence"
              value={avgConfidence !== null ? formatPercent(avgConfidence) : "—"}
              sub="Across all resolutions"
            />
          </div>
        </section>
      )}

      {/* Category Breakdown */}
      {sortedCategories.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs text-muted uppercase tracking-widest">Category Breakdown</h2>
          <Card>
            <div className="flex justify-end gap-4 mb-3 text-xs text-muted">
              <span className="w-8 text-right">Markets</span>
              <span className="w-20 text-right">Volume</span>
            </div>
            <div className="flex flex-col gap-3">
              {sortedCategories.map(([cat, { count, volume }]) => (
                <CategoryBar
                  key={cat}
                  category={cat}
                  count={count}
                  total={allMarkets.length}
                  volume={volume}
                />
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Top Markets by Volume */}
      {topMarkets.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs text-muted uppercase tracking-widest">Top Markets by Volume</h2>
          <div className="flex flex-col gap-2">
            {topMarkets.map((market, i) => (
              <a
                key={market.id}
                href={`/market/${market.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:border-electric-blue/30 transition-colors"
              >
                <span className="text-xs text-muted w-4 text-right shrink-0">{i + 1}</span>
                <p className="flex-1 text-sm text-foreground line-clamp-1">{market.question}</p>
                <span className="text-xs text-muted shrink-0 capitalize">{market.category}</span>
                <span className="text-xs text-electric-blue font-medium shrink-0">
                  {formatVolume(market.total_volume)}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted text-center">
        All data sourced from live GenLayer StudioNet contract state. Refreshes automatically.
      </p>
    </div>
  );
}
