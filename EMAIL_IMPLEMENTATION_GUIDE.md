# Email Implementation Guide - Celestial Drakon Aquatics

## 📧 Overview

This application uses **Resend** for email delivery via **Convex Actions**. This architecture is necessary because the app uses Next.js static export for Capacitor mobile deployment, which doesn't support Next.js API routes.

## 🏗️ Architecture

### Why Convex Actions?

```
┌─────────────────────────────────────────────────────────────┐
│  Traditional Next.js API Route (❌ NOT AVAILABLE)           │
│  - Requires Node.js server                                   │
│  - Not compatible with static export                         │
│  - Can't be bundled in APK                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Convex Actions (✅ CURRENT IMPLEMENTATION)                 │
│  - Works with static export                                  │
│  - Server-side execution on Convex cloud                     │
│  - Compatible with mobile APK deployment                     │
│  - Can make external API calls (Resend)                      │
└─────────────────────────────────────────────────────────────┘
```

### Email Flow Diagram

```
User Action (Forgot Password)
         ↓
Frontend Component (forgot_password/page.tsx)
         ↓
Convex Mutation (requestPasswordReset)
         ↓
Generate Reset Token
         ↓
Schedule Internal Action (sendResetEmailInternal)
         ↓
Call Email Service (sendPasswordResetEmail)
         ↓
Resend SDK → Email Delivered 📬
```

## 📁 File Structure

```
celestial-app/
├── convex/
│   └── services/
│       ├── email.ts               # ✅ Email service (Convex Actions)
│       └── auth.ts                # Password reset logic
│
├── components/
│   ├── emails/
│   │   ├── PasswordResetEmail.tsx # ✅ Password reset template
│   │   └── WelcomeEmail.tsx       # ✅ Welcome email template
│   └── email-template.tsx         # ⚠️  Legacy (not used)
│
├── app/
│   ├── api/send/route.ts          # ⚠️  Non-functional (static export)
│   └── auth/
│       ├── forgot_password/page.tsx
│       └── reset_password/page.tsx
│
└── .env.local                     # Local environment variables
```

## 🔧 Setup Instructions

### 1. Get Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up or log in
3. Navigate to **API Keys** → **Create API Key**
4. Copy your API key (starts with `re_`)

### 2. Verify Your Domain

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Add your domain (e.g., `yourdomain.com`)
4. Add the required DNS records:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
5. Wait for verification (usually takes a few minutes)

**For development/testing:**
You can use `delivered@resend.dev` as a test recipient without domain verification.

### 3. Configure Environment Variables

#### In `.env.local` (for Next.js):

```env
# Resend Configuration
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### In Convex Dashboard (IMPORTANT!):

Since Convex Actions run on Convex servers, you must also add these environment variables to Convex:

1. Go to [Convex Dashboard](https://dashboard.convex.dev/)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add the following:

```
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Click **Save**
6. Redeploy your Convex functions: `npx convex dev` or `npx convex deploy`

### 4. Install Dependencies

```bash
npm install resend
```

Already installed in this project ✅

## 📝 Email Templates

### PasswordResetEmail.tsx

Professional HTML email template for password reset with:
- Branded header with gradient
- Prominent "Reset Password" button
- Expiry warning (1 hour)
- Fallback plain-text link
- Responsive design
- Mobile-friendly styling

### WelcomeEmail.tsx

Welcome email for new users with:
- Warm greeting
- Feature highlights
- Call-to-action button
- Support information

## 🔨 How to Use

### Sending Password Reset Email

The password reset email is **automatically sent** when a user requests a password reset:

```typescript
// In forgot_password/page.tsx
const result = await requestPasswordReset({ email: email.toLowerCase() });

// This triggers:
// 1. Token generation in convex/services/auth.ts
// 2. Email scheduling via internal action
// 3. Email sending via convex/services/email.ts
```

### Sending Welcome Email

To send a welcome email when a user registers:

```typescript
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const sendWelcome = useMutation(api.services.email.sendWelcomeEmail);

// Call after successful registration
await sendWelcome({
  to: userEmail,
  userName: `${firstName} ${lastName}`
});
```

## 🧪 Testing

### Test Password Reset Flow

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to forgot password:**
   ```
   http://localhost:3000/auth/forgot_password
   ```

3. **Enter a valid user email** (user must exist in database)

4. **Check Resend dashboard:**
   - Go to [Resend Emails](https://resend.com/emails)
   - You should see the email in the list
   - Click to view the email content

5. **Check email inbox:**
   - Email should arrive within seconds
   - Click the reset link
   - Should redirect to `/auth/reset_password?token=...`

### Test with Delivered@resend.dev

For development without domain verification:

```typescript
// In convex/services/email.ts
await resend.emails.send({
  from: 'onboarding@resend.dev', // Use Resend's test domain
  to: ['delivered@resend.dev'],   // Use test recipient
  subject: 'Test Email',
  html: '...'
});
```

## 🐛 Troubleshooting

### Issue: "Email service is not configured"

**Cause:** `RESEND_API_KEY` not set in Convex environment variables.

**Solution:**
1. Check Convex Dashboard → Settings → Environment Variables
2. Ensure `RESEND_API_KEY` is set
3. Redeploy: `npx convex dev` or `npx convex deploy`

### Issue: "Failed to send email" or 403 error

**Cause:** Invalid API key or domain not verified.

**Solution:**
1. Verify API key is correct
2. Check domain verification status in Resend dashboard
3. For testing, use `onboarding@resend.dev` as sender

### Issue: Email sent but not received

**Possible causes:**
1. **Spam folder:** Check spam/junk folder
2. **Wrong email:** Verify email address is correct
3. **Domain issues:** DNS records not properly configured
4. **Rate limits:** Check Resend dashboard for delivery status

**Debug steps:**
1. Check Convex logs for errors
2. Check Resend dashboard → Emails → Filter by status
3. Look for bounce or failure notifications

### Issue: Reset link doesn't work

**Cause:** `NEXT_PUBLIC_APP_URL` not set correctly.

**Solution:**
1. Check `.env.local` has `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. For production, set to your production domain
3. Restart development server

### Issue: API route not working

**Expected behavior:** The API route at `/app/api/send/route.ts` is **intentionally non-functional** due to static export. See the comments in that file for details.

**Solution:** Use Convex Actions as documented above.

## 📊 Monitoring

### Check Email Delivery Status

1. **Resend Dashboard:**
   ```
   https://resend.com/emails
   ```
   - View all sent emails
   - Check delivery status
   - See open rates (if enabled)

2. **Convex Logs:**
   ```bash
   npx convex logs
   ```
   - Watch for email service logs
   - Check for errors

## 🚀 Production Deployment

### Checklist

- [ ] Domain verified in Resend
- [ ] SPF, DKIM, DMARC records configured
- [ ] Production API key generated in Resend
- [ ] Environment variables set in Convex Dashboard (production deployment)
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Test emails in production environment
- [ ] Monitor delivery rates in Resend dashboard

### Environment Variables for Production

```env
# In Convex Production Environment Variables
RESEND_API_KEY=re_production_key_here
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@celestialdrakon.com>
NEXT_PUBLIC_APP_URL=https://celestialdrakon.com
```

## 🎨 Customizing Email Templates

### Modify Existing Templates

Edit the template files directly:
- `components/emails/PasswordResetEmail.tsx`
- `components/emails/WelcomeEmail.tsx`

All styles are inline CSS for maximum email client compatibility.

### Add New Email Template

1. **Create template file:**
   ```typescript
   // components/emails/OrderConfirmation.tsx
   export function OrderConfirmation({ orderNumber, userName }) {
     return (
       <html>
         {/* Your email HTML */}
       </html>
     );
   }
   ```

2. **Add email service function:**
   ```typescript
   // convex/services/email.ts
   export const sendOrderConfirmation = action({
     args: {
       to: v.string(),
       userName: v.string(),
       orderNumber: v.string(),
     },
     handler: async (ctx, { to, userName, orderNumber }) => {
       const resend = new Resend(process.env.RESEND_API_KEY);
       
       const { data, error } = await resend.emails.send({
         from: process.env.RESEND_FROM_EMAIL!,
         to: [to],
         subject: 'Order Confirmation',
         html: generateOrderConfirmationHTML(userName, orderNumber),
       });
       
       return { success: !error, emailId: data?.id };
     },
   });
   ```

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Next.js Guide](https://resend.com/docs/send-with-nextjs)
- [Convex Actions](https://docs.convex.dev/functions/actions)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)

## 🆘 Support

If you encounter issues:

1. Check Resend status page: [status.resend.com](https://status.resend.com)
2. Check Convex status: [status.convex.dev](https://status.convex.dev)
3. Review Convex logs: `npx convex logs`
4. Contact Resend support: [resend.com/support](https://resend.com/support)

---

**Last Updated:** 2025-02-10
**Resend SDK Version:** 6.2.2
**Implementation Status:** ✅ Production Ready
