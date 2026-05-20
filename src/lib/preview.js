export const PREVIEW_KIND = {
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  PDF: "pdf",
  CSV: "csv",
  TEXT: "text",
  UNKNOWN: "unknown",
};

export const PREVIEW_MAX_BYTES = 25 * 1024 * 1024;

const IMAGE_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "svg",
  "bmp",
  "ico",
]);

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);

const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "oga", "flac", "aac", "m4a"]);

const PDF_EXTS = new Set(["pdf"]);

const CSV_EXTS = new Set(["csv", "tsv"]);

const TEXT_EXTS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "jsonl",
  "ndjson",
  "yaml",
  "yml",
  "xml",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "php",
  "sh",
  "bash",
  "zsh",
  "fish",
  "sql",
  "log",
  "ini",
  "toml",
  "conf",
  "env",
  "srt",
  "vtt",
]);

function extOf(filename) {
  if (typeof filename !== "string") return "";
  const clean = filename.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  if (dot < 0 || dot === clean.length - 1) return "";
  return clean.slice(dot + 1).toLowerCase();
}

export function previewKindFor(filename) {
  const ext = extOf(filename);
  if (!ext) return PREVIEW_KIND.UNKNOWN;
  if (IMAGE_EXTS.has(ext)) return PREVIEW_KIND.IMAGE;
  if (VIDEO_EXTS.has(ext)) return PREVIEW_KIND.VIDEO;
  if (AUDIO_EXTS.has(ext)) return PREVIEW_KIND.AUDIO;
  if (PDF_EXTS.has(ext)) return PREVIEW_KIND.PDF;
  if (CSV_EXTS.has(ext)) return PREVIEW_KIND.CSV;
  if (TEXT_EXTS.has(ext)) return PREVIEW_KIND.TEXT;
  return PREVIEW_KIND.UNKNOWN;
}

export function fileExtLabel(filename) {
  const ext = extOf(filename);
  if (!ext) return "FILE";
  return ext.toUpperCase();
}

export function canPreview(filename) {
  return previewKindFor(filename) !== PREVIEW_KIND.UNKNOWN;
}
