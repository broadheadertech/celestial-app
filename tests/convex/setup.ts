/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";

// Every Convex module (including _generated) so convex-test can resolve function references.
export const modules = import.meta.glob("../../convex/**/*.*s");

export function newTest() {
  return convexTest(schema, modules);
}

type T = ReturnType<typeof newTest>;
type Role = "client" | "admin" | "super_admin";

/**
 * Creates a user with a live session and returns a client authenticated as them, the same
 * way the app is: identity subject = user id, custom `sid` claim = session id.
 */
export async function signedInAs(t: T, role: Role, email = `${role}-${Math.random().toString(36).slice(2)}@example.test`) {
  const { userId, sessionId } = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email,
      firstName: "Test",
      lastName: role,
      role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      tokenHash: `hash-${userId}`,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });
    return { userId, sessionId };
  });
  return { userId, sessionId, email, as: t.withIdentity({ subject: userId, sid: sessionId }) };
}

export async function seedCatalog(t: T) {
  return t.run(async (ctx) => {
    const now = Date.now();
    const fishCat = await ctx.db.insert("categories", { name: "Fish", isActive: true, createdAt: now, updatedAt: now });
    const gearCat = await ctx.db.insert("categories", { name: "Accessories", isActive: true, createdAt: now, updatedAt: now });
    const base = { image: "https://example.test/p.png", isActive: true, createdAt: now, updatedAt: now };
    const fish = await ctx.db.insert("products", { ...base, name: "Super Red Arowana", price: 200000, costPrice: 120000, categoryId: fishCat, stock: 1 });
    const gear = await ctx.db.insert("products", { ...base, name: "Aquarium Light", price: 1500, costPrice: 900, movingAverageCost: 950, categoryId: gearCat, stock: 10 });
    const gearAsEnquire = await ctx.db.insert("products", { ...base, name: "Custom Tank Build", price: 50000, categoryId: gearCat, stock: 2, purchaseMode: "enquire" });
    const inactive = await ctx.db.insert("products", { ...base, name: "Hidden Item", price: 10, categoryId: gearCat, stock: 5, isActive: false });
    return { fishCat, gearCat, fish, gear, gearAsEnquire, inactive } as Record<string, Id<any>>;
  });
}

/** Extracts the machine-readable code from an authz ConvexError. */
export async function authErrorCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (e) {
    const data = (e as { data?: unknown }).data;
    if (data && typeof data === "object" && "code" in data) return String((data as { code: unknown }).code);
    const msg = e instanceof Error ? e.message : String(e);
    return /UNAUTHENTICATED/.test(msg) ? "UNAUTHENTICATED" : /FORBIDDEN/.test(msg) ? "FORBIDDEN" : `OTHER: ${msg.slice(0, 120)}`;
  }
}
