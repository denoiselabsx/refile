"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  LogOut,
  Moon,
  Sun,
  Plus,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoMark } from "@/components/brand/logo";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { APP_NAV, BRAND, isActive } from "@/lib/nav";

const STORAGE_KEY = "refile.sidebar.expanded";

export function AppSidebar({ navExtraContent = null, footerExtraContent = null }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Must start `false` so SSR and the first client render agree — reading
  // localStorage in the initializer would diverge from the server's HTML
  // and trigger a hydration mismatch (the server has no `window`, the
  // client sometimes returns "true"). Instead we read the stored value
  // AFTER mount and snap to it then. The first paint disables the
  // width transition so a user with `expanded=true` saved snaps open
  // instantly instead of animating from 14 → 64.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) === "true";
      if (saved) setExpanded(true);
    } catch {}
    setMounted(true);
  }, []);

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const isDark = mounted && (resolvedTheme || theme) === "dark";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-border bg-background/80 backdrop-blur-md ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex",
        // Only animate the width AFTER mount — the initial snap from
        // `false` (SSR) to the user's saved state shouldn't be a visible
        // transition; toggles after that should.
        mounted && "transition-[width] duration-300",
        expanded ? "w-64" : "w-14"
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center",
          expanded ? "justify-between px-3" : "justify-center px-2"
        )}
      >
        <Link
          href="/"
          aria-label={`${BRAND.name} home`}
          className="flex size-9 items-center justify-center transition-opacity hover:opacity-80"
        >
          <LogoMark size={22} />
        </Link>
        <button
          onClick={toggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]",
            !expanded && "hidden"
          )}
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {!expanded && (
        <button
          onClick={toggle}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="mx-2 mb-2 flex h-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <nav
        // `min-h-0` is the load-bearing class here. Without it, a
        // `flex-1` child of a flex column defaults to `min-height: auto`
        // — meaning it grows to its content's intrinsic size and never
        // lets an inner `overflow-y-auto` actually scroll. With it, the
        // nav respects the parent height, and the chat-history scroller
        // inside `navExtraContent` finally has somewhere to clip.
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-1 px-2 pt-2",
          expanded ? "items-stretch" : "items-center"
        )}
      >
        <Link
          href="/dashboard"
          aria-label="New chat"
          className={cn(
            "mb-3 flex h-9 items-center rounded-lg bg-foreground text-background shadow-sm transition-all hover:opacity-90 active:scale-[0.97]",
            expanded ? "w-full justify-start px-3" : "w-9 justify-center"
          )}
        >
          <Plus className="size-4 shrink-0" />
          {expanded && (
            <span className="ml-2 whitespace-nowrap text-[12.5px] font-semibold">
              New chat
            </span>
          )}
        </Link>

        {[
          ...APP_NAV,
          { href: "/settings", label: "Settings", icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/settings"
              ? pathname === "/settings"
              : isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center rounded-lg transition-colors",
                expanded ? "w-full justify-start px-3" : "w-9 justify-center",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {active && expanded && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground" />
              )}
              <Icon className="size-4 shrink-0" />
              {expanded && (
                <span className="ml-2 whitespace-nowrap text-[12.5px]">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {navExtraContent && expanded && (
          // `flex flex-col` so the child can use `flex-1 min-h-0
          // overflow-y-auto` to scroll. Plain block + h-full doesn't
          // work for the child — h-full on a flex item resolves
          // against the parent's CONTENT box, which is just the
          // child's intrinsic size, so the scroller never gets a
          // bounded height.
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/70 pt-2">
            {navExtraContent}
          </div>
        )}
      </nav>

      <div className="flex flex-col gap-1 px-2 pb-3">
        {footerExtraContent && expanded && (
          <div className="mb-2 border-t border-border/70 pt-2">
            {footerExtraContent}
          </div>
        )}

        {/* `min-w-0` on the row + on the avatar Link is the load-bearing
            pair here. Without it, a long name/email pushes the row past
            the sidebar's `w-64` and the logout button visibly clips
            against (or past) the right border. With it, the avatar
            Link's flex-1 honors the available space and the truncate
            on the name span actually kicks in. */}
        <div
          className={cn(
            "flex items-center gap-1",
            expanded ? "min-w-0" : "flex-col",
          )}
        >
          <Link
            href="/settings"
            aria-label="Account"
            title={user?.name || "Account"}
            className={cn(
              "flex h-9 items-center rounded-lg transition-colors hover:bg-muted active:scale-[0.97]",
              expanded
                ? "min-w-0 flex-1 justify-start px-2"
                : "w-9 justify-center",
            )}
          >
            <Avatar className="size-7 shrink-0">
              <AvatarImage src={user?.picture} alt={user?.name || "Account"} />
              <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
            </Avatar>
            {expanded && (
              <span className="ml-2 flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[12.5px] font-medium leading-tight">
                  {user?.name || "Account"}
                </span>
                {user?.email && (
                  <span className="truncate text-[10.5px] leading-tight text-muted-foreground">
                    {user.email}
                  </span>
                )}
              </span>
            )}
          </Link>

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]",
              expanded ? "size-8" : "size-9"
            )}
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
          </button>

          {expanded && (
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-[0.97]"
            >
              <LogOut className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
