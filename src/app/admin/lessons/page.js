"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  X,
  Undo2,
  Terminal,
  AlertTriangle,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
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
import { AdminShell } from "@/components/admin/admin-shell";
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // AdminShell handles loading/non-admin states + claim flow. The query
  // skips while we don't yet believe we're admin so the server-side gate
  // never 403s during that window.
  const lessons = useQuery(
    api.learnedLessons.listForReview,
    isAdmin ? {} : "skip"
  );

  const approve = useMutation(api.learnedLessons.approve);
  const reject = useMutation(api.learnedLessons.reject);
  const unapprove = useMutation(api.learnedLessons.unapprove);

  const [busyId, setBusyId] = useState(null);

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

  const loadingList = lessons === undefined;
  const pending = (lessons ?? []).filter(
    (l) => l.status === "pending" || l.status === "superseded"
  );
  const decided = (lessons ?? []).filter(
    (l) => l.status === "approved" || l.status === "rejected"
  );

  return (
    <AdminShell
      title="Learned lessons"
      description="Prompt-fix proposals from clustered failures. Approving injects the lesson into the system prompt; rejecting drops it."
    >
      <div className="max-w-3xl">
        {loadingList ? (
          <div className="mt-2 space-y-4">
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
    </AdminShell>
  );
}
