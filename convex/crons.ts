import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire old files",
  { hours: 1 },
  internal.cleanup.expireOldFiles
);

// Self-improving loop: cluster recent command failures and file distilled
// prompt-fix lessons for admin review. Never auto-applies anything.
crons.interval(
  "review failures and learn",
  { hours: 6 },
  internal.reviewFailures.reviewFailures
);

// Analytics rollup. Computes yesterday's per-event counters into
// eventDailyRollup so the admin dashboard can chart long ranges without
// scanning the raw events table, and prunes raw rows past retention.
crons.daily(
  "analytics rollup",
  { hourUTC: 0, minuteUTC: 30 },
  internal.events.rollupYesterday
);

export default crons;
