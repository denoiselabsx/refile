"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import {
  DOCS_GROUPS,
  docsHref,
  docsNeighbours,
} from "../../../lib/docs-nav.js";
import { cn } from "@/lib/utils";

/** Resolve the current doc slug from the pathname ("/docs" → ""). */
function slugFromPath(pathname) {
  const m = pathname.match(/^\/docs\/?(.*)$/);
  return m ? m[1].replace(/\/$/, "") : "";
}

export function DocsShell({ children }) {
  const pathname = usePathname() || "/docs";
  const current = slugFromPath(pathname);
  const { prev, next } = docsNeighbours(current);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-8 sm:px-5 sm:pt-12 lg:grid-cols-[240px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-7">
          {DOCS_GROUPS.map((g) => (
            <div key={g.group}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {g.group}
              </p>
              <ul className="mt-2 space-y-0.5">
                {g.pages.map((p) => {
                  const active = p.slug === current;
                  return (
                    <li key={p.slug || "overview"}>
                      <Link
                        href={docsHref(p.slug)}
                        className={cn(
                          "block rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                          active
                            ? "bg-muted font-medium text-foreground"
                            : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        {p.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        {/* Mobile page picker */}
        <details className="surface group mb-8 p-4 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-medium">
            <span className="flex items-center gap-2">
              <BookOpen className="size-3.5" />
              Docs menu
            </span>
            <ArrowRight className="size-3.5 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 space-y-4">
            {DOCS_GROUPS.map((g) => (
              <div key={g.group}>
                <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                  {g.group}
                </p>
                <ul className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {g.pages.map((p) => (
                    <li key={p.slug || "overview"}>
                      <Link
                        href={docsHref(p.slug)}
                        className={cn(
                          "block truncate rounded-md border border-border px-2.5 py-1.5 text-[12px]",
                          p.slug === current
                            ? "bg-muted text-foreground"
                            : "bg-card/50 text-foreground/80 hover:bg-muted"
                        )}
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>

        <article className="docs-prose min-w-0 max-w-2xl">
          {children}
        </article>

        {/* Prev / next */}
        <nav className="mt-14 grid max-w-2xl gap-3 border-t border-border pt-6 sm:grid-cols-2">
          {prev ? (
            <Link
              href={docsHref(prev.slug)}
              className="surface group flex flex-col gap-1 p-4 transition-colors hover:border-border-strong"
            >
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ArrowLeft className="size-3" />
                Previous
              </span>
              <span className="text-[14px] font-medium text-foreground">
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={docsHref(next.slug)}
              className="surface group flex flex-col gap-1 p-4 text-right transition-colors hover:border-border-strong sm:col-start-2"
            >
              <span className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                Next
                <ArrowRight className="size-3" />
              </span>
              <span className="text-[14px] font-medium text-foreground">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
