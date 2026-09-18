import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 03:00 Asia/Manila (19:00 UTC): prune stale login throttling rows and dead sessions.
crons.daily("cleanup auth tables", { hourUTC: 19, minuteUTC: 0 }, internal.services.maintenance.cleanupAuthTables, {});

// 03:30 Asia/Manila: rebuild the website if products changed, so new/edited products get their
// prerendered page and link preview (no-op until VERCEL_DEPLOY_HOOK_URL is set).
crons.daily("rebuild website if catalog changed", { hourUTC: 19, minuteUTC: 30 }, internal.services.siteBuild.rebuildIfCatalogChanged, {});

export default crons;
