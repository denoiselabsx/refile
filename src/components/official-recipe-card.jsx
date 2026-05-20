"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Wand2 } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Card for an "official" ReFile recipe — a saved natural-language
 * PROMPT (not a saved shell command, the way DB presets are).
 *
 * Layout: the card is a flex column with the prompt run-button as the
 * top region (icon + label + description + arrow) and an optional
 * meta row at the bottom for conversion-page links. The button and
 * the link are SIBLINGS rather than nested, because <a> inside
 * <button> is invalid HTML.
 *
 * Primary action everywhere: click the body → drop the prompt into
 * the composer. Conversion entries (slug present) get a small "About
 * this conversion" link in the meta row that opens the SEO page.
 * Platform entries (no slug) just have the kind label.
 */
export function OfficialRecipeCard({ recipe }) {
  const router = useRouter();
  const { id, label, description, prompt, slug, kind } = recipe;

  const handleRun = () => {
    try {
      sessionStorage.setItem("chat_prompt_draft", prompt);
    } catch {}
    track("preset_used", { id, surface: "presets_page", kind });
    router.push("/dashboard");
  };

  return (
    <div className="surface flex h-full flex-col p-4 transition-colors hover:border-foreground/30">
      <button
        type="button"
        onClick={handleRun}
        className="group flex flex-1 flex-col text-left focus:outline-none"
        aria-label={`Run ${label}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-foreground/[0.06] text-foreground">
              <Wand2 className="size-3.5" />
            </span>
            <span className="text-[13.5px] font-medium text-foreground">
              {label}
            </span>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>

        <p className="mt-2 line-clamp-2 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2 text-[10.5px] uppercase tracking-wider text-muted-foreground/80">
        <span>Prompt-based · LLM picks the tool</span>
        {slug ? (
          <Link
            href={`/convert/${slug}`}
            className="normal-case tracking-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            About this conversion →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
