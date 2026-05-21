/**
 * Deterministic PRE-FLIGHT verifier for AI-generated commands.
 *
 * Three layers guard a command on its way to the sandbox:
 *
 *   commandValidator.ts  — "is this command SAFE to run?"  (security gate)
 *   commandCorrector.ts  — "is this value CORRECT for the tool?" (known
 *                           value-level mistakes: volume=50%, odd scale…)
 *   commandPreflight.ts  — "will this command's declared inputs/outputs
 *                           actually MATCH what the tool does?" (this file)
 *
 * The third gap is the one that produced the long tail of "Something went
 * wrong with that file" errors. The runJob OUTPUT CONTRACT fails a job when
 * a declared `output_files` name doesn't come back from the worker. But the
 * model frequently declares an output name the tool will NEVER write —
 * not because the conversion failed, but because the tool *derives* the
 * output name itself and the model guessed wrong:
 *
 *   • soffice --convert-to: ALWAYS writes `<input-basename-sans-last-ext>.<newext>`
 *     in the CWD. For `My.Report.v2.pdf → docx` it writes `My.Report.v2.docx`.
 *     A model that declared `out.docx` or `My.docx` triggers a false
 *     "no output" failure even though LibreOffice succeeded.
 *   • pdftoppm: appends `-<page>` to the prefix. `out` → `out-1.png`…
 *   • exiftool -overwrite_original / -all=: edits in place.
 *
 * Preflight is PURE and DETERMINISTIC — no LLM, no network, zero added cost.
 * It runs AFTER correctCommand() and BEFORE the Modal call. It returns:
 *   - ok: true  + the (possibly adjusted) output_files the runJob OUTPUT
 *     CONTRACT should verify against — so a tool-derived name is checked
 *     against reality, not the model's guess.
 *   - ok: false + a precise, machine-usable reason — when the command is
 *     structurally certain to fail (e.g. a magick-subcommand invocation),
 *     so the job fails fast with honest copy instead of burning a Modal run.
 *
 * Design rule (mirrors commandCorrector): every rule is conservative — it
 * only rewrites when the outcome is unambiguous. When unsure, it leaves the
 * declared names untouched and lets the OUTPUT CONTRACT do its job.
 */

export type PreflightResult =
  | {
      ok: true;
      /**
       * The output filenames the OUTPUT CONTRACT should verify against.
       * Equals the model's declared list unless a rule rewrote it to the
       * name(s) the tool will actually produce.
       */
      effectiveOutputs: string[];
      /** Human-readable notes, one per applied rewrite. Internal only. */
      notes: string[];
    }
  | {
      ok: false;
      /** Internal, technical reason — logged, never shown to the user. */
      reason: string;
      /**
       * Coarse, user-facing failure class. The UI maps this to honest copy.
       * `complex` = "rephrase / split it"; `aiError` = "I misread the ask".
       */
      failureKind: "complex" | "aiError";
    };

function firstBinary(command: string): string {
  const trimmed = command.trim();
  const firstSpace = trimmed.search(/\s/);
  const head = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  return head.replace(/^['"]/, "").replace(/['"]$/, "");
}

/**
 * Pull every single-quoted token out of a command. The recipe book quotes
 * EVERY filename in single quotes, so this is a reliable way to recover the
 * filenames a command references without a full shell parser.
 */
function quotedTokens(command: string): string[] {
  const out: string[] = [];
  const re = /'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(command)) !== null) out.push(m[1]);
  return out;
}

/** Replace only the final `.ext` of a filename. `a.b.pdf` → `a.b.docx`. */
function swapLastExtension(filename: string, newExt: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  return `${base}.${newExt}`;
}

/** Lower-cased final extension of a filename, or "" if none. */
function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/**
 * Run the deterministic pre-flight checks.
 *
 * @param command       the validated + corrected command
 * @param declaredOut   the model's declared output_files
 * @param inputFiles    the actual uploaded filenames (ground truth)
 */
export function preflightCommand(
  command: string,
  declaredOut: string[],
  inputFiles: string[]
): PreflightResult {
  const notes: string[] = [];
  const binary = firstBinary(command);

  /* ── Rule 1: the magick-subcommand trap ──────────────────────────────
   * `magick` IS the IM6 `convert` binary. `magick convert …` / `magick
   * identify …` expands to `convert convert …` and the word `convert` is
   * then read as an input filename — "unable to open image 'convert'".
   * The system prompt forbids it, the corrector doesn't catch it, and it
   * is the single most common past IM failure. Reject it deterministically
   * so it never reaches the sandbox. */
  if (binary === "magick" || binary === "convert") {
    if (/^\s*(magick|convert)\s+(convert|identify|mogrify|composite)\b/.test(command)) {
      return {
        ok: false,
        reason:
          "ImageMagick v6 has no subcommands; `magick <subcommand>` expands " +
          "to `convert convert …` and fails. Use the binary standalone.",
        failureKind: "aiError",
      };
    }
  }

  /* ── Rule 2: every quoted input the command reads must be a file we
   * actually have. A command that references a filename the user never
   * uploaded is certain to fail with "no such file". This catches the
   * model inventing placeholder names ('input.pdf', 'video.mp4') even
   * though the system prompt forbids it. We only check tokens that LOOK
   * like input filenames: they carry an extension AND are not in the
   * declared outputs. ── */
  const declaredOutSet = new Set(declaredOut);
  const inputSet = new Set(inputFiles);
  for (const tok of quotedTokens(command)) {
    if (!tok || declaredOutSet.has(tok)) continue;
    // Skip tokens that are plainly not filenames: flag values, geometry,
    // filtergraphs, format names. A filename for us has a dot-extension
    // and no characters that only appear in flag values.
    const looksLikeFilename =
      /\.[A-Za-z0-9]{1,8}$/.test(tok) &&
      !tok.includes("=") &&
      !tok.includes(":") &&
      !/\s/.test(tok);
    if (!looksLikeFilename) continue;
    if (inputSet.has(tok)) continue;
    // A quoted filename-shaped token that is neither an input nor a
    // declared output. It could be a tool-derived intermediate the model
    // named oddly — but if it carries a *known input extension* and we
    // simply don't have it, the command will fail. Be conservative: only
    // reject when it shares an extension with a real input but a different
    // stem (a clear "model retyped the filename wrong" case).
    const tokExt = extOf(tok);
    const collidesWithInputType = inputFiles.some(
      (f) => extOf(f) === tokExt && f !== tok
    );
    if (collidesWithInputType) {
      return {
        ok: false,
        reason:
          `command reads '${tok}', which was not uploaded (have: ` +
          `${inputFiles.join(", ")}). The model likely mistyped a filename.`,
        failureKind: "aiError",
      };
    }
  }

  /* ── Rule 3: soffice / libreoffice derive the output name themselves.
   * `soffice --headless --convert-to <ext> 'IN'` ALWAYS writes
   * `<IN-without-last-extension>.<ext>` into the CWD — it ignores any name
   * the model put in output_files, and it ignores -o. So whatever the
   * model declared, the REAL output is computable. Rewrite the effective
   * output list to the truth so the OUTPUT CONTRACT verifies what soffice
   * actually wrote — this is what fixed multi-dot filenames like
   * `Book_z-library.sk_1lib.sk_.pdf`. ── */
  if (binary === "soffice" || binary === "libreoffice") {
    const m = command.match(/--convert-to\s+([A-Za-z0-9]+)/);
    const inputs = quotedTokens(command).filter((t) => inputSet.has(t));
    if (m && inputs.length === 1) {
      const targetExt = m[1].toLowerCase();
      const derived = swapLastExtension(inputs[0], targetExt);
      if (declaredOut.length !== 1 || declaredOut[0] !== derived) {
        notes.push(
          `soffice derives its output name from the input basename; ` +
            `verifying against '${derived}' instead of the declared ` +
            `'${declaredOut.join(", ") || "(none)"}'.`
        );
      }
      return { ok: true, effectiveOutputs: [derived], notes };
    }
    // Multiple inputs or no parseable --convert-to: leave declared as-is.
  }

  /* ── Rule 4: exiftool in-place edits. `exiftool -all= -overwrite_original
   * 'in.jpg'` mutates the input and writes NO new file. The model
   * sometimes pairs `-overwrite_original` with a declared `out.jpg` that
   * is never created → false "no output". When -overwrite_original is
   * present, the effective output IS the input filename. ── */
  if (binary === "exiftool" && /-overwrite_original\b/.test(command)) {
    const inputs = quotedTokens(command).filter((t) => inputSet.has(t));
    if (inputs.length === 1) {
      if (declaredOut.length !== 1 || declaredOut[0] !== inputs[0]) {
        notes.push(
          `exiftool -overwrite_original edits in place; the result is the ` +
            `input file '${inputs[0]}', not a new file.`
        );
      }
      return { ok: true, effectiveOutputs: [inputs[0]], notes };
    }
  }

  /* ── Rule 5: pdftoppm / pdftocairo (non-singlefile) page-suffix sanity.
   * pdftoppm writes `<prefix>-<page>.<ext>`. The model is told to put the
   * `-N` suffix in output_files. If it declared a bare prefix with NO
   * `-N` and NO extension, that name will never exist. We can't know the
   * page count, so we don't rewrite — but if EVERY declared output lacks
   * an image extension, the model clearly forgot the suffix: reject with
   * a clear reason rather than burn a Modal run that's sure to "no-output".
   * pdftocairo -singlefile is exempt (it writes `<prefix>.<ext>`). ── */
  if (binary === "pdftoppm" || binary === "pdftocairo") {
    const isSingle = /-singlefile\b/.test(command);
    if (!isSingle && declaredOut.length > 0) {
      const noneHaveImageExt = declaredOut.every(
        (o) => !/\.(png|jpe?g|tif?f|ppm)$/i.test(o)
      );
      if (noneHaveImageExt) {
        return {
          ok: false,
          reason:
            `pdftoppm writes '<prefix>-<page>.<ext>' files; declared ` +
            `outputs ${declaredOut.join(", ")} have no image extension.`,
          failureKind: "aiError",
        };
      }
    }
  }

  // Default: nothing to adjust — verify against exactly what was declared.
  return { ok: true, effectiveOutputs: declaredOut, notes };
}
