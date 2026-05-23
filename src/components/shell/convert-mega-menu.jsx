"use client";

/**
 * <ConvertMegaMenu /> — top-bar dropdown for every conversion recipe.
 *
 * Same craft rules as ProductMegaMenu:
 *   • No promotional banner — nav is a navigator.
 *   • Icon-led column headers — quick scan by category.
 *   • Tight, monospaced format chips in row labels for skimming.
 *   • Clear footer CTA to the /convert hub for "browse them all" intent.
 *
 * The mega-menu's job is twofold:
 *   1. Move visitors to the recipe they want in one move.
 *   2. Fire 25+ internal-link impressions per pageview to /convert/<slug>
 *      pages — pure SEO compounding on every public page.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileType,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONVERT_MENU } from "@/lib/nav";

/** One icon per column — matches the category accents elsewhere in the app. */
const COLUMN_ICON = {
  PDF: FileText,
  Image: ImageIcon,
  Video: Film,
  Audio: Music,
  Documents: FileType,
};

export function ConvertMegaMenu({ label = "Convert", active = false }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const closeTimer = useRef(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative z-10 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors lg:px-3.5",
          active || open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            className="absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,860px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35),0_8px_20px_-8px_rgba(0,0,0,0.2)]"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="grid grid-cols-2 gap-x-1 gap-y-3 p-3 sm:grid-cols-3 lg:grid-cols-5">
              {CONVERT_MENU.map((col) => {
                const Icon = COLUMN_ICON[col.title] ?? Layers;
                return (
                  <div key={col.title} className="min-w-0">
                    <div className="flex items-center gap-1.5 px-2 pb-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                        <Icon className="size-3" />
                      </span>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-foreground/80">
                        {col.title}
                      </p>
                    </div>
                    <ul className="space-y-0.5">
                      {col.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className="block truncate rounded-md px-2 py-1.5 text-[12.5px] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:bg-muted focus-visible:text-foreground"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <Link
              href="/convert"
              onClick={() => setOpen(false)}
              className="group flex items-center justify-between gap-3 border-t border-border bg-background/40 px-4 py-3 text-[12.5px] font-medium transition-colors hover:bg-muted/70"
            >
              <span className="inline-flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
                <Layers className="size-3.5" />
                Browse every conversion ReFile does
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
