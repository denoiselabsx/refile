"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  MessageSquare,
  Layers,
  Workflow,
  Settings,
  LogOut,
  Moon,
  Sun,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const NAV = [
  { href: "/dashboard", label: "Chat", icon: MessageSquare },
  { href: "/presets", label: "Presets", icon: Layers },
  { href: "/workflow", label: "Workflows", icon: Workflow },
];

export function AppSidebar() {
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
    <TooltipProvider>
      <aside className="fixed inset-y-0 left-0 z-30 flex w-14 flex-col border-r border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-center">
          <Link href="/" aria-label="ReFile home" className="transition-opacity hover:opacity-80">
            <LogoMark size={22} />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col items-center gap-1 px-2 pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                className="mb-2 flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted"
                aria-label="New chat"
              >
                <Plus className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>

          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-1 px-2 pb-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle theme"
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {mounted ? (
                  isDark ? <Sun className="size-4" /> : <Moon className="size-4" />
                ) : (
                  <span className="size-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isDark ? "Light mode" : "Dark mode"}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-muted"
                aria-label="Account menu"
              >
                <Avatar className="size-7">
                  <AvatarImage src={user?.picture} alt={user?.name || "Account"} />
                  <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={10} className="w-56">
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
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <MessageSquare className="size-3.5" /> Chats
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/presets">
                  <Layers className="size-3.5" /> Presets
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="size-3.5" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="size-3.5" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
