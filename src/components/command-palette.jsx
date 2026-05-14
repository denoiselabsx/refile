"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Layers,
  Workflow,
  BookOpen,
  Sparkles,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Github,
  CreditCard,
  ScrollText,
  Search,
  Plus,
  MessageSquare,
  ArrowRight,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isAuthenticated, logout } = useAuth();

  const isDark = (resolvedTheme || theme) === "dark";

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = useCallback(
    (href) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const run = useCallback((fn) => {
    setOpen(false);
    setQuery("");
    fn?.();
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh] sm:pt-[16vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 cursor-default bg-background/55 backdrop-blur-[6px]"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[640px]"
          >
            {/* Soft outer glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px rounded-[18px] opacity-70"
              style={{
                background:
                  "linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 22%, transparent), transparent 40%)",
                filter: "blur(14px)",
              }}
            />

            <Command
              label="Command Menu"
              className="relative overflow-hidden rounded-2xl border border-border-strong bg-popover shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
              shouldFilter
            >
              {/* Top highlight band */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent"
              />

              {/* Input row */}
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  autoFocus
                  placeholder="Search pages, run actions…"
                  className="h-[52px] flex-1 bg-transparent text-[14px] tracking-tight text-foreground placeholder:text-muted-foreground/70 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                  style={{ outline: "none", boxShadow: "none" }}
                />
                <Hint label="esc" />
              </div>

              {/* List */}
              <Command.List className="max-h-[440px] overflow-y-auto p-2 pb-1.5 [scrollbar-gutter:stable]">
                <Command.Empty>
                  <div className="flex flex-col items-center px-4 py-12 text-center">
                    <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                      <Search className="size-4" />
                    </div>
                    <p className="mt-4 text-[13px] font-medium tracking-tight">
                      No matches for “{query}”
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Try a page name, “sign in”, or “dark mode”.
                    </p>
                  </div>
                </Command.Empty>

                <Group heading="Navigate">
                  <Item onSelect={() => go("/")} icon={Home} label="Home" shortcut="G H" />
                  <Item
                    onSelect={() => go("/presets")}
                    icon={Layers}
                    label="Presets"
                    hint="Community recipes"
                    shortcut="G P"
                  />
                  <Item
                    onSelect={() => go("/workflow")}
                    icon={Workflow}
                    label="Workflow builder"
                    shortcut="G W"
                  />
                  <Item
                    onSelect={() => go("/pricing")}
                    icon={CreditCard}
                    label="Pricing"
                  />
                  <Item onSelect={() => go("/docs")} icon={BookOpen} label="Docs" />
                  <Item
                    onSelect={() => go("/changelog")}
                    icon={ScrollText}
                    label="Changelog"
                  />
                  {isAuthenticated && (
                    <Item
                      onSelect={() => go("/dashboard")}
                      icon={Sparkles}
                      label="Open dashboard"
                      shortcut="G D"
                    />
                  )}
                </Group>

                {isAuthenticated && (
                  <Group heading="Quick actions">
                    <Item
                      onSelect={() => go("/dashboard")}
                      icon={MessageSquare}
                      label="New chat"
                      shortcut="N"
                    />
                    <Item
                      onSelect={() => go("/presets/create")}
                      icon={Plus}
                      label="Create new preset"
                    />
                  </Group>
                )}

                <Group heading="Preferences">
                  <Item
                    onSelect={() =>
                      run(() => setTheme(isDark ? "light" : "dark"))
                    }
                    icon={isDark ? Sun : Moon}
                    label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    shortcut="⌘ ⇧ L"
                  />
                </Group>

                <Group heading="Account">
                  {isAuthenticated ? (
                    <Item
                      onSelect={() => run(logout)}
                      icon={LogOut}
                      label="Sign out"
                      danger
                    />
                  ) : (
                    <Item
                      onSelect={() => go("/login/google")}
                      icon={LogIn}
                      label="Sign in with Google"
                    />
                  )}
                </Group>

                <Group heading="Resources" last>
                  <Item
                    onSelect={() => {
                      setOpen(false);
                      window.open(
                        "https://github.com/denoiselabsx/refile",
                        "_blank"
                      );
                    }}
                    icon={Github}
                    label="GitHub repository"
                    hint="External"
                  />
                </Group>
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-3.5 py-2.5">
                <FooterCluster>
                  <Hint icon={ArrowUp} small />
                  <Hint icon={ArrowDown} small />
                  <span className="text-[11px] text-muted-foreground">
                    navigate
                  </span>
                </FooterCluster>

                <FooterCluster>
                  <Hint icon={CornerDownLeft} small />
                  <span className="text-[11px] text-muted-foreground">
                    select
                  </span>
                </FooterCluster>

                <FooterCluster>
                  <Hint label="⌘" small />
                  <Hint label="K" small />
                  <span className="text-[11px] text-muted-foreground">
                    toggle
                  </span>
                </FooterCluster>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─── Building blocks ─── */

function Group({ heading, children, last = false }) {
  return (
    <Command.Group
      heading={heading}
      className={`px-1 ${last ? "" : "mb-1"} [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground/60`}
    >
      {children}
    </Command.Group>
  );
}

function Item({ icon: Icon, label, hint, shortcut, onSelect, danger = false }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={`group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[13px] outline-none transition-colors
        data-[selected=true]:bg-muted/80 ${danger ? "data-[selected=true]:bg-destructive/10" : ""}`}
    >
      {/* Icon container */}
      <span
        className={`relative flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors
          ${
            danger
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : "border-border bg-muted/40 text-muted-foreground group-data-[selected=true]:border-border-strong group-data-[selected=true]:bg-background group-data-[selected=true]:text-foreground"
          }`}
      >
        <Icon className="size-3.5" />
      </span>

      <span
        className={`flex-1 truncate font-medium tracking-tight ${
          danger
            ? "text-destructive"
            : "text-foreground/90 group-data-[selected=true]:text-foreground"
        }`}
      >
        {label}
      </span>

      {hint && (
        <span className="hidden text-[11px] text-muted-foreground/80 sm:inline">
          {hint}
        </span>
      )}

      {shortcut && <ShortcutChip>{shortcut}</ShortcutChip>}

      <ArrowRight className="size-3.5 shrink-0 -translate-x-1 text-muted-foreground/50 opacity-0 transition-all group-data-[selected=true]:translate-x-0 group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}

function ShortcutChip({ children }) {
  // Split by space into individual key chips
  const parts = String(children).trim().split(/\s+/);
  return (
    <span className="hidden items-center gap-0.5 sm:flex">
      {parts.map((p, i) => (
        <Hint key={i} label={p} small />
      ))}
    </span>
  );
}

function Hint({ label, icon: Icon, small = false }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded-md border border-border bg-card/80 font-mono text-muted-foreground shadow-[0_1px_0_var(--border)] ${
        small
          ? "h-5 min-w-[20px] px-1 text-[10px]"
          : "h-6 min-w-[26px] px-1.5 text-[10.5px]"
      }`}
    >
      {Icon ? <Icon className="size-2.5" /> : label}
    </kbd>
  );
}

function FooterCluster({ children }) {
  return <div className="flex items-center gap-1.5">{children}</div>;
}
