"use client";

import { AppSidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { Footer } from "./footer";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { useAuth } from "@/contexts/auth-context";

/**
 * AppShell — single layout used across every page.
 *
 * - `mode="app"` (or auto + authed): icon sidebar on lg+, full-width on mobile.
 *   No footer; authed surfaces are usually full-height workspaces.
 * - `mode="marketing"` (or auto + guest): top bar + footer.
 *
 * Pass `withFooter={false}` to suppress the footer on a marketing page that
 * shouldn't have it (e.g. login). Pass `withFooter={true}` on an "app" page
 * if you really want it (rare).
 */
export function AppShell({
  children,
  mode = "auto",
  className = "",
  withFooter,
  appSidebarNavExtra = null,
  appSidebarFooterExtra = null,
}) {
  const { isAuthenticated } = useAuth();

  const effectiveMode =
    mode === "auto" ? (isAuthenticated ? "app" : "marketing") : mode;

  const showFooter =
    typeof withFooter === "boolean"
      ? withFooter
      : effectiveMode === "marketing";

  if (effectiveMode === "app") {
    return (
      <div className="h-[100dvh] overflow-hidden bg-background text-foreground">
        <AppSidebar
          navExtraContent={appSidebarNavExtra}
          footerExtraContent={appSidebarFooterExtra}
        />
        <div className={`h-full lg:pl-14 ${className}`}>{children}</div>
        {showFooter && <Footer />}
        <OnboardingFlow />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopBar />
      <main className={`flex-1 ${className}`}>{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
