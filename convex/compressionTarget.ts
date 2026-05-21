/**
 * Compression-target detection + an iterative compression LADDER.
 *
 * Why this module exists
 * ──────────────────────
 * Users routinely ask "compress this to under 1 MB". The LLM emits ONE
 * compression command with a fixed quality knob; if that single setting
 * doesn't reach the target (a 23 MB PDF asked down to 1 MB often lands at
 * ~4.5 MB) the old UI still showed the model's optimistic description
 * ("Compressed to 1 MB"). That is dishonest and the #1 user complaint.
 *
 * The fix has two halves:
 *   1. HONEST REPORTING — runJob measures the real output bytes and the UI
 *      shows them (handled in runJob.ts + ai-response.jsx).
 *   2. ACTUALLY TRY TO HIT IT — when a target is present, instead of running
 *      the model's single command, runJob walks a deterministic LADDER of
 *      progressively stronger compression commands and STOPS at the first
 *      rung whose output is ≤ target. If no rung reaches it, the smallest
 *      result is delivered and the UI says so plainly.
 *
 * Determinism over LLM retries: the ladder is hand-written, recipe-book
 * commands — it does not depend on the model getting a retry right, and it
 * is validated by the same security gate as any other command. The whole
 * laddered job still bills as ONE conversion (the user asked for one
 * outcome), so the locked pricing model is untouched.
 *
 * Pure module — no Convex/Node imports, unit-testable.
 */

/** A single rung of the ladder: one command + the output filename it writes. */
export type Rung = { command: string; output: string };

/** What kind of file we're compressing — picks which ladder to walk. */
export type CompressKind = "pdf" | "video" | "image" | "audio" | "unknown";

export type CompressionTarget = {
  /** The size the user asked for, in bytes. */
  targetBytes: number;
  /** The original phrase, for logging only. */
  phrase: string;
};

/* ──────────────────────────────────────────────────────────────── *
 *  Target-size parsing
 * ──────────────────────────────────────────────────────────────── */

const UNIT_BYTES: Record<string, number> = {
  b: 1,
  kb: 1024,
  k: 1024,
  mb: 1024 * 1024,
  m: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
  g: 1024 * 1024 * 1024,
};

/**
 * Parse a target size out of a free-text prompt. Matches the shapes users
 * actually type: "under 1 MB", "compress to 5mb", "less than 500 KB",
 * "max 2 GB", "smaller than 10 MB", "below 800kb", "to 1.5 MB".
 *
 * Returns null when the prompt names no size — the caller then runs the
 * normal single-command path with no ladder.
 *
 * Conservative: requires an explicit unit so a bare "compress by 50" (a
 * percentage, a page count) never reads as a size. When several numbers
 * appear, the first size-shaped one wins (prompts lead with the goal).
 */
export function parseCompressionTarget(
  prompt: string
): CompressionTarget | null {
  if (!prompt) return null;
  // number + optional space + unit. The unit is mandatory.
  const re = /(\d+(?:\.\d+)?)\s*(gb|mb|kb|g|m|k|b)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prompt)) !== null) {
    const value = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    const mult = UNIT_BYTES[unit];
    if (!mult || !isFinite(value) || value <= 0) continue;
    // Ignore obviously-non-size matches like "h264" → would not match
    // anyway, but also skip a lone "b" with no size intent: require the
    // surrounding prompt to actually talk about size/compression.
    const bytes = Math.round(value * mult);
    // Sanity bounds: 1 KB .. 5 GB. Outside that it's almost certainly not
    // a real compression target (e.g. "1080" matched as something odd).
    if (bytes < 1024 || bytes > 5 * 1024 * 1024 * 1024) continue;
    return { targetBytes: bytes, phrase: m[0] };
  }
  return null;
}

/** Words that signal the user wants the file SMALLER. */
const COMPRESS_INTENT =
  /\b(compress|compressed|compression|shrink|reduce|smaller|under|less than|below|max(?:imum)?|fit|reduce size|file size|down to)\b/i;

/**
 * True when the prompt is a compression request (vs. a plain conversion
 * that happens to mention a size). A target alone isn't enough — "convert
 * to MP4" with no size is not a compression job; "compress under 5 MB" is.
 */
export function isCompressionRequest(prompt: string): boolean {
  return COMPRESS_INTENT.test(prompt || "");
}

/* ──────────────────────────────────────────────────────────────── *
 *  File-kind detection
 * ──────────────────────────────────────────────────────────────── */

const VIDEO_EXT = new Set([
  "mp4", "mov", "mkv", "webm", "avi", "m4v", "wmv", "flv", "mpg", "mpeg",
]);
const IMAGE_EXT = new Set([
  "jpg", "jpeg", "png", "webp", "tiff", "tif", "bmp", "gif",
]);
const AUDIO_EXT = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus"]);

export function compressKindOf(filename: string): CompressKind {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (VIDEO_EXT.has(ext)) return "video";
  if (IMAGE_EXT.has(ext)) return "image";
  if (AUDIO_EXT.has(ext)) return "audio";
  return "unknown";
}

/* ──────────────────────────────────────────────────────────────── *
 *  The ladders
 * ──────────────────────────────────────────────────────────────── */

/** Sanitize a base name into a safe, suffixed output filename. */
function outName(input: string, suffix: string, ext: string): string {
  const base = input.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `${base}_${suffix}.${ext}`;
}

/**
 * PDF ladder — Ghostscript PDFSETTINGS presets from light to extreme, then
 * presets combined with a hard image-DPI downsample for the heaviest rungs.
 * Each rung is one validated single-line command.
 */
function pdfLadder(input: string): Rung[] {
  const gs = (out: string, setting: string, extra = "") =>
    `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${setting} ${extra}-dNOPAUSE -dQUIET -dBATCH -sOutputFile='${out}' '${input}'`;
  return [
    { command: gs(outName(input, "compressed", "pdf"), "ebook"), output: outName(input, "compressed", "pdf") },
    { command: gs(outName(input, "small", "pdf"), "screen"), output: outName(input, "small", "pdf") },
    // Heavier: /screen + force a low image resolution (72 dpi colour/gray).
    {
      command: gs(
        outName(input, "smaller", "pdf"),
        "screen",
        "-dColorImageResolution=72 -dGrayImageResolution=72 -dMonoImageResolution=144 -dDownsampleColorImages=true -dDownsampleGrayImages=true "
      ),
      output: outName(input, "smaller", "pdf"),
    },
    // Extreme: 50 dpi images — last resort, visibly soft but tiny.
    {
      command: gs(
        outName(input, "minimal", "pdf"),
        "screen",
        "-dColorImageResolution=50 -dGrayImageResolution=50 -dMonoImageResolution=100 -dDownsampleColorImages=true -dDownsampleGrayImages=true "
      ),
      output: outName(input, "minimal", "pdf"),
    },
  ];
}

/**
 * Image ladder — JPEG/WebP re-encode at descending quality. PNG/other
 * inputs are pushed to JPEG since that is where the size actually drops.
 * `-strip` removes metadata on every rung.
 */
function imageLadder(input: string): Rung[] {
  const qualities = [70, 50, 35, 22];
  return qualities.map((q, i) => {
    const out = outName(input, `q${q}`, "jpg");
    return {
      command: `magick '${input}' -strip -quality ${q} '${out}'`,
      output: out,
    };
  });
}

/**
 * Video ladder — CRF climbs (lower quality) and a resolution cap kicks in
 * on later rungs. Single-pass libx264; the recipe-book even-dimension +
 * yuv420p guard is included so odd-sized phone clips don't fail. Audio is
 * copied (no-op for silent screencasts) until the heaviest rung, which
 * also drops audio bitrate.
 */
function videoLadder(input: string): Rung[] {
  const evenScale = "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p";
  const cap720 = "scale=trunc(min(iw\\,1280)/2)*2:-2,format=yuv420p";
  const cap480 = "scale=trunc(min(iw\\,854)/2)*2:-2,format=yuv420p";
  const mk = (suffix: string, vf: string, crf: number, audio: string): Rung => {
    const out = outName(input, suffix, "mp4");
    return {
      command: `ffmpeg -i '${input}' -vf "${vf}" -c:v libx264 -crf ${crf} -preset medium ${audio} '${out}'`,
      output: out,
    };
  };
  return [
    mk("compressed", evenScale, 28, "-c:a copy"),
    mk("small", cap720, 30, "-c:a aac -b:a 128k"),
    mk("smaller", cap720, 33, "-c:a aac -b:a 96k"),
    mk("minimal", cap480, 35, "-c:a aac -b:a 64k"),
  ];
}

/** Audio ladder — MP3 at descending bitrate. */
function audioLadder(input: string): Rung[] {
  const bitrates = [128, 96, 64, 48];
  return bitrates.map((b) => {
    const out = outName(input, `${b}k`, "mp3");
    return {
      command: `ffmpeg -i '${input}' -vn -b:a ${b}k '${out}'`,
      output: out,
    };
  });
}

/**
 * Build the compression ladder for a file. The caller walks it in order,
 * runs each rung in the sandbox, and stops at the first output ≤ target.
 * Returns [] for kinds we have no reliable ladder for (the caller then
 * falls back to the model's single command).
 */
export function buildCompressionLadder(
  filename: string
): { kind: CompressKind; rungs: Rung[] } {
  const kind = compressKindOf(filename);
  switch (kind) {
    case "pdf":
      return { kind, rungs: pdfLadder(filename) };
    case "image":
      return { kind, rungs: imageLadder(filename) };
    case "video":
      return { kind, rungs: videoLadder(filename) };
    case "audio":
      return { kind, rungs: audioLadder(filename) };
    default:
      return { kind, rungs: [] };
  }
}

/** Human-readable size for logs and user copy. Binary units, 1 decimal. */
export function formatBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}
