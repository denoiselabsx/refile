"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, ArrowRight, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { LogoMark } from "@/components/brand/logo";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/presets", label: "Presets" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
];

export function TopBar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile sheet open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  // ESC to close
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const isDark = mounted && (resolvedTheme || theme) === "dark";

  return (
    <>
      <header className="pointer-events-none sticky top-0 z-40 flex w-full justify-center px-4 pt-3 sm:pt-4">
        <motion.div
          layout
          initial={false}
          animate={{
            width: scrolled ? "min(880px, 100%)" : "min(1120px, 100%)",
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "pointer-events-auto relative flex h-14 items-center justify-between gap-3 rounded-full px-3 transition-[background-color,border-color,box-shadow] duration-300",
            scrolled
              ? "border border-border bg-card/80 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl"
              : "border border-transparent bg-transparent"
          )}
        >
          {/* Logo */}
          <Link
            href="/"
            aria-label="ReFile home"
            className="group flex items-center gap-2 pl-2 pr-3 transition-opacity"
          >
            <LogoMark size={22} className="transition-transform group-hover:rotate-[-6deg]" />
            <span className="text-[14.5px] font-semibold tracking-tight">
              ReFile
            </span>
            <span className="hidden text-[11px] text-muted-foreground/70 sm:inline">
              / Denoise Labs
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            ref={navRef}
            className="relative hidden items-center gap-0.5 md:flex"
            onMouseLeave={() => setHovered(null)}
          >
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const isHovered = hovered === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHovered(item.href)}
                  className={cn(
                    "relative z-10 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isHovered && (
                    <motion.span
                      layoutId="nav-hover"
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 -z-10 rounded-full bg-muted"
                    />
                  )}
                  {active && !isHovered && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 -z-10 rounded-full bg-muted/70"
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 pl-1.5">
            {/* Cmd-K hint (desktop only) */}
            <button
              type="button"
              aria-label="Open command palette"
              className="hidden h-8 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 text-[11.5px] text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground lg:inline-flex"
            >
              <span>Search</span>
              <span className="flex items-center gap-0.5">
                <Kbd className="h-4 min-w-[14px] border-transparent bg-transparent text-[10.5px]">
                  ⌘
                </Kbd>
                <Kbd className="h-4 min-w-[14px] border-transparent bg-transparent text-[10.5px]">
                  K
                </Kbd>
              </span>
            </button>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle theme"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="rounded-full"
            >
              {mounted ? (
                isDark ? (
                  <Sun className="size-3.5" />
                ) : (
                  <Moon className="size-3.5" />
                )
              ) : (
                <span className="size-3.5" />
              )}
            </Button>

            <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" />

            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-full md:hidden"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>

            {/* Desktop CTAs */}
            <div className="hidden items-center gap-1.5 md:flex">
              {isAuthenticated ? (
                <Button size="sm" variant="secondary" asChild className="rounded-full">
                  <Link href="/dashboard">
                    Dashboard
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" asChild className="rounded-full">
                    <Link href="/login/google">Sign in</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    asChild
                    className="cta-shimmer rounded-full"
                  >
                    <Link href="/login/google">
                      Get started
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </header>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-30 md:hidden"
            aria-hidden="false"
          >
            {/* Backdrop */}
            <div
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
              role="button"
              tabIndex={-1}
              aria-label="Close menu"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-4 mt-[72px] rounded-2xl border border-border bg-card p-4 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
            >
              <nav className="flex flex-col">
                {NAV.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                        active
                          ? "bg-muted text-foreground"
                          : "text-foreground/85 hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {item.label}
                      <ArrowRight
                        className={cn(
                          "size-4 transition-transform",
                          active
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-1 opacity-0"
                        )}
                      />
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {isAuthenticated ? (
                  <Button asChild className="w-full" size="lg">
                    <Link href="/dashboard">
                      Open dashboard
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full" size="lg">
                      <Link href="/login/google">Sign in</Link>
                    </Button>
                    <Button asChild className="w-full cta-shimmer" size="lg">
                      <Link href="/login/google">
                        Get started — free
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              <p className="mt-4 text-center text-[11.5px] text-muted-foreground">
                A Denoise Labs product
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
