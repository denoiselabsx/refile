import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { absoluteUrl } from "@/lib/site";
import { DocHeader } from "@/components/docs/doc-parts";
import { DOCS_GROUPS, docsHref } from "../../../lib/docs-nav.js";

export const metadata = {
  title: "Docs",
  description:
    "ReFile documentation — what it can and can't do, supported formats, writing good prompts, plans and limits, troubleshooting.",
  alternates: { canonical: absoluteUrl("/docs") },
  openGraph: {
    title: "Docs — ReFile",
    description:
      "What ReFile can and can't do, supported formats, prompts, plans, troubleshooting.",
    url: absoluteUrl("/docs"),
  },
};

export default function DocsOverviewPage() {
  // Every page except the overview itself, for the index cards.
  const cards = DOCS_GROUPS.flatMap((g) =>
    g.pages.filter((p) => p.slug !== "")
  );

  return (
    <>
      <DocHeader
        eyebrow="Documentation"
        title="Everything you need, on short pages."
        intro="ReFile turns a plain-language request into a finished file. These docs are deliberately blunt about what it can and can't do — so you never waste a conversion."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((p) => (
          <Link
            key={p.slug}
            href={docsHref(p.slug)}
            className="surface group flex flex-col gap-1.5 p-5 transition-colors hover:border-border-strong"
          >
            <span className="flex items-center justify-between text-[15px] font-medium text-foreground">
              {p.title}
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              {p.desc}
            </span>
          </Link>
        ))}
      </div>

      <div className="surface mt-8 bg-muted/30 px-5 py-7 text-center">
        <h2 className="font-serif text-[20px] text-foreground">
          New here? Start with the basics.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
          The fastest way to understand ReFile is to do one conversion.
        </p>
        <Link
          href={docsHref("getting-started")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-[13.5px] font-medium text-background transition-opacity hover:opacity-90"
        >
          Getting started
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </>
  );
}
