"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Sparkles, Check, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { parseUpgradeError, upgradeOffer } from "../../lib/upgrade.js";
import { track } from "@/lib/analytics";

const UpgradeContext = createContext({
  /** Pass a caught error. Returns true if it was an upgrade wall (modal
   * shown) — caller should then NOT show its own error toast. */
  triggerUpgrade: () => false,
});

export function UpgradeProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  // Billing region for correct pricing in the pitch. Falls back to global.
  const usage = useQuery(api.plans.myUsage, isAuthenticated ? {} : "skip");
  const region = usage?.region || "global";

  const [offer, setOffer] = useState(null);

  const triggerUpgrade = useCallback(
    (errMessage) => {
      const parsed = parseUpgradeError(
        errMessage?.message ?? errMessage
      );
      if (!parsed) return false;
      const built = upgradeOffer(parsed, region);
      if (!built) return false; // already top tier — let caller toast
      setOffer(built);
      return true;
    },
    [region]
  );

  const checkoutHref =
    offer && isAuthenticated && user?.id
      ? `/api/checkout?${new URLSearchParams({
          plan: offer.targetPlanId,
          userId: user.id,
          ...(user.email ? { email: user.email } : {}),
        }).toString()}`
      : `/login/google`;

  return (
    <UpgradeContext.Provider value={{ triggerUpgrade }}>
      {children}

      <Dialog
        open={!!offer}
        onOpenChange={(o) => !o && setOffer(null)}
      >
        {offer && (
          <DialogContent className="max-w-[420px] overflow-hidden p-0">
            {/* Gradient hero */}
            <div className="relative bg-gradient-to-br from-foreground/[0.06] via-transparent to-transparent px-6 pb-5 pt-7">
              <button
                onClick={() => setOffer(null)}
                className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-foreground text-background">
                <Sparkles className="size-5" />
              </span>
              <h2 className="mt-4 font-serif text-[22px] leading-tight text-foreground">
                {offer.title}
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {offer.hook}
              </p>
            </div>

            {/* What you unlock */}
            <div className="px-6 pb-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Everything in {offer.targetPlanName}
              </p>
              <ul className="mt-3 space-y-2">
                {offer.perks.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2.5 text-[13px] text-foreground/90"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-3 border-t border-border bg-muted/30 px-6 py-5">
              <Link
                href={checkoutHref}
                onClick={() => {
                  track("upgrade_clicked", {
                    to: offer.targetPlanId,
                    kind: offer.kind,
                    surface: "upgrade_modal",
                  });
                  setOffer(null);
                }}
                className="cta-shimmer flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[14px] font-semibold text-background transition-opacity hover:opacity-90"
              >
                Upgrade to {offer.targetPlanName} · $
                {offer.targetPriceMonthly}/mo
                <ArrowRight className="size-4" />
              </Link>
              <button
                onClick={() => setOffer(null)}
                className="mt-2 w-full text-center text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Maybe later
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </UpgradeContext.Provider>
  );
}

export function useUpgrade() {
  return useContext(UpgradeContext);
}
