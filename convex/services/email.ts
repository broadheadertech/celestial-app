import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from 'resend';

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
        from: process.env.RESEND_FROM_EMAIL || "Celestial Drakon Aquatics <noreply@cda.broadheader.com>",
        to: [to], // Recipient email
        subject: "Reset Your Password - Celestial Drakon Aquatics",
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
      <h1>🐉 Celestial Drakon Aquatics</h1>
    </div>
    
    <div class="content">
      <h2>Hello ${userName}!</h2>
      
      <p>We received a request to reset your password for your Celestial Drakon Aquatics account.</p>
      
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
      <p><strong>Celestial Drakon Aquatics</strong></p>
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
        from: process.env.RESEND_FROM_EMAIL || "Celestial Drakon Aquatics <noreply@cda.broadheader.com>",
        to: [to],
        subject: "Welcome to Celestial Drakon Aquatics!",
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

function generateWelcomeEmailHTML(userName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Celestial Drakon Aquatics</title>
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
      <h1>🐉 Welcome to Celestial Drakon Aquatics!</h1>
    </div>
    
    <div class="content">
      <h2>Hello ${userName}!</h2>
      
      <p>Thank you for joining Celestial Drakon Aquatics! We're thrilled to have you as part of our aquarium community.</p>
      
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
      <p><strong>Celestial Drakon Aquatics</strong></p>
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
