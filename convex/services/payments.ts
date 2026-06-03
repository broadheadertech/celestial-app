import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { recordAudit } from "./audit";

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const paymentStatusValidator = v.union(
  v.literal("unpaid"),
  v.literal("partial"),
  v.literal("paid"),
  v.literal("refunded"),
);

// Update payment status on an order
export const updateOrderPayment = mutation({
  args: {
    orderId: v.id("orders"),
    paymentStatus: paymentStatusValidator,
    amountPaid: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { orderId, paymentStatus, amountPaid, userId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    const prevStatus = order.paymentStatus || "unpaid";

    let finalAmount = amountPaid;
    if (paymentStatus === "paid" && (finalAmount === undefined || finalAmount === 0)) {
      finalAmount = order.totalAmount;
    }
    if (paymentStatus === "unpaid") finalAmount = 0;
    if (paymentStatus === "refunded") finalAmount = 0;

    if (paymentStatus === "partial") {
      if (!finalAmount || finalAmount <= 0 || finalAmount >= order.totalAmount) {
        throw new Error(`Partial amount must be between 0 and ${order.totalAmount}`);
      }
    }

    await ctx.db.patch(orderId, {
      paymentStatus,
      amountPaid: finalAmount,
      updatedAt: Date.now(),
    });

    await recordAudit(ctx, {
      actorId: userId,
      action: paymentStatus === "refunded" ? "order.refund" : "order.payment",
      category: "sales",
      summary: `Order #${(orderId as string).slice(-6)} payment ${prevStatus} → ${paymentStatus}${finalAmount ? ` (${peso(finalAmount)})` : ""}`,
      entityTable: "orders",
      entityId: orderId,
      amount: finalAmount,
      metadata: { from: prevStatus, to: paymentStatus, customerName: order.customerName },
    });

    return { success: true, paymentStatus, amountPaid: finalAmount };
  },
});

// Update payment status on a reservation
export const updateReservationPayment = mutation({
  args: {
    reservationId: v.id("reservations"),
    paymentStatus: paymentStatusValidator,
    amountPaid: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { reservationId, paymentStatus, amountPaid, userId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");
    const prevStatus = reservation.paymentStatus || "unpaid";

    const total = reservation.totalAmount || 0;
    let finalAmount = amountPaid;
    if (paymentStatus === "paid" && (finalAmount === undefined || finalAmount === 0)) {
      finalAmount = total;
    }
    if (paymentStatus === "unpaid") finalAmount = 0;
    if (paymentStatus === "refunded") finalAmount = 0;

    if (paymentStatus === "partial") {
      if (!finalAmount || finalAmount <= 0 || finalAmount >= total) {
        throw new Error(`Partial amount must be between 0 and ${total}`);
      }
    }

    await ctx.db.patch(reservationId, {
      paymentStatus,
      amountPaid: finalAmount,
      updatedAt: Date.now(),
    });

    await recordAudit(ctx, {
      actorId: userId,
      action: paymentStatus === "refunded" ? "reservation.refund" : "reservation.payment",
      category: "sales",
      summary: `Reservation ${reservation.reservationCode || "#" + (reservationId as string).slice(-6)} payment ${prevStatus} → ${paymentStatus}${finalAmount ? ` (${peso(finalAmount)})` : ""}`,
      entityTable: "reservations",
      entityId: reservationId,
      amount: finalAmount,
      metadata: { from: prevStatus, to: paymentStatus },
    });

    return { success: true, paymentStatus, amountPaid: finalAmount };
  },
});
