"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../../convex/_generated/api";
import { KEY_PREFIX_LEN } from "@/lib/api-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Format a UNIX-ms timestamp as a coarse relative string. We avoid pulling in
 * date-fns / dayjs — this is the only place we need it and Intl gives us the
 * locale-correct phrasing for free.
 */
function formatRelative(ts) {
  if (!ts) return "Never";
  const diffMs = ts - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "just now";
}

/**
 * Hash a string with SHA-256 (hex) using Web Crypto. We can't reuse
 * `hashKey` from src/lib/api-auth.js because that uses node:crypto and
 * would crash in the browser. The output format (lowercase hex) must
 * match server-side hashing exactly so the resolveKey lookup hits.
 */
async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a fresh raw API key. 24 random bytes → 32 base64url chars,
 * prefixed with `rf_live_` (8 chars) → 40 chars total. Matches the
 * server-side validation regex /^rf_live_[A-Za-z0-9_-]{20,}$/.
 */
function generateRawKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `rf_live_${b64}`;
}

function PrefixDisplay({ prefix }) {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground/80">
      {prefix}
      <span className="text-muted-foreground">••••••••</span>
    </span>
  );
}

function KeyRow({ row, onRevoke }) {
  const revoked = !!row.revokedAt;
  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
        revoked && "opacity-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13.5px] font-medium text-foreground">
            {row.name}
          </p>
          {revoked && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
              Revoked
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          <PrefixDisplay prefix={row.keyPrefix} />
          <span>Created {formatRelative(row.createdAt)}</span>
          <span>
            Last used{" "}
            {row.lastUsedAt ? formatRelative(row.lastUsedAt) : "never"}
          </span>
        </div>
      </div>
      {!revoked && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRevoke(row)}
          className="self-start sm:self-auto"
        >
          <Trash2 className="size-3.5" />
          Revoke
        </Button>
      )}
    </div>
  );
}

function CreateDialog({ open, onOpenChange, onCreated }) {
  const createKey = useMutation(api.apiKeys.create);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rawKey, setRawKey] = useState(null);
  const [copied, setCopied] = useState(false);

  // Reset form whenever the dialog opens fresh
  useEffect(() => {
    if (open) {
      setName("");
      setRawKey(null);
      setCopied(false);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give the key a name");
      return;
    }
    setSubmitting(true);
    try {
      const raw = generateRawKey();
      const keyHash = await sha256Hex(raw);
      const keyPrefix = raw.slice(0, KEY_PREFIX_LEN);
      await createKey({ name: trimmed, keyHash, keyPrefix });
      setRawKey(raw);
      onCreated?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create key");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!rawKey) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  }

  // Once we've revealed the raw key, we must not let the user close via
  // overlay click or Escape — the key is gone forever after this view.
  const guardClose = (nextOpen) => {
    if (rawKey && !nextOpen) return; // block close while key is shown
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={guardClose}>
      <DialogContent
        onInteractOutside={(e) => {
          if (rawKey) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (rawKey) e.preventDefault();
        }}
        className={rawKey ? "[&>button:last-child]:hidden" : ""}
      >
        {!rawKey ? (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Give it a memorable name. You&apos;ll see the raw key once on
                the next screen.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <label
                htmlFor="key-name"
                className="text-[12.5px] font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="production"
                maxLength={60}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={submitting}>
                Create key
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Save this key now</DialogTitle>
              <DialogDescription>
                For your security, we won&apos;t show this key again. Copy it
                and store it somewhere safe before closing this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-[12.5px] leading-relaxed text-foreground/80">
                If you lose this key, you&apos;ll need to revoke it and create
                a new one.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2.5">
              <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-foreground">
                {rawKey}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" /> Copy
                  </>
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setRawKey(null);
                  onOpenChange(false);
                }}
              >
                I&apos;ve saved it
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ApiKeysClient() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const keys = useQuery(api.apiKeys.mine, isAuthenticated ? {} : "skip");
  const revokeKey = useMutation(api.apiKeys.revoke);
  const [createOpen, setCreateOpen] = useState(false);

  async function handleRevoke(row) {
    if (
      !window.confirm(
        `Revoke "${row.name}"? Any apps using this key will start getting 401 errors.`
      )
    ) {
      return;
    }
    try {
      await revokeKey({ id: row.id });
      toast.success("Key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-[13px] text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
          <h1 className="font-serif text-[26px] tracking-tight text-foreground">
            API keys
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Sign in to create and manage API keys for the REST API.
          </p>
          <Button onClick={() => router.push("/login/google")}>
            Sign in
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Settings
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-[30px] leading-tight tracking-tight text-foreground sm:text-[36px]">
              API keys
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Use these to call /api/v1/* from your apps.
            </p>
            <Link
              href="/docs/api"
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline-offset-4 hover:underline"
            >
              Read the API docs
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="size-3.5" />
            Create key
          </Button>
        </header>

        {keys === undefined ? (
          <div className="surface divide-y divide-border">
            {[0, 1].map((i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted/70" />
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted">
              <KeyRound className="size-4 text-muted-foreground" />
            </span>
            <p className="text-[13.5px] text-foreground">No API keys yet.</p>
            <p className="-mt-2 text-[13px] text-muted-foreground">
              Create one to start using the REST API.
            </p>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="size-3.5" />
              Create key
            </Button>
          </div>
        ) : (
          <div className="surface divide-y divide-border">
            {keys.map((row) => (
              <KeyRow key={row.id} row={row} onRevoke={handleRevoke} />
            ))}
          </div>
        )}
      </div>

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
