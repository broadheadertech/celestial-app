import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from 'resend';
import { formatPeso, formatViewingDate, formatViewingTime, storeContactValidator, StoreContact } from "./notifications";

/**
 * EMAIL SENDING SERVICE USING RESEND SDK
 * 
 * This file uses Resend SDK directly to send emails.
 * 
 * WHY CONVEX ACTION?
 * - Next.js static export doesn't support API routes (no Node.js server)
 * - Frontend can't call Resend directly (would expose API key)
 * - Convex Actions provide server-side execution for external API calls
 * 
 * FLOW:
 * 1. Frontend calls Convex mutation (requestPasswordReset in auth.ts)
 * 2. Convex verifies email exists in database
 * 3. Convex schedules this action to send email
 * 4. This action calls Resend SDK directly
 * 5. Email sent via Resend API
 * 
 * This is the ONLY way to use Resend with static export.
 */

export const sendPasswordResetEmail = internalAction({
  args: {
    to: v.string(),
    userName: v.string(),
    resetToken: v.string(),
  },
  handler: async (ctx, { to, userName, resetToken }) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set in environment variables");
      throw new Error("Email service is not configured");
    }

    // ============================================================
    // USING RESEND SDK DIRECTLY (as per Resend documentation)
    // See: https://resend.com/docs/api-reference/emails/send-email
    // ============================================================
    
    const resend = new Resend(resendApiKey);
    
    // Construct reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset_password?token=${resetToken}`;

    try {
      // Direct Resend SDK call (exactly as shown in Resend docs)
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Dragon Cave Inventory <noreply@cda.broadheader.com>",
        to: [to], // Recipient email
        subject: "Reset Your Password - Dragon Cave Inventory",
        html: generatePasswordResetEmailHTML(userName, resetUrl), // HTML content
      });

      if (error) {
        console.error("Resend API error:", error);
        throw new Error(error.message || "Failed to send email");
      }

      console.log("✅ Email sent successfully via Resend:", data?.id);

      return {
        success: true,
        emailId: data?.id,
        message: "Password reset email sent successfully",
      };
    } catch (error) {
      console.error("❌ Error sending password reset email:", error);
      throw new Error("Failed to send password reset email. Please try again later.");
    }
  },
});

// HTML email template for password reset
function generatePasswordResetEmailHTML(userName: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .content p {
      color: #666666;
      margin-bottom: 20px;
      font-size: 16px;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .reset-button {
      display: inline-block;
      padding: 16px 40px;
      background-color: #FF6B00;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.3s ease;
    }
    .reset-button:hover {
      background-color: #FF8C00;
    }
    .info-box {
      background-color: #FFF3E0;
      border-left: 4px solid #FF6B00;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      color: #666666;
      font-size: 14px;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #eeeeee;
    }
    .footer p {
      color: #999999;
      font-size: 14px;
      margin: 5px 0;
    }
    .link-text {
      color: #FF6B00;
      word-break: break-all;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐉 Dragon Cave Inventory</h1>
    </div>
    
    <div class="content">
      <h2>Hello ${userName}!</h2>
      
      <p>We received a request to reset your password for your Dragon Cave Inventory account.</p>
      
      <p>Click the button below to create a new password:</p>
      
      <div class="button-container">
        <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
      </div>
      
      <div class="info-box">
        <p><strong>⏰ This link will expire in 1 hour</strong> for security purposes.</p>
      </div>
      
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p class="link-text">${resetUrl}</p>
      
      <p style="margin-top: 40px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      
      <p style="color: #999999; font-size: 14px; margin-top: 30px;">
        This is an automated message, please do not reply to this email.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Dragon Cave Inventory</strong></p>
      <p>Your trusted aquarium fish and accessories store</p>
      <p style="margin-top: 20px;">
        Need help? Contact us at support@celestialdrakon.com
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Send welcome email to new users
export const sendWelcomeEmail = action({
  args: {
    to: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, { to, userName }) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set in environment variables");
      return { success: false, message: "Email service not configured" };
    }

    // Initialize Resend client
    const resend = new Resend(resendApiKey);

    try {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Dragon Cave Inventory <noreply@cda.broadheader.com>",
        to: [to],
        subject: "Welcome to Dragon Cave Inventory!",
        html: generateWelcomeEmailHTML(userName),
      });

      if (error) {
        console.error("Resend API error:", error);
        return { success: false, message: "Failed to send welcome email" };
      }

      return {
        success: true,
        emailId: data?.id,
        message: "Welcome email sent successfully",
      };
    } catch (error) {
      console.error("Error sending welcome email:", error);
      return { success: false, message: "Failed to send welcome email" };
    }
  },
});

/* ------------------------------------------------------------------------------------------
 * Customer confirmation emails for storefront submissions (web orders, viewing requests,
 * contact messages). Scheduled best-effort from the mutations; they never throw, so a missing
 * API key or a Resend outage only logs — the customer's order/booking/message is already saved.
 * All user-provided text is escaped before it goes into HTML.
 * ------------------------------------------------------------------------------------------ */

const DEFAULT_FROM_ADDRESS = "noreply@cda.broadheader.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips characters that don't belong in a header value (subject, display name). */
function headerSafe(value: string): string {
  return value.replace(/[\r\n<>"]/g, " ").replace(/\s+/g, " ").trim();
}

function fromAddress(store: StoreContact): string {
  return process.env.RESEND_FROM_EMAIL || `${headerSafe(store.storeName) || "Store"} <${DEFAULT_FROM_ADDRESS}>`;
}

type ContactLine = { label: string; text: string; href?: string };

function storeContactLines(store: StoreContact, options: { includeHours: boolean }): ContactLine[] {
  const lines: ContactLine[] = [];
  const address = [store.addressLine, store.city].filter((part) => part.trim()).join(", ");
  if (address) lines.push({ label: "Address", text: address });
  if (store.mapUrl && /^https:\/\//i.test(store.mapUrl)) lines.push({ label: "Map", text: store.mapUrl, href: store.mapUrl });
  const whatsappDigits = store.whatsappNumber.replace(/\D/g, "");
  if (whatsappDigits) {
    lines.push({ label: "WhatsApp", text: `+${whatsappDigits}`, href: `https://wa.me/${whatsappDigits}` });
  }
  if (store.phone) lines.push({ label: "Phone", text: store.phone });
  if (store.landline) lines.push({ label: "Landline", text: store.landline });
  if (store.email) lines.push({ label: "Email", text: store.email, href: `mailto:${store.email}` });
  if (options.includeHours && store.hours) lines.push({ label: "Hours", text: store.hours });
  return lines;
}

type EmailBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "details"; rows: { label: string; value: string }[] }
  | { kind: "items"; rows: { name: string; quantity: number; lineTotal: string }[]; total: string };

/** Renders the same content as simple HTML and plain text. Every string is escaped here. */
function renderEmail(args: {
  store: StoreContact;
  heading: string;
  blocks: EmailBlock[];
  includeHours: boolean;
}): { html: string; text: string } {
  const contact = storeContactLines(args.store, { includeHours: args.includeHours });
  const cell = "padding:6px 0;border-bottom:1px solid #eeeeee;vertical-align:top;";

  const htmlBlocks = args.blocks.map((block) => {
    if (block.kind === "paragraph") {
      return `<p style="margin:0 0 16px;">${escapeHtml(block.text)}</p>`;
    }
    if (block.kind === "details") {
      const rows = block.rows
        .map((row) => `<tr><td style="${cell}color:#777777;width:40%;">${escapeHtml(row.label)}</td><td style="${cell}">${escapeHtml(row.value)}</td></tr>`)
        .join("");
      return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:15px;">${rows}</table>`;
    }
    const rows = block.rows
      .map((row) => `<tr><td style="${cell}">${escapeHtml(row.name)}</td><td style="${cell}text-align:center;width:48px;">&times;${row.quantity}</td><td style="${cell}text-align:right;white-space:nowrap;">${escapeHtml(row.lineTotal)}</td></tr>`)
      .join("");
    return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:15px;">${rows}<tr><td colspan="2" style="padding:10px 0;font-weight:600;">Total</td><td style="padding:10px 0;font-weight:600;text-align:right;white-space:nowrap;">${escapeHtml(block.total)}</td></tr></table>`;
  });

  const contactHtml = contact.length
    ? `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #eeeeee;font-size:14px;color:#555555;">
        <p style="margin:0 0 8px;font-weight:600;color:#333333;">${escapeHtml(args.store.storeName)}</p>
        ${contact
          .map((line) => {
            const value = line.href
              ? `<a href="${escapeHtml(line.href)}" style="color:#b3261e;">${escapeHtml(line.text)}</a>`
              : escapeHtml(line.text);
            return `<p style="margin:0 0 4px;">${escapeHtml(line.label)}: ${value}</p>`;
          })
          .join("")}
      </div>`
    : `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #eeeeee;font-size:14px;color:#555555;"><p style="margin:0;font-weight:600;color:#333333;">${escapeHtml(args.store.storeName)}</p></div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(args.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333333;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <div style="padding:24px 28px;background:#1f1a17;color:#ffffff;">
      <p style="margin:0;font-size:14px;letter-spacing:0.04em;opacity:0.8;">${escapeHtml(args.store.storeName)}</p>
      <h1 style="margin:4px 0 0;font-size:22px;font-weight:600;">${escapeHtml(args.heading)}</h1>
    </div>
    <div style="padding:28px;">
      ${htmlBlocks.join("\n      ")}
      ${contactHtml}
    </div>
  </div>
</body>
</html>`;

  const textBlocks = args.blocks.map((block) => {
    if (block.kind === "paragraph") return block.text;
    if (block.kind === "details") return block.rows.map((row) => `${row.label}: ${row.value}`).join("\n");
    return [
      ...block.rows.map((row) => `${row.quantity} x ${row.name} — ${row.lineTotal}`),
      `Total: ${block.total}`,
    ].join("\n");
  });
  const text = [
    args.heading,
    "",
    textBlocks.join("\n\n"),
    "",
    "—",
    args.store.storeName,
    ...contact.map((line) => `${line.label}: ${line.text}`),
  ].join("\n");

  return { html, text };
}

type SendResult = { success: boolean; skipped?: boolean; emailId?: string };

/** Sends via Resend without ever throwing; logs and reports failure instead. */
async function sendBestEffort(args: {
  kind: string;
  to: string;
  subject: string;
  store: StoreContact;
  content: { html: string; text: string };
  idempotencyKey: string;
}): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn(`RESEND_API_KEY is not set; skipping ${args.kind} email.`);
    return { success: false, skipped: true };
  }

  try {
    const resend = new Resend(resendApiKey);
    const replyTo = args.store.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.store.email) ? args.store.email : undefined;
    const { data, error } = await resend.emails.send(
      {
        from: fromAddress(args.store),
        to: [args.to],
        subject: headerSafe(args.subject),
        html: args.content.html,
        text: args.content.text,
        ...(replyTo ? { replyTo } : {}),
      },
      { idempotencyKey: args.idempotencyKey },
    );
    if (error) {
      console.error(`Resend API error sending ${args.kind} email:`, error);
      return { success: false };
    }
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error(`Error sending ${args.kind} email:`, error);
    return { success: false };
  }
}

export const sendWebOrderConfirmationEmail = internalAction({
  args: {
    to: v.string(),
    orderId: v.string(),
    orderCode: v.string(),
    customerName: v.string(),
    items: v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
    })),
    totalAmount: v.number(),
    fulfilment: v.string(),
    store: storeContactValidator,
  },
  handler: async (_ctx, args): Promise<SendResult> => {
    const content = renderEmail({
      store: args.store,
      heading: `We've received your order ${args.orderCode}`,
      includeHours: true,
      blocks: [
        { kind: "paragraph", text: `Hi ${args.customerName}, thank you for your order with ${args.store.storeName}.` },
        { kind: "details", rows: [
          { label: "Order", value: args.orderCode },
          { label: "Fulfilment", value: args.fulfilment },
        ] },
        {
          kind: "items",
          rows: args.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            lineTotal: formatPeso(item.unitPrice * item.quantity),
          })),
          total: formatPeso(args.totalAmount),
        },
        { kind: "paragraph", text: "Nothing has been charged. We'll contact you to confirm stock, payment and pickup/delivery." },
        { kind: "paragraph", text: `If you have questions, reply to this email or reach us using the details below and mention ${args.orderCode}.` },
      ],
    });
    return await sendBestEffort({
      kind: "web order confirmation",
      to: args.to,
      subject: `Order ${args.orderCode} received — ${args.store.storeName}`,
      store: args.store,
      content,
      idempotencyKey: `web-order-confirmation/${args.orderId}`,
    });
  },
});

export const sendViewingRequestEmail = internalAction({
  args: {
    to: v.string(),
    viewingId: v.string(),
    name: v.string(),
    date: v.string(),
    time: v.string(),
    partySize: v.number(),
    store: storeContactValidator,
  },
  handler: async (_ctx, args): Promise<SendResult> => {
    const content = renderEmail({
      store: args.store,
      heading: "We've received your viewing request",
      includeHours: true,
      blocks: [
        { kind: "paragraph", text: `Hi ${args.name}, thank you for booking a visit to ${args.store.storeName}.` },
        { kind: "details", rows: [
          { label: "Date", value: formatViewingDate(args.date) },
          { label: "Time", value: formatViewingTime(args.time) },
          { label: "Party size", value: `${args.partySize} ${args.partySize === 1 ? "person" : "people"}` },
        ] },
        { kind: "paragraph", text: "This is a request, not yet a confirmed booking. We'll confirm your slot shortly." },
      ],
    });
    return await sendBestEffort({
      kind: "viewing request",
      to: args.to,
      subject: `Viewing request received — ${args.store.storeName}`,
      store: args.store,
      content,
      idempotencyKey: `viewing-request/${args.viewingId}`,
    });
  },
});

export const sendContactAcknowledgementEmail = internalAction({
  args: {
    to: v.string(),
    messageId: v.string(),
    name: v.string(),
    store: storeContactValidator,
  },
  handler: async (_ctx, args): Promise<SendResult> => {
    // The sender's subject/message are intentionally not echoed back, so the open contact form
    // can't be used to relay arbitrary content to third-party inboxes.
    const content = renderEmail({
      store: args.store,
      heading: "Thanks for getting in touch",
      includeHours: false,
      blocks: [
        { kind: "paragraph", text: `Hi ${args.name}, we've received your message and will get back to you as soon as we can.` },
      ],
    });
    return await sendBestEffort({
      kind: "contact acknowledgement",
      to: args.to,
      subject: `We received your message — ${args.store.storeName}`,
      store: args.store,
      content,
      idempotencyKey: `contact-acknowledgement/${args.messageId}`,
    });
  },
});

function generateWelcomeEmailHTML(userName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Dragon Cave Inventory</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 32px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .content p {
      color: #666666;
      margin-bottom: 20px;
      font-size: 16px;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #eeeeee;
    }
    .footer p {
      color: #999999;
      font-size: 14px;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐉 Welcome to Dragon Cave Inventory!</h1>
    </div>
    
    <div class="content">
      <h2>Hello ${userName}!</h2>
      
      <p>Thank you for joining Dragon Cave Inventory! We're thrilled to have you as part of our aquarium community.</p>
      
      <p>🐠 Explore our wide selection of exotic fish, premium aquarium tanks, and high-quality accessories to create your dream aquatic paradise.</p>
      
      <p><strong>What you can do with your account:</strong></p>
      <ul style="color: #666666; padding-left: 20px;">
        <li>Browse and purchase aquarium fish and accessories</li>
        <li>Make reservations for live fish</li>
        <li>Track your orders and reservations</li>
        <li>Manage your profile and preferences</li>
      </ul>
      
      <p style="margin-top: 30px;">If you have any questions or need assistance, our team is here to help!</p>
    </div>
    
    <div class="footer">
      <p><strong>Dragon Cave Inventory</strong></p>
      <p>Your trusted aquarium fish and accessories store</p>
      <p style="margin-top: 20px;">
        Need help? Contact us at support@celestialdrakon.com
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
