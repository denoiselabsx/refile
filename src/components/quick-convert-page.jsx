"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  FileType,
  Table2,
  Minimize2,
  UploadCloud,
  Download,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  ArrowRight,
  Boxes,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import {
  QUICK_CONVERT_TABLE,
  getQuickConvertEntry,
} from "../../convex/quickConvertCommands";
import { downloadFile } from "@/lib/download-file";
import { track } from "@/lib/analytics";
import { useQuickConvert } from "@/lib/use-quick-convert";
import { UpgradeModal, SuccessUpsell } from "@/components/upgrade";

/**
 * Quick Convert page — the no-AI, one-click conversion surface.
 *
 * Picks a tile → upload → (compress only) optional target size → submit.
 * The prompt row carries `quickConvertId`; runJob skips the model and runs
 * the deterministic recipe from convex/quickConvertCommands.ts.
 */

const CATEGORY_META = {
  pdf: { label: "PDF", icon: FileText },
  image: { label: "Image", icon: ImageIcon },
  video: { label: "Video", icon: Film },
  audio: { label: "Audio", icon: Music },
  document: { label: "Documents", icon: FileType },
  data: { label: "Data", icon: Table2 },
};

const CATEGORY_ORDER = ["pdf", "image", "video", "audio", "document", "data"];

/** Split a label like "PDF → Word" into [from, to] for chip rendering. */
function splitLabel(label) {
  const parts = label.split(/[→→]/).map((s) => s.trim());
  if (parts.length === 2) return { from: parts[0], to: parts[1] };
  return { from: label, to: null };
}

function formatBytes(bytes) {
  if (bytes == null || !isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/** Synthetic prompt string runJob/parseCompressionTarget reads. */
function composePrompt(entry, targetSize) {
  if (entry.kind === "compress") {
    const size = targetSize.trim();
    return size
      ? `Compress this ${entry.category} file to under ${size}.`
      : `Compress this ${entry.category} file as much as possible.`;
  }
  return entry.label;
}

/* ──────────────────────────────────────────────────────────────── *
 *  Top-level page
 * ──────────────────────────────────────────────────────────────── */

export function QuickConvertPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");

  const entry = selectedId ? getQuickConvertEntry(selectedId) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return QUICK_CONVERT_TABLE.filter((e) => {
      if (activeCat !== "all" && e.category !== activeCat) return false;
      if (!q) return true;
      const hay = [
        e.label,
        e.description,
        e.id,
        ...e.fromExts,
        e.toExt,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, activeCat]);

  const grouped = useMemo(() => {
    const map = {};
    for (const e of filtered) (map[e.category] ??= []).push(e);
    return map;
  }, [filtered]);

  // Esc closes the detail panel.
  useEffect(() => {
    if (!entry) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry]);

  const totalCount = QUICK_CONVERT_TABLE.length;

  return (
    <AppShell mode="auto">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
          <AnimatePresence mode="wait">
            {!entry ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <Hero totalCount={totalCount} />

                <SearchAndFilters
                  query={query}
                  setQuery={setQuery}
                  activeCat={activeCat}
                  setActiveCat={setActiveCat}
                />

                {filtered.length === 0 ? (
                  <EmptyResults onClear={() => setQuery("")} />
                ) : (
                  <div className="mt-8 space-y-10">
                    {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map(
                      (cat) => (
                        <CategorySection
                          key={cat}
                          category={cat}
                          entries={grouped[cat]}
                          onPick={(id) => {
                            track("quick_convert_opened", { id });
                            setSelectedId(id);
                          }}
                        />
                      ),
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`panel-${entry.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <ConvertPanel
                  entry={entry}
                  onBack={() => setSelectedId(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Hero header
 * ──────────────────────────────────────────────────────────────── */

function Hero({ totalCount }) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <Boxes className="size-5 text-foreground" />
      </div>
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
          Quick Convert
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-foreground" />
            No AI · direct
          </span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
          {totalCount} deterministic recipes. Pick one, drop a file, get the
          result — straight from the tool, with no model in between.
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Search + category filter chips
 * ──────────────────────────────────────────────────────────────── */

function SearchAndFilters({ query, setQuery, activeCat, setActiveCat }) {
  return (
    <div className="mt-7 space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search formats — try “heic”, “mp4”, “excel”…"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-[14px] text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-border-strong focus:bg-background focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CategoryPill
          active={activeCat === "all"}
          onClick={() => setActiveCat("all")}
          label="All"
        />
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          return (
            <CategoryPill
              key={cat}
              active={activeCat === cat}
              onClick={() => setActiveCat(cat)}
              label={meta.label}
              icon={<Icon className="size-3.5" />}
            />
          );
        })}
      </div>
    </div>
  );
}

function CategoryPill({ active, onClick, label, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Category section + tile
 * ──────────────────────────────────────────────────────────────── */

function CategorySection({ category, entries, onPick }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-foreground">
          <span className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
            <Icon className="size-3.5" />
          </span>
          {meta.label}
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {entries.length} {entries.length === 1 ? "recipe" : "recipes"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <Tile key={e.id} entry={e} onClick={() => onPick(e.id)} />
        ))}
      </div>
    </section>
  );
}

function Tile({ entry, onClick }) {
  const isCompress = entry.kind === "compress";
  const { from, to } = splitLabel(entry.label);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col gap-2.5 overflow-hidden rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* subtle hover wash */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent" />
      </div>

      <div className="relative flex items-center justify-between">
        {isCompress ? (
          <CompressBadge />
        ) : (
          <FormatBadges from={from} to={to} />
        )}
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>

      <div className="relative">
        <p className="text-[13.5px] font-medium leading-snug text-foreground">
          {entry.label}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">
          {entry.description}
        </p>
      </div>
    </button>
  );
}

function FormatBadges({ from, to }) {
  return (
    <div className="flex items-center gap-1.5">
      <FormatChip text={from} />
      {to && (
        <>
          <ArrowRight className="size-3 text-muted-foreground/60" />
          <FormatChip text={to} variant="solid" />
        </>
      )}
    </div>
  );
}

function FormatChip({ text, variant = "outline" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${
        variant === "solid"
          ? "bg-foreground text-background"
          : "border border-border bg-background text-foreground"
      }`}
    >
      {text}
    </span>
  );
}

function CompressBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
      <Minimize2 className="size-3" />
      Compress
    </span>
  );
}

function EmptyResults({ onClear }) {
  return (
    <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <Search className="size-6 text-muted-foreground" />
      <p className="mt-3 text-[13px] font-medium text-foreground">
        No recipes match that search
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Try a different format, or clear the filter.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
      >
        Clear search
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Convert detail panel — upload, submit, poll, download
 * ──────────────────────────────────────────────────────────────── */

function ConvertPanel({ entry, onBack }) {
  const qc = useQuickConvert(entry);
  const [targetSize, setTargetSize] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const accept = useMemo(
    () => entry.fromExts.map((e) => `.${e}`).join(","),
    [entry],
  );

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    track("quick_convert_used", { id: entry.id, anon: !qc.isAuthenticated });
    qc.submit(targetSize);
  };

  const reset = () => {
    qc.reset();
    setTargetSize("");
  };

  const { state, files, uploadProgress, job, upgradePrompt } = qc;
  const uploading = state === "uploading";
  const submitting = state === "submitting";
  const isRunning = state === "running";
  const isDone = state === "done";
  const isFailed = state === "failed";

  const { from, to } = splitLabel(entry.label);

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="group mb-6 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        All conversions
        <kbd className="ml-1 hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          Esc
        </kbd>
      </button>

      {/* ── Panel header ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
            {entry.kind === "compress" ? (
              <Minimize2 className="size-5" />
            ) : (
              (() => {
                const Icon = CATEGORY_META[entry.category].icon;
                return <Icon className="size-5" />;
              })()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-semibold leading-tight text-foreground">
              {entry.label}
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {entry.description}
            </p>
          </div>
        </div>

        {entry.kind !== "compress" && to && (
          <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/50 px-4 py-3">
            <FormatChip text={from} />
            <ArrowRight className="size-4 text-muted-foreground" />
            <FormatChip text={to} variant="solid" />
          </div>
        )}

        {/* ── Upload / form ──────────────────────────────────── */}
        {state === "idle" || uploading || submitting ? (
          <form onSubmit={handleSubmit} className="mt-6">
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
                    htmlFor="target-size"
                    className="text-[12px] font-medium text-foreground"
                  >
                    Target size
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Optional
                  </span>
                </div>
                <input
                  id="target-size"
                  type="text"
                  value={targetSize}
                  onChange={(e) => setTargetSize(e.target.value)}
                  placeholder="e.g. 5MB"
                  className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-border-strong focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["500KB", "1MB", "5MB", "10MB", "25MB"].map((s) => (
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
        ) : null}

        {/* ── Running ──────────────────────────────────────── */}
        <AnimatePresence>
          {isRunning && <RunningState />}
        </AnimatePresence>

        {/* ── Done ─────────────────────────────────────────── */}
        <AnimatePresence>
          {isDone && (
            <SuccessState
              job={job}
              entry={entry}
              onReset={reset}
              isAnonymous={!qc.isAuthenticated}
              anonRemaining={qc.anonRemaining}
              anonLimit={qc.anonLimit}
            />
          )}
        </AnimatePresence>

        {/* ── Failed ───────────────────────────────────────── */}
        <AnimatePresence>
          {isFailed && <FailureState job={job} onReset={reset} />}
        </AnimatePresence>
      </div>

      {/* ── Upgrade walls (anon only) ──────────────────────── */}
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
 *  Sub-components for the panel
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
      {/* Animated progress bar across the bottom while uploading */}
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

function SuccessState({ job, entry, onReset, isAnonymous, anonRemaining, anonLimit }) {
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
                downloadFile(o.url, o.filename),
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

      {/* Anonymous users get the soft upsell after seeing value. Authed
          users have already converted; no need to nag them. */}
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
