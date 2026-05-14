import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";

import { Badge } from "@/components/ui/badge";
import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Status",
  description:
    "Current operational status of ReFile — authentication, chat API, sandboxed execution, and storage. Incident history and how to report problems.",
  alternates: { canonical: absoluteUrl("/status") },
  openGraph: {
    title: "Status — ReFile",
    description:
      "Current operational status of ReFile services and recent incidents.",
    url: absoluteUrl("/status"),
  },
};

// Edit these when there's an active incident. Keep it honest — empty arrays
// mean "operational". The page should always be truthful about today.
const COMPONENTS = [
  {
    name: "Web app",
    description: "Marketing site, dashboard, presets, workflows",
    status: "operational",
  },
  {
    name: "Authentication",
    description: "Google sign-in and session management",
    status: "operational",
  },
  {
    name: "Chat API",
    description: "Prompt submission, command generation",
    status: "operational",
  },
  {
    name: "Sandbox execution",
    description: "Sandboxed shell command runs",
    status: "operational",
  },
  {
    name: "File storage",
    description: "Uploads and output downloads",
    status: "operational",
  },
  {
    name: "Voice transcription",
    description: "Audio → text for the mic input",
    status: "operational",
  },
];

const INCIDENTS = [
  // Example shape — leave empty when there are none.
  // {
  //   id: "2026-05-10-sandbox",
  //   date: "2026-05-10",
  //   title: "Sandbox cold starts elevated",
  //   status: "resolved",
  //   summary: "Capacity issue caused 30–60s waits for the first request after idle. Resolved by increasing the warm pool.",
  // },
];

const META = {
  // Build-time fallback. For "live" updates, edit this file or back this with a CMS/Convex collection later.
  updatedAt: "2026-05-14T10:00:00Z",
};

const STATUS_META = {
  operational: {
    label: "Operational",
    icon: CheckCircle2,
    color: "text-success",
    dot: "bg-success",
  },
  degraded: {
    label: "Degraded performance",
    icon: AlertTriangle,
    color: "text-warning",
    dot: "bg-warning",
  },
  partial_outage: {
    label: "Partial outage",
    icon: AlertTriangle,
    color: "text-warning",
    dot: "bg-warning",
  },
  major_outage: {
    label: "Major outage",
    icon: XCircle,
    color: "text-destructive",
    dot: "bg-destructive",
  },
  maintenance: {
    label: "Maintenance",
    icon: Clock,
    color: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

function overallStatus(components) {
  if (components.some((c) => c.status === "major_outage")) return "major_outage";
  if (components.some((c) => c.status === "partial_outage")) return "partial_outage";
  if (components.some((c) => c.status === "degraded")) return "degraded";
  if (components.some((c) => c.status === "maintenance")) return "maintenance";
  return "operational";
}

function formatUpdated(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function StatusPage() {
  const overall = overallStatus(COMPONENTS);
  const overallMeta = STATUS_META[overall];
  const allGood = overall === "operational";

  return (
    <AppShell mode="marketing">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20 sm:pb-12">
          <Badge variant="outline" className="gap-1.5 rounded-full">
            <Activity className="size-3" />
            Status
          </Badge>
          <h1 className="text-display mt-5 text-balance">
            {allGood ? (
              <>
                All systems{" "}
                <em className="text-muted-foreground">operational.</em>
              </>
            ) : (
              <>
                Some things are{" "}
                <em className="text-muted-foreground">acting up.</em>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            ReFile is in public preview. This page is updated manually by the
            team. For real-time incidents, follow{" "}
            <a
              href="https://github.com/denoiselabsx/refile/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              GitHub Discussions
            </a>
            .
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Last updated {formatUpdated(META.updatedAt)}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-5">
        {/* Overall banner */}
        <div
          className={`surface flex items-start gap-3 p-5 ${
            allGood
              ? ""
              : "border-warning/40 bg-warning/5"
          }`}
        >
          <overallMeta.icon className={`mt-0.5 size-5 shrink-0 ${overallMeta.color}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold tracking-tight">
              {overallMeta.label}
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              {allGood
                ? "Everything's running normally. If something looks off on your end, please tell us."
                : "We're investigating. See the component list below for what's affected."}
            </p>
          </div>
        </div>

        {/* Components */}
        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Components
          </h2>
          <ul className="mt-3 overflow-hidden rounded-lg border border-border">
            {COMPONENTS.map((c, i) => {
              const meta = STATUS_META[c.status] ?? STATUS_META.operational;
              return (
                <li
                  key={c.name}
                  className={`flex items-center justify-between gap-4 bg-card px-4 py-3.5 ${
                    i !== 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium tracking-tight">
                      {c.name}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {c.description}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium ${meta.color}`}
                  >
                    <span className={`size-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Incidents */}
        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent incidents
          </h2>
          {INCIDENTS.length === 0 ? (
            <div className="surface mt-3 p-5 text-center">
              <CheckCircle2 className="mx-auto size-5 text-success" />
              <p className="mt-3 text-[14px] font-medium">
                No incidents in the last 90 days.
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Quiet is good.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {INCIDENTS.map((inc) => (
                <li key={inc.id} className="surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold tracking-tight">
                        {inc.title}
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {new Date(inc.date).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        inc.status === "resolved"
                          ? "text-success"
                          : "text-warning"
                      }
                    >
                      {inc.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/85">
                    {inc.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Report */}
        <section className="mt-10 surface bg-muted/30 p-5 sm:p-7">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Seeing something we aren't?
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            We don't have automated probes yet — this page is curated by hand.
            If something's broken for you, tell us and we'll dig in.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href="mailto:support@denoiselabs.com?subject=ReFile%20incident"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium transition-colors hover:bg-muted"
            >
              Email support
              <ArrowRight className="size-3.5" />
            </a>
            <a
              href="https://github.com/denoiselabsx/refile/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium transition-colors hover:bg-muted"
            >
              Open a GitHub issue
              <ArrowRight className="size-3.5" />
            </a>
            <Link
              href="/community"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium transition-colors hover:bg-muted"
            >
              Community channels
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      </div>


    </AppShell>
  );
}
