"use client";

/**
 * <RecipeRunner /> — the embeddable deterministic-conversion widget.
 *
 * This is THE working tool: drop a file, optional target-size for
 * compression, hit submit, see live progress, download the result.
 * Used by:
 *   • /dashboard/quick   (inside the categorical browse page)
 *   • /convert/<slug>    (the SEO landing pages)
 *   • potentially future embeds (a partner widget, a how-to page demo)
 *
 * Single source of truth for the UX of "run this recipe" — pulled out
 * of quick-convert-page.jsx so the SEO pages can drop it in without
 * duplicating the upload/state/upsell wiring.
 *
 * Auth-aware via useQuickConvert: authed users hit Convex directly,
 * anonymous users go through /api/anon-convert. The component itself
 * doesn't care which.
 */

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  UploadCloud,
  X,
  AlertCircle,
} from "lucide-react";
import { useQuickConvert } from "@/lib/use-quick-convert";
import { UpgradeModal, SuccessUpsell } from "@/components/upgrade";
import { downloadFile } from "@/lib/download-file";
import { getQuickConvertEntry } from "../../convex/quickConvertCommands";

const COMPRESS_PRESETS = ["500KB", "1MB", "5MB", "10MB", "25MB"];

function formatBytes(bytes) {
  if (bytes == null || !isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/**
 * Accepts EITHER a full entry object (when called from another client
 * component that already has it — e.g. quick-convert-page) OR a string
 * `entryId` looked up here. Server components must use `entryId` so
 * they don't serialise the entry's `build` function across the RSC
 * boundary (functions can't be serialised; Next throws).
 */
export function RecipeRunner({ entry: entryProp, entryId, variant = "card" }) {
  const entry = entryProp ?? (entryId ? getQuickConvertEntry(entryId) : null);
  if (!entry) return null;
  const qc = useQuickConvert(entry);
  const [targetSize, setTargetSize] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const accept = useMemo(
    () => entry.fromExts.map((e) => `.${e}`).join(","),
    [entry]
  );

  const { state, files, uploadProgress, job, upgradePrompt } = qc;
  const uploading = state === "uploading";
  const submitting = state === "submitting";
  const isRunning = state === "running";
  const isDone = state === "done";
  const isFailed = state === "failed";

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    qc.submit(targetSize);
  };

  // `card` (default) = boxed, used inside dashboard panel & SEO hero.
  // `bare` = no outer card; used when the page already wraps it.
  const wrapperCls =
    variant === "card"
      ? "rounded-2xl border border-border bg-card p-6 sm:p-7"
      : "";

  return (
    <div className={wrapperCls}>
      {/* ── Form ──────────────────────────────────────────── */}
      {(state === "idle" || uploading || submitting) && (
        <form onSubmit={handleSubmit}>
          <DropZone
            entry={entry}
            accept={accept}
            dragOver={dragOver}
            uploading={uploading}
            uploadProgress={uploadProgress}
            hasFiles={files.length > 0}
            inputRef={inputRef}
            onFiles={qc.uploadFiles}
            onDragChange={setDragOver}
          />

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              <AnimatePresence initial={false}>
                {files.map((f, i) => (
                  <motion.li
                    key={f.storageId}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
                  >
                    <CheckCircle2 className="size-3.5 shrink-0 text-foreground" />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {f.filename}
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                      {formatBytes(f.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => qc.removeFile(i)}
                      className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {entry.kind === "compress" && files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 rounded-xl border border-border bg-background p-3.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor={`target-size-${entry.id}`}
                  className="text-[12px] font-medium text-foreground"
                >
                  Target size
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Optional
                </span>
              </div>
              <input
                id={`target-size-${entry.id}`}
                type="text"
                value={targetSize}
                onChange={(e) => setTargetSize(e.target.value)}
                placeholder="e.g. 5MB"
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-border-strong focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COMPRESS_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTargetSize(s)}
                    className={`rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium transition-colors ${
                      targetSize === s
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Leave blank to compress as far as quality allows.
              </p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={files.length === 0 || uploading || submitting}
            className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[13.5px] font-medium text-background shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                {entry.kind === "compress" ? "Compress now" : "Convert now"}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ── States ────────────────────────────────────────── */}
      <AnimatePresence>{isRunning && <RunningState />}</AnimatePresence>
      <AnimatePresence>
        {isDone && (
          <SuccessState
            job={job}
            entry={entry}
            onReset={() => {
              qc.reset();
              setTargetSize("");
            }}
            isAnonymous={!qc.isAuthenticated}
            anonRemaining={qc.anonRemaining}
            anonLimit={qc.anonLimit}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isFailed && (
          <FailureState
            job={job}
            onReset={() => {
              qc.reset();
              setTargetSize("");
            }}
          />
        )}
      </AnimatePresence>

      <UpgradeModal
        open={!!upgradePrompt}
        onClose={qc.dismissUpgrade}
        variant={upgradePrompt?.variant ?? "quota-exhausted"}
        fileSizeMb={upgradePrompt?.fileSizeMb}
        capMb={upgradePrompt?.capMb}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Internal sub-components (kept here to keep RecipeRunner the
 *  single import point — these are not re-exported).
 * ──────────────────────────────────────────────────────────────── */

function DropZone({
  entry,
  accept,
  dragOver,
  uploading,
  uploadProgress,
  hasFiles,
  inputRef,
  onFiles,
  onDragChange,
}) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all ${
        dragOver
          ? "border-foreground bg-muted/60"
          : "border-border bg-background hover:border-border-strong hover:bg-muted/30"
      } ${uploading ? "pointer-events-none" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragOver) onDragChange(true);
      }}
      onDragLeave={() => onDragChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragChange(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      {uploading && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${uploadProgress}%` }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 h-0.5 bg-foreground"
        />
      )}

      <motion.div
        animate={{ scale: dragOver ? 1.08 : 1 }}
        transition={{ duration: 0.18 }}
        className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card"
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <UploadCloud className="size-5 text-muted-foreground" />
        )}
      </motion.div>

      <p className="mt-3 text-[13px] font-medium text-foreground">
        {uploading
          ? `Uploading… ${Math.round(uploadProgress)}%`
          : hasFiles && entry.multiInput
            ? "Add more files"
            : entry.multiInput
              ? "Drop files here, or click to choose"
              : "Drop a file here, or click to choose"}
      </p>
      <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
        {entry.fromExts.join(" · ")}
      </p>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={!!entry.multiInput}
        onChange={(e) => onFiles(e.target.files)}
      />
    </label>
  );
}

function RunningState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className="mt-6 overflow-hidden rounded-xl border border-border bg-background"
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-card">
          <Loader2 className="size-4 animate-spin text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground">
            Working on your file
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Running the recipe in the sandbox — usually a few seconds.
          </p>
        </div>
      </div>
      <div className="h-0.5 w-full overflow-hidden bg-muted">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="h-full w-1/3 bg-foreground"
        />
      </div>
    </motion.div>
  );
}

function SuccessState({
  job,
  entry,
  onReset,
  isAnonymous,
  anonRemaining,
  anonLimit,
}) {
  const inSize = job?.inputSizeBytes;
  const outSize = job?.outputSizeBytes;
  const ratio =
    inSize && outSize && inSize > 0 ? (1 - outSize / inSize) * 100 : null;
  const showSizeDelta = entry.kind === "compress" && ratio !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6"
    >
      <div className="rounded-xl border border-border bg-background">
        <div className="flex items-start gap-3 px-4 pt-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
            <CheckCircle2 className="size-4 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-foreground">
              {job?.aiDescription || "Done."}
            </p>
            {showSizeDelta && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px]">
                <span className="font-mono text-muted-foreground line-through">
                  {formatBytes(inSize)}
                </span>
                <ArrowRight className="size-3 text-muted-foreground/60" />
                <span className="font-mono font-semibold text-foreground">
                  {formatBytes(outSize)}
                </span>
                <span className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
                  −{ratio.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <ul className="mt-3 space-y-1.5 px-4 pb-4">
          {(job?.outputUrls || []).map((o) => (
            <li
              key={o.storageId}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-[12px]"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {o.filename}
              </span>
              {o.size != null && (
                <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                  {formatBytes(o.size)}
                </span>
              )}
              <button
                type="button"
                onClick={() => downloadFile(o.url, o.filename)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11.5px] font-medium text-background transition-opacity hover:opacity-90"
              >
                <Download className="size-3" />
                Download
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Convert another
          </button>
          {(job?.outputUrls?.length ?? 0) > 1 && (
            <button
              type="button"
              onClick={() =>
                (job?.outputUrls || []).forEach((o) =>
                  downloadFile(o.url, o.filename)
                )
              }
              className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline"
            >
              <Download className="size-3.5" />
              Download all
            </button>
          )}
        </div>
      </div>

      {isAnonymous && (
        <SuccessUpsell
          remaining={anonRemaining ?? 0}
          limit={anonLimit ?? 3}
        />
      )}
    </motion.div>
  );
}

function FailureState({ job, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-background">
          <AlertCircle className="size-4 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-foreground">
            {job?.failureTitle || "That didn't work"}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {job?.failureBody ||
              "The file may be corrupt, an unsupported variant, or password-protected."}
          </p>
          <button
            type="button"
            onClick={onReset}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      </div>
    </motion.div>
  );
}
