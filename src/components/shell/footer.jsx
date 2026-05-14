import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Presets", href: "/presets" },
      { label: "Workflows", href: "/workflow" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Community", href: "https://github.com/denoiselabsx/refile", external: true },
      { label: "Status", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2" aria-label="ReFile home">
              <LogoMark size={22} />
              <span className="font-semibold tracking-tight">ReFile</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              AI-native file automation. Describe the outcome, drop the file, get
              the command and the result.
            </p>
            <a
              href="https://denoiselabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <span className="size-1.5 rounded-full bg-foreground/70" />
              A <span className="font-medium text-foreground">Denoise Labs</span> product
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-[13px] text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-[11.5px] text-muted-foreground sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} ReFile · A{" "}
            <a
              href="https://denoiselabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/90 underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Denoise Labs
            </a>{" "}
            product
          </span>
          <span className="font-serif italic">
            Built for people who like commands as much as outcomes.
          </span>
        </div>
      </div>
    </footer>
  );
}
