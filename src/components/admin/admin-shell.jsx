"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import {
  ShieldCheck,
  Lock,
  LayoutDashboard,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * Shared wrapper for every page under /admin.
 *
 * Responsibilities:
 *   - Loading + admin-gate + claim flow (centralized so individual pages
 *     just render their content).
 *   - Renders the admin sub-nav (Overview / Analytics / Lessons) at the
 *     top so admins can move between sections without bouncing through
 *     the main app sidebar.
 *
 * Page usage:
 *   <AdminShell title="Analytics" description="…">
 *     {content}
 *   </AdminShell>
 *
 * The gate is a UI courtesy — every admin Convex query also re-checks
 * the role server-side, so a non-admin who bypasses the UI still gets a
 * 403 from the network.
 */

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/lessons", label: "Lessons", icon: Sparkles },
];

function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ title, description, children }) {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const claimAdmin = useMutation(api.users.claimAdmin);
  const [claiming, setClaiming] = useState(false);

  async function handleClaimAdmin() {
    setClaiming(true);
    try {
      await claimAdmin({});
      toast.success("You're now an admin. Reloading…");
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err?.message ?? "Not on the admin allowlist.");
    } finally {
      setClaiming(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-5 py-10">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-3 h-4 w-96" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-5 py-10">
          <EmptyState
            icon={Lock}
            title="Admin access required"
            description={
              user
                ? `Signed in as ${user.email ?? "your account"}. If your email is on the admin allowlist, claim access below.`
                : "Sign in with an allowlisted account to access the admin area."
            }
          />
          {user ? (
            <div className="mt-6 flex justify-center">
              <Button onClick={handleClaimAdmin} disabled={claiming}>
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                {claiming ? "Claiming…" : "Claim admin access"}
              </Button>
            </div>
          ) : null}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 py-10">
        <AdminNav />
        {(title || description) && (
          <header className="mt-6">
            {title ? (
              <h1 className="font-serif text-3xl text-foreground">{title}</h1>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </header>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </AppShell>
  );
}
