"use client";
import Link from "next/link";
import { useProtocolStats } from "@/hooks/useMarkets";
import { formatVolume } from "@/lib/format";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create a Market",
    description:
      "Define a verifiable yes/no question, set resolution criteria, choose a deadline, and provide reference sources for AI resolution.",
  },
  {
    step: "02",
    title: "Trade YES or NO",
    description:
      "Buy YES or NO shares using GEN tokens. Prices update continuously based on pool liquidity — early traders get better odds.",
  },
  {
    step: "03",
    title: "AI Resolves",
    description:
      "When the deadline passes, PredictIQResolver gathers evidence from the web, reasons through the question, and proposes an outcome.",
  },
  {
    step: "04",
    title: "Validators Consensus",
    description:
      "Independent GenLayer validators verify the AI reasoning. Unanimous consensus under the Equivalence Principle finalizes on-chain.",
  },
  {
    step: "05",
    title: "Winners Claim",
    description:
      "Correct position holders claim their proportional share of the losing pool automatically through the smart contract.",
  },
];

const WHY_PREDICTIQ = [
  {
    title: "No Oracle Dependency",
    description:
      "Traditional markets rely on centralized oracles. PredictIQ embeds AI reasoning directly in the contract — no third party needed.",
  },
  {
    title: "Verifiable AI Reasoning",
    description:
      "Every resolution includes a full trace: evidence gathered, sources cited, confidence score, and reasoning — all stored on-chain.",
  },
  {
    title: "Validator Consensus",
    description:
      "No single AI call determines an outcome. Multiple GenLayer validators independently verify before finalization.",
  },
  {
    title: "Fully Transparent",
    description:
      "Every trade, position, and resolution is recorded on GenLayer StudioNet. Anyone can inspect any market's full history.",
  },
];

export default function LandingPage() {
  const { data: stats, isLoading } = useProtocolStats();

  return (
    <div className="flex flex-col">
      {/* ── HERO ── */}
      <section className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">

        {/* Background glow — right-side luminous blob (blue/indigo instead of green) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 80% 55%, rgba(59,130,246,0.22) 0%, rgba(79,70,229,0.14) 40%, transparent 70%)",
          }}
        />

        {/* S-curve divider SVG — glowing left edge */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 w-full h-full"
          viewBox="0 0 1280 720"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(6,182,212,0)" />
              <stop offset="35%" stopColor="rgba(59,130,246,0.9)" />
              <stop offset="65%" stopColor="rgba(79,70,229,0.9)" />
              <stop offset="100%" stopColor="rgba(79,70,229,0)" />
            </linearGradient>
          </defs>
          {/* S-curve path — dark left, lit right */}
          <path
            d="M 520 -20 C 520 180, 760 260, 760 380 C 760 500, 520 580, 520 740"
            fill="none"
            stroke="url(#curveGrad)"
            strokeWidth="1.5"
            filter="url(#glow)"
            opacity="0.85"
          />
        </svg>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end flex-1 max-w-7xl mx-auto w-full px-6 md:px-10 pb-16 pt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">

            {/* Left — headline */}
            <div className="flex flex-col gap-6">
              <p
                className="text-xs font-semibold tracking-[0.2em] uppercase"
                style={{ color: "rgba(59,130,246,0.8)" }}
              >
                FOR PREDICTORS, BY AI
              </p>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-foreground leading-none tracking-tight">
                Trade<br />
                The Future
              </h1>
              <div className="flex items-center gap-4 pt-2">
                <Link
                  href="/markets"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-background transition-all hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #4f46e5)" }}
                >
                  Browse Markets <span className="text-base">››</span>
                </Link>
                <Link
                  href="/create"
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  Create a Market
                </Link>
              </div>
            </div>

            {/* Right — descriptor block */}
            <div className="flex flex-col gap-2 md:self-end md:text-right">
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
                AI-powered prediction markets on GenLayer.<br />
                Evidence-based resolution, validator consensus,
              </p>
              <p
                className="text-base md:text-lg font-semibold"
                style={{ color: "#3b82f6" }}
              >
                zero oracles required.
              </p>
            </div>
          </div>
        </div>

        {/* Live stats strip at very bottom of hero */}
        <div className="relative z-10 border-t border-border/50 bg-surface/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Open Markets", value: stats?.total_markets != null ? String(stats.total_markets) : null },
              { label: "Total Volume", value: stats?.total_volume != null ? formatVolume(stats.total_volume) : null },
              { label: "Resolved", value: stats?.total_resolved != null ? String(stats.total_resolved) : null },
              { label: "Traders", value: stats?.total_traders != null ? String(stats.total_traders) : null },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
                {isLoading ? (
                  <div className="h-6 w-14 bg-surface-2 rounded animate-pulse" />
                ) : value != null ? (
                  <span className="text-xl font-bold text-foreground">{value}</span>
                ) : (
                  <span className="text-xl font-bold text-muted">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-7xl mx-auto w-full px-6 md:px-10 py-24 flex flex-col gap-12">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-electric-blue mb-2">
            Protocol
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-foreground">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {HOW_IT_WORKS.map(({ step, title, description }) => (
            <div
              key={step}
              className="flex flex-col gap-3 p-5 rounded-2xl border border-border bg-surface hover:border-electric-blue/30 transition-colors"
            >
              <span
                className="text-4xl font-black leading-none"
                style={{ color: "rgba(59,130,246,0.15)" }}
              >
                {step}
              </span>
              <h3 className="font-bold text-foreground text-sm">{title}</h3>
              <p className="text-xs text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY PREDICTIQ ── */}
      <section
        className="w-full py-24"
        style={{ background: "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.04) 50%, transparent 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col gap-12">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-electric-blue mb-2">
              Why PredictIQ
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              Built different<br />
              <span style={{ color: "#3b82f6" }}>from the start.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {WHY_PREDICTIQ.map(({ title, description }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-border bg-surface flex flex-col gap-3 hover:border-electric-blue/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#3b82f6" }}
                  />
                  <h3 className="font-bold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY GENLAYER ── */}
      <section className="max-w-7xl mx-auto w-full px-6 md:px-10 py-24 flex flex-col gap-12">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan mb-2">
            Powered By
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-foreground">
            Why GenLayer
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Intelligent Contracts",
              body: "Python contracts with native LLM inference and web access via gl.exec_prompt() and gl.get_webpage(). AI is a first-class primitive.",
              color: "#06b6d4",
            },
            {
              title: "Optimistic Democracy",
              body: "A leader validator proposes; peers independently verify using the Equivalence Principle. No single point of failure in resolution.",
              color: "#3b82f6",
            },
            {
              title: "Non-Determinism Handled",
              body: "GenVM's execution model separates AI/web operations from deterministic state transitions — consensus without identical outputs.",
              color: "#4f46e5",
            },
          ].map(({ title, body, color }) => (
            <div
              key={title}
              className="p-6 rounded-2xl border border-border bg-surface flex flex-col gap-3 hover:border-electric-blue/30 transition-colors"
            >
              <h3 className="font-bold" style={{ color }}>{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-6">
          <a
            href="https://genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-electric-blue hover:underline"
          >
            Learn about GenLayer →
          </a>
          <a
            href="https://docs.genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-electric-blue hover:underline"
          >
            Read the docs →
          </a>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="w-full py-24 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(59,130,246,0.1) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 flex flex-col items-center gap-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-foreground">
            Ready to predict?
          </h2>
          <p className="text-muted max-w-md">
            Connect your wallet, browse live markets, or create the first prediction market on PredictIQ.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #3b82f6, #4f46e5)" }}
            >
              View All Markets ››
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center px-8 py-3 rounded-full font-bold text-sm border border-border text-muted hover:text-foreground hover:border-electric-blue/40 transition-all"
            >
              Create a Market
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
