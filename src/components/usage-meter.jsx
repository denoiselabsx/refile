"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * Compact usage meter shown at the bottom of the history sidebar.
 *
 * Free plan resets DAILY at UTC midnight — the meter shows a "resets in Hh Mm"
 * countdown so the limit feels like a daily allowance, not a one-time stress
 * point. Paid plans bill monthly and show the cost breakdown.
 *
 * Numbers come straight from convex/plans.ts `myUsage`, which mirrors the
 * billing math in lib/plans.js — so what the user sees here is exactly what
 * they'll be charged. Failed conversions are never counted (metered only on
 * success in runJob), so this also doubles as honest cost transparency.
 */

function msUntilNextUtcMidnight() {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return Math.max(0, next.getTime() - now.getTime());
}

function formatResetCountdown(ms) {
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function DailyReset() {
  const [ms, setMs] = useState(() => msUntilNextUtcMidnight());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextUtcMidnight()), 60_000);
    return () => clearInterval(id);
  }, []);
  return <>Resets in {formatResetCountdown(ms)}</>;
}

export function UsageMeter() {
  const u = useQuery(api.plans.myUsage);

  // Loading or signed-out: render nothing rather than a flash of zeros.
  if (!u) return null;

  const pct = Math.min(
    100,
    Math.round((u.conversions / Math.max(1, u.includedConversions)) * 100)
  );
  const overQuota = u.conversions >= u.includedConversions;
  const isDaily = u.periodKind === "day";
  const fmtUsd = (n) => `$${(n || 0).toFixed(n < 1 ? 4 : 2)}`;

  return (
    <div className="shrink-0 border-t border-border px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
          <Zap className="size-3" />
          {u.planName} · {isDaily ? "today" : "this month"}
        </span>
        <Link
          href="/pricing"
          className="text-[11px] font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
        >
          {u.planId === "free" ? "Upgrade" : "Manage"}
        </Link>
      </div>

      {/* Conversion quota bar */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="font-medium text-foreground">
            {u.conversions}
            <span className="text-muted-foreground">
              {" "}
              of {u.includedConversions}{" "}
              {isDaily ? "today" : "conversions"}
            </span>
          </span>
          {overQuota && u.extraConversions > 0 && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-500">
              +{u.extraConversions} over
            </span>
          )}
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              overQuota
                ? "bg-amber-500 dark:bg-amber-400"
                : "bg-foreground/80"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {isDaily && (
          <p className="mt-1.5 text-[10.5px] text-muted-foreground">
            <DailyReset />
          </p>
        )}
      </div>

      {/* Cost breakdown only meaningful on paid plans. Hiding it on Free
          removes a confusing "Projected bill: $0.00" that doesn't apply to
          a hard-stop plan. Compact one-line "Projected bill" with the
          full Groq+Modal split tucked into a <details> so it never
          clips below the sidebar fold on short viewports — that was
          the original bug. */}
      {!isDaily && (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[11.5px] text-muted-foreground transition-colors hover:text-foreground">
            <span>Projected bill</span>
            <span className="tabular-nums font-medium text-foreground">
              {fmtUsd(u.projectedBillUsd)}
            </span>
          </summary>
          <dl className="mt-2 space-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <dt>Groq (AI)</dt>
              <dd className="tabular-nums">{fmtUsd(u.groqCostUsd)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Modal (compute)</dt>
              <dd className="tabular-nums">{fmtUsd(u.modalCostUsd)}</dd>
            </div>
          </dl>
        </details>
      )}

      {u.overageDueUsd > 0 && (
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
          Includes {fmtUsd(u.overageDueUsd)} pay-as-you-go overage, billed at
          month end.
        </p>
      )}
    </div>
  );
}
