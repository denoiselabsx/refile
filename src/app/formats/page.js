import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import {
  CONVERSIONS,
  CATEGORIES,
  CATEGORY_LABEL,
} from "@/lib/conversions";
import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "All conversions — ReFile",
  description:
    "Every supported file conversion on ReFile — video, audio, image, PDF, and compression. Pick one to start converting in plain language.",
  alternates: { canonical: absoluteUrl("/formats") },
  openGraph: {
    title: "All conversions — ReFile",
    description:
      "Every supported file conversion on ReFile, grouped by category.",
    url: absoluteUrl("/formats"),
  },
};

export default function FormatsIndexPage() {
  // Group conversions by category for the index. Keeps the page scannable
  // — a flat alphabetical list would hide that ReFile does video AND
  // audio AND PDF, which is the differentiator vs single-purpose tools.
  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    label: CATEGORY_LABEL[cat],
    items: CONVERSIONS.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <AppShell mode="marketing">
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-14 sm:pt-20">
        <header className="border-b border-border pb-8">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Index
          </p>
          <h1 className="text-h1-serif mt-2 text-balance">
            All conversions
          </h1>
          <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-muted-foreground">
            Pick a conversion to land on a page with a pre-filled prompt and
            a drop zone. Or — skip the index entirely — open{" "}
            <Link
              href="/dashboard"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              the dashboard
            </Link>{" "}
            and just describe what you want in plain language.
          </p>
        </header>

        <div className="mt-10 space-y-10">
          {grouped.map(({ category, label, items }) => (
            <section key={category}>
              <h2 className="text-[15px] font-semibold tracking-tight">
                {label}
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {items.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/convert/${c.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-[13.5px] transition-colors hover:bg-muted/60"
                    >
                      <span className="font-medium text-foreground">
                        {c.title
                          .replace(" Online — Free", "")
                          .replace("Convert ", "")
                          .replace("Compress ", "Compress ")}
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
