"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { BarChart3, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { AdminShell } from "@/components/admin/admin-shell";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../../../convex/_generated/api";
import { EVENT_NAMES, EVENT_LABELS } from "../../../../lib/analytics-events.js";

const RANGE_OPTIONS = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
];

// SVG line chart. Plain SVG (no Recharts) so the admin page stays under
// the route-chunk budget — Recharts is ~80KB and we'd only use 5% of it.
function LineChart({ series, days }) {
  const w = 760;
  const h = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 36 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  // Build the X axis as the last `days` UTC day keys.
  const axisDays = useMemo(() => {
    const out = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      out.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
      );
    }
    return out;
  }, [days]);

  const maxY = Math.max(
    1,
    ...series.flatMap((s) => axisDays.map((d) => s.byDay[d] ?? 0))
  );

  const x = (i) =>
    pad.left + (axisDays.length === 1 ? 0 : (i / (axisDays.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / maxY) * innerH;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      className="overflow-visible"
    >
      {/* Y gridlines (4 ticks) */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line
            x1={pad.left}
            x2={w - pad.right}
            y1={pad.top + innerH * (1 - p)}
            y2={pad.top + innerH * (1 - p)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={pad.left - 6}
            y={pad.top + innerH * (1 - p) + 3}
            textAnchor="end"
            className="fill-muted-foreground text-[10px]"
          >
            {Math.round(maxY * p)}
          </text>
        </g>
      ))}

      {/* X labels (sparse — every ~7 days) */}
      {axisDays.map((d, i) => {
        const showLabel =
          i === 0 ||
          i === axisDays.length - 1 ||
          i % Math.ceil(axisDays.length / 6) === 0;
        if (!showLabel) return null;
        return (
          <text
            key={d}
            x={x(i)}
            y={h - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {d.slice(5)}
          </text>
        );
      })}

      {/* Lines */}
      {series.map((s) => {
        const points = axisDays
          .map((d, i) => `${x(i)},${y(s.byDay[d] ?? 0)}`)
          .join(" ");
        return (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        );
      })}
    </svg>
  );
}

const SERIES_COLORS = {
  conversion_started: "#3b82f6", // blue
  conversion_completed: "#22c55e", // green
  conversion_failed: "#ef4444", // red
  daily_limit_hit: "#f59e0b", // amber
};

function statTotal(rollupRows, todayRows, name) {
  const rollup = rollupRows
    .filter((r) => r.name === name)
    .reduce((a, b) => a + b.count, 0);
  const today = todayRows
    .filter((r) => r.name === name)
    .reduce((a, b) => a + b.count, 0);
  return rollup + today;
}

function statUnique(rollupRows, todayRows, name) {
  // Unique-user totals don't strictly add across days (a single user can
  // appear on multiple days), but for a quick at-a-glance card the sum is
  // a useful approximation. Label it accordingly in the UI.
  const rollup = rollupRows
    .filter((r) => r.name === name)
    .reduce((a, b) => a + b.uniqueUsers, 0);
  const today = todayRows
    .filter((r) => r.name === name)
    .reduce((a, b) => a + b.uniqueUsers, 0);
  return rollup + today;
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [days, setDays] = useState(30);
  const [explorerName, setExplorerName] = useState("conversion_completed");

  // AdminShell handles the loading + non-admin states. Queries below skip
  // when isAdmin is false so they don't 403 during that window.
  const rollup = useQuery(
    api.events.adminRollup,
    isAdmin ? { days } : "skip"
  );
  const today = useQuery(api.events.adminToday, isAdmin ? {} : "skip");
  const recent = useQuery(
    api.events.adminRecentByName,
    isAdmin ? { name: explorerName, limit: 100 } : "skip"
  );

  const rollupRows = rollup ?? [];
  const todayRows = today ?? [];

  // Build per-event day maps for the line chart.
  const series = ["conversion_started", "conversion_completed", "conversion_failed"].map(
    (name) => {
      const byDay = {};
      for (const r of rollupRows) {
        if (r.name === name) byDay[r.day] = (byDay[r.day] ?? 0) + r.count;
      }
      for (const r of todayRows) {
        if (r.name === name) byDay[r.day] = (byDay[r.day] ?? 0) + r.count;
      }
      return { name, color: SERIES_COLORS[name], byDay };
    }
  );

  const totalStarted = statTotal(rollupRows, todayRows, "conversion_started");
  const totalCompleted = statTotal(rollupRows, todayRows, "conversion_completed");
  const totalFailed = statTotal(rollupRows, todayRows, "conversion_failed");
  const totalLimitHit = statTotal(rollupRows, todayRows, "daily_limit_hit");
  const uniqueStarters = statUnique(rollupRows, todayRows, "conversion_started");
  const successRate =
    totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

  return (
    <AdminShell
      title="Analytics"
      description={`Last ${days} days. Rollup runs 00:30 UTC; today's column is live.`}
    >
      <div className="-mt-2 mb-4 flex justify-end">
        <div className="flex rounded-md border border-border bg-background p-0.5">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setDays(r.value)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                days === r.value
                  ? "rounded-sm bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            icon={BarChart3}
            label="Conversions started"
            value={totalStarted}
            sub={`${uniqueStarters} user-days`}
          />
          <StatCard
            icon={TrendingUp}
            label="Success rate"
            value={`${successRate}%`}
            sub={`${totalCompleted} completed`}
          />
          <StatCard
            icon={AlertTriangle}
            label="Failed"
            value={totalFailed}
            sub={totalStarted > 0 ? `${Math.round((totalFailed / totalStarted) * 100)}% of starts` : "—"}
          />
          <StatCard
            icon={Users}
            label="Daily limit hits"
            value={totalLimitHit}
            sub="Free users blocked"
          />
        </div>

        {/* Line chart */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Conversion lifecycle</CardTitle>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {series.map((s) => (
                <span key={s.name} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block size-2.5 rounded-sm"
                    style={{ backgroundColor: s.color }}
                  />
                  {EVENT_LABELS[s.name]}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <LineChart series={series} days={days} />
          </CardContent>
        </Card>

        {/* Explorer */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Event explorer</CardTitle>
            <select
              className="mt-2 w-full max-w-xs rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={explorerName}
              onChange={(e) => setExplorerName(e.target.value)}
            >
              {EVENT_NAMES.map((n) => (
                <option key={n} value={n}>
                  {EVENT_LABELS[n]}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            {recent === undefined ? (
              <Skeleton className="h-40 w-full" />
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <div className="max-h-[420px] overflow-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">User</th>
                      <th className="px-3 py-2 font-medium">Props</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r._id} className="border-t border-border">
                        <td className="px-3 py-2 align-top text-muted-foreground">
                          {new Date(r.at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {r.userId ? (
                            <span className="font-mono">{r.userId.slice(-6)}</span>
                          ) : r.anonId ? (
                            <span className="font-mono text-muted-foreground">
                              {r.anonId.slice(-6)} (anon)
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top font-mono">
                          {r.props ? JSON.stringify(r.props) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className="mt-2 font-serif text-2xl text-foreground">{value}</div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}
