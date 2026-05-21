/**
 * Deterministic sandbox-failure DIAGNOSIS.
 *
 * When a command exits non-zero in the Modal worker, runJob historically
 * marked EVERY such failure `execError` and the UI showed one generic card:
 * "Something went wrong with that file — it may be corrupt, an unexpected
 * format, or password-protected." That copy is a guess. It is wrong for most
 * failures, gives the user no real next step, and made distinct problems
 * (a password-protected PDF, a scanned PDF that can't become editable text,
 * an unsupported codec, an out-of-memory kill) all look identical.
 *
 * This module reads the real stderr/stdout/exit code and classifies the
 * failure into a concrete CAUSE. Each cause carries:
 *   - `failureKind`: the coarse class the schema + UI already understand.
 *   - `userTitle` / `userBody`: honest, specific, NON-TECHNICAL copy that
 *     names what actually went wrong and — crucially — what WILL work
 *     instead. No tool names, no flags, no log text ever reaches the user.
 *
 * Pure and deterministic — no LLM, no network. Runs inline in runJob after
 * a non-zero exit. When nothing matches, it falls back to a generic-but-
 * honest message (not a confident wrong guess).
 *
 * Keep the matchers ANCHORED to phrases real tools emit. A matcher that
 * fires on the wrong failure is worse than one that misses — when unsure,
 * let it fall through to the generic case.
 */

export type Diagnosis = {
  /** Coarse class — must be one of the schema's failureKind literals. */
  failureKind: "noOutput" | "execError" | "config" | "complex";
  /** Short, specific, non-technical headline for the failure card. */
  userTitle: string;
  /** One short paragraph: what went wrong + the concrete alternative. */
  userBody: string;
  /** Internal tag for logs/metrics so failure mix is observable. */
  cause: string;
};

type Matcher = {
  cause: string;
  /** True if this matcher applies to the given (tool, logs) pair. */
  test: (tool: string, logs: string) => boolean;
  failureKind: Diagnosis["failureKind"];
  userTitle: string;
  userBody: string;
};

/* The matchers are ordered: the FIRST that tests true wins. Put the most
 * specific / highest-confidence causes first. `logs` is lower-cased before
 * matching, so all patterns here are lower-case. */
const MATCHERS: Matcher[] = [
  /* ── Password-protected / encrypted PDF ─────────────────────────────── */
  {
    cause: "pdf_encrypted",
    test: (_t, l) =>
      /incorrect password|password required|encrypted|owner password|user password|pdf is password|requires a password|bad password/.test(
        l
      ),
    failureKind: "execError",
    userTitle: "This file is password-protected",
    userBody:
      "This PDF is locked with a password, so it can't be opened or " +
      "converted as-is. Unlock it first — if you know the password, tell " +
      "me “remove the password from this PDF” and upload it, then " +
      "run your conversion on the unlocked file.",
  },

  /* ── Scanned / image-only PDF asked to become editable text ─────────── */
  {
    cause: "pdf_scanned_to_editable",
    test: (tool, l) =>
      (tool === "soffice" || tool === "libreoffice" || tool === "pandoc") &&
      /source file could not be loaded|no text|empty document|filter.*not found|writer_pdf_import/.test(
        l
      ),
    failureKind: "execError",
    userTitle: "This PDF can't be turned into an editable document",
    userBody:
      "This PDF looks like scanned pages or images rather than real, " +
      "selectable text, so it can't be converted into an editable Word " +
      "document. What I CAN do is pull the text out with OCR — upload it " +
      "again and ask to “extract the text from this PDF”.",
  },

  /* ── Unsupported / mismatched codec or format ───────────────────────── */
  {
    cause: "unsupported_codec",
    test: (_t, l) =>
      /unknown encoder|encoder not found|decoder not found|codec not currently supported|unsupported codec|invalid data found when processing input|no decoder for|could not find codec/.test(
        l
      ),
    failureKind: "execError",
    userTitle: "That format combination isn't supported",
    userBody:
      "I couldn't process this file in the way you asked — the source " +
      "format or the target you requested isn't one I can handle directly. " +
      "Try converting to a more common format (for video MP4, for audio " +
      "MP3, for images PNG or JPG) and let me know.",
  },

  /* ── Corrupt / unreadable / truncated input ─────────────────────────── */
  {
    cause: "corrupt_input",
    test: (_t, l) =>
      /moov atom not found|invalid data found|premature end|truncated|corrupt|not a (?:valid|recognized)|broken|malformed|header (?:error|missing)|unexpected end of file|damaged/.test(
        l
      ),
    failureKind: "execError",
    userTitle: "This file looks damaged",
    userBody:
      "I couldn't read this file — it appears to be incomplete or " +
      "corrupted (a partial download or a bad export will do this). Try " +
      "re-saving or re-downloading the original, then upload it again.",
  },

  /* ── Wrong file type for the requested operation ────────────────────── */
  {
    cause: "wrong_input_type",
    test: (_t, l) =>
      /no such file|cannot open|unable to open|not a (?:pdf|png|jpeg|jpg|zip|gif)|improper image header|decode error|cannot identify/.test(
        l
      ),
    failureKind: "execError",
    userTitle: "That file isn't the type this needs",
    userBody:
      "The file doesn't match what this operation expects — for example " +
      "asking to compress a PDF but uploading an image. Check that you " +
      "uploaded the right file, then describe again what you'd like done " +
      "with it.",
  },

  /* ── Ran out of memory / killed ─────────────────────────────────────── */
  {
    cause: "resource_exhausted",
    test: (_t, l) =>
      /killed|out of memory|cannot allocate|std::bad_alloc|memory exhausted|signal 9|oom/.test(
        l
      ),
    failureKind: "complex",
    userTitle: "That file was too large to process",
    userBody:
      "This file needed more memory than a single run allows — usually a " +
      "very large or very high-resolution file. Try a smaller or " +
      "lower-resolution version, or ask for the work in smaller pieces " +
      "(for example one page or one section at a time).",
  },

  /* ── Timed out ──────────────────────────────────────────────────────── */
  {
    cause: "timeout",
    test: (_t, l) =>
      /timed out|timeout|time limit|exceeded the (?:time|deadline)/.test(l),
    failureKind: "complex",
    userTitle: "That took too long to finish",
    userBody:
      "This conversion ran past the time limit for a single job — " +
      "typically a large video or a high-page-count document. Try a " +
      "shorter clip, a smaller file, or splitting the work into parts.",
  },

  /* ── Empty output despite exit 0 handled elsewhere; this catches a tool
   * that explicitly says it wrote nothing. ───────────────────────────── */
  {
    cause: "no_output_produced",
    test: (_t, l) =>
      /nothing to do|no pages|empty input|0 pages|produced no output/.test(l),
    failureKind: "noOutput",
    userTitle: "That didn't produce a result",
    userBody:
      "The file was readable, but the operation had nothing to work on — " +
      "for example an empty document or a page range that doesn't exist. " +
      "Double-check the file and what you asked for, then try again.",
  },
];

/** Generic fallback when no matcher fires — honest, not a confident guess. */
const GENERIC: Diagnosis = {
  cause: "unknown",
  failureKind: "execError",
  userTitle: "That conversion didn't go through",
  userBody:
    "I couldn't complete this one on this particular file. Try describing " +
    "the result you want a little differently, or convert to a more common " +
    "format — and if it keeps happening, reach out and we'll look into it.",
};

/**
 * Classify a sandbox failure from the worker's logs.
 *
 * @param tool  the AI-declared tool (e.g. "ffmpeg", "soffice"); may be ""
 * @param logs  the combined stdout+stderr from the worker (any length)
 * @param exitCode  the process exit code, when known
 */
export function diagnoseError(
  tool: string,
  logs: string,
  exitCode?: number
): Diagnosis {
  const haystack = (logs || "").toLowerCase();
  const t = (tool || "").toLowerCase();

  for (const m of MATCHERS) {
    if (m.test(t, haystack)) {
      return {
        cause: m.cause,
        failureKind: m.failureKind,
        userTitle: m.userTitle,
        userBody: m.userBody,
      };
    }
  }

  // Exit code 137 = SIGKILL (almost always OOM) even if logs are silent.
  if (exitCode === 137) {
    const oom = MATCHERS.find((m) => m.cause === "resource_exhausted")!;
    return {
      cause: oom.cause,
      failureKind: oom.failureKind,
      userTitle: oom.userTitle,
      userBody: oom.userBody,
    };
  }

  return { ...GENERIC };
}
