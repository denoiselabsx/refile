/**
 * User-facing copy guard. ReFile sells an outcome ("your video, compressed"),
 * not a toolbox — exposing ffmpeg/imagemagick/flags in the UI makes the
 * product feel like a thin wrapper and undercuts perceived value. The model
 * is instructed to write outcome-only descriptions, but this is the
 * deterministic safety net: anything that smells like a tool, binary, flag,
 * or raw command is scrubbed before it can reach the browser.
 *
 * Pure (no framework imports) so both the Convex backend and the Next.js
 * frontend can use it.
 */

// Binary/keyword tokens a description must never contain. Deliberately
// EXCLUDES words that are also normal English ("convert", "identify",
// "zip", "tar", "sox", "lame") — "Convert your file to PDF" is exactly
// the outcome copy we WANT. A real command leak ("convert in.png
// out.png") is still caught by the filename-pair / flag shapes below.
const TOOL_TOKENS = [
  "ffmpeg", "ffprobe", "magick", "imagemagick", "mogrify", "opusenc",
  "opusdec", "mkvmerge", "mkvextract", "mkvinfo", "pandoc", "libreoffice",
  "soffice", "wkhtmltopdf", "antiword", "catdoc", "catppt", "xls2csv",
  "qpdf", "ghostscript", "pdftoppm", "pdftocairo", "pdfinfo", "pdfunite",
  "pdfseparate", "pdftotext", "poppler", "cwebp", "dwebp", "gif2webp",
  "img2webp", "heif-convert", "avifenc", "avifdec", "rsvg-convert",
  "exiftool", "tesseract", "rembg", "bunzip2", "gunzip", "libx264",
  "libx265", "yuv420p", "colorspace", "floydsteinberg", "pdfsettings",
  "-vf", "-af", "-i ",
];

// Patterns that betray a command even without a known binary name.
const COMMAND_SHAPES = [
  /`[^`]*`/, // backtick code span
  /\b\w+=\S+/, // key=value (volume=0.5, scale=...)
  /(^|\s)-{1,2}[a-z]/i, // -flag / --flag
  /\b[a-z0-9_]+\.[a-z0-9]{1,4}\s+[a-z0-9_]+\.[a-z0-9]{1,4}\b/i, // in.x out.y
];

function looksTechnical(text) {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  for (const t of TOOL_TOKENS) {
    // word-ish boundary so "convert" matches but "conversion" does not
    const re = new RegExp(`(^|[^a-z])${t.replace(/[-]/g, "\\-")}([^a-z]|$)`, "i");
    if (re.test(lower)) return true;
  }
  return COMMAND_SHAPES.some((re) => re.test(String(text)));
}

/**
 * Return the text only if it's safe end-user copy; otherwise null so the
 * caller can substitute a generic outcome line. We deliberately do NOT try
 * to partially rewrite a leaky sentence — a half-scrubbed string reads
 * worse than a clean generic one.
 */
export function safeDescription(text) {
  if (!text) return null;
  const trimmed = String(text).trim();
  if (!trimmed || looksTechnical(trimmed)) return null;
  return trimmed;
}

/**
 * Strip every command/tool-revealing field from a prompt doc before it
 * leaves the server. Keeps outcome + the user's own filenames; drops the
 * machinery. pipelineSteps collapses to { description, status } with the
 * description scrubbed (or a neutral "Step N" fallback).
 */
export function publicPrompt(prompt) {
  if (!prompt) return prompt;
  const {
    aiCommand: _c,
    aiTool: _t,
    sandboxLogs: _l,
    // errorMessage holds RAW stderr / tool names / paths. It is internal
    // (admin debug + the self-improvement cron read it directly off the
    // row). It must NEVER ride along in the browser-facing payload — drop
    // it here. The user-facing failure copy is failureTitle/failureBody.
    errorMessage: _e,
    pipelineSteps,
    aiDescription,
    failureTitle,
    failureBody,
    ...rest
  } = prompt;

  const cleanedSteps = Array.isArray(pipelineSteps)
    ? pipelineSteps.map((s, i) => ({
        description: safeDescription(s?.description) || `Step ${i + 1}`,
        status: s?.status ?? "pending",
      }))
    : undefined;

  return {
    ...rest,
    aiDescription: safeDescription(aiDescription) || undefined,
    // Diagnosed failure copy is already non-technical, but run it through
    // the same guard as a defense-in-depth net — a future matcher that
    // leaks a tool name gets scrubbed rather than shown.
    ...(failureTitle
      ? { failureTitle: safeDescription(failureTitle) || undefined }
      : {}),
    ...(failureBody
      ? { failureBody: safeDescription(failureBody) || undefined }
      : {}),
    ...(cleanedSteps ? { pipelineSteps: cleanedSteps } : {}),
  };
}
