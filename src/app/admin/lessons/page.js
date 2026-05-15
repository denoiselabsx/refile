"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ShieldCheck,
  Check,
  X,
  Undo2,
  Terminal,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../../../convex/_generated/api";

const STATUS_META = {
  pending: { label: "Pending review", variant: "warning" },
  approved: { label: "Approved — live", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  superseded: { label: "Superseded", variant: "outline" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function Evidence({ icon: Icon, label, children }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground">
        {children}
      </pre>
    </div>
  );
}

function LessonCard({ lesson, onAction, busy }) {
  const isPending = lesson.status === "pending";
  const isApproved = lesson.status === "approved";

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">
            {lesson.title}
          </CardTitle>
          <StatusBadge status={lesson.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="subtle">{lesson.tool}</Badge>
          <span>
            {lesson.occurrences} occurrence
            {lesson.occurrences === 1 ? "" : "s"}
          </span>
          {lesson.reviewedAt ? (
            <span>
              · reviewed {new Date(lesson.reviewedAt).toLocaleString()}
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="rounded-md border border-border bg-background p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Proposed lesson (added to the prompt if approved)
          </div>
          <p className="text-sm text-foreground">{lesson.lesson}</p>
        </div>

        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
            Show evidence
          </summary>
          <div className="mt-2 space-y-2">
            <Evidence icon={MessageSquare} label="Example user request">
              {lesson.examplePrompt}
            </Evidence>
            <Evidence icon={Terminal} label="Command that failed">
              {lesson.exampleCommand}
            </Evidence>
            <Evidence icon={AlertTriangle} label="Error">
              {lesson.exampleError}
            </Evidence>
          </div>
        </details>

        {lesson.reviewNote ? (
          <p className="text-xs italic text-muted-foreground">
            Review note: {lesson.reviewNote}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="gap-2">
        {isPending || lesson.status === "superseded" ? (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onAction("approve", lesson._id)}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onAction("reject", lesson._id)}
            >
              <X className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
          </>
        ) : null}

        {isApproved ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onAction("unapprove", lesson._id)}
          >
            <Undo2 className="mr-1.5 h-4 w-4" />
            Unapprove
          </Button>
        ) : null}

        {lesson.status === "rejected" ? (
          <span className="text-xs text-muted-foreground">
            Won&apos;t be re-filed by the cron.
          </span>
        ) : null}
      </CardFooter>
    </Card>
  );
}

export default function AdminLessonsPage() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  // Only query the admin list once we believe we're an admin — the query
  // throws "Admin only." otherwise and would surface as an error.
  const lessons = useQuery(
    api.learnedLessons.listForReview,
    isAdmin ? {} : "skip"
  );

  const approve = useMutation(api.learnedLessons.approve);
  const reject = useMutation(api.learnedLessons.reject);
  const unapprove = useMutation(api.learnedLessons.unapprove);
  const claimAdmin = useMutation(api.users.claimAdmin);

  const [busyId, setBusyId] = useState(null);
  const [claiming, setClaiming] = useState(false);

  async function handleAction(kind, id) {
    setBusyId(id);
    try {
      if (kind === "approve") {
        await approve({ id });
        toast.success("Lesson approved — now injected into the prompt.");
      } else if (kind === "reject") {
        await reject({ id });
        toast.success("Lesson rejected.");
      } else if (kind === "unapprove") {
        await unapprove({ id });
        toast.success("Lesson unapproved — no longer injected.");
      }
    } catch (err) {
      toast.error(err?.message ?? "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleClaimAdmin() {
    setClaiming(true);
    try {
      await claimAdmin({});
      toast.success("You're now an admin. Reloading…");
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err?.message ?? "Not on the admin allowlist.");
    } finally {
      setClaiming(false);
    }
  }

  // ── Loading auth ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-5 py-10">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-3 h-4 w-96" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Not an admin ────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-5 py-10">
          <EmptyState
            icon={Lock}
            title="Admin access required"
            description={
              user
                ? `Signed in as ${user.email ?? "your account"}. If your email is on the admin allowlist, claim access below.`
                : "Sign in with an allowlisted account to review learned fixes."
            }
          />
          {user ? (
            <div className="mt-6 flex justify-center">
              <Button onClick={handleClaimAdmin} disabled={claiming}>
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                {claiming ? "Claiming…" : "Claim admin access"}
              </Button>
            </div>
          ) : null}
        </div>
      </AppShell>
    );
  }

  // ── Admin: review queue ─────────────────────────────────────────
  const loadingList = lessons === undefined;
  const pending = (lessons ?? []).filter(
    (l) => l.status === "pending" || l.status === "superseded"
  );
  const decided = (lessons ?? []).filter(
    (l) => l.status === "approved" || l.status === "rejected"
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Learned fixes
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Prompt-fix lessons the failure-review cron distilled from clustered
          job failures. Approving one appends it to the command-generation
          prompt for every future job. The hand-written system prompt is never
          modified — these are additive and reversible.
        </p>

        {loadingList ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : (lessons ?? []).length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Sparkles}
              title="No lessons yet"
              description="The cron files lessons when it sees a failure pattern recur at least twice. Nothing to review right now."
            />
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Needs review ({pending.length})
              </h2>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing pending. 🎉
                </p>
              ) : (
                <div className="space-y-4">
                  {pending.map((l) => (
                    <LessonCard
                      key={l._id}
                      lesson={l}
                      busy={busyId === l._id}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              )}
            </section>

            {decided.length > 0 ? (
              <section>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                  Decided ({decided.length})
                </h2>
                <div className="space-y-4">
                  {decided.map((l) => (
                    <LessonCard
                      key={l._id}
                      lesson={l}
                      busy={busyId === l._id}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
