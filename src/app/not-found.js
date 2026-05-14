import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Not found — ReFile",
};

export default function NotFound() {
  return (
    <AppShell mode="marketing">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
          <Compass className="size-5" />
        </div>
        <p className="mt-6 text-mono text-[11.5px] uppercase tracking-wider text-muted-foreground">
          404 · Page not found
        </p>
        <h1 className="mt-3 text-h1 tracking-tight">
          We can't find that one.
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
          The link might be stale, the page might have moved, or it might never
          have existed at all.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="size-3.5" /> Back home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/presets">Browse presets</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
