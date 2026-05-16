/**
 * Semantic corrector for AI-generated shell commands.
 *
 * `commandValidator.ts` answers "is this command *safe* to run?" — a security
 * gate. This file answers a different question: "is this command *correct* for
 * the tool it targets?" The LLM frequently emits commands that are perfectly
 * safe and well-formed bash but semantically wrong for the underlying binary —
 * the classic being `ffmpeg ... -af 'volume=50%'`, where ffmpeg's volume
 * filter wants a linear multiplier (`0.5`) or a dB value (`-6dB`), never a
 * percentage. The command runs, ffmpeg errors out, the user sees a failure.
 *
 * These mistakes are deterministic and enumerable, so we fix them
 * deterministically here rather than hoping the model gets it right or
 * paying for a second LLM round-trip. Each rule is:
 *   - conservative: only rewrites when the pattern is unambiguous
 *   - documented: carries a human-readable note explaining the fix
 *   - idempotent: running a corrected command back through is a no-op
 *
 * Corrections are applied AFTER validateCommand() passes (so we never have to
 * reason about injection here — the string is already known pipe/again-free)
 * and BEFORE the command is sent to the Modal worker.
 *
 * Keep new rules narrow. A rule that rewrites a command the user actually
 * meant is worse than a rule that misses one — when in doubt, don't rewrite.
 */

export type CorrectionResult = {
  /** The (possibly rewritten) command. Equals the input if nothing matched. */
  command: string;
  /** Human-readable notes, one per applied rule. Empty if nothing changed. */
  notes: string[];
};

type Rule = {
  /** Tool(s) this rule applies to, matched against the first binary. */
  appliesTo: (binary: string) => boolean;
  /**
   * Returns the rewritten command + a note, or null if the rule didn't match.
   * Receives the current (possibly already-corrected) command so rules
   * compose. Must be idempotent.
   */
  apply: (command: string) => { command: string; note: string } | null;
};

function firstBinary(command: string): string {
  const trimmed = command.trim();
  const firstSpace = trimmed.search(/\s/);
  const head = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  return head.replace(/^['"]/, "").replace(/['"]$/, "");
}

const isFfmpeg = (b: string) => b === "ffmpeg";
const isImageMagick = (b: string) =>
  b === "magick" || b === "convert" || b === "mogrify";

/**
 * Rewrites a percentage value to ffmpeg's expected linear-gain multiplier.
 * "50%" → "0.5", "150%" → "1.5", "100%" → "1". Returns null if not a clean
 * "<number>%" so we never mangle a value we don't fully understand.
 */
function percentToMultiplier(pct: string): string | null {
  const m = pct.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  // Trim trailing zeros: 0.50 → 0.5, 1.00 → 1
  return String(parseFloat((n / 100).toFixed(6)));
}

const RULES: Rule[] = [
  /* ── ffmpeg: volume filter percentage → multiplier ─────────────────────
   * `-af 'volume=50%'` / `-filter:a volume=50%` / inside a -af/-vf chain.
   * ffmpeg's volume filter takes a linear factor or a dB value, never a
   * percentage. This is the single most common reported failure.
   */
  {
    appliesTo: isFfmpeg,
    apply(command) {
      // Match `volume=` followed by a number-with-percent, wherever it
      // appears (bare, single-quoted, or mid filtergraph like
      // "volume=50%,aformat=...").
      const re = /\bvolume\s*=\s*(\d+(?:\.\d+)?)\s*%/gi;
      if (!re.test(command)) return null;
      let changed = false;
      const out = command.replace(
        /\bvolume\s*=\s*(\d+(?:\.\d+)?)\s*%/gi,
        (whole, num) => {
          const mult = percentToMultiplier(`${num}%`);
          if (mult === null) return whole;
          changed = true;
          return `volume=${mult}`;
        }
      );
      if (!changed) return null;
      return {
        command: out,
        note:
          "ffmpeg's volume filter expects a linear multiplier (e.g. 0.5), " +
          "not a percentage — rewrote `volume=N%` to the equivalent factor.",
      };
    },
  },

  /* ── ffmpeg: deprecated `-vol N` flag percentage ───────────────────────
   * The legacy `-vol` audio-volume flag is a 256-based integer (256 = unity).
   * Models sometimes write `-vol 50%`. Convert a percentage to the 256 scale.
   */
  {
    appliesTo: isFfmpeg,
    apply(command) {
      const re = /(-vol\s+)(\d+(?:\.\d+)?)\s*%/i;
      const m = command.match(re);
      if (!m) return null;
      const pct = parseFloat(m[2]);
      if (!Number.isFinite(pct)) return null;
      const scaled = Math.round((pct / 100) * 256);
      return {
        command: command.replace(re, `$1${scaled}`),
        note:
          "ffmpeg's `-vol` flag uses a 256-based scale (256 = original " +
          `volume), not a percentage — rewrote to \`-vol ${scaled}\`.`,
      };
    },
  },

  /* ── ffmpeg: bare scale dimensions that break libx264 ──────────────────
   * `scale=1920:955` with libx264/yuv420p fails ("height not divisible
   * by 2"). If the model emitted a scale filter with explicit ODD pixel
   * dimensions AND the command encodes with libx264, snap each odd
   * dimension down to even. We only touch literal integer:integer forms —
   * never expressions like trunc(...)/-2/iw, which already handle parity.
   */
  {
    appliesTo: isFfmpeg,
    apply(command) {
      if (!/\blibx264\b/.test(command)) return null;
      const re = /\bscale=(\d+):(\d+)\b/g;
      let changed = false;
      const out = command.replace(re, (whole, w, h) => {
        const wn = parseInt(w, 10);
        const hn = parseInt(h, 10);
        const ew = wn % 2 === 0 ? wn : wn - 1;
        const eh = hn % 2 === 0 ? hn : hn - 1;
        if (ew === wn && eh === hn) return whole;
        changed = true;
        return `scale=${ew}:${eh}`;
      });
      if (!changed) return null;
      return {
        command: out,
        note:
          "libx264 with yuv420p requires even width and height — rounded " +
          "the odd scale dimension(s) down to the nearest even number.",
      };
    },
  },

  /* ── ffmpeg: `-q:a N%` quality percentage ──────────────────────────────
   * `-q:a` (libmp3lame VBR) is a 0–9 quality scale, not a percentage.
   * A model writing `-q:a 80%` means "fairly high quality". Map the
   * percentage onto the 0–9 scale (higher % = lower q number = better).
   */
  {
    appliesTo: isFfmpeg,
    apply(command) {
      const re = /(-q:a\s+)(\d+(?:\.\d+)?)\s*%/i;
      const m = command.match(re);
      if (!m) return null;
      const pct = Math.max(0, Math.min(100, parseFloat(m[2])));
      if (!Number.isFinite(pct)) return null;
      // 100% → q0 (best), 0% → q9 (worst). Round to nearest integer.
      const q = Math.round((1 - pct / 100) * 9);
      return {
        command: command.replace(re, `$1${q}`),
        note:
          "ffmpeg's `-q:a` is a 0–9 VBR quality scale, not a percentage — " +
          `mapped ${m[2]}% to \`-q:a ${q}\` (0 = best).`,
      };
    },
  },

  /* ── ImageMagick: `-quality` is already 0–100, strip a stray % ─────────
   * `-quality 80%` is harmless in some IM builds but errors in others and
   * is never required. Normalize `-quality N%` → `-quality N`.
   */
  {
    appliesTo: isImageMagick,
    apply(command) {
      const re = /(-quality\s+)(\d+)\s*%/i;
      if (!re.test(command)) return null;
      return {
        command: command.replace(re, "$1$2"),
        note:
          "ImageMagick's -quality takes a bare 0–100 value — removed the " +
          "trailing percent sign.",
      };
    },
  },

  /* ── ffmpeg: `-ss`/`-to` given as MM:SS but written like "1m30s" ───────
   * Models sometimes emit human durations ("1m30s", "90sec"). ffmpeg
   * accepts seconds or HH:MM:SS, not "1m30s". Convert the common
   * `<num>m<num>s`, `<num>m`, `<num>s`, `<num>sec` forms to seconds.
   */
  {
    appliesTo: isFfmpeg,
    apply(command) {
      const re = /(-(?:ss|to|t)\s+)(?:'?)(\d+m\d+s|\d+m|\d+sec|\d+s)(?:'?)/gi;
      let changed = false;
      const out = command.replace(re, (whole, flag, dur) => {
        let secs: number | null = null;
        let mm: RegExpMatchArray | null;
        if ((mm = dur.match(/^(\d+)m(\d+)s$/i))) {
          secs = parseInt(mm[1], 10) * 60 + parseInt(mm[2], 10);
        } else if ((mm = dur.match(/^(\d+)m$/i))) {
          secs = parseInt(mm[1], 10) * 60;
        } else if ((mm = dur.match(/^(\d+)(?:sec|s)$/i))) {
          secs = parseInt(mm[1], 10);
        }
        if (secs === null) return whole;
        changed = true;
        return `${flag}${secs}`;
      });
      if (!changed) return null;
      return {
        command: out,
        note:
          "ffmpeg time options take seconds or HH:MM:SS, not human " +
          'durations like "1m30s" — converted to seconds.',
      };
    },
  },
];

/**
 * Apply every matching correction rule, in order, until a fixed point.
 * Rules are idempotent and compose, so a single pass is normally enough;
 * we cap at a few passes purely as a safety net against a rule that
 * accidentally isn't idempotent (it would otherwise loop forever).
 *
 * Input is assumed to have already passed `validateCommand`.
 */
export function correctCommand(command: string): CorrectionResult {
  const binary = firstBinary(command);
  const applicable = RULES.filter((r) => r.appliesTo(binary));
  if (applicable.length === 0) return { command, notes: [] };

  const notes: string[] = [];
  let current = command;
  const MAX_PASSES = 4;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let anyChange = false;
    for (const rule of applicable) {
      const res = rule.apply(current);
      if (res && res.command !== current) {
        current = res.command;
        // De-dupe notes if the same rule fires across passes.
        if (!notes.includes(res.note)) notes.push(res.note);
        anyChange = true;
      }
    }
    if (!anyChange) break;
  }

  return { command: current, notes };
}
