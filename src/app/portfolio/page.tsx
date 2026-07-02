"use client";
import { useWallet } from "@/hooks/useWallet";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAllMarkets } from "@/hooks/useMarkets";
import { useTrading } from "@/hooks/useTrading";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TxStatus from "@/components/ui/TxStatus";
import { LoadingState, EmptyState } from "@/components/ui/Spinner";
import { formatGEN, formatAddress, calcYesPrice, calcNoPrice, formatPercent } from "@/lib/format";
import Link from "next/link";
import type { Market, Position } from "@/types";

function PositionRow({
  position,
  market,
  onClaim,
  claiming,
}: {
  position: Position;
  market: Market | undefined;
  onClaim: (id: number) => void;
  claiming: boolean;
}) {
  if (!market) return null;
  const yesPrice = calcYesPrice(market.yes_pool, market.no_pool);
  const noPrice = calcNoPrice(market.yes_pool, market.no_pool);
  const estValue =
    position.yes_shares * yesPrice + position.no_shares * noPrice;

  const isWinner =
    market.resolved &&
    ((market.outcome === true && position.yes_shares > 0) ||
      (market.outcome === false && position.no_shares > 0));

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-surface hover:border-electric-blue/30 transition-colors">
      <div className="flex-1 min-w-0">
        <Link
          href={`/market/${market.id}`}
          className="text-sm font-medium text-foreground hover:text-electric-blue line-clamp-2"
        >
          {market.question}
        </Link>
        <div className="flex gap-2 mt-1 flex-wrap">
          <Badge variant="neutral">{market.category}</Badge>
          {market.resolved ? (
            <Badge variant={market.outcome ? "yes" : "no"}>
              Resolved {market.outcome ? "YES" : "NO"}
            </Badge>
          ) : (
            <Badge variant="active">Active</Badge>
          )}
        </div>
      </div>

      <div className="flex gap-4 shrink-0 text-xs">
        {position.yes_shares > 0 && (
          <div className="text-center">
            <div className="text-muted">YES Shares</div>
            <div className="text-yes font-bold">{position.yes_shares}</div>
            <div className="text-muted">{formatPercent(yesPrice)} ea</div>
          </div>
        )}
        {position.no_shares > 0 && (
          <div className="text-center">
            <div className="text-muted">NO Shares</div>
            <div className="text-no font-bold">{position.no_shares}</div>
            <div className="text-muted">{formatPercent(noPrice)} ea</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-muted">Est. Value</div>
          <div className="text-foreground font-bold">{formatGEN(estValue * 1e18)}</div>
        </div>
      </div>

      {isWinner && (
        <Button
          size="sm"
          variant="yes"
          onClick={() => onClaim(market.id)}
          loading={claiming}
        >
          Claim
        </Button>
      )}
    </div>
  );
}

export default function PortfolioPage() {
  const { account, connect } = useWallet();
  const { data: positions, isLoading: posLoading } = usePortfolio(account);
  const { data: markets } = useAllMarkets();
  const { txState, txHash, error, claimReward } = useTrading(account);

  if (!account) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState
          title="Connect your wallet"
          description="Connect MetaMask to view your portfolio and positions."
          action={<Button onClick={connect}>Connect Wallet</Button>}
        />
      </div>
    );
  }

  const marketMap = new Map<number, Market>(
    (markets ?? []).map((m) => [m.id, m])
  );

  const activePositions = (positions ?? []).filter((p) => {
    const m = marketMap.get(p.market_id);
    return m && !m.resolved;
  });

  const closedPositions = (positions ?? []).filter((p) => {
    const m = marketMap.get(p.market_id);
    return m && m.resolved;
  });

  const claimablePositions = closedPositions.filter((p) => {
    const m = marketMap.get(p.market_id);
    if (!m) return false;
    return (
      (m.outcome === true && p.yes_shares > 0) ||
      (m.outcome === false && p.no_shares > 0)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
        <p className="text-sm text-muted mt-0.5 font-mono">{formatAddress(account)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="text-xs text-muted uppercase tracking-wider">Active Positions</div>
          {posLoading ? (
            <div className="h-7 w-12 bg-surface-2 rounded animate-pulse mt-1" />
          ) : (
            <div className="text-2xl font-bold text-foreground mt-1">
              {activePositions.length}
            </div>
          )}
        </div>
        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="text-xs text-muted uppercase tracking-wider">Closed Positions</div>
          {posLoading ? (
            <div className="h-7 w-12 bg-surface-2 rounded animate-pulse mt-1" />
          ) : (
            <div className="text-2xl font-bold text-foreground mt-1">
              {closedPositions.length}
            </div>
          )}
        </div>
        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="text-xs text-muted uppercase tracking-wider">Claimable</div>
          {posLoading ? (
            <div className="h-7 w-12 bg-surface-2 rounded animate-pulse mt-1" />
          ) : (
            <div className="text-2xl font-bold text-yes mt-1">
              {claimablePositions.length}
            </div>
          )}
        </div>
        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="text-xs text-muted uppercase tracking-wider">Total Markets</div>
          {posLoading ? (
            <div className="h-7 w-12 bg-surface-2 rounded animate-pulse mt-1" />
          ) : (
            <div className="text-2xl font-bold text-foreground mt-1">
              {(positions ?? []).length}
            </div>
          )}
        </div>
      </div>

      <TxStatus state={txState} error={error} hash={txHash} />

      {posLoading ? (
        <LoadingState message="Loading positions from StudioNet..." />
      ) : (positions ?? []).length === 0 ? (
        <EmptyState
          title="No positions yet"
          description="You have no open or closed positions. Start trading to build your portfolio."
          action={
            <Link href="/markets">
              <Button>Browse Markets</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Active Positions */}
          {activePositions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Active Positions
              </h2>
              {activePositions.map((pos) => (
                <PositionRow
                  key={pos.market_id}
                  position={pos}
                  market={marketMap.get(pos.market_id)}
                  onClaim={claimReward}
                  claiming={["pending", "proposing"].includes(txState)}
                />
              ))}
            </section>
          )}

          {/* Claimable */}
          {claimablePositions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-yes uppercase tracking-wider">
                Claimable Rewards
              </h2>
              {claimablePositions.map((pos) => (
                <PositionRow
                  key={pos.market_id}
                  position={pos}
                  market={marketMap.get(pos.market_id)}
                  onClaim={claimReward}
                  claiming={["pending", "proposing"].includes(txState)}
                />
              ))}
            </section>
          )}

          {/* Closed Positions */}
          {closedPositions.filter(
            (p) =>
              !claimablePositions.some((c) => c.market_id === p.market_id)
          ).length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                Closed Positions
              </h2>
              {closedPositions
                .filter(
                  (p) =>
                    !claimablePositions.some((c) => c.market_id === p.market_id)
                )
                .map((pos) => (
                  <PositionRow
                    key={pos.market_id}
                    position={pos}
                    market={marketMap.get(pos.market_id)}
                    onClaim={claimReward}
                    claiming={false}
                  />
                ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
