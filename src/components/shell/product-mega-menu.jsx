"use client";

/**
 * <ProductMegaMenu /> — top-bar dropdown for ReFile's product surface.
 *
 * Design rules (intentional, not preferences):
 *
 *   1. NO PROMOTIONAL HEADER. A nav menu is a navigator, not a banner.
 *      Linear, Vercel, Stripe all skip the marketing kicker; we follow.
 *   2. ICON-LED ROWS. Every row leads with a contained icon in a 36px
 *      square. Builds visual rhythm; lets the user scan by glyph before
 *      reading.
 *   3. ONE-LINE DESCRIPTIONS. Tight, factual, no "AI-powered" or "smart".
 *      The user already chose to open the menu; tell them what each
 *      destination IS, not why it's great.
 *   4. RESTRAINED LANGUAGE. "Chat" (not "AI chat") — the chat is the
 *      thing; what it does is in the description, not the label.
 *   5. CLEAR FOOTER CTA. The bottom rail is a real link to /, not an
 *      afterthought. Same visual weight as a row, slight accent.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ArrowRight,
  MessageSquare,
  Workflow,
  Layers,
  Code2,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCT_MENU } from "@/lib/nav";

/** Icon assigned per product surface. Keyed by href so the menu is the
 *  single source of truth for what surfaces exist; this map just decorates. */
const PRODUCT_ICONS = {
  "/dashboard": MessageSquare,
  "/workflow": Workflow,
  "/presets": Layers,
  "/developers": Code2,
};

export function ProductMegaMenu({ label = "Product", active = false }) {
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
            className="absolute left-1/2 top-full z-50 mt-2 w-[min(90vw,400px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35),0_8px_20px_-8px_rgba(0,0,0,0.2)]"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <ul className="p-1.5">
              {PRODUCT_MENU.map((item) => {
                const Icon = PRODUCT_ICONS[item.href] ?? MessageSquare;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="group flex items-start gap-3 rounded-xl p-3 transition-all hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors group-hover:border-border-strong group-hover:bg-card">
                        <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[13px] font-semibold leading-tight text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="group flex items-center justify-between gap-3 border-t border-border bg-background/40 px-4 py-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              <span className="inline-flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
                <Home className="size-3.5" />
                See how it works
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
