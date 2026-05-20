"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoMark } from "@/components/brand/logo";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { APP_NAV, BRAND, isActive } from "@/lib/nav";

export function AppSidebar({ navExtraContent = null, footerExtraContent = null }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
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
    <aside className="group fixed inset-y-0 left-0 z-30 hidden w-14 flex-col overflow-hidden border-r border-border bg-background/80 backdrop-blur-md transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:w-72 lg:flex">
        <div className="flex h-14 items-center px-2 group-hover:px-3">
          <Link
            href="/"
            aria-label={`${BRAND.name} home`}
            className="flex size-9 items-center justify-center transition-opacity hover:opacity-80"
          >
            <LogoMark size={22} />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col items-center gap-1 px-2 pt-2 group-hover:items-stretch">
          <Link
            href="/dashboard"
            className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background shadow-sm transition-all hover:opacity-90 active:scale-[0.97] group-hover:w-full group-hover:justify-start group-hover:px-3"
            aria-label="New chat"
          >
            <Plus className="size-4 shrink-0" />
            <span className="ml-2 hidden whitespace-nowrap text-[12.5px] font-semibold group-hover:inline">
              New chat
            </span>
          </Link>

          {APP_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors group-hover:w-full group-hover:justify-start group-hover:px-3",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 hidden h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground group-hover:block" />
                )}
                <Icon className="size-4 shrink-0" />
                <span className="ml-2 hidden whitespace-nowrap text-[12.5px] group-hover:inline">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {navExtraContent && (
            <div className="mt-2 hidden w-full min-h-0 flex-1 overflow-hidden border-t border-border/70 pt-2 group-hover:block">
              {navExtraContent}
            </div>
          )}
        </nav>

        <div className="flex flex-col gap-1 px-2 pb-3">
          {footerExtraContent && (
            <div className="mb-2 hidden w-full border-t border-border/70 pt-2 group-hover:block">
              {footerExtraContent}
            </div>
          )}

          {/* Collapsed: avatar only (clicks → /settings). Expanded: avatar +
              name/email on the left, theme + sign-out icons on the right. */}
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              aria-label="Account settings"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted active:scale-[0.97]",
                "group-hover:w-auto group-hover:flex-1 group-hover:justify-start group-hover:px-2",
                isActive(pathname, "/settings") && "bg-muted"
              )}
            >
              <Avatar className="size-7 shrink-0">
                <AvatarImage src={user?.picture} alt={user?.name || "Account"} />
                <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="ml-2 hidden min-w-0 flex-1 flex-col text-left group-hover:flex">
                <span className="truncate text-[12.5px] font-medium leading-tight">
                  {user?.name || "Account"}
                </span>
                {user?.email && (
                  <span className="truncate text-[10.5px] leading-tight text-muted-foreground">
                    {user.email}
                  </span>
                )}
              </span>
            </Link>

            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
              className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97] group-hover:inline-flex"
            >
              {mounted ? (
                isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />
              ) : (
                <span className="size-3.5" />
              )}
            </button>

            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] group-hover:inline-flex"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>
  );
}
