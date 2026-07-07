"use client";
import { use, useState } from "react";
import { useMarket } from "@/hooks/useMarkets";
import { useUserPosition } from "@/hooks/usePortfolio";
import { useTrading } from "@/hooks/useTrading";
import { useResolution, useResolveMarket } from "@/hooks/useResolution";
import { useWallet } from "@/hooks/useWallet";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import TxStatus from "@/components/ui/TxStatus";
import { LoadingState, EmptyState } from "@/components/ui/Spinner";
import {
  formatGEN,
  formatVolume,
  formatTimeRemaining,
  formatAddress,
  calcYesPrice,
  calcNoPrice,
  formatPercent,
  formatGENAmount,
  hasMarketLiquidity,
} from "@/lib/format";
import Link from "next/link";

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const marketId = parseInt(id, 10);

  const { data: market, isLoading } = useMarket(isNaN(marketId) ? null : marketId);
  const { account, connect } = useWallet();
  const { data: position } = useUserPosition(account, marketId);
  const { data: resolution } = useResolution(marketId);
  const { txState, txHash, error, buyYes, buyNo, sellYes, sellNo, claimReward, reset } =
    useTrading(account);
  const {
    txState: resolveTxState,
    txHash: resolveTxHash,
    error: resolveError,
    resolveMarket,
    reset: resolveReset,
  } = useResolveMarket(account);

  const [tab, setTab] = useState<"buy-yes" | "buy-no" | "sell">("buy-yes");
  const [amount, setAmount] = useState("");
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  if (isLoading) return <LoadingState message="Loading market..." />;
  if (!market)
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          title="Market not found"
          description="This market does not exist on StudioNet."
          action={
            <Link href="/markets">
              <Button size="sm" variant="secondary">Back to Markets</Button>
            </Link>
          }
        />
      </div>
    );

  const yesPrice = calcYesPrice(market.yes_pool, market.no_pool);
  const noPrice = calcNoPrice(market.yes_pool, market.no_pool);
  const total = Number(market.yes_pool) + Number(market.no_pool);
  const hasLiquidity = hasMarketLiquidity(market.yes_pool, market.no_pool);
  const isExpired = now > market.deadline;

  const handleTrade = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    const wei = BigInt(Math.floor(parseFloat(amount) * 1e18));
    reset();
    if (tab === "buy-yes") await buyYes(marketId, wei);
    else if (tab === "buy-no") await buyNo(marketId, wei);
    setAmount("");
  };

  const handleResolve = () => {
    resolveReset();
    resolveMarket(marketId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/markets" className="hover:text-foreground">Markets</Link>
        <span>/</span>
        <span>#{market.id}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Market Info */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-start gap-3 flex-wrap">
            <Badge variant="neutral">{market.category}</Badge>
            {market.resolved ? (
              <Badge variant={market.outcome ? "yes" : "no"}>
                Resolved: {market.outcome ? "YES" : "NO"}
              </Badge>
            ) : (
              <Badge variant="active">Active · {formatTimeRemaining(market.deadline)}</Badge>
            )}
          </div>

          <h1 className="text-xl font-bold text-foreground leading-snug">
            {market.question}
          </h1>

          <Card>
            <p className="text-xs text-muted uppercase tracking-wider mb-2">
              Resolution Criteria
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {market.resolution_criteria}
            </p>
          </Card>

          {/* Price Bar */}
          <Card>
            <div className="flex gap-4 mb-3">
              <div className="flex-1 text-center">
                <div className="text-xs text-muted mb-1">YES</div>
                <div className="text-2xl font-black text-yes">
                  {yesPrice !== null ? formatPercent(yesPrice) : "—"}
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-xs text-muted mb-1">NO</div>
                <div className="text-2xl font-black text-no">
                  {noPrice !== null ? formatPercent(noPrice) : "—"}
                </div>
              </div>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${hasLiquidity ? "bg-no" : "bg-surface-2"}`}>
              <div
                className="h-full bg-yes rounded-full transition-all"
                style={{ width: `${yesPrice !== null ? yesPrice * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted">
              <span>YES Pool: {formatGEN(market.yes_pool)}</span>
              <span>{hasLiquidity ? `Total Vol: ${formatVolume(total)}` : "No liquidity yet"}</span>
              <span>NO Pool: {formatGEN(market.no_pool)}</span>
            </div>
          </Card>

          {/* Sources */}
          {market.sources && market.sources.length > 0 && (
            <Card>
              <p className="text-xs text-muted uppercase tracking-wider mb-2">
                Resolution Sources
              </p>
              <ul className="flex flex-col gap-1">
                {market.sources.map((src, i) => (
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
            </Card>
          )}

          {/* Resolution Report */}
          {resolution && (
            <Card>
              <p className="text-xs text-muted uppercase tracking-wider mb-3">
                Resolution Report
              </p>
              <div className="flex gap-3 mb-3 flex-wrap">
                <Badge variant={resolution.outcome === "YES" ? "yes" : "no"}>
                  Outcome: {resolution.outcome}
                </Badge>
                <Badge variant="neutral">
                  Confidence: {formatPercent(parseFloat(resolution.confidence))}
                </Badge>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">
                {resolution.reasoning}
              </p>
              {resolution.sources.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1">Evidence Sources Used:</p>
                  <ul className="flex flex-col gap-0.5">
                    {resolution.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-electric-blue hover:underline truncate block"
                        >
                          {s}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted mt-3">
                Resolved at: {resolution.resolved_at}
              </p>
            </Card>
          )}

          {/* Market Meta */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg border border-border bg-surface">
              <span className="text-muted">Creator</span>
              <p className="text-foreground font-mono mt-0.5">
                {formatAddress(market.creator)}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-surface">
              <span className="text-muted">Market ID</span>
              <p className="text-foreground font-mono mt-0.5">#{market.id}</p>
            </div>
          </div>
        </div>

        {/* Right: Trading Panel */}
        <div className="flex flex-col gap-4">
          {/* Your Position */}
          {position && (position.yes_shares > 0 || position.no_shares > 0) && (
            <Card>
              <p className="text-xs text-muted uppercase tracking-wider mb-2">
                Your Position
              </p>
              {position.yes_shares > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-yes">YES Shares</span>
                  <span className="text-foreground font-mono">
                    {position.yes_shares}
                  </span>
                </div>
              )}
              {position.no_shares > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-no">NO Shares</span>
                  <span className="text-foreground font-mono">
                    {position.no_shares}
                  </span>
                </div>
              )}
              {market.resolved && !position.claimed && (
                <Button
                  className="w-full mt-3"
                  variant="primary"
                  onClick={() => { reset(); claimReward(marketId); }}
                  loading={
                    ["pending", "proposing", "committing", "revealing"].includes(txState)
                  }
                >
                  Claim Reward
                </Button>
              )}
              {market.resolved && position.claimed && (
                <p className="text-xs text-yes mt-3 text-center">Reward claimed</p>
              )}
            </Card>
          )}

          {/* Resolve Panel — expired but not yet resolved */}
          {isExpired && !market.resolved && (
            <Card>
              <p className="text-xs text-muted uppercase tracking-wider mb-2">
                Resolve Market
              </p>
              <p className="text-xs text-muted mb-3 leading-relaxed">
                This market has passed its deadline. Anyone can trigger on-chain
                resolution — validators will fetch the sources, agree on the
                evidence, then use LLM consensus to determine the outcome.
              </p>
              {account ? (
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={handleResolve}
                  loading={["pending", "proposing", "committing", "revealing"].includes(resolveTxState)}
                  disabled={resolveTxState === "finalized"}
                >
                  {resolveTxState === "finalized" ? "Resolved" : "Resolve Market"}
                </Button>
              ) : (
                <Button className="w-full" onClick={connect}>
                  Connect Wallet to Resolve
                </Button>
              )}
              <TxStatus state={resolveTxState} error={resolveError} hash={resolveTxHash} />
            </Card>
          )}

          {/* Trade Panel — only while market is active (not expired, not resolved) */}
          {!market.resolved && !isExpired && (
            <Card>
              <p className="text-xs text-muted uppercase tracking-wider mb-3">
                Place Trade
              </p>

              <div className="flex gap-1 mb-4 border border-border rounded-lg p-0.5">
                {(["buy-yes", "buy-no", "sell"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                      tab === t
                        ? t === "buy-yes"
                          ? "bg-yes text-white"
                          : t === "buy-no"
                          ? "bg-no text-white"
                          : "bg-surface-2 text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {t === "buy-yes" ? "Buy YES" : t === "buy-no" ? "Buy NO" : "Sell"}
                  </button>
                ))}
              </div>

              {tab !== "sell" ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-muted mb-1 block">
                      Amount (GEN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-electric-blue"
                    />
                  </div>
                  {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (() => {
                    const amt = parseFloat(amount);
                    const price = tab === "buy-yes" ? yesPrice : noPrice;
                    const validPrice = price !== null && price >= 0.001 && price <= 0.999;
                    const shares = validPrice ? amt / price : null;
                    return (
                      <div className="text-xs border border-border rounded-lg p-3 flex flex-col gap-1.5">
                        <div className="flex justify-between text-muted">
                          <span>Odds</span>
                          <span>{price !== null ? formatPercent(price) : "—"}</span>
                        </div>
                        <div className="flex justify-between text-muted">
                          <span>Est. shares</span>
                          <span>{shares !== null ? shares.toFixed(2) : "—"}</span>
                        </div>
                        <div className="border-t border-border my-0.5" />
                        <div className="flex justify-between font-semibold">
                          <span className="text-muted">To win</span>
                          <span className={tab === "buy-yes" ? "text-yes" : "text-no"}>
                            {shares !== null ? formatGENAmount(shares) : "—"}
                          </span>
                        </div>
                        {price === null && (
                          <div className="text-[11px] text-muted">
                            No live odds yet. This market needs its first liquidity.
                          </div>
                        )}
                        {shares !== null && shares > amt && (
                          <div className="flex justify-between text-[11px] text-muted">
                            <span>Net profit if correct</span>
                            <span>+{formatGENAmount(shares - amt)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {account ? (
                    <Button
                      variant={tab === "buy-yes" ? "yes" : "no"}
                      className="w-full"
                      onClick={handleTrade}
                      disabled={!amount || isNaN(parseFloat(amount))}
                      loading={
                        ["pending", "proposing", "committing", "revealing"].includes(txState)
                      }
                    >
                      {tab === "buy-yes" ? "Buy YES" : "Buy NO"}
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={connect}>
                      Connect Wallet
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {position && (position.yes_shares > 0 || position.no_shares > 0) ? (
                    <>
                      <p className="text-xs text-muted">Sell all shares in your position.</p>
                      {position.yes_shares > 0 && (
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => { reset(); sellYes(marketId, BigInt(position.yes_shares)); }}
                          loading={["pending", "proposing", "committing", "revealing"].includes(txState)}
                        >
                          Sell {position.yes_shares} YES shares
                        </Button>
                      )}
                      {position.no_shares > 0 && (
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => { reset(); sellNo(marketId, BigInt(position.no_shares)); }}
                          loading={["pending", "proposing", "committing", "revealing"].includes(txState)}
                        >
                          Sell {position.no_shares} NO shares
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted text-center py-4">
                      No position to sell.
                    </p>
                  )}
                </div>
              )}

              <TxStatus state={txState} error={error} hash={txHash} />
            </Card>
          )}

          {/* Market Stats */}
          <Card>
            <p className="text-xs text-muted uppercase tracking-wider mb-3">
              Market Stats
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Total Volume</span>
                <span className="text-foreground">{formatVolume(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">YES Pool</span>
                <span className="text-yes">{formatGEN(market.yes_pool)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">NO Pool</span>
                <span className="text-no">{formatGEN(market.no_pool)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Deadline</span>
                <span className="text-foreground">
                  {new Date(market.deadline * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
