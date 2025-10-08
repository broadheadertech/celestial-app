import { mutation, action, query, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const PUSHY_API_KEY = "f4a6c89a619917af76528e00923ab5c8943791d16cf3c387d97137147e4727b9";

// Store or update user's push token
export const savePushToken = mutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    pushToken: v.string(),
  },
  handler: async (ctx, { userId, pushToken }) => {
    console.log("=== savePushToken MUTATION CALLED ===");
    console.log(`   userId: ${userId}`);
    console.log(`   pushToken: ${pushToken.substring(0, 20)}...`);
    
    try {
      // Try to get user by ID (works for Convex IDs and string IDs)
      console.log("🔍 Step 1: Trying to get user by direct ID lookup...");
      const user = await ctx.db.get(userId as any);
      
      if (user) {
        console.log(`✅ User found by ID: ${user.email}`);
        console.log(`   Current pushToken: ${user.pushToken ? user.pushToken.substring(0, 20) + '...' : 'null'}`);
        console.log("💾 Patching user record...");
        
        await ctx.db.patch(user._id, {
          pushToken,
          pushTokenUpdatedAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        console.log("✅ User record patched successfully");
        
        // Verify the update
        const updatedUser = await ctx.db.get(user._id);
        console.log(`✅ Verification - New pushToken: ${updatedUser?.pushToken ? updatedUser.pushToken.substring(0, 20) + '...' : 'null'}`);
        
        return { success: true, message: "Push token saved successfully" };
      }

      // If user not found by direct ID, try to find by Facebook ID
      console.log("⚠️ User not found by direct ID");
      console.log("🔍 Step 2: Trying to find user by Facebook ID...");
      
      const userByFacebook = await ctx.db
        .query("users")
        .withIndex("by_facebook_id", (q) => q.eq("facebookId", userId as string))
        .first();

      if (userByFacebook) {
        console.log(`✅ User found by Facebook ID: ${userByFacebook.email}`);
        console.log("💾 Patching user record...");
        
        await ctx.db.patch(userByFacebook._id, {
          pushToken,
          pushTokenUpdatedAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        console.log("✅ User record patched successfully");
        return { success: true, message: "Push token saved successfully" };
      }

      console.error("❌ User not found by ID or Facebook ID");
      throw new Error("User not found");
    } catch (error) {
      console.error("❌ Error in savePushToken mutation:", error);
      console.error("   Error details:", JSON.stringify(error, null, 2));
      throw error;
    }
  },
});

// Get all admin push tokens for sending notifications
export const getAdminPushTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role")
      .filter((q) => 
        q.or(
          q.eq(q.field("role"), "admin"),
          q.eq(q.field("role"), "super_admin")
        )
      )
      .collect();

    return admins
      .filter(admin => admin.pushToken && admin.isActive !== false)
      .map(admin => ({
        userId: admin._id,
        pushToken: admin.pushToken,
        email: admin.email,
        name: `${admin.firstName} ${admin.lastName}`,
      }));
  },
});

// Get user push token by user ID or email
export const getUserPushToken = internalQuery({
  args: {
    userId: v.optional(v.union(v.id("users"), v.string())),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, { userId, userEmail }) => {
    console.log(`🔍 Looking for push token - userId: ${userId}, userEmail: ${userEmail}`);
    
    if (userId) {
      try {
        // Try to get user by ID
        const user = await ctx.db.get(userId as any);
        if (user) {
          console.log(`✅ Found user by ID: ${user.email}, has token: ${!!user.pushToken}`);
          if (user.pushToken) {
            return {
              userId: user._id,
              pushToken: user.pushToken,
              email: user.email,
              name: `${user.firstName} ${user.lastName}`,
            };
          }
        } else {
          console.log(`⚠️ User not found by direct ID lookup`);
        }

        // Try to find by Facebook ID
        const userByFacebook = await ctx.db
          .query("users")
          .withIndex("by_facebook_id", (q) => q.eq("facebookId", userId as string))
          .first();

        if (userByFacebook) {
          console.log(`✅ Found user by Facebook ID: ${userByFacebook.email}, has token: ${!!userByFacebook.pushToken}`);
          if (userByFacebook.pushToken) {
            return {
              userId: userByFacebook._id,
              pushToken: userByFacebook.pushToken,
              email: userByFacebook.email,
              name: `${userByFacebook.firstName} ${userByFacebook.lastName}`,
            };
          }
        }
      } catch (error) {
        console.error("❌ Error fetching user by ID:", error);
      }
    }

    if (userEmail) {
      console.log(`🔍 Trying to find user by email: ${userEmail}`);
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userEmail))
        .first();

      if (user) {
        console.log(`✅ Found user by email: ${user.email}, has token: ${!!user.pushToken}`);
        if (user.pushToken) {
          return {
            userId: user._id,
            pushToken: user.pushToken,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          };
        }
      } else {
        console.log(`⚠️ User not found by email`);
      }
    }

    console.log(`❌ No push token found for user`);
    return null;
  },
});

// Send push notification via Pushy API
export const sendPushNotification = internalAction({
  args: {
    to: v.union(v.string(), v.array(v.string())), // Device token(s) or topic
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      type: v.optional(v.string()),
      reservationId: v.optional(v.string()),
      orderId: v.optional(v.string()),
      productId: v.optional(v.string()),
      action: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { to, title, message, data }) => {
    try {
      const pushData = {
        title,
        message,
        ...data,
      };

      const payload = {
        to,
        data: pushData,
        notification: {
          badge: 1,
          sound: "default",
          body: message,
          title: title,
        },
      };

      const response = await fetch(
        `https://api.pushy.me/push?api_key=${PUSHY_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pushy API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Push notification sent successfully:", result);
      return { success: true, id: result.id };
    } catch (error) {
      console.error("Error sending push notification:", error);
      throw error;
    }
  },
});

// Send push notification to all admins
export const sendPushToAdmins = action({
  args: {
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      type: v.optional(v.string()),
      reservationId: v.optional(v.string()),
      orderId: v.optional(v.string()),
      productId: v.optional(v.string()),
      action: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { title, message, data }) => {
    try {
      // Get all admin tokens
      const adminTokens = await ctx.runQuery(
        internal.services.pushNotifications.getAdminPushTokens
      );

      if (adminTokens.length === 0) {
        console.log("No admin push tokens found");
        return { success: true, sent: 0 };
      }

      const tokens = adminTokens.map(admin => admin.pushToken);

      // Send push notification to all admins
      const result = await ctx.runAction(
        internal.services.pushNotifications.sendPushNotification,
        {
          to: tokens,
          title,
          message,
          data,
        }
      );

      return { success: true, sent: tokens.length, ...result };
    } catch (error) {
      console.error("❌ Error sending push to admins:", error);
      throw error;
    }
  },
});

// Send push notification to specific user
export const sendPushToUser = action({
  args: {
    userId: v.optional(v.union(v.id("users"), v.string())),
    userEmail: v.optional(v.string()),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      type: v.optional(v.string()),
      reservationId: v.optional(v.string()),
      orderId: v.optional(v.string()),
      productId: v.optional(v.string()),
      action: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { userId, userEmail, title, message, data }) => {
    try {
      console.log(`📤 sendPushToUser called - userId: ${userId}, userEmail: ${userEmail}`);
      console.log(`   Title: ${title}`);
      console.log(`   Message: ${message}`);
      
      if (!userId && !userEmail) {
        console.error("❌ Neither userId nor userEmail provided");
        throw new Error("Either userId or userEmail must be provided");
      }

      // Get user push token
      const userToken = await ctx.runQuery(
        internal.services.pushNotifications.getUserPushToken,
        { userId, userEmail }
      );

      if (!userToken) {
        console.log(`❌ No push token found for user: ${userId || userEmail}`);
        console.log(`   This user may not have opened the mobile app yet`);
        return { success: false, error: "User has no push token" };
      }

      console.log(`✅ Found push token for ${userToken.name} (${userToken.email})`);
      console.log(`   Token: ${userToken.pushToken.substring(0, 20)}...`);

      // Send push notification
      console.log(`📱 Sending push notification via Pushy API...`);
      const result = await ctx.runAction(
        internal.services.pushNotifications.sendPushNotification,
        {
          to: userToken.pushToken,
          title,
          message,
          data,
        }
      );

      console.log(`✅ Push notification sent successfully to ${userToken.name}`);
      return { success: true, ...result };
    } catch (error) {
      console.error("❌ Error sending push to user:", error);
      throw error;
    }
  },
});

// Send push notification to topic (e.g., all clients)
export const sendPushToTopic = action({
  args: {
    topic: v.string(), // e.g., "admins", "clients"
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      type: v.optional(v.string()),
      reservationId: v.optional(v.string()),
      orderId: v.optional(v.string()),
      productId: v.optional(v.string()),
      action: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { topic, title, message, data }) => {
    try {
      // Send push notification to topic
      const result = await ctx.runAction(
        internal.services.pushNotifications.sendPushNotification,
        {
          to: `/topics/${topic}`,
          title,
          message,
          data,
        }
      );

      return { success: true, ...result };
    } catch (error) {
      console.error(`❌ Error sending push to topic ${topic}:`, error);
      throw error;
    }
  },
});

// Remove push token (for logout)
export const removePushToken = mutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
  },
  handler: async (ctx, { userId }) => {
    try {
      // Try to get user by ID
      const user = await ctx.db.get(userId as any);
      
      if (user) {
        await ctx.db.patch(user._id, {
          pushToken: undefined,
          pushTokenUpdatedAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { success: true, message: "Push token removed successfully" };
      }

      // Try to find by Facebook ID
      const userByFacebook = await ctx.db
        .query("users")
        .withIndex("by_facebook_id", (q) => q.eq("facebookId", userId as string))
        .first();

      if (userByFacebook) {
        await ctx.db.patch(userByFacebook._id, {
          pushToken: undefined,
          pushTokenUpdatedAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { success: true, message: "Push token removed successfully" };
      }

      throw new Error("User not found");
    } catch (error) {
      console.error("Error removing push token:", error);
      throw error;
    }
  },
});
