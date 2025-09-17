import { mutation } from "../_generated/server";
import { api } from "../_generated/api";

// Migration to add loginMethod field to existing users
export const fixLoginMethod = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all users without loginMethod
    const usersWithoutLoginMethod = await ctx.db.query("users").collect();

    let updatedCount = 0;

    for (const user of usersWithoutLoginMethod) {
      if (!user.loginMethod) {
        // Determine login method based on existing fields
        const loginMethod = user.facebookId ? "facebook" : "email";

        await ctx.db.patch(user._id, {
          loginMethod,
          updatedAt: Date.now(),
        });

        updatedCount++;
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} users with loginMethod field`,
      updatedCount,
    };
  },
});
