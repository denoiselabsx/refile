"use client";

import {
  FileText,
  FileType,
  Image as ImageIcon,
  Film,
  Music,
  Minimize2,
  BookOpen,
} from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Quick-convert grid — the iLovePDF-style "tap a tile, drop a file, done"
 * shortcut, shown on the empty dashboard above the composer.
 *
 * Why this exists
 * ───────────────
 * User feedback: the upload → @-mention → type-a-prompt flow has too much
 * friction for a quick one-off conversion. Power users can still type a
 * free-form request; this grid is the fast lane for the common 90%.
 *
 * How it works
 * ────────────
 * Each tile carries a natural-language `prompt` (NOT a command — same
 * prompt-mutation design as the platform presets: the LLM still plans the
 * actual tool, so the corrector / learned-lessons pipeline still applies,
 * and no tool name ever leaks into the UI). Tapping a tile:
 *   1. seeds the composer with that prompt (via onPick), and
 *   2. opens the Uploads panel so the next thing the user does is drop a
 *      file — then they just hit send. No typing required.
 *
 * The tiles deliberately stay format-level and generic; anything more
 * specific is what the free-form composer is for.
 */

const TILES = [
  {
    id: "compress-pdf",
    label: "Compress PDF",
    hint: "Shrink a large PDF",
    icon: Minimize2,
    prompt:
      "Compress this PDF as much as possible while keeping the text crisp.",
  },
  {
    id: "pdf-to-word",
    label: "PDF → Word",
    hint: "Editable .docx",
    icon: FileType,
    prompt: "Convert this PDF into an editable Word document.",
  },
  {
    id: "word-to-pdf",
    label: "Word → PDF",
    hint: "Share-ready PDF",
    icon: FileText,
    prompt: "Convert this Word document to a PDF.",
  },
  {
    id: "images-to-pdf",
    label: "Images → PDF",
    hint: "One PDF, one image per page",
    icon: FileText,
    prompt:
      "Combine these images into a single PDF, one image per page, in order.",
  },
  {
    id: "compress-image",
    label: "Compress image",
    hint: "Smaller JPG / PNG",
    icon: ImageIcon,
    prompt:
      "Compress this image as much as possible without obvious quality loss.",
  },
  {
    id: "heic-to-jpg",
    label: "HEIC → JPG",
    hint: "iPhone photos anywhere",
    icon: ImageIcon,
    prompt: "Convert this HEIC photo to a high-quality JPG.",
  },
  {
    id: "compress-video",
    label: "Compress video",
    hint: "Smaller, still smooth",
    icon: Film,
    prompt:
      "Compress this video as much as possible while keeping it smooth and watchable.",
  },
  {
    id: "video-to-mp3",
    label: "Video → MP3",
    hint: "Pull out the audio",
    icon: Music,
    prompt: "Extract the audio from this video as a 192 kbps MP3.",
  },
  {
    id: "to-epub",
    label: "Word → EPUB",
    hint: "Read it as an e-book",
    icon: BookOpen,
    prompt: "Convert this Word document into an EPUB e-book.",
  },
];

export function QuickConvert({ onPick }) {
  const handle = (tile) => {
    track("quick_convert_used", { id: tile.id });
    onPick?.(tile.prompt);
  };

  return (
    <div className="mt-7 sm:mt-9">
      <p className="mb-2.5 text-[12px] font-medium text-muted-foreground">
        Quick convert — pick one, then drop your file
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handle(tile)}
              className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-muted/50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-foreground">
                  {tile.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {tile.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
