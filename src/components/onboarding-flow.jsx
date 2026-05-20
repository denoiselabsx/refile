"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Upload, Zap, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPlan } from "../../lib/plans.js";

// Free-plan limits are region-independent (quotas are identical across
// regions; only price differs, which onboarding doesn't show).
const free = getPlan("free");

const STEPS = [
  {
    icon: Upload,
    title: "Convert anything with a sentence",
    body: (
      <>
        Drop a file, describe what you want in plain language (or your voice —
        we support 11 languages), and ReFile generates and runs the right
        command for you. Images, video, audio, PDFs, documents, archives —
        70+ tools under the hood.
      </>
    ),
  },
  {
    icon: Zap,
    title: `You're on the Free plan`,
    body: (
      <>
        That's{" "}
        <strong className="text-foreground">
          {free.includedConversions} conversions a day
        </strong>{" "}
        (resets at UTC midnight), files up to{" "}
        <strong className="text-foreground">
          {Math.round(free.maxFileBytes / (1024 * 1024))} MB
        </strong>
        , one file at a time, and up to{" "}
        <strong className="text-foreground">{free.maxPresets} saved presets</strong>.
        A live meter in the sidebar always shows where you stand. Need more?
        Student is $2/mo with pay-as-you-go.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "You only pay for what works",
    body: (
      <>
        A conversion counts only when it{" "}
        <strong className="text-foreground">succeeds and produces a file</strong>.
        Failed commands, unsafe commands we block, or runs with no output cost
        you nothing — and never touch your quota. We also show you the real
        Groq + Modal cost behind each month so there are no surprises.
      </>
    ),
  },
];

/**
 * Shown exactly once, the first time a signed-in user lands in the app
 * without an `onboardedAt` timestamp (see convex/users.ts `me`). Completing
 * or dismissing it calls plans.completeOnboarding so it never reappears.
 *
 * Mounted inside the authenticated app shell; renders nothing for
 * already-onboarded or signed-out users.
 */
export function OnboardingFlow() {
  const { user, isLoading } = useAuth();
  const complete = useMutation(api.plans.completeOnboarding);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const shouldShow =
    !isLoading && user && user.onboarded === false && !dismissed;

  if (!shouldShow) return null;

  const finish = async () => {
    // Optimistically close; the mutation persists so it won't show again even
    // across devices. If it fails the user just sees it once more — harmless.
    setDismissed(true);
    try {
      await complete();
    } catch {
      /* non-fatal: onboarding is not load-bearing */
    }
  };

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open onOpenChange={(o) => !o && finish()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-border bg-muted">
            <Icon className="size-5 text-foreground" />
          </div>
          <DialogTitle className="font-serif text-[22px] leading-tight">
            {s.title}
          </DialogTitle>
          <DialogDescription className="mt-2 text-[13.5px] leading-relaxed">
            {s.body}
          </DialogDescription>
        </DialogHeader>

        {/* Step dots */}
        <div className="mt-2 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-foreground"
                  : i < step
                    ? "w-1.5 bg-foreground/40"
                    : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={finish}
            className="text-[12.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Skip
          </button>
          <Button
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="cta-shimmer"
          >
            {isLast ? (
              <>
                Start converting
                <Check className="size-3.5" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
