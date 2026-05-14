import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire old files",
  { hours: 1 },
  internal.cleanup.expireOldFiles
);

export default crons;
