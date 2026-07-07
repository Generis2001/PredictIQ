export function formatGEN(wei: number | bigint | string): string {
  const value = typeof wei === "bigint" ? Number(wei) : Number(wei);
  const gen = value / 1e18;
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(2)}M GEN`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(2)}K GEN`;
  return `${gen.toFixed(4)} GEN`;
}

export function formatVolume(wei: number | bigint): string {
  return formatGEN(wei);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimeRemaining(deadline: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline - now;
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function getPoolTotal(yesPool: number | string, noPool: number | string): number | null {
  const y = Number(yesPool);
  const n = Number(noPool);
  const total = y + n;
  if (!isFinite(total)) return null;
  return total;
}

export function hasMarketLiquidity(yesPool: number | string, noPool: number | string): boolean {
  const total = getPoolTotal(yesPool, noPool);
  return total !== null && total > 0;
}

export function calcYesPrice(yesPool: number | string, noPool: number | string): number | null {
  const y = Number(yesPool);
  const n = Number(noPool);
  const total = getPoolTotal(y, n);
  if (total === null || total === 0) return null;
  return n / total;
}

export function calcNoPrice(yesPool: number | string, noPool: number | string): number | null {
  const y = Number(yesPool);
  const n = Number(noPool);
  const total = getPoolTotal(y, n);
  if (total === null || total === 0) return null;
  return y / total;
}

// Formats a raw GEN amount (not wei) with no scientific notation, max 2 decimal places
export function formatGENAmount(gen: number): string {
  if (!isFinite(gen) || isNaN(gen) || gen <= 0) return "—";
  if (gen >= 1_000_000_000) return `${(gen / 1_000_000_000).toFixed(2)}B GEN`;
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(2)}M GEN`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(2)}K GEN`;
  return `${gen.toFixed(2)} GEN`;
}
