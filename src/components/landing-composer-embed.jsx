"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { track } from "@/lib/analytics";

/**
 * Conversion-page composer entry-point.
 *
 * Shows a drop zone + prompt preview. When the visitor picks a file we
 * can't actually upload it from a landing page — Convex storage needs an
 * authenticated session — so we use the existing chat_prompt_draft
 * sessionStorage seam (the same one the preset detail page uses) to
 * carry the intent into the dashboard.
 *
 * Flow:
 *   1. Visitor picks a file (or types nothing — they can also just click
 *      "Open ReFile with this prompt").
 *   2. We stash the prompt + the filename hint + a flag to open the
 *      Uploads panel automatically.
 *   3. We push to /dashboard (or /login/google if signed out — the auth
 *      flow returns them to /dashboard where the seam fires).
 *
 * Fires `landing_view` is owned by the parent (LandingViewBeacon); this
 * component fires the conversion-intent event when the user actually
 * commits to converting.
 */

const STORAGE_KEY = "chat_prompt_draft";

export function LandingComposerEmbed({ slug, from, to, examplePrompt }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [pickedName, setPickedName] = useState(null);
  const [busy, setBusy] = useState(false);

  const startConversion = useCallback(
    (filename) => {
      setBusy(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, examplePrompt);
      } catch {
        /* sessionStorage can be unavailable in private mode — degrade
           gracefully by just sending the user to /dashboard. The prompt
           field will be empty; not great, but the page still works. */
      }
      track("conversion_started", {
        source: "landing",
        slug,
        from,
        to,
        hadFile: Boolean(filename),
      });
      // wantFile=1 tells the dashboard to auto-open the Uploads panel so
      // the visitor can drop the file the moment they land.
      const params = new URLSearchParams({ from: "landing", wantFile: "1" });
      const dest = `/dashboard?${params.toString()}`;
      if (isAuthenticated) {
        router.push(dest);
      } else {
        // Send them through login; Convex Auth returns them to the URL
        // we put in `next`. The dashboard then reads the prompt draft.
        const next = encodeURIComponent(dest);
        router.push(`/login/google?next=${next}`);
      }
    },
    [examplePrompt, from, isAuthenticated, router, slug, to]
  );

  const onPick = (file) => {
    if (!file) return;
    setPickedName(file.name);
    startConversion(file.name);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm sm:p-5">
      {/* Prompt preview — the literal natural-language ask we'll
          pre-fill in the dashboard. This is the thing that's different
          from every other "convert X to Y" tool. */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-background px-3.5 py-2.5">
        <Wand2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[13.5px] leading-relaxed text-foreground">
          {examplePrompt}
        </p>
      </div>

      {/* Drop zone */}
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        htmlFor={`landing-file-${slug}`}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
          dragging
            ? "border-foreground/40 bg-muted/40"
            : "border-border hover:border-foreground/30 hover:bg-muted/30"
        }`}
      >
        <UploadCloud className="size-5 text-muted-foreground" />
        <p className="text-[13.5px] font-medium text-foreground">
          {pickedName
            ? `Selected ${pickedName} — taking you to ReFile…`
            : `Drop your ${from.toUpperCase()} here, or click to select`}
        </p>
        <p className="text-[11.5px] text-muted-foreground">
          You'll sign in once, then ReFile runs the conversion.
        </p>
        <input
          id={`landing-file-${slug}`}
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>

      {/* Alternate entry: skip the file, just open the dashboard with
          the prompt preset. Useful for visitors who want to read the
          page first and convert later. */}
      <button
        type="button"
        onClick={() => startConversion(null)}
        disabled={busy || isLoading}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60"
      >
        Open ReFile with this prompt
      </button>
    </div>
  );
}
