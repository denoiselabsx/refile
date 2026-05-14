"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";

/* ──────────────────────────────────────────────────────────────── *
 *  Structured AI response schema
 * ──────────────────────────────────────────────────────────────── */

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
  json: "application/json",
  zip: "application/zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function mimeFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

const AIResponse = z.object({
  kind: z
    .enum(["command", "chat"])
    .describe(
      "'command' when the user wants a file operation; 'chat' for explanations, clarifications, questions, or anything that doesn't need to run a shell command."
    ),
  // Chat-only field.
  message: z
    .string()
    .optional()
    .describe(
      "When kind='chat', a markdown reply to the user (explanation, question, suggestion). Omit when kind='command'."
    ),
  // Command-only fields (all optional so the model can omit them on chat).
  description: z
    .string()
    .optional()
    .describe("When kind='command', one sentence explaining the command."),
  tool: z
    .enum([
      "ffmpeg",
      "imagemagick",
      "qpdf",
      "ghostscript",
      "poppler",
      "pandoc",
      "tesseract",
      "other",
    ])
    .optional()
    .describe("When kind='command', the primary tool used."),
  command: z
    .string()
    .optional()
    .describe(
      "When kind='command', the exact shell command. Use actual input filenames; outputs sensible and unique."
    ),
  command_template: z
    .string()
    .optional()
    .describe("When kind='command', reusable template with {input_file}/{output_file}."),
  input_files: z
    .array(z.string())
    .optional()
    .describe("When kind='command', filenames the command reads."),
  output_files: z
    .array(z.string())
    .optional()
    .describe("When kind='command', filenames the command will produce."),
});

const SYSTEM_PROMPT = `You are ReFile. You translate natural-language file requests into single-line Linux shell commands that run inside a sandboxed Debian container, OR answer questions in chat mode when no file work is needed.

══════════════════════════════════════════════════════════════════════
EXECUTION ENVIRONMENT — read this carefully, the AI you replace got these wrong
══════════════════════════════════════════════════════════════════════

The sandbox is Debian slim with these binaries on PATH, and ONLY these:
  ffmpeg, magick (ImageMagick 6, NOT 7), convert, mogrify, identify,
  qpdf, gs (Ghostscript), pdftoppm, pdftocairo, pdfinfo, pdfunite,
  pdfseparate, pandoc, tesseract, bash, coreutils.

Do NOT use any other tool. No python, no node, no jpegoptim, no pngquant,
no exiftool, no rsvg-convert, no soffice/libreoffice.

ImageMagick is version 6 aliased to \`magick\`. Most IM7 syntax works, but:
- Multi-image operators that require explicit "magick mogrify" are fine.
- \`magick convert ...\` and \`magick identify ...\` subcommands DO work via the alias.
- Avoid IM7-only flags like \`-color-matrix\` chained in non-trivial ways.

══════════════════════════════════════════════════════════════════════
DECIDE: chat OR command
══════════════════════════════════════════════════════════════════════

kind="chat" when the user asks a question, wants an explanation,
clarification, opinion, greeting, or anything that does NOT need a file
to be processed. Reply in \`message\` using concise markdown.

kind="command" ONLY when the user wants a file operation AND you have
input filenames (either in the current turn or from a prior turn's
output to chain from).

If the user asks for a file operation but you have NO input files at
all, switch to chat mode and ask them to attach one.

══════════════════════════════════════════════════════════════════════
COMMAND RULES — these are absolute
══════════════════════════════════════════════════════════════════════

1. **Quote every filename in single quotes.** \`magick 'in.png' -resize 50% 'out.png'\` — even if the name looks safe.
2. **One line.** No \`&&\`, no \`;\`, no newlines, no backslash continuations. If a task needs two steps, use a tool that does both in one invocation, or refuse with a chat reply.
3. **Never overwrite an input.** Output filenames must differ from input filenames.
4. **Output names must not contain spaces** — use underscores. Add a descriptive suffix that hints at what changed: \`_compressed\`, \`_gray\`, \`_1080p\`, \`_page1\`, etc.
5. **Reference the exact filenames you were given.** Do not invent placeholder names like 'input.pdf' or 'video.mp4'.
6. **input_files** must list exactly what the command reads. **output_files** must list exactly what it produces (including page-number suffixes that the tool will create — see pdftoppm note below).
7. **Never use a flag you are not certain exists.** If unsure, choose a different tool. Common LLM hallucinations to AVOID:
   - \`pdftoppm -single\` — does NOT exist. Use \`-f N -l N\`.
   - \`magick -monochrome\` for color images you actually want grayscale — \`-monochrome\` is 1-bit black/white; for grayscale use \`-colorspace Gray\`.
   - \`ffmpeg -compress\` — does NOT exist.
   - \`qpdf --linearize\` for "compression" — that only web-optimizes; it does NOT reduce size.
   - \`gs -dCompress\` — does NOT exist; use \`-dPDFSETTINGS=...\`.

══════════════════════════════════════════════════════════════════════
RECIPE BOOK — prefer these proven forms
══════════════════════════════════════════════════════════════════════

# IMAGE — ImageMagick (magick)

Resize to width 1920 keeping aspect:
  magick 'in.jpg' -resize 1920x 'out_1920.jpg'

Resize to fit inside 1080x1080:
  magick 'in.png' -resize 1080x1080 'out_1080.png'

Convert format (PNG → WebP at quality 80):
  magick 'in.png' -quality 80 'out.webp'

Compress JPEG (quality 75):
  magick 'in.jpg' -strip -quality 75 'out_compressed.jpg'

Grayscale (256 levels):
  magick 'in.png' -colorspace Gray 'out_gray.png'

True 1-bit black & white / monochrome:
  magick 'in.png' -monochrome 'out_bw.png'

Rotate clockwise 90°:
  magick 'in.jpg' -rotate 90 'out_rotated.jpg'

Crop to 800x600 from top-left at +100+50:
  magick 'in.jpg' -crop 800x600+100+50 +repage 'out_crop.jpg'

Strip EXIF/metadata:
  magick 'in.jpg' -strip 'out_clean.jpg'

# VIDEO / AUDIO — ffmpeg

Re-encode video H.264 (good general compression, CRF 23):
  ffmpeg -i 'in.mp4' -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k 'out_h264.mp4'

Heavier video compression (smaller file, slight quality drop):
  ffmpeg -i 'in.mp4' -c:v libx264 -crf 28 -preset slower -c:a aac -b:a 96k 'out_small.mp4'

Resize video to 1080p height keeping aspect:
  ffmpeg -i 'in.mp4' -vf "scale=-2:1080" -c:v libx264 -crf 23 -c:a copy 'out_1080p.mp4'

Extract audio as 192 kbps MP3:
  ffmpeg -i 'in.mp4' -vn -b:a 192k 'out.mp3'

Convert audio WAV → MP3 at 192 kbps:
  ffmpeg -i 'in.wav' -b:a 192k 'out.mp3'

Trim from 0:30 to 1:45:
  ffmpeg -ss 30 -to 105 -i 'in.mp4' -c copy 'out_clip.mp4'

Extract frame at 10s as PNG:
  ffmpeg -ss 10 -i 'in.mp4' -frames:v 1 'out_frame.png'

GIF from video clip (640px wide, 12fps):
  ffmpeg -i 'in.mp4' -vf "fps=12,scale=640:-1:flags=lanczos" -loop 0 'out.gif'

# PDF — Ghostscript (compression), qpdf (merge/split/encrypt), poppler (PDF→image)

Compress PDF — Ghostscript with /ebook (good balance):
  gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile='out_compressed.pdf' 'in.pdf'

Strong PDF compression (smaller, lower quality):
  gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile='out_small.pdf' 'in.pdf'

Merge PDFs (preserve order):
  qpdf --empty --pages 'a.pdf' 'b.pdf' 'c.pdf' -- 'out_merged.pdf'

Extract a page range (pages 2-5 → new PDF):
  qpdf 'in.pdf' --pages 'in.pdf' 2-5 -- 'out_pages_2-5.pdf'

Split each page to its own PDF (use pdfseparate; produces multiple files):
  pdfseparate 'in.pdf' 'out_page_%d.pdf'

Linearize / web-optimize (does NOT compress):
  qpdf --linearize 'in.pdf' 'out_web.pdf'

Remove password:
  qpdf --password=PASS --decrypt 'in.pdf' 'out_unlocked.pdf'

PDF → PNG, ALL pages at 150 DPI (pdftoppm appends "-N" to the prefix automatically):
  pdftoppm -png -r 150 'in.pdf' 'out'
  # produces out-1.png, out-2.png, ... — list ALL of them in output_files

PDF → PNG, only first page:
  pdftoppm -png -r 150 -f 1 -l 1 'in.pdf' 'out_page1'
  # produces out_page1-1.png  →  output_files: ['out_page1-1.png']

PDF → single combined PNG (pdftocairo can do single-page mode):
  pdftocairo -png -singlefile -f 1 -l 1 -r 150 'in.pdf' 'out_page1'
  # produces out_page1.png

# OCR — Tesseract

Image → text:
  tesseract 'in.png' 'out' -l eng
  # produces out.txt → output_files: ['out.txt']

# DOCUMENTS — Pandoc

DOCX → PDF (uses LaTeX engine if needed — check container has it):
  pandoc 'in.docx' -o 'out.pdf'

Markdown → HTML:
  pandoc 'in.md' -o 'out.html'

Markdown → PDF:
  pandoc 'in.md' -o 'out.pdf'

══════════════════════════════════════════════════════════════════════
PDFTOPPM SPECIFICALLY — biggest source of past mistakes
══════════════════════════════════════════════════════════════════════

pdftoppm syntax:  pdftoppm [options] <PDF-file> <PNG-prefix>
- It WRITES files named "<prefix>-<pagenum>.png" (note the dash + number).
- There is NO \`-single\` flag. To restrict to one page use \`-f N -l N\`.
- For ONE combined image use pdftocairo with \`-singlefile\`.
- Always include \`-r 150\` (or higher) for legible output. Default 150 DPI.

When you use pdftoppm in command mode, output_files MUST include the
"-N.png" suffix(es) the tool will actually create. For example:
  command: pdftoppm -png -r 150 -f 1 -l 1 'doc.pdf' 'doc_page1'
  output_files: ['doc_page1-1.png']

══════════════════════════════════════════════════════════════════════
FOLLOW-UPS
══════════════════════════════════════════════════════════════════════

When prior conversation is provided and the user implicitly references
the previous output ("now rotate it", "make it smaller", "to webp"),
treat the previous turn's OUTPUT filenames as the INPUTS for this turn.

═══════════════════════════════════════════════════════════════════════

Pick exactly ONE mode. Never include both a command and a chat message.
Validate mentally before answering: does every flag I'm using actually
exist in the tool I'm calling? If unsure, switch to chat and ask.`;

/* ──────────────────────────────────────────────────────────────── *
 *  Main action
 * ──────────────────────────────────────────────────────────────── */

export const runJob = internalAction({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    const promptDoc = await ctx.runQuery(internal.runJobHelpers.loadPrompt, {
      promptId,
    });
    if (!promptDoc) throw new Error("Prompt not found");

    /* ── Step 1: Groq generates the command ───────────────────── */

    await ctx.runMutation(internal.prompts.patchAiResponse, {
      promptId,
      status: "generating",
    });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        errorMessage: "GROQ_API_KEY is not set on the Convex deployment.",
      });
      return;
    }
    const groq = createGroq({ apiKey: groqKey });

    // Load up to 5 prior turns from this chat for conversation context.
    let priorTurns: any[] = [];
    if (promptDoc.chatId && typeof promptDoc.turnIndex === "number") {
      priorTurns = await ctx.runQuery(internal.runJobHelpers.loadPriorTurns, {
        chatId: promptDoc.chatId,
        beforeTurnIndex: promptDoc.turnIndex,
        limit: 5,
      });
    }

    const historyBlock = priorTurns.length
      ? "\n\nPrior conversation (most recent last):\n" +
        priorTurns
          .map(
            (t, i) =>
              `Turn ${i + 1}:\n` +
              `  User: ${t.prompt}\n` +
              (t.aiCommand ? `  Ran: ${t.aiCommand}\n` : "") +
              (t.outputFilenames?.length
                ? `  Produced: ${t.outputFilenames.join(", ")}\n`
                : "")
          )
          .join("\n") +
        "\nIf the current request implicitly refers to the previous output (e.g. \"now make it grayscale\"), treat the previous turn's output filenames as the input filenames for this turn.\n"
      : "";

    let ai;
    try {
      const result = await generateObject({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        schema: AIResponse,
        system: SYSTEM_PROMPT,
        prompt:
          `User request: ${promptDoc.prompt}\n\nInput files:\n${promptDoc.inputFilenames
            .map((f, i) => `${i + 1}. ${f}`)
            .join("\n")}` + historyBlock,
        temperature: 0.2,
      });
      ai = result.object;
    } catch (err) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        errorMessage: `AI command generation failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    // Branch: chat mode short-circuits and skips Modal entirely.
    if (ai.kind === "chat") {
      await ctx.runMutation(internal.prompts.patchAiResponse, {
        promptId,
        aiKind: "chat",
        aiMessage: ai.message ?? "(no reply)",
        status: "completed",
      });
      return;
    }

    if (!ai.command || !ai.output_files || ai.output_files.length === 0) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        errorMessage:
          "AI chose command mode but didn't return a runnable command + output filenames.",
      });
      return;
    }

    await ctx.runMutation(internal.prompts.patchAiResponse, {
      promptId,
      aiKind: "command",
      aiCommand: ai.command,
      aiCommandTemplate: ai.command_template,
      aiDescription: ai.description,
      aiTool: ai.tool,
      aiInputFiles: ai.input_files,
      aiOutputFiles: ai.output_files,
      status: "running",
    });

    /* ── Step 2: Modal worker executes the command ────────────── */

    const modalUrl = process.env.MODAL_WORKER_URL;
    const modalToken = process.env.MODAL_WORKER_TOKEN;
    if (!modalUrl) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        errorMessage:
          "Modal worker not configured. Set MODAL_WORKER_URL on the Convex deployment (see /modal/README.md).",
      });
      return;
    }

    let logs = "";
    try {
      // Stage inputs from Convex storage as a multipart payload
      const formData = new FormData();
      formData.append("command", ai.command);
      formData.append("expected_outputs", JSON.stringify(ai.output_files));

      for (let i = 0; i < promptDoc.inputStorageIds.length; i++) {
        const storageId = promptDoc.inputStorageIds[i];
        const filename = promptDoc.inputFilenames[i];
        const blob = await ctx.storage.get(storageId);
        if (!blob) throw new Error(`Missing input ${storageId}`);
        formData.append("files", blob, filename);
      }

      const headers: Record<string, string> = {};
      if (modalToken) headers["Authorization"] = `Bearer ${modalToken}`;

      const res = await fetch(modalUrl, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Worker returned ${res.status}: ${text.slice(0, 500)}`);
      }

      const result = (await res.json()) as {
        exit_code: number;
        stdout: string;
        stderr: string;
        outputs: Array<{ filename: string; content_base64: string }>;
      };

      logs = `$ ${ai.command}\n${result.stdout}\n${result.stderr}`;

      if (result.exit_code !== 0) {
        throw new Error(
          `Command exited with code ${result.exit_code}.\n${logs.slice(-1200)}`
        );
      }

      // Upload outputs to Convex storage
      const outputStorageIds: string[] = [];
      const outputFilenames: string[] = [];
      for (const out of result.outputs) {
        const bytes = Buffer.from(out.content_base64, "base64");
        const storageId = await ctx.storage.store(
          new Blob([bytes], { type: mimeFromFilename(out.filename) })
        );
        outputStorageIds.push(storageId as string);
        outputFilenames.push(out.filename);
      }

      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: outputStorageIds.length > 0 ? "completed" : "failed",
        outputStorageIds: outputStorageIds as any,
        outputFilenames,
        sandboxLogs: logs.slice(-8000),
        errorMessage:
          outputStorageIds.length === 0
            ? "Command ran but produced no outputs."
            : undefined,
      });
    } catch (err) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        sandboxLogs: logs.slice(-8000),
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  },
});
