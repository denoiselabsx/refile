"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * Compact monthly-usage meter shown at the bottom of the history sidebar.
 *
 * Numbers come straight from convex/plans.ts `myUsage`, which mirrors the
 * billing math in lib/plans.js — so what the user sees here is exactly what
 * they'll be charged. Failed conversions are never counted (metered only on
 * success in runJob), so this also doubles as honest cost transparency.
 */
export function UsageMeter() {
  const u = useQuery(api.plans.myUsage);

  // Loading or signed-out: render nothing rather than a flash of zeros.
  if (!u) return null;

  const pct = Math.min(
    100,
    Math.round((u.conversions / Math.max(1, u.includedConversions)) * 100)
  );
  const overQuota = u.conversions >= u.includedConversions;
  const fmtUsd = (n) => `$${(n || 0).toFixed(n < 1 ? 4 : 2)}`;

  return (
    <div className="shrink-0 border-t border-border px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
          <Zap className="size-3" />
          {u.planName} · this month
        </span>
        <Link
          href="/pricing"
          className="text-[11px] font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
        >
          {u.planId === "power" ? "Manage" : "Upgrade"}
        </Link>
      </div>

      {/* Conversion quota bar */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="font-medium text-foreground">
            {u.conversions}
            <span className="text-muted-foreground">
              {" "}
              / {u.includedConversions} conversions
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
              overQuota ? "bg-amber-500" : "bg-foreground"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Real provider-cost breakdown — accurate, not estimated */}
      <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
        <div className="flex justify-between">
          <dt>Groq (AI)</dt>
          <dd className="tabular-nums">{fmtUsd(u.groqCostUsd)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Modal (compute)</dt>
          <dd className="tabular-nums">{fmtUsd(u.modalCostUsd)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1 font-medium text-foreground">
          <dt>Projected bill</dt>
          <dd className="tabular-nums">{fmtUsd(u.projectedBillUsd)}</dd>
        </div>
      </dl>

      {u.overageDueUsd > 0 && (
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
          Includes {fmtUsd(u.overageDueUsd)} pay-as-you-go overage, billed at
          month end.
        </p>
      )}
    </div>
  );
}
