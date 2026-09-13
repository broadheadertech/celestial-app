import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 03:00 Asia/Manila (19:00 UTC): prune stale login throttling rows and dead sessions.
crons.daily("cleanup auth tables", { hourUTC: 19, minuteUTC: 0 }, internal.services.maintenance.cleanupAuthTables, {});

export default crons;
