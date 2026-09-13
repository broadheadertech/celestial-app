import { mutation, query, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { notifyUserRegistered } from "./notifications";
import { internal } from "../_generated/api";
import { createSession } from "./session";
import { getViewer, isStaffRole, requireSelfOrStaff, requireStaff } from "../lib/authz";
import {
  hashPassword as hashPasswordImpl,
  verifyPassword,
  needsRehash,
  dummyVerify,
  sha256Hex,
} from "../lib/password";
import {
  LOGIN_POLICY,
  PASSWORD_RESET_POLICY,
  clearAttempts,
  getLockMinutes,
  normalizeEmail,
  recordAttempt,
} from "../lib/throttle";

// Password hashing lives in convex/lib/password.ts (PBKDF2-HMAC-SHA256). Re-exported here
// because other modules (admin.ts) import it from auth.
export async function hashPassword(password: string): Promise<string> {
  return hashPasswordImpl(password);
}

const INVALID_CREDENTIALS = "Invalid email or password";
const lockedMessage = (minutes: number) =>
  `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;

/** Revokes a user's live sessions, optionally keeping one (e.g. the caller's own). */
async function revokeUserSessions(
  ctx: MutationCtx,
  userId: Id<"users">,
  keepSessionId?: Id<"sessions"> | null,
): Promise<void> {
  const now = Date.now();
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const session of sessions) {
    if (session._id === keepSessionId || session.revokedAt || session.expiresAt < now) continue;
    await ctx.db.patch(session._id, { revokedAt: now });
  }
}

// Login mutation
//
// Credential failures RETURN { success: false, message } instead of throwing: a thrown error
// would roll back the failed-attempt counter. The client (hooks/useAuth.ts) already treats
// `success === false` as an error and shows `message`.
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const throttleKey = normalizeEmail(email);
    const fail = (message: string) => ({
      success: false as const,
      user: null,
      sessionToken: null,
      message,
    });

    const lockMinutes = await getLockMinutes(ctx, "login", throttleKey);
    if (lockMinutes !== null) {
      return fail(lockedMessage(lockMinutes));
    }

    // Find user by email (as given first, for accounts stored with mixed case)
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user && throttleKey !== email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", throttleKey))
        .first();
    }

    // Unknown email, password-less (Facebook) account, or wrong password all look the same.
    let isValidPassword = false;
    if (user?.passwordHash) {
      isValidPassword = await verifyPassword(password, user.passwordHash);
    } else {
      await dummyVerify(password);
    }

    if (!user || !user.passwordHash || !isValidPassword) {
      const lockedFor = await recordAttempt(ctx, "login", throttleKey, LOGIN_POLICY);
      return fail(lockedFor !== null ? lockedMessage(lockedFor) : INVALID_CREDENTIALS);
    }

    // Check if user is active
    if (user.isActive === false || user.isBanned) {
      return fail("Account is deactivated. Please contact support.");
    }

    await clearAttempts(ctx, "login", throttleKey);

    // Upgrade older hash formats (legacy / salted SHA-256 / fewer iterations) on successful login
    if (needsRehash(user.passwordHash)) {
      await ctx.db.patch(user._id, {
        passwordHash: await hashPassword(password),
        updatedAt: Date.now(),
      });
    }

    const sessionToken = await createSession(ctx, user._id);

    // Return user data without password hash
    const { passwordHash, resetToken, resetTokenExpiry, ...userWithoutPassword } = user;

    return {
      success: true as const,
      user: userWithoutPassword,
      sessionToken,
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
    // Accepted for backwards compatibility but ignored: public sign-up always creates a client.
    // Staff accounts are created from the admin panel (admin.ts).
    role: v.optional(v.union(v.literal("client"), v.literal("admin"), v.literal("super_admin"))),
  },
  handler: async (ctx, { email, password, firstName, lastName, phone }) => {
    const role = "client" as const;
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
    const passwordHash = await hashPassword(password);

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
    const sessionToken = await createSession(ctx, userId);

    const { passwordHash: _, ...userWithoutPassword } = newUser;

    return {
      success: true,
      user: userWithoutPassword,
      sessionToken,
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

    // Only yourself, or staff looking anyone up.
    const viewer = await getViewer(ctx);
    if (!viewer || (viewer._id !== userId && !isStaffRole(viewer.role))) {
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
    await requireSelfOrStaff(ctx, userId);
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
    const viewer = await getViewer(ctx);
    if (!viewer || viewer._id !== userId) {
      throw new Error("You can only change your own password.");
    }
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.passwordHash) {
      throw new Error("This account does not use password authentication");
    }

    // Verify current password
    const isValidCurrentPassword = await verifyPassword(currentPassword, user.passwordHash);
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

    // Hash new password (always uses new secure format)
    const newPasswordHash = await hashPassword(newPassword);

    await ctx.db.patch(userId, {
      passwordHash: newPasswordHash,
      updatedAt: Date.now(),
    });

    // Sign out every other device; keep the session making this call (getViewer already
    // verified the JWT's `sid` belongs to this user and is live).
    const identity = await ctx.auth.getUserIdentity();
    const currentSessionId =
      typeof identity?.sid === "string" ? ctx.db.normalizeId("sessions", identity.sid) : null;
    await revokeUserSessions(ctx, userId, currentSessionId);

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
    await requireSelfOrStaff(ctx, userId);
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
    await requireStaff(ctx);
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
    await requireStaff(ctx);
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

    // Ensure loginMethod is set for Facebook users. Role is forced to client:
    // social sign-up must never be able to create staff accounts.
    const userWithLoginMethod = {
      ...userData,
      role: "client" as const,
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
    await requireSelfOrStaff(ctx, userId);
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

// Reset tokens: 32 random bytes, base64url. Only the SHA-256 of the token is stored in
// users.resetToken, so a database leak doesn't expose usable links.
function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const hashResetToken = (token: string) => sha256Hex(`reset:${token}`);

const RESET_REQUESTED_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

// Request password reset
// Always returns the same result whether or not the email has an account (no enumeration);
// the email is only sent when the account exists and uses a password. Sends via Resend
// (see convex/services/email.ts).
export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const normalizedEmail = normalizeEmail(email);

    // Rate limit per email, counted whether or not the account exists. Throwing is fine
    // here: nothing needs to be recorded for a request that is refused.
    const lockMinutes = await getLockMinutes(ctx, "password_reset", normalizedEmail);
    if (lockMinutes !== null) {
      throw new Error(
        `Too many password reset requests. Try again in ${lockMinutes} minute${lockMinutes === 1 ? "" : "s"}.`,
      );
    }
    await recordAttempt(ctx, "password_reset", normalizedEmail, PASSWORD_RESET_POLICY);

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (user && user.passwordHash) {
      const resetToken = generateResetToken();
      const now = Date.now();

      await ctx.db.patch(user._id, {
        resetToken: await hashResetToken(resetToken),
        resetTokenExpiry: now + 3600000, // 1 hour from now
        updatedAt: now,
      });

      // Note: We use Convex Action because static export doesn't support API routes
      await ctx.scheduler.runAfter(0, internal.services.email.sendPasswordResetEmail, {
        to: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        resetToken,
      });
    }

    return {
      success: true,
      message: RESET_REQUESTED_MESSAGE,
    };
  },
});

// Verify reset token
export const verifyResetToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    if (!token) {
      return { valid: false, message: "Invalid reset token" };
    }
    const tokenHash = await hashResetToken(token);
    const user = await ctx.db
      .query("users")
      .withIndex("by_reset_token", (q) => q.eq("resetToken", tokenHash))
      .first();

    if (!user) {
      return { valid: false, message: "Invalid reset token" };
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      return { valid: false, message: "Reset token has expired" };
    }

    return {
      valid: true,
      userId: user._id,
      email: user.email,
      message: "Token is valid",
    };
  },
});

// Reset password with token
export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { token, newPassword }) => {
    if (!token) {
      throw new Error("Invalid or expired reset token");
    }
    // Find user by reset token
    const tokenHash = await hashResetToken(token);
    const user = await ctx.db
      .query("users")
      .withIndex("by_reset_token", (q) => q.eq("resetToken", tokenHash))
      .first();

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      throw new Error("Reset token has expired. Please request a new password reset link.");
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      throw new Error("Password must contain at least one uppercase letter, one lowercase letter, and one number");
    }

    // Hash new password (always uses new secure format)
    const newPasswordHash = await hashPassword(newPassword);

    // Update user with new password and clear reset token
    await ctx.db.patch(user._id, {
      passwordHash: newPasswordHash,
      resetToken: undefined,
      resetTokenExpiry: undefined,
      updatedAt: Date.now(),
    });

    // Whoever had the old password is signed out everywhere; the account owner can log in
    // again immediately with the new password.
    await revokeUserSessions(ctx, user._id);
    await clearAttempts(ctx, "login", normalizeEmail(user.email));

    return {
      success: true,
      message: "Password has been reset successfully",
    };
  },
});
