"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAllMarkets } from "@/hooks/useMarkets";
import { formatAddress } from "@/lib/format";

function Avatar({ src, username, size = 52 }: { src?: string; username?: string; size?: number }) {
  const initials = username ? username.slice(0, 2).toUpperCase() : "?";
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="rounded-full overflow-hidden bg-surface-2 border border-border flex items-center justify-center shrink-0"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={username} className="w-full h-full object-cover" />
      ) : (
        <span
          style={{
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: size * 0.32,
            color: "#d8d8e4",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

export default function ProfilePanel() {
  const { account } = useWallet();
  const { data: profile } = useProfile(account);
  const { data: positions } = usePortfolio(account);
  const { data: allMarkets } = useAllMarkets();
  const [open, setOpen] = useState(false);

  if (!account || !profile) return null;

  const marketsCreated = (allMarkets ?? []).filter(
    (m) => m.creator.toLowerCase() === account.toLowerCase()
  ).length;

  const activePositions = (positions ?? []).filter((p) => {
    const m = (allMarkets ?? []).find((x) => x.id === p.market_id);
    return m && !m.resolved;
  }).length;

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={open ? "Close profile panel" : "Open profile panel"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative z-10 flex flex-col items-center justify-center gap-2 w-7 cursor-pointer"
        style={{
          background: "#171719",
          borderLeft: "1px solid #2e2e33",
          borderTop: "1px solid #2e2e33",
          borderBottom: "1px solid #2e2e33",
          borderRadius: "8px 0 0 8px",
          paddingTop: 16,
          paddingBottom: 16,
          boxShadow: "-2px 0 12px rgba(0,0,0,0.4)",
        }}
      >
        <Avatar src={profile.avatar_url} username={profile.username} size={20} />
        <span
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "#87878f",
            textTransform: "uppercase",
            userSelect: "none",
          }}
        >
          Profile
        </span>
      </button>

      <div
        aria-hidden={!open}
        style={{
          width: 260,
          maxHeight: "80vh",
          transform: open ? "translate(0, -50%)" : "translate(calc(100% + 1.75rem), -50%)",
          transition: "transform 0.2s cubic-bezier(0.4,0,0.2,1)",
          background: "#171719",
          borderLeft: "1px solid #2e2e33",
          borderTop: "1px solid #2e2e33",
          borderBottom: "1px solid #2e2e33",
          borderRadius: "0 0 0 12px",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.5)",
          overflowY: "auto",
        }}
        className="absolute right-7 top-1/2 flex flex-col gap-4 p-5"
      >
        <div className="flex items-center gap-3">
          <Avatar src={profile.avatar_url} username={profile.username} size={48} />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              @{profile.username}
            </span>
            <span className="text-[11px] text-muted font-mono mt-0.5">
              {formatAddress(account)}
            </span>
          </div>
        </div>

        {profile.bio && (
          <p className="text-xs leading-relaxed" style={{ color: "#a0a0aa" }}>
            {profile.bio.length > 140 ? profile.bio.slice(0, 140) + "…" : profile.bio}
          </p>
        )}

        {profile.twitter_handle && (
          <a
            href={`https://x.com/${profile.twitter_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted hover:text-foreground transition-colors w-fit"
          >
            @{profile.twitter_handle} on X ↗
          </a>
        )}

        <div className="border-t border-border" />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-surface-2 border border-border">
            <span className="text-[10px] text-muted uppercase tracking-wider">Markets</span>
            <span className="text-lg font-bold text-foreground">{marketsCreated}</span>
          </div>
          <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-surface-2 border border-border">
            <span className="text-[10px] text-muted uppercase tracking-wider">Active</span>
            <span className="text-lg font-bold text-foreground">{activePositions}</span>
          </div>
        </div>

        <Link
          href="/profile"
          className="text-xs text-center py-2 rounded-lg border border-border text-muted hover:text-foreground hover:border-muted transition-colors mt-auto"
        >
          View full profile →
        </Link>
      </div>
    </div>
  );
}
