"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAllMarkets } from "@/hooks/useMarkets";
import { formatAddress } from "@/lib/format";

function Avatar({ src, username, size = 56 }: { src?: string; username?: string; size?: number }) {
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
      className="fixed right-0 top-1/3 z-40 flex items-stretch"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Slide-in panel */}
      <div
        style={{
          width: 240,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
        className="bg-surface border-l border-t border-b border-border rounded-l-xl shadow-2xl flex flex-col gap-4 p-4"
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <Avatar src={profile.avatar_url} username={profile.username} size={44} />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">@{profile.username}</span>
            <span className="text-xs text-muted font-mono">{formatAddress(account)}</span>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-xs leading-relaxed" style={{ color: "#a0a0aa" }}>
            {profile.bio.length > 120 ? profile.bio.slice(0, 120) + "…" : profile.bio}
          </p>
        )}

        {/* Twitter */}
        {profile.twitter_handle && (
          <a
            href={`https://x.com/${profile.twitter_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted hover:text-foreground transition-colors w-fit"
          >
            @{profile.twitter_handle} on X
          </a>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted uppercase tracking-wider">Markets</span>
            <span className="text-base font-bold text-foreground">{marketsCreated}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted uppercase tracking-wider">Active</span>
            <span className="text-base font-bold text-foreground">{activePositions}</span>
          </div>
        </div>

        {/* Link to full profile */}
        <Link
          href="/profile"
          className="text-xs text-center py-1.5 rounded-lg border border-border text-muted hover:text-foreground transition-colors"
        >
          View full profile
        </Link>
      </div>

      {/* Tab handle — always visible on the right edge */}
      <div
        style={{
          writingMode: "vertical-rl",
          transform: open ? "none" : "none",
        }}
        className="flex items-center justify-center w-5 bg-surface border border-border rounded-l-md cursor-pointer"
      >
        <span className="text-[9px] tracking-widest text-muted uppercase select-none rotate-180">
          Profile
        </span>
      </div>
    </div>
  );
}
