/**
 * Quick Convert — the deterministic command table.
 *
 * Why this module exists
 * ──────────────────────
 * The chat path sends every request through Groq to pick a tool + command.
 * That is the right design for free-text ("make this look like a polaroid")
 * but it is overkill — and a latency/cost/variance tax — for the bread-and-
 * butter asks: "PDF → Word", "HEIC → JPG", "compress this video".
 *
 * Quick Convert is the no-AI path. The user picks a tile, the tile carries a
 * stable `id`, and `runJob` looks that id up HERE to get a hand-written
 * command. No model call. The command still runs through the SAME security
 * gate (`validateCommand`) and semantic corrector (`correctCommand`) as any
 * AI-generated command, then the same Modal worker and output contract — so
 * Quick Convert is strictly a *generation* shortcut, not a trust shortcut.
 *
 * Compression entries (`kind: "compress"`) carry NO `build` function: the
 * runJob compress branch reuses the existing deterministic ladder in
 * compressionTarget.ts. This file is only the metadata anchor for them.
 *
 * Pure module — no Convex/Node imports. The client UI imports it directly
 * (the grid is generated from QUICK_CONVERT_TABLE) so the tiles can never
 * drift from the executable recipes.
 */

export type QuickConvertKind = "convert" | "compress";

/** A built command plus the exact output filename(s) the tool will write. */
export type BuiltCommand = { command: string; outputs: string[] };

export type QuickConvertEntry = {
  /** Stable id — referenced by the prompt row's `quickConvertId`. */
  id: string;
  kind: QuickConvertKind;
  /** Coarse grouping for the UI grid. */
  category: "video" | "audio" | "image" | "pdf" | "document" | "data";
  /** Short UI label, e.g. "PDF → Word". */
  label: string;
  /** Outcome-only copy. Stored as aiDescription; shown on the success card. */
  description: string;
  /** Accepted input extensions, lowercase, no dot. */
  fromExts: string[];
  /** Output extension the user receives. "*" = depends (compress = same ext). */
  toExt: string;
  /** True for recipes that take many input files (images → PDF). */
  multiInput?: boolean;
  /** Tool name for the success card / diagnostics. Never shown raw to users. */
  tool: string;
  /**
   * Build the command for concrete (already sanitized) input filenames.
   * Absent for `kind: "compress"` — those use the compressionTarget ladder.
   */
  build?: (inputs: string[]) => BuiltCommand;
};

/* ──────────────────────────────────────────────────────────────── *
 *  Filename helpers — mirror compressionTarget.ts `outName`.
 * ──────────────────────────────────────────────────────────────── */

/** Strip the extension and neutralize anything unsafe in a base name. */
function baseOf(input: string): string {
  return input
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[.\-]+/, "") || "file";
}

/** `report.docx` + `pdf` → `report.pdf`. */
function reExt(input: string, ext: string): string {
  return `${baseOf(input)}.${ext}`;
}

/* ──────────────────────────────────────────────────────────────── *
 *  Command builders — one per recipe family. Every command is a
 *  single line using only allowlisted binaries (verified against
 *  convex/commandValidator.ts) and tools installed in modal/worker.py.
 * ──────────────────────────────────────────────────────────────── */

/** ffmpeg: extract/transcode audio to MP3 at 192 kbps. */
function toMp3(inputs: string[]): BuiltCommand {
  const out = reExt(inputs[0], "mp3");
  return { command: `ffmpeg -i '${inputs[0]}' -vn -b:a 192k '${out}'`, outputs: [out] };
}

/**
 * ffmpeg: transcode any video container to H.264/AAC MP4.
 *
 *   • even-dimension + yuv420p guard — keeps odd-sized phone clips from
 *     failing libx264
 *   • -preset veryfast — 5–8× faster than "medium" at ~5% larger files.
 *     For the no-AI Quick Convert path, finishing in seconds beats a tiny
 *     size win the user can't see. Long videos at "medium" were timing out
 *     past Modal's response window and hanging the job.
 *   • audio re-encoded to AAC (not copied) because webm/avi/mkv audio
 *     codecs aren't MP4-compatible.
 */
function toMp4(inputs: string[]): BuiltCommand {
  const out = reExt(inputs[0], "mp4");
  return {
    command:
      `ffmpeg -i '${inputs[0]}' ` +
      `-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" ` +
      `-c:v libx264 -crf 23 -preset veryfast -c:a aac -b:a 128k '${out}'`,
    outputs: [out],
  };
}

/**
 * ImageMagick: convert an image to another raster format at high quality.
 *
 * The `[0]` suffix on the input pins multi-frame inputs (animated GIFs,
 * multi-page TIFFs) to frame 0. Without it, ImageMagick happily writes
 * `out-0.jpg`, `out-1.jpg`, ... into the workdir and our declared `out.jpg`
 * never appears → false "no output" failure. `[0]` is harmless on
 * single-frame inputs.
 */
function imageTo(ext: string) {
  return (inputs: string[]): BuiltCommand => {
    const out = reExt(inputs[0], ext);
    return {
      command: `magick '${inputs[0]}[0]' -quality 92 '${out}'`,
      outputs: [out],
    };
  };
}

/** libheif: HEIC photo → JPG (heif-convert picks JPEG from the .jpg name). */
function heicToJpg(inputs: string[]): BuiltCommand {
  const out = reExt(inputs[0], "jpg");
  return { command: `heif-convert -q 92 '${inputs[0]}' '${out}'`, outputs: [out] };
}

/** librsvg: SVG → PNG at a sensible 1024px width. */
function svgToPng(inputs: string[]): BuiltCommand {
  const out = reExt(inputs[0], "png");
  return { command: `rsvg-convert -w 1024 '${inputs[0]}' -o '${out}'`, outputs: [out] };
}

/** librsvg: SVG → PDF (vector preserved). */
function svgToPdf(inputs: string[]): BuiltCommand {
  const out = reExt(inputs[0], "pdf");
  return { command: `rsvg-convert -f pdf '${inputs[0]}' -o '${out}'`, outputs: [out] };
}

/**
 * poppler: render PDF pages to images. We deliberately limit to the
 * FIRST PAGE ONLY (`-f 1 -l 1`) on the anonymous/Quick Convert path —
 * here's why:
 *
 *   • Rendering N pages at 150 DPI is N × ~150–300ms of CPU. A 200-page
 *     scanned PDF could take minutes — the user just sees a hung "Working
 *     on your file" spinner and bails.
 *   • The Modal worker collects ALL declared outputs into a base64 JSON
 *     response. Even at 200 KB per page, 200 pages = ~40 MB → exceeds
 *     Convex action payload limits and hangs the HTTP exchange.
 *   • pdftoppm zero-pads the page suffix dynamically (`-1` for 1-9 pages,
 *     `-01` for 10-99, `-001` for 100+) which makes "declare every page
 *     filename in advance" impossible — verifyOutputs would fail on
 *     mismatched names.
 *
 * Limiting to page 1 sidesteps all three: ~1 second CPU, ~200 KB payload,
 * `-1.<ext>` suffix is deterministic. Multi-page is offered via signup
 * (the SEO copy and faqs in lib/conversions.js call this out honestly).
 */
function pdfToImage(fmt: "png" | "jpeg", ext: string) {
  return (inputs: string[]): BuiltCommand => {
    const base = baseOf(inputs[0]);
    return {
      command: `pdftoppm -${fmt} -r 150 -f 1 -l 1 '${inputs[0]}' '${base}'`,
      outputs: [`${base}-1.${ext}`],
    };
  };
}

/**
 * ImageMagick: combine many images into a single PDF, one image per page.
 * Each input gets `[0]` so a multi-page TIFF or animated GIF in the batch
 * contributes only its first frame — predictable, no exploding output.
 */
function imagesToPdf(inputs: string[]): BuiltCommand {
  const out = "combined.pdf";
  const quoted = inputs.map((f) => `'${f}[0]'`).join(" ");
  return { command: `magick ${quoted} '${out}'`, outputs: [out] };
}

/**
 * LibreOffice headless: convert to a target format. soffice derives the
 * output name itself (same base, new extension) and writes it to the CWD.
 */
function sofficeTo(ext: string, extraFilter = "") {
  return (inputs: string[]): BuiltCommand => {
    const out = reExt(inputs[0], ext);
    const filter = extraFilter ? `${extraFilter} ` : "";
    return {
      command: `soffice --headless ${filter}--convert-to ${ext} '${inputs[0]}'`,
      outputs: [out],
    };
  };
}

/** pandoc: document/markup conversion (md/txt → pdf, docx → epub, csv → json). */
function pandocTo(ext: string) {
  return (inputs: string[]): BuiltCommand => {
    const out = reExt(inputs[0], ext);
    return { command: `pandoc '${inputs[0]}' -o '${out}'`, outputs: [out] };
  };
}

/* ──────────────────────────────────────────────────────────────── *
 *  The table.
 *
 *  Note on what's deliberately NOT here:
 *   - json → csv: in2csv/csvjson write to stdout only, and the security
 *     validator hard-blocks `>` redirection. There is no reliable single
 *     command. Excluded by design (the chat path can still attempt it).
 * ──────────────────────────────────────────────────────────────── */

export const QUICK_CONVERT_TABLE: QuickConvertEntry[] = [
  /* ── Video ─────────────────────────────────────────────────── */
  { id: "mp4-to-mp3", kind: "convert", category: "video", label: "MP4 → MP3",
    description: "Extracted the audio track as a 192 kbps MP3.",
    fromExts: ["mp4"], toExt: "mp3", tool: "ffmpeg", build: toMp3 },
  { id: "mov-to-mp4", kind: "convert", category: "video", label: "MOV → MP4",
    description: "Converted to a widely-compatible H.264 MP4.",
    fromExts: ["mov"], toExt: "mp4", tool: "ffmpeg", build: toMp4 },
  { id: "mkv-to-mp4", kind: "convert", category: "video", label: "MKV → MP4",
    description: "Converted to a widely-compatible H.264 MP4.",
    fromExts: ["mkv"], toExt: "mp4", tool: "ffmpeg", build: toMp4 },
  { id: "webm-to-mp4", kind: "convert", category: "video", label: "WebM → MP4",
    description: "Converted to a widely-compatible H.264 MP4.",
    fromExts: ["webm"], toExt: "mp4", tool: "ffmpeg", build: toMp4 },
  { id: "avi-to-mp4", kind: "convert", category: "video", label: "AVI → MP4",
    description: "Converted to a widely-compatible H.264 MP4.",
    fromExts: ["avi"], toExt: "mp4", tool: "ffmpeg", build: toMp4 },
  { id: "gif-to-mp4", kind: "convert", category: "video", label: "GIF → MP4",
    description: "Converted the animation to an H.264 MP4 video.",
    fromExts: ["gif"], toExt: "mp4", tool: "ffmpeg", build: toMp4 },

  /* ── Audio ─────────────────────────────────────────────────── */
  { id: "wav-to-mp3", kind: "convert", category: "audio", label: "WAV → MP3",
    description: "Converted to a 192 kbps MP3.",
    fromExts: ["wav"], toExt: "mp3", tool: "ffmpeg", build: toMp3 },
  { id: "m4a-to-mp3", kind: "convert", category: "audio", label: "M4A → MP3",
    description: "Converted to a 192 kbps MP3.",
    fromExts: ["m4a"], toExt: "mp3", tool: "ffmpeg", build: toMp3 },
  { id: "flac-to-mp3", kind: "convert", category: "audio", label: "FLAC → MP3",
    description: "Converted to a 192 kbps MP3.",
    fromExts: ["flac"], toExt: "mp3", tool: "ffmpeg", build: toMp3 },
  { id: "aac-to-mp3", kind: "convert", category: "audio", label: "AAC → MP3",
    description: "Converted to a 192 kbps MP3.",
    fromExts: ["aac"], toExt: "mp3", tool: "ffmpeg", build: toMp3 },
  { id: "ogg-to-mp3", kind: "convert", category: "audio", label: "OGG → MP3",
    description: "Converted to a 192 kbps MP3.",
    fromExts: ["ogg"], toExt: "mp3", tool: "ffmpeg", build: toMp3 },

  /* ── Image ─────────────────────────────────────────────────── */
  { id: "heic-to-jpg", kind: "convert", category: "image", label: "HEIC → JPG",
    description: "Converted the HEIC photo to a high-quality JPG.",
    fromExts: ["heic", "heif"], toExt: "jpg", tool: "heif-convert", build: heicToJpg },
  { id: "png-to-jpg", kind: "convert", category: "image", label: "PNG → JPG",
    description: "Converted to a high-quality JPG.",
    fromExts: ["png"], toExt: "jpg", tool: "imagemagick", build: imageTo("jpg") },
  { id: "jpg-to-png", kind: "convert", category: "image", label: "JPG → PNG",
    description: "Converted to a PNG.",
    fromExts: ["jpg", "jpeg"], toExt: "png", tool: "imagemagick", build: imageTo("png") },
  { id: "webp-to-png", kind: "convert", category: "image", label: "WebP → PNG",
    description: "Converted to a PNG.",
    fromExts: ["webp"], toExt: "png", tool: "imagemagick", build: imageTo("png") },
  { id: "webp-to-jpg", kind: "convert", category: "image", label: "WebP → JPG",
    description: "Converted to a high-quality JPG.",
    fromExts: ["webp"], toExt: "jpg", tool: "imagemagick", build: imageTo("jpg") },
  { id: "png-to-webp", kind: "convert", category: "image", label: "PNG → WebP",
    description: "Converted to a compact WebP.",
    fromExts: ["png"], toExt: "webp", tool: "imagemagick", build: imageTo("webp") },
  { id: "jpg-to-webp", kind: "convert", category: "image", label: "JPG → WebP",
    description: "Converted to a compact WebP.",
    fromExts: ["jpg", "jpeg"], toExt: "webp", tool: "imagemagick", build: imageTo("webp") },
  { id: "bmp-to-png", kind: "convert", category: "image", label: "BMP → PNG",
    description: "Converted to a PNG.",
    fromExts: ["bmp"], toExt: "png", tool: "imagemagick", build: imageTo("png") },
  { id: "tiff-to-jpg", kind: "convert", category: "image", label: "TIFF → JPG",
    description: "Converted to a high-quality JPG.",
    fromExts: ["tiff", "tif"], toExt: "jpg", tool: "imagemagick", build: imageTo("jpg") },
  { id: "svg-to-png", kind: "convert", category: "image", label: "SVG → PNG",
    description: "Rendered the SVG to a 1024px-wide PNG.",
    fromExts: ["svg"], toExt: "png", tool: "rsvg-convert", build: svgToPng },
  { id: "svg-to-pdf", kind: "convert", category: "image", label: "SVG → PDF",
    description: "Converted the SVG to a vector PDF.",
    fromExts: ["svg"], toExt: "pdf", tool: "rsvg-convert", build: svgToPdf },

  /* ── PDF ───────────────────────────────────────────────────── */
  { id: "pdf-to-jpg", kind: "convert", category: "pdf", label: "PDF → JPG",
    description: "Rendered each PDF page to a JPG image.",
    fromExts: ["pdf"], toExt: "jpg", tool: "poppler", build: pdfToImage("jpeg", "jpg") },
  { id: "pdf-to-png", kind: "convert", category: "pdf", label: "PDF → PNG",
    description: "Rendered each PDF page to a PNG image.",
    fromExts: ["pdf"], toExt: "png", tool: "poppler", build: pdfToImage("png", "png") },
  { id: "images-to-pdf", kind: "convert", category: "pdf", label: "Images → PDF",
    description: "Combined the images into a single PDF, one image per page.",
    fromExts: ["jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif"], toExt: "pdf",
    multiInput: true, tool: "imagemagick", build: imagesToPdf },

  /* ── Documents ─────────────────────────────────────────────── */
  { id: "docx-to-pdf", kind: "convert", category: "document", label: "Word → PDF",
    description: "Converted the Word document to a PDF.",
    fromExts: ["docx", "doc"], toExt: "pdf", tool: "libreoffice", build: sofficeTo("pdf") },
  { id: "pdf-to-docx", kind: "convert", category: "document", label: "PDF → Word",
    description: "Converted the PDF to an editable Word document.",
    fromExts: ["pdf"], toExt: "docx", tool: "libreoffice",
    build: sofficeTo("docx", "--infilter=writer_pdf_import") },
  { id: "pptx-to-pdf", kind: "convert", category: "document", label: "PowerPoint → PDF",
    description: "Converted the presentation to a PDF.",
    fromExts: ["pptx", "ppt"], toExt: "pdf", tool: "libreoffice", build: sofficeTo("pdf") },
  { id: "xlsx-to-pdf", kind: "convert", category: "document", label: "Excel → PDF",
    description: "Converted the spreadsheet to a PDF.",
    fromExts: ["xlsx", "xls"], toExt: "pdf", tool: "libreoffice", build: sofficeTo("pdf") },
  { id: "odt-to-pdf", kind: "convert", category: "document", label: "ODT → PDF",
    description: "Converted the OpenDocument text to a PDF.",
    fromExts: ["odt"], toExt: "pdf", tool: "libreoffice", build: sofficeTo("pdf") },
  // Text → PDF via LibreOffice (NOT pandoc). pandoc-to-PDF needs a
  // LaTeX install (xelatex/pdflatex), which isn't in the Modal image.
  // soffice handles plain text natively — wraps it in a monospace
  // PDF without any tex dependency.
  { id: "txt-to-pdf", kind: "convert", category: "document", label: "Text → PDF",
    description: "Converted the text file to a PDF.",
    fromExts: ["txt"], toExt: "pdf", tool: "libreoffice", build: sofficeTo("pdf") },
  { id: "docx-to-epub", kind: "convert", category: "document", label: "Word → EPUB",
    description: "Converted the Word document to an EPUB e-book.",
    fromExts: ["docx", "doc"], toExt: "epub", tool: "pandoc", build: pandocTo("epub") },
  // Intentionally NOT shipped here (would-be ids commented for the record):
  //   md-to-pdf   — pandoc needs LaTeX; soffice doesn't read markdown.
  //                 Possible later via pandoc → HTML → wkhtmltopdf pipeline.
  //   html-to-pdf — wkhtmltopdf is deprecated, finicky in sandboxes,
  //                 and we don't fetch remote assets — would silently
  //                 render broken pages. Better to surface in chat.
  //   csv-to-json — pandoc's CSV→JSON output is its AST, not the
  //                 row-as-object shape users want. No clean one-liner
  //                 without redirection (which the validator blocks).
  //
  // All three still have /convert/<slug> SEO pages — they fall through
  // to the NoRecipeFallback ("Sign up to access this in chat") which
  // is more honest than running a half-broken recipe.

  /* ── Data ──────────────────────────────────────────────────── */
  { id: "csv-to-xlsx", kind: "convert", category: "data", label: "CSV → Excel",
    description: "Converted the CSV to an Excel spreadsheet.",
    fromExts: ["csv"], toExt: "xlsx", tool: "libreoffice", build: sofficeTo("xlsx") },
  { id: "xlsx-to-csv", kind: "convert", category: "data", label: "Excel → CSV",
    description: "Converted the spreadsheet to a CSV.",
    fromExts: ["xlsx", "xls"], toExt: "csv", tool: "libreoffice", build: sofficeTo("csv") },
  // csv-to-json is deliberately NOT a Quick Convert recipe — pandoc's
  // output is its AST, not the row-as-object shape users want. The SEO
  // page exists and falls through to the signup CTA.

  /* ── Compression (ladder-driven; no `build`) ───────────────── */
  { id: "compress-pdf", kind: "compress", category: "pdf", label: "Compress PDF",
    description: "Compressed the PDF.",
    fromExts: ["pdf"], toExt: "pdf", tool: "ghostscript" },
  { id: "compress-video", kind: "compress", category: "video", label: "Compress video",
    description: "Compressed the video.",
    fromExts: ["mp4", "mov", "mkv", "webm", "avi"], toExt: "mp4", tool: "ffmpeg" },
  { id: "compress-image", kind: "compress", category: "image", label: "Compress image",
    description: "Compressed the image.",
    fromExts: ["jpg", "jpeg", "png", "webp", "tiff", "tif", "bmp"], toExt: "jpg",
    tool: "imagemagick" },
  { id: "compress-audio", kind: "compress", category: "audio", label: "Compress audio",
    description: "Compressed the audio.",
    fromExts: ["mp3", "wav", "flac", "ogg", "m4a", "aac"], toExt: "mp3", tool: "ffmpeg" },
];

/** Look up an entry by its stable id. Returns null for an unknown id. */
export function getQuickConvertEntry(id: string): QuickConvertEntry | null {
  return QUICK_CONVERT_TABLE.find((e) => e.id === id) ?? null;
}

/** Lowercase extension of a filename, no dot ("" if none). */
export function extOf(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}
