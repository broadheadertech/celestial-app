import { mutation } from "../_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, { orderId, paymentStatus, amountPaid }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

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

    return { success: true, paymentStatus, amountPaid: finalAmount };
  },
});

// Update payment status on a reservation
export const updateReservationPayment = mutation({
  args: {
    reservationId: v.id("reservations"),
    paymentStatus: paymentStatusValidator,
    amountPaid: v.optional(v.number()),
  },
  handler: async (ctx, { reservationId, paymentStatus, amountPaid }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");

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

    return { success: true, paymentStatus, amountPaid: finalAmount };
  },
});
