"use client";

import { AppSidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useAuth } from "@/contexts/auth-context";

/**
 * AppShell — single layout used across the app.
 * - Authed users get a thin icon sidebar.
 * - Guests get a top bar (used on marketing / public pages).
 *
 *  Pass `mode="marketing"` to force the top bar regardless of auth.
 *  Pass `mode="app"` to force the sidebar.
 */
export function AppShell({ children, mode = "auto", className = "" }) {
  const { isAuthenticated, isLoading } = useAuth();

  const effectiveMode =
    mode === "auto" ? (isAuthenticated ? "app" : "marketing") : mode;

  if (effectiveMode === "app") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar />
        <div className={`pl-14 ${className}`}>{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopBar />
      <main className={`flex-1 ${className}`}>{children}</main>
    </div>
  );
}
