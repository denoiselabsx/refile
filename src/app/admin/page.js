"use client";

import Link from "next/link";
import { BarChart3, Sparkles, ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS = [
  {
    href: "/admin/analytics",
    icon: BarChart3,
    title: "Analytics",
    description:
      "Conversion lifecycle, daily limit hits, upgrade clicks, and a raw event explorer.",
  },
  {
    href: "/admin/lessons",
    icon: Sparkles,
    title: "Learned lessons",
    description:
      "Failure-cluster lessons proposed by the self-improving cron. Approve to inject into the system prompt.",
  },
];

export default function AdminOverviewPage() {
  return (
    <AdminShell
      title="Admin"
      description="Operations surface. Anything that should never appear to a regular user lives under /admin."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/30">
              <CardContent className="flex items-start gap-3 p-5">
                <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{title}</p>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
