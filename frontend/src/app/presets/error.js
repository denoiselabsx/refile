"use client";

import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CloudOff, RefreshCw } from "lucide-react";

export default function PresetsError({ error, reset }) {
  const looksLikeBackendDown =
    typeof error?.message === "string" &&
    /supabase|convex|fetch|ECONN|NetworkError/i.test(error.message);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-20">
        <div className="surface">
          <EmptyState
            icon={CloudOff}
            title={
              looksLikeBackendDown
                ? "Presets are temporarily unavailable"
                : "We couldn't load presets"
            }
            description={
              looksLikeBackendDown
                ? "Our data layer didn't respond. Give it a moment and try again."
                : "Something went wrong on our end."
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => reset()}>
                  <RefreshCw className="size-3.5" /> Try again
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Back home</Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
