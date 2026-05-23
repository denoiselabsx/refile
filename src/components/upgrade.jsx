"use client";

/**
 * Upgrade primitives: the modal, the counter pill, the success upsell.
 *
 * Single file because they share the same variant union, the same brand
 * voice, and need to stay coherent — the modal copy and the counter copy
 * have to line up, otherwise the user sees "2 of 3 used" then a modal
 * saying "5 of 5". Keeping them together makes that impossible to drift.
 *
 * Design principles (these are intentional, not preferences):
 *
 *   1. EARN BEFORE ASKING. The post-success upsell only appears AFTER
 *      a conversion completed. The hard wall only appears when quota is
 *      ACTUALLY exhausted. We never preempt with a wall.
 *   2. EMAIL-FIRST, PAYMENT-SECOND. The primary CTA on every wall is
 *      "Sign up free → 30/day". Free signup is 10× higher conversion
 *      than direct-to-payment and seeds the pipeline for later upgrade.
 *   3. NAME THE FEATURE, NOT THE PLAN. "Files over 25 MB need an
 *      account" beats "Upgrade to Pro". The user wanted X; tell them
 *      what unlocks X.
 *   4. NO DARK PATTERNS. No countdowns, no "92% pick Pro", no fake
 *      scarcity. Trust earned > trust manufactured.
 *   5. TONAL VISUAL. Matches the existing OKLCH design system — no
 *      neon accents, no marketing illustrations. Looks like a tool,
 *      not a landing page.
 *
 * Variants supported:
 *   • `quota-exhausted`: anonymous user used all N free conversions
 *   • `file-too-big`: anonymous user tried a file over the size cap
 *   • `signed-in-feature`: authed user hit a Pro-gated feature
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X, Check, Sparkles, LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/* ──────────────────────────────────────────────────────────────── *
 *  Tier copy — sourced from lib/plans.js where possible, but the
 *  modal-specific value props live here so the wall doesn't read
 *  like a pricing-page summary (different intent, different copy).
 * ──────────────────────────────────────────────────────────────── */

const PRO_BULLETS = [
  "Unlimited conversions per day",
  "Files up to 2 GB",
  "Batch and pipeline conversions",
  "Priority sandbox queue",
  "API access",
];

const FREE_SIGNUP_BULLETS = [
  "30 conversions per day",
  "Files up to 100 MB",
  "Conversion history",
  "No card required",
];

/* ──────────────────────────────────────────────────────────────── *
 *  <UpgradeModal /> — the wall.
 *
 *  Props:
 *    open        — controlled open state
 *    onClose     — close handler (only fires when dismissable)
 *    variant     — which wall to show
 *    feature?    — for `signed-in-feature`: a short name like "Batch upload"
 *    fileSizeMb? — for `file-too-big`: the file's size
 *    capMb?      — for `file-too-big`: the cap they hit
 *    dailyLimit? — for `quota-exhausted`: the limit they hit (default 3)
 * ──────────────────────────────────────────────────────────────── */

export function UpgradeModal({
  open,
  onClose,
  variant,
  feature,
  fileSizeMb,
  capMb,
  dailyLimit = 3,
}) {
  // Quota-exhausted is a hard wall; the others are dismissable (the user
  // can pick a smaller file, etc.). We pass an onOpenChange that respects
  // that — Esc/click-outside on a hard wall does nothing.
  const dismissable = variant !== "quota-exhausted";

  const copy = headlineFor({ variant, feature, fileSizeMb, capMb, dailyLimit });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissable) onClose?.();
      }}
    >
      <DialogContent
        // Wider than the default so the two CTAs sit side by side
        // comfortably on desktop, stacked on mobile.
        className="max-w-md gap-0 p-0 sm:max-w-lg"
        // Hide the auto-rendered close button on hard walls. The DialogContent
        // primitive currently doesn't render one for us (custom impl), but
        // we add our own for the dismissable case below.
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="relative px-6 pt-6 sm:px-7 sm:pt-7">
          {dismissable && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-3.5" />
            </button>
          )}

          {copy.kicker && (
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {copy.kicker}
            </p>
          )}
          <DialogTitle className="mt-1.5 text-[20px] font-semibold leading-tight tracking-tight text-foreground sm:text-[22px]">
            {copy.title}
          </DialogTitle>
          {copy.subtitle && (
            <DialogDescription className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              {copy.subtitle}
            </DialogDescription>
          )}
        </div>

        {/* ── Tier cards (stacked) ───────────────────────────────── */}
        <div className="mt-5 space-y-2.5 px-6 pb-6 sm:px-7 sm:pb-7">
          {/* Free signup — the primary, lowest-friction path */}
          <TierCard
            recommended
            badge="Recommended"
            title="Sign up free"
            sub="No card required"
            href="/signup?from=upgrade"
            cta="Continue with email"
            ctaIcon={<LogIn className="size-3.5" />}
            bullets={FREE_SIGNUP_BULLETS}
          />
          {/* Pro — the paid option, framed as a value upgrade not a wall */}
          <TierCard
            title="Go Pro"
            sub="$7 / month"
            href="/pricing"
            cta="See Pro"
            ctaIcon={<ArrowRight className="size-3.5" />}
            bullets={PRO_BULLETS}
          />
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="border-t border-border bg-background/40 px-6 py-3 text-center text-[11px] text-muted-foreground sm:px-7">
          {variant === "quota-exhausted" ? (
            <>Or come back tomorrow — your free quota resets every day.</>
          ) : (
            <>Already have an account? <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link></>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function headlineFor({ variant, feature, fileSizeMb, capMb, dailyLimit }) {
  switch (variant) {
    case "quota-exhausted":
      return {
        kicker: "Daily limit reached",
        title: `You've used your ${dailyLimit} free conversions today`,
        subtitle:
          "Sign up free for 30 conversions every day — no card required — or go Pro for unlimited.",
      };
    case "file-too-big":
      return {
        kicker: "File too large",
        title: `That file is ${formatSize(fileSizeMb)} — over the ${formatSize(
          capMb
        )} free limit`,
        subtitle:
          "Sign up free to convert files up to 100 MB, or go Pro for files up to 2 GB.",
      };
    case "signed-in-feature":
      return {
        kicker: "Pro feature",
        title: `${feature || "This"} is a Pro feature`,
        subtitle:
          "Go Pro for unlimited conversions, batch uploads, big files, and API access.",
      };
    default:
      return {
        kicker: null,
        title: "Upgrade to keep going",
        subtitle: null,
      };
  }
}

function formatSize(mb) {
  if (mb == null || !isFinite(mb)) return "—";
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

/* ──────────────────────────────────────────────────────────────── *
 *  Tier card inside the modal
 * ──────────────────────────────────────────────────────────────── */

function TierCard({ recommended, badge, title, sub, href, cta, ctaIcon, bullets }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-4 transition-colors ${
        recommended
          ? "border-foreground/80 bg-foreground/[0.03]"
          : "border-border bg-background hover:border-border-strong"
      }`}
    >
      {recommended && badge && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
          <Sparkles className="size-2.5" />
          {badge}
        </span>
      )}
      <div className="flex items-baseline gap-2">
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        <p className="text-[11.5px] text-muted-foreground">{sub}</p>
      </div>

      <ul className="mt-2.5 grid gap-1">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground"
          >
            <Check className="mt-[3px] size-3 shrink-0 text-foreground/70" />
            {b}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors ${
          recommended
            ? "bg-foreground text-background hover:opacity-90"
            : "border border-border bg-card text-foreground hover:bg-muted"
        }`}
      >
        {cta}
        {ctaIcon}
      </Link>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  <FreeCounter /> — the "X / 3 free today" pill.
 *
 *  Tonal, low-key. Renders nothing while still loading and nothing
 *  when the user has zero usage today (no reason to advertise the
 *  limit before they've used the tool).
 * ──────────────────────────────────────────────────────────────── */

export function FreeCounter({ used, limit, className = "" }) {
  if (used == null || used <= 0) return null;
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining === 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        exhausted
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-border bg-card text-muted-foreground"
      } ${className}`}
      title={`You've used ${used} of ${limit} free conversions today.`}
    >
      <span
        className={`size-1.5 rounded-full ${
          exhausted ? "bg-destructive" : "bg-foreground/70"
        }`}
      />
      {exhausted
        ? `0 of ${limit} free left today`
        : `${remaining} of ${limit} free left today`}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  <SuccessUpsell /> — the inline post-success nudge.
 *
 *  Shows ONLY after a successful conversion completes, ONLY for
 *  anonymous users, and remembers dismissal in localStorage so we
 *  don't badger the same anon user every result they generate.
 *
 *  Soft tone, not a wall. The user just got value; we're seeding
 *  the next conversion (sign up to keep going) without blocking.
 * ──────────────────────────────────────────────────────────────── */

const DISMISS_KEY = "refile.anon-upsell.dismissed-at";
const NAG_INTERVAL_MS = 24 * 60 * 60 * 1000; // re-show once a day

export function SuccessUpsell({ remaining, limit }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const last = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      return last > 0 && Date.now() - last < NAG_INTERVAL_MS;
    } catch {
      return false;
    }
  });
  if (dismissed) return null;

  const exhausted = remaining === 0;
  const message = exhausted
    ? `You've used all ${limit} free conversions today.`
    : remaining === 1
      ? `1 free conversion left today.`
      : `${remaining} free conversions left today.`;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <Sparkles className="size-3.5 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1 text-[12px] leading-snug">
        <p className="font-medium text-foreground">{message}</p>
        <p className="text-muted-foreground">
          Sign up free for 30/day, history, and bigger files.
        </p>
      </div>
      <Link
        href="/signup?from=upsell"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-foreground px-2.5 py-1.5 text-[11.5px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Sign up
        <ArrowRight className="size-3" />
      </Link>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {}
          setDismissed(true);
        }}
        aria-label="Dismiss"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
