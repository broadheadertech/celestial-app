import { v } from "convex/values";
import { mutation, query, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { recordAudit } from "./audit";

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const methodValidator = v.union(
  v.literal("cash"),
  v.literal("gcash"),
  v.literal("card"),
  v.literal("bank_transfer"),
  v.literal("other"),
);

const kindValidator = v.union(
  v.literal("downpayment"),
  v.literal("partial"),
  v.literal("full"),
  v.literal("refund"),
  v.literal("legacy"),
);

/**
 * Recompute the reservation's cached payment fields (amountPaid + paymentStatus)
 * from the authoritative ledger. Called after every insert/delete so the cache can
 * never drift from the sum of real payment events.
 */
async function recomputeReservationPaymentCache(
  ctx: MutationCtx,
  reservationId: Id<"reservations">,
) {
  const reservation = await ctx.db.get(reservationId);
  if (!reservation) return;

  const entries = await ctx.db
    .query("reservationPayments")
    .withIndex("by_reservation", (q) => q.eq("reservationId", reservationId))
    .collect();

  const amountPaid = entries.reduce((s, e) => s + e.amount, 0);
  const total = reservation.totalAmount || 0;

  let paymentStatus: "unpaid" | "partial" | "paid" | "refunded";
  if (amountPaid <= 0) {
    // No money on hand. Distinguish a true refund (had paid, now returned) from never-paid.
    paymentStatus = entries.some((e) => e.amount < 0) ? "refunded" : "unpaid";
  } else if (total > 0 && amountPaid >= total - 0.01) {
    paymentStatus = "paid";
  } else {
    paymentStatus = "partial";
  }

  await ctx.db.patch(reservationId, {
    amountPaid: Math.max(0, Math.round(amountPaid * 100) / 100),
    paymentStatus,
    updatedAt: Date.now(),
  });

  return { amountPaid, paymentStatus, total };
}

// ==================== MUTATIONS ====================

/**
 * Record one incremental payment against a reservation (downpayment, partial top-up,
 * or full settlement). The amount is what's collected NOW — not a running total — so
 * staff just enter "add ₱300". Each entry carries its own method and date; cash entries
 * move Cash on Hand at that date. The reservation's amountPaid/paymentStatus are
 * recomputed from the ledger afterward.
 */
export const addReservationPayment = mutation({
  args: {
    reservationId: v.id("reservations"),
    amount: v.number(),
    method: methodValidator,
    kind: v.optional(kindValidator),
    note: v.optional(v.string()),
    date: v.optional(v.number()), // defaults to now; allow backdating a payment that came in earlier
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { reservationId, amount, method, kind, note, date, userId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    const total = reservation.totalAmount || 0;
    const alreadyPaid = reservation.amountPaid || 0;
    // Guard against collecting more than the balance due (small epsilon for rounding/change).
    if (total > 0 && alreadyPaid + amount > total + 0.01) {
      const balance = Math.max(0, total - alreadyPaid);
      throw new Error(
        `Payment of ${peso(amount)} exceeds the remaining balance of ${peso(balance)}.`,
      );
    }

    // Infer kind when not explicitly provided.
    const resolvedKind =
      kind ??
      (alreadyPaid <= 0
        ? "downpayment"
        : alreadyPaid + amount >= total - 0.01 && total > 0
          ? "full"
          : "partial");

    const now = Date.now();
    let recordedByName: string | undefined;
    if (userId) {
      const u = await ctx.db.get(userId);
      if (u) recordedByName = `${u.firstName} ${u.lastName}`.trim();
    }

    const id = await ctx.db.insert("reservationPayments", {
      reservationId,
      amount,
      method,
      kind: resolvedKind,
      note: note?.trim() || undefined,
      date: date || now,
      recordedBy: userId,
      recordedByName,
      createdAt: now,
    });

    const cache = await recomputeReservationPaymentCache(ctx, reservationId);

    await recordAudit(ctx, {
      actorId: userId,
      action: "reservation.payment",
      category: "sales",
      summary: `Reservation ${reservation.reservationCode || "#" + (reservationId as string).slice(-6)} — ${resolvedKind} ${peso(amount)} (${method})${cache ? ` · paid ${peso(cache.amountPaid)} of ${peso(cache.total)}` : ""}`,
      entityTable: "reservationPayments",
      entityId: id,
      amount,
      metadata: { reservationId, method, kind: resolvedKind, balance: cache ? cache.total - cache.amountPaid : undefined },
    });

    return {
      success: true,
      paymentId: id,
      amountPaid: cache?.amountPaid ?? amount,
      paymentStatus: cache?.paymentStatus,
      balance: cache ? Math.max(0, cache.total - cache.amountPaid) : undefined,
    };
  },
});

/**
 * Reverse/delete a single payment entry (e.g. a mistaken key-in). The reservation's
 * cached totals are recomputed from the remaining ledger.
 */
export const deleteReservationPayment = mutation({
  args: {
    paymentId: v.id("reservationPayments"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { paymentId, userId }) => {
    const entry = await ctx.db.get(paymentId);
    if (!entry) throw new Error("Payment entry not found");
    const reservationId = entry.reservationId;
    const reservation = await ctx.db.get(reservationId);

    await ctx.db.delete(paymentId);
    const cache = await recomputeReservationPaymentCache(ctx, reservationId);

    await recordAudit(ctx, {
      actorId: userId,
      action: "reservation.payment.delete",
      category: "sales",
      summary: `Removed ${entry.kind || "payment"} ${peso(entry.amount)} (${entry.method}) from reservation ${reservation?.reservationCode || "#" + (reservationId as string).slice(-6)}`,
      entityTable: "reservationPayments",
      entityId: paymentId,
      amount: entry.amount,
      metadata: { reservationId, deleted: { amount: entry.amount, method: entry.method, kind: entry.kind } },
    });

    return {
      success: true,
      amountPaid: cache?.amountPaid ?? 0,
      paymentStatus: cache?.paymentStatus,
      balance: cache ? Math.max(0, cache.total - cache.amountPaid) : undefined,
    };
  },
});

/**
 * One-time backfill: for every non-cancelled reservation that has a cached amountPaid
 * but no ledger entries yet, create a single "legacy" entry so the payment-flow view
 * and audit history are consistent. Method is "other" so it does NOT retroactively
 * change Cash on Hand (historical reservation cash was never counted toward COH).
 * Idempotent — re-running skips reservations that already have ledger rows.
 */
export const backfillReservationPaymentsLedger = mutation({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, { userId }) => {
    const reservations = await ctx.db.query("reservations").collect();
    let created = 0;
    let skipped = 0;

    for (const r of reservations) {
      const paid = r.amountPaid || 0;
      if (paid <= 0) {
        skipped++;
        continue;
      }
      const existing = await ctx.db
        .query("reservationPayments")
        .withIndex("by_reservation", (q) => q.eq("reservationId", r._id))
        .first();
      if (existing) {
        skipped++;
        continue;
      }

      const ts = r.updatedAt || r.createdAt || Date.now();
      await ctx.db.insert("reservationPayments", {
        reservationId: r._id,
        amount: paid,
        method: "other",
        kind: "legacy",
        note: "Backfilled from existing amount paid (pre-ledger).",
        date: ts,
        recordedBy: userId,
        createdAt: Date.now(),
      });
      created++;
    }

    await recordAudit(ctx, {
      actorId: userId,
      action: "reservation.payment.backfill",
      category: "system",
      summary: `Backfilled reservation payment ledger — ${created} legacy entries created`,
      entityTable: "reservationPayments",
      metadata: { created, skipped },
    });

    return { success: true, created, skipped };
  },
});

// ==================== QUERIES ====================

/**
 * The full payment timeline for one reservation, oldest first, plus a summary
 * (total, paid, balance, status). Powers the payment-flow panel on the detail page.
 */
export const getReservationPayments = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, { reservationId }) => {
    const reservation = await ctx.db.get(reservationId);
    const entries = await ctx.db
      .query("reservationPayments")
      .withIndex("by_reservation", (q) => q.eq("reservationId", reservationId))
      .collect();

    entries.sort((a, b) => a.date - b.date);

    const total = reservation?.totalAmount || 0;
    const paid = entries.reduce((s, e) => s + e.amount, 0);
    const balance = Math.max(0, total - paid);

    // Running balance after each entry, for the timeline.
    let running = 0;
    const timeline = entries.map((e) => {
      running += e.amount;
      return {
        _id: e._id,
        amount: e.amount,
        method: e.method,
        kind: e.kind,
        note: e.note,
        date: e.date,
        recordedByName: e.recordedByName,
        runningPaid: running,
        runningBalance: Math.max(0, total - running),
      };
    });

    return {
      reservationId,
      total,
      paid,
      balance,
      paymentStatus: reservation?.paymentStatus || (paid > 0 ? "partial" : "unpaid"),
      count: entries.length,
      timeline,
    };
  },
});
