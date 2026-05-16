"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  MessageSquare,
  Layers,
  Settings,
  LogOut,
  Moon,
  Sun,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97] group-hover:w-full group-hover:justify-start group-hover:px-3"
          >
            {mounted ? (
              isDark ? (
                <Sun className="size-4 shrink-0" />
              ) : (
                <Moon className="size-4 shrink-0" />
              )
            ) : (
              <span className="size-4 shrink-0" />
            )}
            <span className="ml-2 hidden whitespace-nowrap text-[12.5px] group-hover:inline">
              {isDark ? "Light mode" : "Dark mode"}
            </span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted active:scale-[0.97] group-hover:w-full group-hover:justify-start group-hover:px-2"
                aria-label="Account menu"
              >
                <Avatar className="size-7 shrink-0">
                  <AvatarImage src={user?.picture} alt={user?.name || "Account"} />
                  <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                </Avatar>
                <span className="ml-2 hidden min-w-0 flex-1 truncate text-left text-[12.5px] font-medium group-hover:inline">
                  {user?.name || "Account"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-56"
            >
              {user && (
                <>
                  <DropdownMenuLabel className="normal-case tracking-normal text-foreground">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium">{user.name}</span>
                      <span className="text-[11.5px] font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              {APP_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <Icon className="size-3.5" /> {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="size-3.5" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="size-3.5" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
  );
}
