"use client";
import { useState, useRef } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useProfile, useHasProfile, useProfileActions } from "@/hooks/useProfile";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAllMarkets } from "@/hooks/useMarkets";
import Button from "@/components/ui/Button";
import TxStatus from "@/components/ui/TxStatus";
import { EmptyState } from "@/components/ui/Spinner";
import { formatAddress } from "@/lib/format";

function Avatar({
  src,
  username,
  size = 80,
}: {
  src?: string;
  username?: string;
  size?: number;
}) {
  const initials = username ? username.slice(0, 2).toUpperCase() : "?";
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="rounded-full overflow-hidden bg-surface-2 border border-border flex items-center justify-center"
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-border bg-surface">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { account, connect } = useWallet();
  const { data: profile } = useProfile(account);
  const { data: hasProfile } = useHasProfile(account);
  const { data: positions } = usePortfolio(account);
  const { data: allMarkets } = useAllMarkets();
  const { txState, txHash, error, createProfile, updateProfile, reset } = useProfileActions(account);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "", twitter_handle: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    if (!profile) return;
    setForm({
      username: profile.username,
      bio: profile.bio,
      twitter_handle: profile.twitter_handle,
    });
    setAvatarPreview(profile.avatar_url);
    setEditing(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!hasProfile) {
      if (!form.username.trim()) errs.username = "Required";
      else if (form.username.length < 3) errs.username = "Min 3 characters";
      else if (form.username.length > 30) errs.username = "Max 30 characters";
      else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = "Letters, numbers, underscores only";
    }
    if (!form.bio.trim()) errs.bio = "Required";
    else if (form.bio.length > 300) errs.bio = "Max 300 characters";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    reset();

    let avatarUrl = profile?.avatar_url ?? "";
    if (avatarFile) {
      setAvatarUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const res = await fetch("/api/avatar", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        avatarUrl = json.url;
      } catch (err) {
        setFieldErrors({ avatar: err instanceof Error ? err.message : "Upload failed" });
        setAvatarUploading(false);
        return;
      }
      setAvatarUploading(false);
    }

    const handle = form.twitter_handle.replace(/^@/, "");
    let saved = false;
    if (hasProfile) {
      saved = await updateProfile(form.bio, avatarUrl, handle);
    } else {
      saved = await createProfile(form.username, form.bio, avatarUrl, handle);
    }
    if (saved) {
      setEditing(false);
      setAvatarFile(null);
    }
  }

  if (!account) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState
          title="Connect your wallet"
          description="Connect MetaMask to create or view your PredictIQ profile."
          action={<Button onClick={connect}>Connect Wallet</Button>}
        />
      </div>
    );
  }

  const marketsCreated = (allMarkets ?? []).filter(
    (m) => m.creator.toLowerCase() === account.toLowerCase()
  ).length;
  const activePositions = (positions ?? []).filter((p) => {
    const m = (allMarkets ?? []).find((x) => x.id === p.market_id);
    return m && !m.resolved;
  }).length;
  const totalVolume = (positions ?? []).reduce((sum, p) => {
    const m = (allMarkets ?? []).find((x) => x.id === p.market_id);
    return sum + (m ? (p.yes_shares + p.no_shares) : 0);
  }, 0);

  const isBusy = avatarUploading || ["pending", "proposing", "committing", "revealing"].includes(txState);
  const showForm = !hasProfile || editing;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">

      {/* Header */}
      {hasProfile && profile && !editing ? (
        <div className="flex items-center gap-5">
          <Avatar src={profile.avatar_url} username={profile.username} size={80} />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">@{profile.username}</h1>
            <p className="text-sm text-muted font-mono">{formatAddress(account)}</p>
            {profile.bio && (
              <p className="text-sm mt-1" style={{ color: "#a0a0aa" }}>{profile.bio}</p>
            )}
            {profile.twitter_handle && (
              <a
                href={`https://x.com/${profile.twitter_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted hover:text-foreground transition-colors mt-0.5 w-fit"
              >
                @{profile.twitter_handle} on X
              </a>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={startEditing}>
            Edit
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Avatar src={avatarPreview || undefined} size={64} />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {hasProfile ? "Edit Profile" : "Create Profile"}
            </h1>
            <p className="text-sm text-muted mt-0.5">{formatAddress(account)}</p>
          </div>
        </div>
      )}

      {/* Stats — always visible once profile exists */}
      {hasProfile && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Markets Created" value={marketsCreated} />
          <StatCard label="Active Positions" value={activePositions} />
          <StatCard label="Total Shares" value={totalVolume} />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Avatar upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted uppercase tracking-wider">Avatar</label>
            <div className="flex items-center gap-4">
              <Avatar src={avatarPreview || undefined} size={56} />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:border-muted transition-colors w-fit"
                >
                  {avatarPreview ? "Change photo" : "Upload from gallery"}
                </button>
                <span className="text-xs text-muted">JPG, PNG, GIF · max 2 MB</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {fieldErrors.avatar && <p className="text-xs text-no">{fieldErrors.avatar}</p>}
          </div>

          {/* Username — only on create, greyed-out on edit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">
              Username {!hasProfile && <span className="text-no">*</span>}
              {hasProfile && <span className="text-muted ml-1">(cannot be changed)</span>}
            </label>
            <input
              type="text"
              value={hasProfile ? (profile?.username ?? "") : form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!!hasProfile}
              placeholder="your_username"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {fieldErrors.username && <p className="text-xs text-no">{fieldErrors.username}</p>}
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">
              Bio <span className="text-no">*</span>
            </label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell the PredictIQ community about yourself..."
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-muted transition-colors resize-none"
            />
            <div className="flex justify-between text-xs text-muted">
              {fieldErrors.bio
                ? <span className="text-no">{fieldErrors.bio}</span>
                : <span />}
              <span>{form.bio.length}/300</span>
            </div>
          </div>

          {/* Twitter handle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Twitter / X Handle</label>
            <div className="flex items-center gap-0 bg-surface-2 border border-border rounded-lg overflow-hidden focus-within:border-muted transition-colors">
              <span className="px-3 py-2 text-sm text-muted select-none">@</span>
              <input
                type="text"
                value={form.twitter_handle.replace(/^@/, "")}
                onChange={(e) => setForm({ ...form, twitter_handle: e.target.value.replace(/^@/, "") })}
                placeholder="yourhandle"
                className="flex-1 bg-transparent py-2 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
            </div>
          </div>

          <TxStatus state={txState} error={error} hash={txHash} />

          <div className="flex gap-3">
            {editing && (
              <Button type="button" variant="secondary" onClick={() => { setEditing(false); reset(); }}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={isBusy} className="flex-1">
              {hasProfile ? "Save Changes" : "Create Profile"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
