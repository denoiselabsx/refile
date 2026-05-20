"use client";

import { useState } from "react";
import { Share2, Link as LinkIcon, MessageCircle, Check } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { api } from "../../convex/_generated/api";
import { SITE_URL } from "@/lib/site";

/**
 * "Share" button for one output file in the chat / uploads panel.
 *
 * First open → mints a 24h share link via api.shareLinks.createForOutput
 * (idempotent: a follow-up open on the same output returns the same
 * URL).  The dropdown then offers Copy Link + Share on WhatsApp.
 *
 * Lives next to the Download button. Only renders for output files —
 * sharing your own input would be useless.
 */
/**
 * variant:
 *   "hover" (default) — icon-only button that only appears on parent
 *      group-hover. Used in the Uploads sidebar where dozens of files
 *      share a row each.
 *   "inline" — always-visible pill matching the inline Download button
 *      next to it on the chat result card.
 */
export function ShareButton({ promptId, storageId, filename, variant = "hover" }) {
  const create = useMutation(api.shareLinks.createForOutput);
  const [shortCode, setShortCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = SITE_URL.replace(/\/$/, "");
  const shareUrl = shortCode ? `${baseUrl}/d/${shortCode}` : null;

  const ensureLink = async () => {
    if (shortCode) return shortCode;
    setBusy(true);
    try {
      const { shortCode: code } = await create({ promptId, storageId });
      setShortCode(code);
      return code;
    } catch (err) {
      toast.error(err?.message ?? "Couldn't create share link.");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleOpenChange = (next) => {
    // Lazy-mint on first open so we don't create links for stray hovers.
    if (next && !shortCode) {
      ensureLink().catch(() => {});
    }
  };

  const handleCopy = async () => {
    try {
      const code = await ensureLink();
      await navigator.clipboard.writeText(`${baseUrl}/d/${code}`);
      setCopied(true);
      toast.success("Link copied — valid for 24 hours.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ensureLink already toasts; clipboard failures are swallowed
      // because there's nothing actionable to surface.
    }
  };

  const handleWhatsApp = async () => {
    try {
      const code = await ensureLink();
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          `Here's ${filename}: ${baseUrl}/d/${code}`
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch {
      /* already toasted */
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        {variant === "inline" ? (
          <button
            type="button"
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60"
            aria-label={`Share ${filename}`}
            title="Share link (24h)"
          >
            <Share2 className="size-3.5" />
            Share
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="hidden rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-hover:inline-flex disabled:opacity-60"
            aria-label={`Share ${filename}`}
            title="Share link (24h)"
          >
            <Share2 className="size-3.5" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="pb-1">Shareable link</DropdownMenuLabel>
        <p className="px-2 pb-2 text-[11px] leading-relaxed text-muted-foreground">
          Anyone with this link can download for 24 hours.
        </p>
        {shareUrl ? (
          <div className="mx-2 mb-1 truncate rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-[11px] text-foreground/90">
            {shareUrl.replace(/^https?:\/\//, "")}
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleCopy(); }}>
          {copied ? (
            <Check className="mr-2 size-3.5 text-success" />
          ) : (
            <LinkIcon className="mr-2 size-3.5 text-muted-foreground" />
          )}
          {copied ? "Copied" : "Copy link"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleWhatsApp(); }}>
          <MessageCircle className="mr-2 size-3.5 text-muted-foreground" />
          Share on WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
