"use client";

import { AppSidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useAuth } from "@/contexts/auth-context";

/**
 * AppShell — single layout used across the app.
 * - Authed: thin icon sidebar on lg+; on mobile, content is full-width
 *   (chat surfaces handle their own header / nav).
 * - Guests: top bar (marketing / public pages).
 */
export function AppShell({ children, mode = "auto", className = "" }) {
  const { isAuthenticated, isLoading } = useAuth();

  const effectiveMode =
    mode === "auto" ? (isAuthenticated ? "app" : "marketing") : mode;

  if (effectiveMode === "app") {
    return (
      <div className="h-[100dvh] overflow-hidden bg-background text-foreground">
        <AppSidebar />
        <div className={`h-full lg:pl-14 ${className}`}>{children}</div>
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
