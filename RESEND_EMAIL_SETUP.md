# Resend Email Integration Guide

## Overview

This guide explains how to set up and use Resend for sending emails in the Celestial Drakon Aquatics application, specifically for the password reset functionality.

## Why Convex Actions Instead of Next.js API Routes?

**Important**: This app uses Next.js **static export** (`output: "export"`) for Capacitor mobile deployment. This means:
- ❌ Next.js API routes **DO NOT WORK** in production (they're excluded from static builds)
- ✅ Convex Actions work perfectly because they run on Convex's servers, not Next.js

Therefore, we use **Convex Actions** to send emails via Resend API.

---

## Setup Instructions

### 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (includes 3,000 emails/month, 100 emails/day)
3. Verify your email address

### 2. Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "Celestial Drakon Aquatics - Production")
5. Copy the API key (starts with `re_`)
6. ⚠️ **Save it securely** - you won't be able to see it again

### 3. Configure Your Domain (Optional but Recommended)

For production, you should send emails from your own domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `celestialdrakon.com`)
4. Add the DNS records shown by Resend to your domain provider
5. Wait for verification (usually takes a few minutes)

**Without domain verification**, you can only send to verified email addresses.

### 4. Add Environment Variables

Add the following to your `.env.local` file (create it if it doesn't exist):

```env
# Resend Email Service
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@yourdomain.com>

# Application URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For production**, update these in your Convex dashboard:
1. Go to your Convex project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `RESEND_API_KEY` = your production API key
   - `RESEND_FROM_EMAIL` = your verified email address
   - `NEXT_PUBLIC_APP_URL` = your production URL (e.g., `https://celestialdrakon.com`)

---

## Architecture

### Email Flow

```
1. User requests password reset
   ↓
2. Frontend calls Convex mutation: requestPasswordReset()
   ↓
3. Mutation generates token, saves to DB
   ↓
4. Mutation schedules internal action: sendResetEmailInternal()
   ↓
5. Action calls Resend API via: sendPasswordResetEmail()
   ↓
6. Email sent to user with reset link
```

### File Structure

```
convex/services/
├── auth.ts                    # Password reset mutation
└── email.ts                   # Resend email actions

app/auth/
├── forgot_password/page.tsx   # Request reset page
└── reset_password/page.tsx    # Reset password page
```

---

## Usage

### Password Reset Email

The email is automatically sent when a user requests a password reset:

```typescript
// Frontend (forgot_password page)
const requestPasswordReset = useMutation(api.services.auth.requestPasswordReset);
await requestPasswordReset({ email: "user@example.com" });
```

**Email includes**:
- Personalized greeting with user's name
- Reset button with secure token link
- Link expires in 1 hour
- Security notice
- Branded HTML template

### Welcome Email (Optional)

You can send welcome emails to new users:

```typescript
// In your registration flow
import { api } from "@/convex/_generated/api";

await ctx.scheduler.runAfter(0, internal.services.email.sendWelcomeEmail, {
  to: user.email,
  userName: `${user.firstName} ${user.lastName}`,
});
```

---

## Customizing Email Templates

### Password Reset Email

Edit the HTML template in `convex/services/email.ts`:

```typescript
function generatePasswordResetEmailHTML(userName: string, resetUrl: string): string {
  // Customize the HTML here
}
```

**Current features**:
- Responsive design
- Brand colors (#FF6B00 orange)
- Mobile-friendly
- Professional layout

### Adding New Email Types

1. Create a new action in `convex/services/email.ts`:

```typescript
export const sendCustomEmail = internalAction({
  args: {
    to: v.string(),
    // Add your custom args
  },
  handler: async (ctx, args) => {
    // Email sending logic
  },
});
```

2. Call it from your mutation using scheduler:

```typescript
await ctx.scheduler.runAfter(0, internal.services.email.sendCustomEmail, {
  to: "user@example.com",
  // Your args
});
```

---

## Testing

### Development Testing

1. **Test with Resend Sandbox**:
   - Use the default sandbox email: `delivered@resend.dev`
   - No domain verification needed
   - Perfect for development

2. **Test with Your Email**:
   - Add your email to Resend's verified list
   - Go to **API Keys** → **Verify Email**
   - Enter your email and verify

### Test Flow

1. Start development server: `npm run dev`
2. Go to forgot password page
3. Enter test email
4. Check email inbox
5. Click reset link
6. Verify redirect to reset password page

---

## Troubleshooting

### Email Not Sending

**Check Convex logs**:
1. Go to Convex dashboard
2. Navigate to **Logs**
3. Look for error messages from `sendPasswordResetEmail`

**Common issues**:
- ❌ Missing `RESEND_API_KEY` environment variable
- ❌ Invalid API key
- ❌ Using unverified "from" email
- ❌ Domain not verified (for custom domains)

### Email Going to Spam

**Solutions**:
1. Verify your domain in Resend
2. Add SPF, DKIM, DMARC records
3. Use a professional "from" address
4. Avoid spam trigger words in subject/body

### Reset Link Not Working

**Check**:
1. `NEXT_PUBLIC_APP_URL` is set correctly
2. Token hasn't expired (1 hour limit)
3. User hasn't already used the token
4. Network connectivity

---

## Best Practices

### Security

1. ✅ **Never expose API keys** in frontend code
2. ✅ Use `internalAction` for email sending (not public `action`)
3. ✅ Validate email addresses before sending
4. ✅ Rate limit password reset requests
5. ✅ Use secure HTTPS URLs in production

### Performance

1. ✅ Use scheduler for async email sending (non-blocking)
2. ✅ Don't wait for email confirmation before responding to user
3. ✅ Handle email failures gracefully (log but don't block)

### User Experience

1. ✅ Send confirmation even if email doesn't exist (security)
2. ✅ Use clear, branded templates
3. ✅ Include alternative text instructions
4. ✅ Provide support contact in emails

---

## Rate Limits

### Resend Free Tier

- **3,000 emails/month**
- **100 emails/day**
- **10 API requests/second**

### Upgrade Options

| Plan | Monthly Emails | Daily Limit | Price |
|------|----------------|-------------|-------|
| Free | 3,000 | 100 | $0 |
| Pro | 50,000 | 10,000 | $20/mo |
| Business | 100,000+ | Custom | Custom |

---

## Production Checklist

Before deploying to production:

- [ ] Resend account created and verified
- [ ] Domain verified in Resend (recommended)
- [ ] API key added to Convex environment variables
- [ ] `RESEND_FROM_EMAIL` set to verified email
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Email templates tested with actual emails
- [ ] SPF/DKIM/DMARC records added to DNS
- [ ] Spam testing completed
- [ ] Error handling tested
- [ ] Rate limiting implemented (if needed)

---

## Alternative Solutions (Not Recommended)

### Why Not Next.js API Routes?

```typescript
// ❌ This WON'T work in production with static export
app/api/send-email/route.ts  // Excluded from static build
```

### Why Not Client-Side Resend?

```typescript
// ❌ This exposes your API key to users
const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_KEY); // DANGEROUS!
```

### Why Convex Actions ARE the Solution

```typescript
// ✅ Runs on Convex servers, not Next.js
// ✅ Works with static export
// ✅ API key stays server-side
// ✅ Can be called from mutations/queries
export const sendEmail = internalAction({ ... });
```

---

## Support Resources

- **Resend Docs**: https://resend.com/docs
- **Convex Actions**: https://docs.convex.dev/functions/actions
- **Resend React Email**: https://react.email (for advanced templates)
- **Support**: support@celestialdrakon.com

---

## Summary

✅ **What Works**:
- Convex Actions for email sending
- Resend API integration
- Password reset emails
- Welcome emails
- Custom HTML templates

❌ **What Doesn't Work**:
- Next.js API routes (due to static export)
- Client-side email sending (security risk)
- Server-side rendering for emails (not needed)

🎯 **Best Practice**: Use Convex Actions + Resend for all email needs in this static-export application.

---

**Last Updated**: February 2025
**Version**: 1.0.0
