"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // surface to whatever telemetry you wire up later
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
          <AlertOctagon className="size-5" />
        </div>
        <h1 className="mt-6 text-h1 tracking-tight">Something went sideways</h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
          We hit an error rendering this page. The team has been notified — try
          again, or head home.
        </p>
        {error?.digest && (
          <p className="mt-2 text-mono text-[11px] text-muted-foreground">
            ref: {error.digest}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => reset()}>
            <RefreshCw className="size-3.5" /> Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="size-3.5" /> Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
