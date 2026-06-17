"use client";
import type { TransactionState } from "@/types";

const stateConfig: Record<
  TransactionState,
  { label: string; color: string; dot: string }
> = {
  idle: { label: "", color: "", dot: "" },
  pending: { label: "Awaiting signature...", color: "text-yellow-400", dot: "bg-yellow-400" },
  proposing: { label: "Leader proposing...", color: "text-blue-400", dot: "bg-blue-400" },
  committing: { label: "Validators committing...", color: "text-blue-400", dot: "bg-blue-400" },
  revealing: { label: "Revealing votes...", color: "text-cyan-400", dot: "bg-cyan-400" },
  accepted: { label: "Accepted", color: "text-yes", dot: "bg-yes" },
  finalized: { label: "Finalized", color: "text-yes", dot: "bg-yes" },
  error: { label: "Transaction failed", color: "text-no", dot: "bg-no" },
};

export default function TxStatus({
  state,
  error,
  hash,
}: {
  state: TransactionState;
  error?: string | null;
  hash?: string | null;
}) {
  if (state === "idle") return null;
  const cfg = stateConfig[state];
  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${cfg.dot} ${
            ["pending", "proposing", "committing", "revealing"].includes(state)
              ? "animate-pulse"
              : ""
          }`}
        />
        <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
      </div>
      {error && <p className="text-xs text-no">{error}</p>}
      {hash && (
        <p className="text-xs text-muted font-mono truncate">
          tx: {hash}
        </p>
      )}
    </div>
  );
}
