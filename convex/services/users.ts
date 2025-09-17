import { v } from "convex/values";
import { query } from "../_generated/server";

//Query all to get guest emails within a date range
export const getAllGuestEmails = query({
    handler: async (ctx) => {
        const reservations = await ctx.db.query("reservations").collect();

        const emails = reservations
            .map(reservation => reservation.guestInfo?.email)
            .filter(email => email !== undefined && email !== null);

        return emails;
    },
});

// Get email by reservation ID
export const getEmailById = query({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    
    if (!reservation || !reservation.guestInfo?.email) {
      return null;
    }
    
    return reservation.guestInfo.email;
  },
});

// Get email by guestId
export const getEmailByGuestId = query({
  args: {
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("reservations")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .first();
    
    if (!reservation || !reservation.guestInfo?.email) {
      return null;
    }
    
    return reservation.guestInfo.email;
  },
});

// Query to get guest emails within a date range
export const getGuestEmailsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const reservations = await ctx.db.query("reservations").collect();
    
    const filteredReservations = reservations.filter(
      reservation => 
        reservation.reservationDate >= args.startDate &&
        reservation.reservationDate <= args.endDate &&
        reservation.guestInfo?.email
    );
    
    const emails = filteredReservations.map(
      reservation => reservation.guestInfo!.email
    );
    
    return emails;
  },
});


// Get all unique guestInfo from all reservations (no duplicates by name and email)
export const getAllGuestInfo = query({
  handler: async (ctx) => {
    const reservations = await ctx.db.query("reservations").collect();
    
    const guestInfos = reservations
      .filter(reservation => reservation.guestInfo)
      .map(reservation => reservation.guestInfo!);
    
    // Use Map to track unique combinations of name and email
    const uniqueGuestMap = new Map();
    
    guestInfos.forEach(guestInfo => {
      // Create a unique key using name and email (case-insensitive)
      const key = `${guestInfo.name?.toLowerCase()}-${guestInfo.email?.toLowerCase()}`;
      
      // Only add if we haven't seen this combination before
      if (!uniqueGuestMap.has(key)) {
        uniqueGuestMap.set(key, guestInfo);
      }
    });
    
    // Return array of unique guest info objects
    return Array.from(uniqueGuestMap.values());
  },
});


// Get guestInfo by guestId
export const getGuestInfoByGuestId = query({
  args: {
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("reservations")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .first();
    
    if (!reservation || !reservation.guestInfo) {
      return null;
    }
    
    return reservation.guestInfo;
  },
});

