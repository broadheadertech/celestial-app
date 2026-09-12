import { v } from "convex/values";
import { action, internalQuery, mutation, query, MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getViewer } from "../lib/authz";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const JWT_TTL_SECONDS = 60 * 60; // 1 hour; the client refreshes automatically
export const JWT_AUDIENCE = "celestial-app";

// ---------- encoding helpers ----------

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlFromString(s: string): string {
  return base64UrlFromBytes(new TextEncoder().encode(s));
}

function bytesFromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- session lifecycle (called from auth.ts) ----------

/** Creates a session for a user who just proved who they are. Returns the raw token. */
export async function createSession(ctx: MutationCtx, userId: Id<"users">): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = base64UrlFromBytes(bytes);
  const now = Date.now();
  await ctx.db.insert("sessions", {
    userId,
    tokenHash: await sha256Hex(token),
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  return token;
}

/** Revokes a session. Safe to call with an unknown or already-revoked token. */
export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const tokenHash = await sha256Hex(sessionToken);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (session && !session.revokedAt) {
      await ctx.db.patch(session._id, { revokedAt: Date.now() });
    }
    return null;
  },
});

export const validateSession = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (!session || session.revokedAt || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user || user.isActive === false || user.isBanned) return null;
    return { sessionId: session._id, userId: user._id };
  },
});

/**
 * Exchanges a session token for a signed JWT. Returns null when the session is no longer
 * valid, which tells the client to sign the user out.
 */
export const issueToken = action({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }): Promise<string | null> => {
    const session = await ctx.runQuery(internal.services.session.validateSession, {
      tokenHash: await sha256Hex(sessionToken),
    });
    if (!session) return null;

    const privateKeyB64 = process.env.JWT_PRIVATE_KEY;
    const issuer = process.env.CONVEX_SITE_URL;
    if (!privateKeyB64 || !issuer) {
      throw new Error("Auth is not configured: set JWT_PRIVATE_KEY on the Convex deployment.");
    }

    const key = await crypto.subtle.importKey(
      "pkcs8",
      bytesFromBase64(privateKeyB64),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT", kid: "celestial-1" };
    const payload = {
      iss: issuer,
      aud: JWT_AUDIENCE,
      sub: session.userId,
      sid: session.sessionId,
      iat: now,
      exp: now + JWT_TTL_SECONDS,
    };
    const signingInput = `${base64UrlFromString(JSON.stringify(header))}.${base64UrlFromString(JSON.stringify(payload))}`;
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(signingInput),
    );
    return `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`;
  },
});

/** The signed-in user as the server sees them (null for guests or dead sessions). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;
    const { passwordHash, resetToken, resetTokenExpiry, ...safe } = user;
    return safe;
  },
});
