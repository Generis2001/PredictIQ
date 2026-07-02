"use client";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { getWriteClient, MARKET_FACTORY_ADDRESS, TransactionStatus } from "@/lib/genlayer";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TxStatus from "@/components/ui/TxStatus";
import type { TransactionState, MarketCategory } from "@/types";

const CATEGORIES: MarketCategory[] = [
  "crypto",
  "politics",
  "sports",
  "tech",
  "business",
  "science",
];

export default function CreateMarketPage() {
  const { account, connect } = useWallet();
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    question: "",
    resolution_criteria: "",
    category: "crypto" as MarketCategory,
    deadline_days: "30",
    initial_liquidity: "1",
    sources: ["", "", ""],
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  function validate(): boolean {
    const e: Partial<Record<string, string>> = {};
    if (!form.question.trim()) e.question = "Question is required";
    else if (form.question.length < 20)
      e.question = "Question must be at least 20 characters";
    if (!form.resolution_criteria.trim())
      e.resolution_criteria = "Resolution criteria is required";
    else if (form.resolution_criteria.length < 30)
      e.resolution_criteria = "Criteria must be at least 30 characters";
    const days = parseInt(form.deadline_days, 10);
    if (isNaN(days) || days < 1) e.deadline_days = "Deadline must be at least 1 day";
    if (days > 365) e.deadline_days = "Deadline cannot exceed 365 days";
    const liquidity = parseFloat(form.initial_liquidity);
    if (isNaN(liquidity) || liquidity <= 0)
      e.initial_liquidity = "Initial liquidity must be positive";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!account) {
      await connect();
      return;
    }

    setTxState("pending");
    setTxError(null);
    setTxHash(null);

    try {
      const client = getWriteClient(account);
      const deadlineTs = Math.floor(Date.now() / 1000) + parseInt(form.deadline_days, 10) * 86400;
      const liquidityWei = BigInt(Math.floor(parseFloat(form.initial_liquidity) * 1e18));
      const filteredSources = form.sources.filter((s) => s.trim() !== "");

      const hash = await client.writeContract({
        address: MARKET_FACTORY_ADDRESS,
        functionName: "create_market",
        args: [
          form.question,
          form.resolution_criteria,
          form.category,
          deadlineTs,
          filteredSources,
        ],
        value: liquidityWei,
      });

      setTxHash(hash as string);
      setTxState("proposing");

      await client.waitForTransactionReceipt({
        hash: hash as never,
        status: TransactionStatus.ACCEPTED,
      });
      setTxState("accepted");

      const receipt = await client.waitForTransactionReceipt({
        hash: hash as never,
        status: TransactionStatus.FINALIZED,
      });
      setTxState("finalized");

      const id = (receipt as { result?: number })?.result;
      if (typeof id === "number") setCreatedId(id);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transaction failed");
      setTxState("error");
    }
  }

  if (createdId !== null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-yes/10 border border-yes flex items-center justify-center text-yes text-xl font-bold">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-foreground">Market Created</h1>
        <p className="text-muted text-sm">
          Your prediction market #{createdId} is now live on GenLayer StudioNet.
        </p>
        <div className="flex gap-3">
          <a href={`/market/${createdId}`}>
            <Button>View Market</Button>
          </a>
          <Button
            variant="secondary"
            onClick={() => {
              setCreatedId(null);
              setTxState("idle");
              setForm({
                question: "",
                resolution_criteria: "",
                category: "crypto",
                deadline_days: "30",
                initial_liquidity: "1",
                sources: ["", "", ""],
              });
            }}
          >
            Create Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Market</h1>
        <p className="text-muted text-sm mt-1">
          Deploy a new prediction market to GenLayer StudioNet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Question */}
        <Card>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">
            Question <span className="text-no">*</span>
          </label>
          <textarea
            rows={3}
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            placeholder="Will Bitcoin exceed $100,000 by December 31, 2025?"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-electric-blue resize-none"
          />
          {errors.question && (
            <p className="text-xs text-no mt-1">{errors.question}</p>
          )}
          <p className="text-xs text-muted mt-1">
            Must be a verifiable yes/no question. {form.question.length}/500
          </p>
        </Card>

        {/* Resolution Criteria */}
        <Card>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">
            Resolution Criteria <span className="text-no">*</span>
          </label>
          <textarea
            rows={4}
            value={form.resolution_criteria}
            onChange={(e) =>
              setForm({ ...form, resolution_criteria: e.target.value })
            }
            placeholder="This market resolves YES when the fetched evidence contains the required deterministic terms. YES terms: bitcoin, 100000, usd. NO terms: below 100000."
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-electric-blue resize-none"
          />
          {errors.resolution_criteria && (
            <p className="text-xs text-no mt-1">{errors.resolution_criteria}</p>
          )}
          <p className="text-xs text-muted mt-1">
            Be specific. Include YES terms and optional NO terms as comma-separated phrases so validators can verify the same rule.
          </p>
        </Card>

        {/* Category + Deadline */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <label className="block text-xs text-muted uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as MarketCategory })
              }
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-electric-blue"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </Card>

          <Card>
            <label className="block text-xs text-muted uppercase tracking-wider mb-2">
              Resolution in (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={form.deadline_days}
              onChange={(e) => setForm({ ...form, deadline_days: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-electric-blue"
            />
            {errors.deadline_days && (
              <p className="text-xs text-no mt-1">{errors.deadline_days}</p>
            )}
          </Card>
        </div>

        {/* Initial Liquidity */}
        <Card>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">
            Initial Liquidity (GEN) <span className="text-no">*</span>
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.initial_liquidity}
            onChange={(e) => setForm({ ...form, initial_liquidity: e.target.value })}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-electric-blue"
          />
          {errors.initial_liquidity && (
            <p className="text-xs text-no mt-1">{errors.initial_liquidity}</p>
          )}
          <p className="text-xs text-muted mt-1">
            Seeded equally into YES and NO pools. You can add more after creation.
          </p>
        </Card>

        {/* Resolution Sources */}
        <Card>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">
            Resolution Sources (optional)
          </label>
          <div className="flex flex-col gap-2">
            {form.sources.map((src, i) => (
              <input
                key={i}
                type="url"
                value={src}
                onChange={(e) => {
                  const s = [...form.sources];
                  s[i] = e.target.value;
                  setForm({ ...form, sources: s });
                }}
                placeholder={`https://example.com/source-${i + 1}`}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-electric-blue"
              />
            ))}
          </div>
          <p className="text-xs text-muted mt-1">
            The resolver fetches these URLs under strict validator equality before applying deterministic criteria.
          </p>
        </Card>

        <TxStatus state={txState} error={txError} hash={txHash} />

        {account ? (
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={["pending", "proposing", "committing", "revealing"].includes(txState)}
          >
            Deploy Market to StudioNet
          </Button>
        ) : (
          <Button type="button" size="lg" className="w-full" onClick={connect}>
            Connect Wallet to Create
          </Button>
        )}
      </form>
    </div>
  );
}
