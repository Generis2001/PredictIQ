"use client";
import Link from "next/link";
import { useProtocolStats } from "@/hooks/useMarkets";
import Button from "@/components/ui/Button";
import { formatVolume, formatPercent } from "@/lib/format";

function StatCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-border bg-surface">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      {loading ? (
        <div className="h-7 w-20 bg-surface-2 rounded animate-pulse" />
      ) : (
        <span className="text-2xl font-bold text-foreground">{value}</span>
      )}
    </div>
  );
}

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
      "When the deadline passes, GenLayer's Intelligent Contract gathers evidence from the web, reasons through the question, and proposes an outcome.",
  },
  {
    step: "04",
    title: "Validators Reach Consensus",
    description:
      "Independent validator nodes verify the AI reasoning using the Equivalence Principle. Unanimous consensus finalizes the outcome on-chain.",
  },
  {
    step: "05",
    title: "Winners Claim Rewards",
    description:
      "Correct position holders claim their proportional share of the losing pool automatically through the RewardDistributor contract.",
  },
];

const WHY_PREDICTIQ = [
  {
    title: "No Oracle Dependency",
    description:
      "Traditional prediction markets rely on centralized oracles that can be manipulated or fail. PredictIQ uses AI reasoning embedded directly in the contract.",
  },
  {
    title: "Verifiable AI Reasoning",
    description:
      "Every resolution includes a full reasoning trace: evidence gathered, sources cited, confidence score, and the logical path to the outcome — all stored on-chain.",
  },
  {
    title: "Validator Consensus",
    description:
      "No single AI call determines an outcome. Multiple GenLayer validators independently run the resolution logic. Consensus is required for finalization.",
  },
  {
    title: "Transparent & Auditable",
    description:
      "Every trade, position, and resolution is recorded on GenLayer StudioNet. Anyone can inspect the full history of any market at any time.",
  },
];

export default function LandingPage() {
  const { data: stats, isLoading } = useProtocolStats();

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col gap-24">
      {/* Hero */}
      <section className="text-center flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 border border-electric-blue/30 bg-electric-blue/5 rounded-full px-4 py-1.5 text-xs text-electric-blue">
          <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse" />
          Live on GenLayer StudioNet
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight max-w-3xl">
          Trade Predictions.{" "}
          <span className="text-electric-blue">Let AI Resolve Reality.</span>
        </h1>
        <p className="text-lg text-muted max-w-2xl leading-relaxed">
          PredictIQ replaces unreliable oracles with GenLayer Intelligent Contracts — autonomous AI agents that gather evidence, reason through outcomes, and reach validator consensus entirely on-chain.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/markets">
            <Button size="lg">Browse Markets</Button>
          </Link>
          <Link href="/create">
            <Button size="lg" variant="secondary">Create a Market</Button>
          </Link>
        </div>
      </section>

      {/* Live Protocol Stats */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-muted uppercase tracking-widest text-center">
          Live Protocol Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Open Markets"
            value={stats ? String(stats.total_markets) : "—"}
            loading={isLoading}
          />
          <StatCard
            label="Total Volume"
            value={stats ? formatVolume(stats.total_volume) : "—"}
            loading={isLoading}
          />
          <StatCard
            label="Markets Resolved"
            value={stats ? String(stats.total_resolved) : "—"}
            loading={isLoading}
          />
          <StatCard
            label="Active Traders"
            value={stats ? String(stats.total_traders) : "—"}
            loading={isLoading}
          />
        </div>
        {!isLoading && !stats && (
          <p className="text-center text-xs text-muted">
            Stats will appear once contracts are deployed and activity begins.
          </p>
        )}
      </section>

      {/* How It Works */}
      <section className="flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">How It Works</h2>
          <p className="text-muted mt-1 text-sm">Five steps from question to payout</p>
        </div>
        <div className="grid md:grid-cols-5 gap-4">
          {HOW_IT_WORKS.map(({ step, title, description }) => (
            <div
              key={step}
              className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-surface"
            >
              <span className="text-3xl font-black text-electric-blue/20">{step}</span>
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
              <p className="text-xs text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why PredictIQ */}
      <section className="flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Why PredictIQ</h2>
          <p className="text-muted mt-1 text-sm">Built different from the start</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {WHY_PREDICTIQ.map(({ title, description }) => (
            <div
              key={title}
              className="p-5 rounded-xl border border-border bg-surface flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-electric-blue" />
                <h3 className="font-semibold text-foreground">{title}</h3>
              </div>
              <p className="text-sm text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why GenLayer */}
      <section className="rounded-2xl border border-border bg-surface p-8 flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Why GenLayer</h2>
          <p className="text-muted mt-1 text-sm">The only blockchain built for AI-native contracts</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Intelligent Contracts",
              body: "Python contracts with native LLM inference and web access via gl.nondet.exec_prompt() and gl.nondet.web.get(). AI is a first-class primitive.",
            },
            {
              title: "Optimistic Democracy",
              body: "A leader validator proposes an outcome; peer validators independently verify using the Equivalence Principle. No single point of failure.",
            },
            {
              title: "Non-Determinism Handled",
              body: "GenVM's execution model separates non-deterministic AI/web operations from deterministic state transitions, ensuring consensus without identical outputs.",
            },
          ].map(({ title, body }) => (
            <div key={title} className="flex flex-col gap-2">
              <h3 className="font-semibold text-cyan">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-center mt-2">
          <a
            href="https://genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-electric-blue hover:underline"
          >
            Learn about GenLayer →
          </a>
          <a
            href="https://docs.genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-electric-blue hover:underline"
          >
            Read the docs →
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">Ready to trade?</h2>
        <p className="text-muted text-sm">Connect your wallet and start predicting.</p>
        <Link href="/markets">
          <Button size="lg">View All Markets</Button>
        </Link>
      </section>
    </div>
  );
}
