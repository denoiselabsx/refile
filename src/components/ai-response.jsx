"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Download,
  AlertTriangle,
  Save,
  Loader2,
  Circle,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatMarkdown } from "@/components/chat-markdown";
import { useAuth } from "@/contexts/auth-context";
import { useUpgrade } from "@/contexts/upgrade-context";
import { parseUpgradeError } from "../../lib/upgrade.js";
import { HIDE_LAUNCH_FEATURES } from "@/lib/nav";
import { FilePreview, PreviewModal } from "@/components/preview";
import { canPreview } from "@/lib/preview";
import { ShareButton } from "@/components/share-button";
import { downloadFile } from "@/lib/download-file";

export function AIResponse({ prompt }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { triggerUpgrade } = useUpgrade();
  const [previewItem, setPreviewItem] = useState(null);

  // A chat reply may carry a machine-readable upgrade tag (e.g. a pipeline
  // that exceeds the plan). Open the upsell modal once; the user only ever
  // sees the plain-English remainder, never the tag.
  const upgradeParsed =
    prompt?.aiKind === "chat" && prompt?.aiMessage
      ? parseUpgradeError(prompt.aiMessage)
      : null;
  useEffect(() => {
    if (upgradeParsed) triggerUpgrade(prompt.aiMessage);
  }, [upgradeParsed, prompt?.aiMessage, triggerUpgrade]);

  if (!prompt) return null;

  const isPending =
    prompt.status === "pending" || prompt.status === "generating";
  const isRunning = prompt.status === "running";
  const isFailed = prompt.status === "failed";

  const handleSaveAsPreset = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save presets");
      return;
    }
    if (!prompt.aiCommandTemplate) {
      toast.error("This response has no reusable template");
      return;
    }
    sessionStorage.setItem(
      "preset_draft",
      JSON.stringify({
        command_template: prompt.aiCommandTemplate,
        description: prompt.aiDescription || "",
        input_files: prompt.aiInputFiles || [],
        output_files: prompt.aiOutputFiles || [],
        tool: prompt.aiTool || "",
      })
    );
    router.push("/presets/create");
  };

  const pipelineSteps = prompt.pipelineSteps;
  const hasPipeline = pipelineSteps?.length > 0;

  return (
    <div className="space-y-3">
      {/* ── Pipeline: per-step progress (multi-tool sequence) ── */}
      {hasPipeline && (
        <div className="surface overflow-hidden">
          <div className="border-b border-border/70 px-4 py-3 text-[12px] font-medium text-muted-foreground">
            Pipeline · {pipelineSteps.length} step
            {pipelineSteps.length === 1 ? "" : "s"}
          </div>
          <ol className="divide-y divide-border/60">
            {pipelineSteps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 shrink-0">
                  {s.status === "completed" ? (
                    <Check className="size-4 text-success" />
                  ) : s.status === "running" ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : s.status === "failed" ? (
                    <AlertTriangle className="size-4 text-destructive" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/40" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug text-foreground">
                    <span className="text-muted-foreground">{i + 1}.</span>{" "}
                    {s.description}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {s.status === "completed"
                      ? "Done"
                      : s.status === "running"
                        ? "Working…"
                        : s.status === "failed"
                          ? "Didn’t complete"
                          : "Queued"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── In-progress: a single calm status line ── */}
      {(isPending || isRunning) && !hasPipeline && (
        <div className="surface flex items-center gap-3 px-4 py-3.5">
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-foreground">
              {isRunning ? "Working on it…" : "Understanding your request…"}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {isRunning
                ? "Processing your files securely. This usually takes a few seconds."
                : "Figuring out the best way to do this."}
            </p>
          </div>
        </div>
      )}

      {/* ── Chat reply (no file op). Upgrade tag is stripped — the user
           sees only the plain message; the modal carries the upsell. ── */}
      {!isPending && !isRunning && prompt.aiKind === "chat" && prompt.aiMessage && (
        <ChatMarkdown>
          {upgradeParsed ? upgradeParsed.message : prompt.aiMessage}
        </ChatMarkdown>
      )}

      {/* ── Success: ONE cohesive result card. Summary header +
           outputs as the hero (the file is what they came for). ── */}
      {!isPending &&
        !isRunning &&
        !isFailed &&
        prompt.aiKind !== "chat" &&
        // Complete success = something the user can actually take away:
        // downloadable outputs, OR the legitimate expired-files state
        // (it succeeded earlier, blobs were GC'd after 24h). A bare
        // description with no files is NOT a success — never show a green
        // ✓ "Done" with nothing to download.
        (prompt.outputUrls?.length > 0 ||
          (prompt.filesExpired && prompt.status === "completed")) && (
          <div className="surface overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3.5">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13.5px] font-medium leading-snug text-foreground">
                  <Check className="size-3.5 shrink-0 text-success" />
                  {prompt.aiDescription || "Done — your files are ready"}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {prompt.outputUrls?.length
                    ? `${prompt.outputUrls.length} file${
                        prompt.outputUrls.length === 1 ? "" : "s"
                      } ready to download`
                    : "Completed earlier — files have since expired"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {/* Run again: opens a fresh chat with this turn's prompt
                    pre-filled. The user can drop a new file or reuse the
                    same one. Uses the existing chat_prompt_draft seam
                    (also used by the SEO landing pages). */}
                {prompt.prompt && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          "chat_prompt_draft",
                          prompt.prompt
                        );
                      } catch {}
                      router.push("/dashboard");
                    }}
                    title="Run this prompt again on a new file"
                  >
                    <RotateCw className="size-3.5" /> Run again
                  </Button>
                )}
                {!HIDE_LAUNCH_FEATURES && prompt.aiCommandTemplate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveAsPreset}
                    disabled={!isAuthenticated}
                  >
                    <Save className="size-3.5" /> Save preset
                  </Button>
                )}
              </div>
            </div>

            {prompt.outputUrls?.length > 0 && (
              <ul className="divide-y divide-border/60">
                {prompt.outputUrls.map((out) => {
                  const previewable = canPreview(out.filename) && !!out.url;
                  return (
                  <li
                    key={out.storageId}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {previewable ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewItem({
                              filename: out.filename,
                              url: out.url,
                            })
                          }
                          className="shrink-0 rounded-md transition-opacity hover:opacity-80"
                          aria-label={`Preview ${out.filename}`}
                        >
                          <FilePreview
                            filename={out.filename}
                            url={out.url}
                            mode="inline"
                          />
                        </button>
                      ) : (
                        <FilePreview
                          filename={out.filename}
                          url={out.url}
                          mode="inline"
                        />
                      )}
                      <span
                        className="truncate text-[13px] font-medium text-foreground"
                        title={out.filename}
                      >
                        {out.filename}
                      </span>
                    </div>
                    {out.url && (
                      <div className="flex shrink-0 items-center gap-2">
                        <ShareButton
                          promptId={prompt._id}
                          storageId={out.storageId}
                          filename={out.filename}
                          variant="inline"
                        />
                        <button
                          type="button"
                          onClick={() => downloadFile(out.url, out.filename)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
                        >
                          <Download className="size-3.5" />
                          Download
                        </button>
                      </div>
                    )}
                  </li>
                  );
                })}
              </ul>
            )}

            {prompt.filesExpired &&
              !prompt.outputUrls?.length &&
              prompt.status === "completed" && (
                <p className="px-4 py-3 text-[12px] text-muted-foreground">
                  Files expired — outputs are deleted after 24 hours. Re-upload
                  to run this again.
                </p>
              )}
          </div>
        )}

      {/* ── Failure: honest, specific copy per failureKind. NEVER leak
           logs/commands. The old "too much in one shot" text is ONLY for
           genuinely-complex requests — every other failure says what's
           actually wrong so the user isn't sent in circles. ── */}
      {isFailed && (
        <FailureCard
          failureKind={prompt.failureKind}
          failureTitle={prompt.failureTitle}
          failureBody={prompt.failureBody}
          promptId={prompt._id}
        />
      )}

      <PreviewModal
        open={!!previewItem}
        onOpenChange={(o) => !o && setPreviewItem(null)}
        filename={previewItem?.filename}
        url={previewItem?.url}
      >
        {previewItem && (
          <FilePreview
            filename={previewItem.filename}
            url={previewItem.url}
            mode="modal"
          />
        )}
      </PreviewModal>
    </div>
  );
}

/**
 * Failure presentation.
 *
 * Three tiers, most-specific first:
 *  1. failureTitle/failureBody — DIAGNOSED copy from diagnoseError() on the
 *     server: the real cause (password-protected, scanned PDF, bad codec…)
 *     plus a concrete alternative. Already sanitized; shown verbatim.
 *  2. failureKind === "complex" — the genuinely-too-much-in-one-shot card.
 *  3. The coarse per-failureKind COPY table — fallback when no diagnosis
 *     was produced.
 *
 * No logs, commands, or tool names ever appear here.
 */
function FailureCard({ failureKind, failureTitle, failureBody }) {
  // Tier 1: a specific server-diagnosed cause. Both fields must be present
  // (a half-diagnosis falls through to the coarse copy).
  if (failureTitle && failureBody) {
    return (
      <div className="surface px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
          {failureTitle}
        </p>
        <p className="mt-1">{failureBody}</p>
        <p className="mt-2 text-[12px]">
          This attempt wasn&apos;t counted toward your usage — retry as many
          times as you like.
        </p>
      </div>
    );
  }

  // Tier 2: genuinely-complex requests — keep the original, correct guidance.
  if (failureKind === "complex" || !failureKind) {
    return (
      <div className="surface px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
          Let&apos;s try that a different way
        </p>
        <p className="mt-1">
          That request was a bit much to do in one shot. Two things that
          almost always work:
        </p>
        <ul className="mt-1.5 space-y-1">
          <li className="flex gap-2">
            <span className="text-foreground/60">1.</span>
            <span>
              Ask for <strong className="font-medium text-foreground">one
              change at a time</strong> — e.g. &ldquo;make it black and
              white&rdquo;, then &ldquo;now rotate it 180°&rdquo;, then
              &ldquo;combine into a PDF&rdquo;. Each result feeds the next.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-foreground/60">2.</span>
            <span>
              Describe the <strong className="font-medium text-foreground">
              end result</strong> in plain words rather than how to do it.
            </span>
          </li>
        </ul>
        <p className="mt-2 text-[12px]">
          This attempt wasn&apos;t counted toward your usage — retry as
          many times as you like.
        </p>
      </div>
    );
  }

  const COPY = {
    noInput: {
      title: "Upload a file first",
      body: "I don't have a file to work on yet. Use Upload files on the left, then tell me what you'd like done with it.",
    },
    noOutput: {
      title: "That didn't produce a result",
      body: "I tried, but nothing came out the other end. Double-check the file is the kind you described, then give it another go — or try phrasing the request a little differently.",
    },
    execError: {
      title: "Something went wrong with that file",
      body: "That didn't work on this particular file — it may be corrupt, an unexpected format, or password-protected. Try a different file, or describe what you want a little differently.",
    },
    config: {
      title: "We hit a snag on our end",
      body: "This one is on us, not you — the service had a temporary problem. Please try again in a moment; if it keeps happening, contact support.",
    },
    aiError: {
      title: "I couldn't read that request",
      body: "I had trouble understanding what you wanted. Try describing the end result in plain words — e.g. \"convert this to PNG\" or \"compress this PDF\".",
    },
  };

  const { title, body } = COPY[failureKind] ?? COPY.aiError;

  return (
    <div className="surface px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
        {title}
      </p>
      <p className="mt-1">{body}</p>
      <p className="mt-2 text-[12px]">
        This attempt wasn&apos;t counted toward your usage — retry as many
        times as you like.
      </p>
    </div>
  );
}
