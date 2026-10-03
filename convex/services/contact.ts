import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { submitGeneralInquiry } from "./inquiries";

/**
 * The public /contact form. Messages now live in the shared inquiries inbox
 * (convex/services/inquiries.ts) alongside product enquiries, so there's one place to work from.
 *
 * This mutation is kept because the deployed static site still calls it — the storefront only
 * picks up a rename on its next deploy. It validates and inserts through `createGeneralInquiry`,
 * so both paths behave identically. The old `contactMessages` rows are copied across once by
 * `inquiries.backfillContactMessages`; nothing writes to that table any more.
 */
export const createContactMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    // Kept for client compatibility; the sender is derived from the session instead.
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { success, inquiryId } = await submitGeneralInquiry(ctx, {
      name: args.name,
      email: args.email,
      phone: args.phone,
      subject: args.subject,
      message: args.message,
    });
    // The old shape returned `id`; keep it so an older build of the site still works.
    return { success, id: inquiryId };
  },
});
