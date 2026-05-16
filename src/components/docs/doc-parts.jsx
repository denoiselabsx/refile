/**
 * Shared presentational primitives for doc pages — keeps every page
 * visually consistent without a markdown pipeline.
 */

export function DocHeader({ eyebrow, title, intro }) {
  return (
    <header className="mb-10">
      {eyebrow && (
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-1.5 font-serif text-[34px] leading-[1.1] tracking-tight text-foreground sm:text-[40px]">
        {title}
      </h1>
      {intro && (
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          {intro}
        </p>
      )}
    </header>
  );
}

export function DocSection({ title, children }) {
  return (
    <section className="mt-10 first:mt-0">
      {title && (
        <h2 className="text-[19px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      )}
      <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}

export function DocCode({ children }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 text-mono text-[12.5px] leading-relaxed text-foreground/90">
      <code>{children}</code>
    </pre>
  );
}

/** Two-column "yes / no" capability card — used on the can/can't page. */
export function CapabilityGrid({ can = [], cannot = [] }) {
  return (
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      <div className="surface p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-success">
          ✓ Can do
        </p>
        <ul className="mt-2.5 space-y-1.5 text-[13.5px] text-foreground/85">
          {can.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-success">·</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
      <div className="surface p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-destructive">
          ✕ Can&apos;t do
        </p>
        <ul className="mt-2.5 space-y-1.5 text-[13.5px] text-foreground/85">
          {cannot.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-destructive">·</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DocCallout({ children, tone = "muted" }) {
  const toneCls =
    tone === "warn"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-border bg-muted/40";
  return (
    <div
      className={`my-4 rounded-lg border ${toneCls} px-4 py-3 text-[13.5px] leading-relaxed text-foreground/80`}
    >
      {children}
    </div>
  );
}

export function DocList({ items }) {
  return (
    <ul className="my-2 ml-1 space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-[14.5px] text-foreground/85">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
