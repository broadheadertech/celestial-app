import { v } from "convex/values";
import { publicName } from "../lib/productName";
import { query, QueryCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

/**
 * Public order/reservation tracking for customers without an account.
 *
 * The caller must supply BOTH the code (ORD-XXXXXX from checkout, or RES-… for
 * reservations) and the email used when ordering; anything that doesn't match exactly
 * returns null, so the page can't be used to discover other people's orders. Only
 * customer-safe fields are returned (no notes, staff names, costs or other contacts).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Web orders don't have an indexed code; scan the most recent orders (plenty for this store).
const ORDER_SCAN_LIMIT = 3000;

async function accountEmail(ctx: QueryCtx, userId: string | undefined) {
  if (!userId) return null;
  const id = ctx.db.normalizeId("users", userId);
  if (!id) return null;
  const user = await ctx.db.get(id);
  return user?.email.toLowerCase() ?? null;
}

async function itemLines(ctx: QueryCtx, items: { productId: Doc<"products">["_id"]; quantity: number; price: number }[]) {
  return Promise.all(
    items.map(async (item) => {
      const product = await ctx.db.get(item.productId);
      return { name: product ? publicName(product) : "Item", image: product?.image ?? null, quantity: item.quantity, price: item.price };
    }),
  );
}

export const trackByCode = query({
  args: { code: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    const email = args.email.trim().toLowerCase();
    if (code.length < 8 || code.length > 40 || !EMAIL_RE.test(email)) return null;

    if (code.startsWith("RES-")) {
      const r = await ctx.db
        .query("reservations")
        .withIndex("by_reservation_code", (q) => q.eq("reservationCode", code))
        .first();
      if (!r) return null;
      const matches =
        r.guestInfo?.email.trim().toLowerCase() === email ||
        (await accountEmail(ctx, typeof r.userId === "string" ? r.userId : undefined)) === email;
      if (!matches) return null;

      const lines = r.items?.length
        ? await itemLines(ctx, r.items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.reservedPrice })))
        : r.productId
          ? await itemLines(ctx, [{ productId: r.productId, quantity: r.quantity ?? 1, price: 0 }])
          : [];

      return {
        kind: "reservation" as const,
        code,
        status: r.status,
        paymentStatus: r.paymentStatus ?? "unpaid",
        total: r.totalAmount ?? lines.reduce((s, l) => s + l.price * l.quantity, 0),
        amountPaid: r.amountPaid ?? 0,
        items: lines,
        pickup: r.guestInfo?.pickupSchedule ?? null,
        fulfilment: "pickup" as const,
        expiresAt: r.expiryDate,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }

    if (code.startsWith("ORD-")) {
      const suffix = code.slice(4);
      if (!/^[A-Z0-9]{6}$/.test(suffix)) return null;
      const recent = await ctx.db.query("orders").order("desc").take(ORDER_SCAN_LIMIT);
      for (const o of recent) {
        if (o._id.slice(-6).toUpperCase() !== suffix) continue;
        // placeWebOrder records the customer's email in the notes ("Contact: email · phone").
        const contactLine = /Contact: ([^\n]*)/i.exec(o.notes ?? "")?.[1]?.toLowerCase() ?? "";
        const noteEmail = contactLine.split("·").map((s) => s.trim()).find((s) => EMAIL_RE.test(s));
        const matches = noteEmail === email || (await accountEmail(ctx, o.userId)) === email;
        if (!matches) continue;

        const fulfilmentMatch = /Fulfilment: (pickup|delivery)/i.exec(o.notes ?? "")?.[1]?.toLowerCase();
        return {
          kind: "order" as const,
          code,
          status: o.status,
          paymentStatus: o.paymentStatus ?? "unpaid",
          total: o.totalAmount,
          amountPaid: o.amountPaid ?? 0,
          items: await itemLines(ctx, o.items),
          pickup: null,
          fulfilment: (fulfilmentMatch === "delivery" ? "delivery" : "pickup") as "pickup" | "delivery",
          expiresAt: null,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        };
      }
      return null;
    }

    return null;
  },
});
