"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import Button from "@/components/ui/Button";
import { formatAddress } from "@/lib/format";

const navLinks = [
  { href: "/markets", label: "Markets" },
  { href: "/create", label: "Create" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/resolution", label: "Resolution" },
  { href: "/analytics", label: "Analytics" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { account, connecting, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <nav className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-1 shrink-0">
          <span className="font-bold text-foreground tracking-tight">Predict</span>
          <span
            style={{
              fontFamily: "var(--font-playfair)",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "1.15rem",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "#d8d8e4",
            }}
          >
            IQ
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname.startsWith(href)
                  ? "text-foreground bg-surface border border-border"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-muted border border-border rounded px-2 py-0.5">
            StudioNet
          </span>
          {account ? (
            <button
              onClick={disconnect}
              className="text-xs font-mono bg-surface border border-border rounded-lg px-3 py-1.5 text-muted hover:text-foreground transition-colors"
            >
              {formatAddress(account)}
            </button>
          ) : (
            <Button size="sm" onClick={connect} loading={connecting}>
              Connect Wallet
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
