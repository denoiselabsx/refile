"use client";

import { useMemo, useState } from "react";
import { Sparkles, Info } from "lucide-react";
import {
  PLATFORM_PRESETS,
  presetMatchesFiles,
  fileKindFromName,
} from "@/lib/platform-presets";
import { track } from "@/lib/analytics";

/**
 * Pill row of platform-aware quick actions ("WhatsApp", "Instagram", etc).
 *
 * Renders directly above the composer when at least one file is staged.
 * Tapping a pill:
 *   1. Replaces the composer prompt with the preset's natural-language
 *      ask (the parent owns the prompt state via onSelect).
 *   2. Shows an inline description of what the conversion will produce
 *      so the user can read it before sending.
 *   3. Fires `preset_used` analytics.
 *
 * Presets are filtered by file kind — no point showing "Instagram Reel"
 * when the only file is a PDF. If no files are staged, we hide the row
 * entirely (presets apply to a file).
 */
export function QuickActions({ stagedFilenames = [], onSelect }) {
  const [activeId, setActiveId] = useState(null);

  const fileKinds = useMemo(() => {
    const out = new Set();
    for (const name of stagedFilenames) out.add(fileKindFromName(name));
    return [...out];
  }, [stagedFilenames]);

  const matching = useMemo(
    () =>
      PLATFORM_PRESETS.filter((p) =>
        presetMatchesFiles(p, fileKinds.length ? fileKinds : null)
      ),
    [fileKinds]
  );

  if (stagedFilenames.length === 0 || matching.length === 0) return null;

  const active = matching.find((p) => p.id === activeId);

  const handlePick = (preset) => {
    setActiveId(preset.id);
    onSelect?.(preset.prompt);
    track("preset_used", {
      id: preset.id,
      surface: "quick_actions",
      fileKinds,
    });
  };

  return (
    <div className="mb-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="size-3" />
          Convert for
        </span>
        {matching.map((p) => {
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePick(p)}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground/80 hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" />
          <span>{active.description}</span>
        </div>
      ) : null}
    </div>
  );
}
