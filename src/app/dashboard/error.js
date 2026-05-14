"use client";

import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CloudOff, RefreshCw } from "lucide-react";

export default function DashboardError({ error, reset }) {
  return (
    <AppShell mode="app">
      <div className="mx-auto max-w-2xl px-5 py-20">
        <div className="surface">
          <EmptyState
            icon={CloudOff}
            title="The workspace failed to load"
            description="We couldn't reach the backend. Sign in again, or retry in a moment."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => reset()}>
                  <RefreshCw className="size-3.5" /> Retry
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Home</Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
