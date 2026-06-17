export function formatGEN(wei: number | bigint): string {
  const value = typeof wei === "bigint" ? Number(wei) : wei;
  const gen = value / 1e18;
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(2)}M GEN`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(2)}K GEN`;
  return `${gen.toFixed(4)} GEN`;
}

export function formatVolume(wei: number | bigint): string {
  const value = typeof wei === "bigint" ? Number(wei) : wei;
  const gen = value / 1e18;
  if (gen >= 1_000_000) return `$${(gen / 1_000_000).toFixed(1)}M`;
  if (gen >= 1_000) return `$${(gen / 1_000).toFixed(1)}K`;
  return `$${gen.toFixed(2)}`;
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

export function calcYesPrice(yesPool: number, noPool: number): number {
  const total = yesPool + noPool;
  if (total === 0) return 0.5;
  return noPool / total;
}

export function calcNoPrice(yesPool: number, noPool: number): number {
  const total = yesPool + noPool;
  if (total === 0) return 0.5;
  return yesPool / total;
}
