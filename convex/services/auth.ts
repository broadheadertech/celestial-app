import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { notifyUserRegistered } from "./notifications";

// Simple password hashing (for demo - in production use proper crypto)
function hashPassword(password: string): string {
  // This is a simple hash for demo purposes
  // In production, you should use a proper password hashing library
  // that works with Convex or implement server-side hashing
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString() + password.length.toString();
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

// Login mutation
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Check if user is active
    if (user.isActive === false) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    // Return user data without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    
    return {
      success: true,
      user: userWithoutPassword,
      message: "Login successful",
    };
  },
});

// Register mutation
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(v.union(v.literal("client"), v.literal("admin"), v.literal("super_admin"))),
  },
  handler: async (ctx, { email, password, firstName, lastName, phone, role = "client" }) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error("Password must contain at least one uppercase letter, one lowercase letter, and one number");
    }

    // Validate names
    if (!firstName.trim() || !lastName.trim()) {
      throw new Error("First name and last name are required");
    }

    // Validate phone number if provided
    if (phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(phone.replace(/\s/g, ""))) {
      throw new Error("Please enter a valid phone number");
    }

    // Hash password
    const passwordHash = hashPassword(password);

    const now = Date.now();

    // Create user
    const userId = await ctx.db.insert("users", {
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim(),
      passwordHash,
      role,
      isActive: true,
      loginMethod: "email", // Default to email for password-based registration
      createdAt: now,
      updatedAt: now,
    });

    // Get created user
    const newUser = await ctx.db.get(userId);
    if (!newUser) {
      throw new Error("Failed to create user");
    }

    // Create notification for admin about new user registration
    if (role === "client") {
      await notifyUserRegistered(ctx, {
        userId: userId as string,
        userName: `${firstName.trim()} ${lastName.trim()}`,
        userEmail: email.toLowerCase(),
      });
    }

    // Return user data without password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    return {
      success: true,
      user: userWithoutPassword,
      message: "Account created successfully",
    };
  },
});

// Get current user by ID
export const getCurrentUser = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { userId }) => {
    if (!userId) {
      return null;
    }
    
    const user = await ctx.db.get(userId);
    
    if (!user) {
      return null; // Return null instead of throwing error
    }

    if (user.isActive === false) {
      return null; // Return null for deactivated users
    }

    // Return user data without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { userId, firstName, lastName, phone }) => {
    const user = await ctx.db.get(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (firstName !== undefined) {
      if (!firstName.trim()) {
        throw new Error("First name cannot be empty");
      }
      updateData.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (!lastName.trim()) {
        throw new Error("Last name cannot be empty");
      }
      updateData.lastName = lastName.trim();
    }

    if (phone !== undefined) {
      if (phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(phone.replace(/\s/g, ""))) {
        throw new Error("Please enter a valid phone number");
      }
      updateData.phone = phone?.trim();
    }

    await ctx.db.patch(userId, updateData);

    const updatedUser = await ctx.db.get(userId);
    if (!updatedUser) {
      throw new Error("Failed to update user");
    }

    // Return user data without password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return {
      success: true,
      user: userWithoutPassword,
      message: "Profile updated successfully",
    };
  },
});

// Change password
export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { userId, currentPassword, newPassword }) => {
    const user = await ctx.db.get(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isValidCurrentPassword = verifyPassword(currentPassword, user.passwordHash);
    if (!isValidCurrentPassword) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      throw new Error("New password must contain at least one uppercase letter, one lowercase letter, and one number");
    }

    // Hash new password
    const newPasswordHash = hashPassword(newPassword);

    await ctx.db.patch(userId, {
      passwordHash: newPasswordHash,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  },
});

// Deactivate user account
export const deactivateAccount = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(userId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Account deactivated successfully",
    };
  },
});

// Get user by Facebook ID
export const getUserByFacebookId = query({
  args: {
    facebookId: v.string(),
  },
  handler: async (ctx, { facebookId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_facebook_id", (q) => q.eq("facebookId", facebookId))
      .first();

    if (!user) {
      return null;
    }

    // Return user data without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});

// Get user by email (for Facebook auth)
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return null;
    }

    // Return user data without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});

// Create Facebook user
export const createFacebookUser = mutation({
  args: {
    userData: v.object({
      email: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      phone: v.optional(v.string()),
      role: v.union(v.literal("client"), v.literal("admin"), v.literal("super_admin")),
      isActive: v.boolean(),
      facebookId: v.optional(v.string()),
      profilePicture: v.optional(v.string()),
      loginMethod: v.union(v.literal("email"), v.literal("facebook")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  },
  handler: async (ctx, { userData }) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userData.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Ensure loginMethod is set for Facebook users
    const userWithLoginMethod = {
      ...userData,
      loginMethod: userData.loginMethod || "facebook", // Default to facebook if not provided
    };

    const userId = await ctx.db.insert("users", userWithLoginMethod);

    // Get created user
    const newUser = await ctx.db.get(userId);
    if (!newUser) {
      throw new Error("Failed to create user");
    }

    // Create notification for admin about new user registration
    if (userData.role === "client") {
      await notifyUserRegistered(ctx, {
        userId: userId as string,
        userName: `${userData.firstName} ${userData.lastName}`,
        userEmail: userData.email,
      });
    }

    // Return user data without password hash
    const { passwordHash, ...userWithoutPassword } = newUser;

    return {
      success: true,
      user: userWithoutPassword,
      message: "Facebook account created successfully",
    };
  },
});

// Update user Facebook data
export const updateUserFacebookData = mutation({
  args: {
    userId: v.id("users"),
    facebookId: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    loginMethod: v.union(v.literal("email"), v.literal("facebook")),
  },
  handler: async (ctx, { userId, facebookId, profilePicture, loginMethod }) => {
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = {
      updatedAt: Date.now(),
      loginMethod,
    };

    if (facebookId !== undefined) {
      updateData.facebookId = facebookId;
    }

    if (profilePicture !== undefined) {
      updateData.profilePicture = profilePicture;
    }

    await ctx.db.patch(userId, updateData);

    const updatedUser = await ctx.db.get(userId);
    if (!updatedUser) {
      throw new Error("Failed to update user");
    }

    // Return user data without password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return {
      success: true,
      user: userWithoutPassword,
      message: "Facebook data updated successfully",
    };
  },
});