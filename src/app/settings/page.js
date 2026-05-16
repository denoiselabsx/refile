"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import {
  User,
  CreditCard,
  Palette,
  Trash2,
  LogOut,
  ArrowRight,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

function Section({ icon: Icon, title, desc, children }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5 ring-1 ring-border">
          <Icon className="size-4 text-foreground/70" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-foreground">
            {title}
          </h2>
          {desc && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{desc}</p>
          )}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login/google");
  }, [isLoading, isAuthenticated, router]);

  const usage = useQuery(
    api.plans.myUsage,
    isAuthenticated ? {} : "skip"
  );

  if (isLoading || !isAuthenticated) {
    return (
      <AppShell mode="app">
        <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
          Loading…
        </div>
      </AppShell>
    );
  }

  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <AppShell mode="app">
      <div className="mx-auto h-full max-w-2xl overflow-y-auto px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <h1 className="font-serif text-[30px] leading-tight tracking-tight text-foreground sm:text-[36px]">
            Settings
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Your account, plan, and preferences.
          </p>
        </header>

        <div className="space-y-4">
          {/* Account */}
          <Section icon={User} title="Account" desc="Signed in with Google.">
            <div className="flex items-center gap-3">
              {user?.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt=""
                  className="size-10 rounded-full"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-[14px] font-medium">
                  {(user?.name || user?.email || "U")[0]?.toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-foreground">
                  {user?.name || "—"}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
          </Section>

          {/* Plan & usage */}
          <Section
            icon={CreditCard}
            title="Plan & usage"
            desc="This month, on your current plan."
          >
            {usage ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[20px] font-semibold text-foreground">
                      {usage.planName}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {usage.conversions.toLocaleString()} /{" "}
                      {usage.includedConversions.toLocaleString()} conversions
                      used
                    </p>
                  </div>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
                  >
                    {usage.planId === "free"
                      ? "Upgrade"
                      : "Manage plan"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (usage.conversions /
                          Math.max(1, usage.includedConversions)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                {usage.overageDueUsd > 0 && (
                  <p className="text-[12.5px] text-muted-foreground">
                    Pay-as-you-go this month:{" "}
                    <span className="font-medium text-foreground">
                      ${usage.overageDueUsd.toFixed(2)}
                    </span>{" "}
                    ({usage.extraConversions} extra)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">Loading…</p>
            )}
          </Section>

          {/* Appearance */}
          <Section
            icon={Palette}
            title="Appearance"
            desc="Choose how ReFile looks."
          >
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => {
                const TIcon = t.icon;
                const active = mounted && theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-[12.5px] font-medium transition-colors",
                      active
                        ? "border-foreground/30 bg-muted text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <TIcon className="size-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Data */}
          <Section
            icon={Trash2}
            title="Your data"
            desc="Files auto-delete after 24 hours."
          >
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Delete individual chats from the history sidebar. For full
              account deletion, email{" "}
              <a
                href="mailto:privacy@denoiselabs.com"
                className="text-foreground underline-offset-4 hover:underline"
              >
                privacy@denoiselabs.com
              </a>{" "}
              — everything is wiped within 30 days. See the{" "}
              <Link
                href="/privacy"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          {/* Sign out */}
          <button
            onClick={logout}
            className="surface flex w-full items-center gap-3 p-5 text-left transition-colors hover:border-border-strong"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 ring-1 ring-destructive/20">
              <LogOut className="size-4 text-destructive" />
            </span>
            <span className="text-[14px] font-medium text-foreground">
              Sign out
            </span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
