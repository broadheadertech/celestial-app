import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireStaff } from "./lib/authz";

// Generate upload URL for images (staff only — product/associate image uploads in admin)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Get file URL from storage ID (staff only — used right after an admin upload)
export const getFileUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireStaff(ctx);
    return await ctx.storage.getUrl(storageId);
  },
});

// Delete file from storage (staff only)
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireStaff(ctx);
    await ctx.storage.delete(storageId);
    return { success: true };
  },
});
