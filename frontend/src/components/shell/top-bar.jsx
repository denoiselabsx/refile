"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoWordmark } from "@/components/brand/logo";
import { useAuth } from "@/contexts/auth-context";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/presets", label: "Presets" },
  { href: "/workflow", label: "Workflows" },
];

export function TopBar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && (resolvedTheme || theme) === "dark";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 glass">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="ReFile home"
        >
          <LogoWordmark size={20} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {mounted ? (
              isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />
            ) : (
              <span className="size-3.5" />
            )}
          </Button>

          {isAuthenticated ? (
            <Button size="sm" variant="secondary" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/login/google">Sign in</Link>
              </Button>
              <Button size="sm" variant="default" asChild>
                <Link href="/login/google">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
