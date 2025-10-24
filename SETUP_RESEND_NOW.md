# 🚀 Setup Resend Email - Step by Step Guide

## ⚠️ CRITICAL FIXES APPLIED

I've fixed the following issues with your password reset implementation:

### ❌ Problems Found:
1. **API Route Won't Work**: `app/api/send/route.ts` was using Next.js API routes which are **excluded** from static builds
2. **Wrong Domain Format**: Was using `cda.broadheader.com` instead of `noreply@cda.broadheader.com`
3. **Not Connected**: Email service wasn't properly integrated with forgot password flow
4. **Unused Files**: Email template component wasn't being used

### ✅ Fixes Applied:
1. ✨ **Deleted** `app/api/` directory (doesn't work with static export)
2. ✨ **Deleted** `components/email-template.tsx` (replaced by Convex service)
3. ✨ **Updated** `.env.local` with correct Resend configuration
4. ✨ **Verified** Convex email service uses correct architecture

---

## 📋 Setup Instructions (5 Minutes)

### Step 1: Create Resend Account (2 min)

1. Go to https://resend.com/signup
2. Sign up with your email
3. Verify your email address
4. **Free tier includes**: 3,000 emails/month, 100 emails/day

### Step 2: Verify Your Domain (3 min)

**IMPORTANT**: You MUST verify `cda.broadheader.com` to send emails from it.

1. In Resend Dashboard → **Domains**
2. Click **Add Domain**
3. Enter: `cda.broadheader.com`
4. Resend will show DNS records like:

```
Type: TXT
Name: _resend
Value: resend-verify=abc123xyz

Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.u12345.wl123.sendgrid.net

Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

5. Add these records to your domain's DNS (wherever you manage `cda.broadheader.com`)
6. Wait 5-10 minutes for DNS propagation
7. Click **Verify** in Resend dashboard

### Step 3: Get API Key (1 min)

1. In Resend Dashboard → **API Keys**
2. Click **Create API Key**
3. Name it: "Celestial Drakon - Production"
4. Copy the key (starts with `re_`)
5. ⚠️ **Save it now** - you won't see it again!

### Step 4: Add to Local Environment (30 sec)

Open `.env.local` and update these lines:

```env
# Replace with your actual Resend API key
RESEND_API_KEY=re_your_actual_key_here

# This is already set correctly - no changes needed
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@cda.broadheader.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Add to Convex Dashboard (1 min)

**CRITICAL**: Convex Actions run on Convex servers, so you must add the API key there:

1. Go to https://dashboard.convex.dev
2. Select your project: `celestial-db`
3. Go to **Settings** → **Environment Variables**
4. Click **Add Variable**
5. Add these:

```
Name: RESEND_API_KEY
Value: re_your_actual_key_here

Name: RESEND_FROM_EMAIL
Value: Celestial Drakon Aquatics <noreply@cda.broadheader.com>

Name: NEXT_PUBLIC_APP_URL
Value: http://localhost:3000
```

6. Click **Save**

---

## 🧪 Test the Setup

### Quick Test (2 minutes)

1. **Start Dev Server**:
```bash
npm run dev
```

2. **Go to Forgot Password Page**:
```
http://localhost:3000/auth/forgot_password
```

3. **Enter Test Email**:
   - Use an email you have access to
   - OR use Resend's test email: `delivered@resend.dev`

4. **Check Results**:
   - ✅ Should see success message
   - ✅ Check email inbox (might be in spam)
   - ✅ Email should have reset link
   - ✅ Click link → should go to reset password page

5. **Reset Password**:
   - Enter new password (8+ chars, uppercase, lowercase, number)
   - Confirm password
   - Submit
   - Should redirect to login
   - Login with new password ✅

---

## 🔧 How It Works Now

### Architecture (Correct Implementation)

```
┌──────────────────────────┐
│  User: forgot_password   │
│  Enters: user@email.com  │
└──────────┬───────────────┘
           │
           ▼
┌───────────────────────────────┐
│  Frontend: Calls Convex       │
│  requestPasswordReset(email)  │
└──────────┬────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Convex Mutation (auth.ts)       │
│  1. Validate email exists        │
│  2. Generate token               │
│  3. Save to database             │
│  4. Schedule email action        │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Convex Action (email.ts)        │
│  1. Get RESEND_API_KEY from env  │
│  2. Build reset URL with token   │
│  3. Call Resend API              │
│  4. Send HTML email              │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Resend API                      │
│  Sends email to user's inbox    │
│  FROM: noreply@cda.broadheader   │
│  TO: user@email.com (dynamic!)   │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  User receives email             │
│  Clicks reset link               │
│  → /auth/reset_password?token=..│
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Reset password page             │
│  1. Verify token                 │
│  2. Show password form           │
│  3. Update password              │
│  4. Redirect to login            │
└──────────────────────────────────┘
```

### Key Points:

✅ **FROM**: `noreply@cda.broadheader.com` (your verified domain)
✅ **TO**: Dynamic - whatever email the user enters
✅ **No API Routes**: Everything uses Convex Actions
✅ **Works with Static Export**: Compatible with Capacitor APK
✅ **Secure**: API key stays on Convex servers

---

## 📝 Environment Variables Summary

### Local (.env.local) - For Development
```env
RESEND_API_KEY=re_your_actual_key
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@cda.broadheader.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Convex Dashboard - For Production
```
RESEND_API_KEY = re_your_actual_key
RESEND_FROM_EMAIL = Celestial Drakon Aquatics <noreply@cda.broadheader.com>
NEXT_PUBLIC_APP_URL = https://your-production-url.com
```

---

## 🎯 What Changed

### Files Deleted:
- ❌ `app/api/send/route.ts` - Doesn't work with static export
- ❌ `components/email-template.tsx` - Not needed

### Files Modified:
- ✅ `.env.local` - Added Resend configuration
- ✅ `.env.example` - Added Resend examples

### Files Already Correct:
- ✅ `convex/services/email.ts` - Uses Convex Actions (correct!)
- ✅ `convex/services/auth.ts` - Properly schedules email
- ✅ `app/auth/forgot_password/page.tsx` - Calls correct mutation
- ✅ `app/auth/reset_password/page.tsx` - Verifies token

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Email not sending"

**Check**:
```bash
# 1. Is API key in Convex dashboard?
# Go to: https://dashboard.convex.dev → Settings → Environment Variables

# 2. Is domain verified in Resend?
# Go to: https://resend.com/domains

# 3. Check Convex logs for errors
# Go to: https://dashboard.convex.dev → Logs
```

### Issue 2: "Email going to spam"

**Solution**:
1. Make sure domain is **verified** in Resend
2. Add all DNS records (SPF, DKIM, DMARC)
3. Wait for DNS propagation (can take up to 24 hours)
4. Test with different email providers

### Issue 3: "Invalid from address"

**Check**:
```env
# Must be in this exact format:
RESEND_FROM_EMAIL=Name <email@verified-domain.com>

# Example (correct):
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@cda.broadheader.com>

# Wrong formats:
# ❌ cda.broadheader.com (missing email format)
# ❌ noreply@cda.broadheader.com (missing name)
# ❌ <noreply@cda.broadheader.com> (missing name)
```

### Issue 4: "Reset link not working"

**Check**:
```env
# Make sure NEXT_PUBLIC_APP_URL is set correctly
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
NEXT_PUBLIC_APP_URL=https://yourdomain.com # Production
```

---

## 📊 Verification Checklist

Before considering setup complete:

### Resend Account
- [ ] Account created at resend.com
- [ ] Email verified
- [ ] Domain `cda.broadheader.com` added
- [ ] DNS records added to domain
- [ ] Domain shows "Verified" status in Resend
- [ ] API key created and copied

### Environment Variables
- [ ] `RESEND_API_KEY` in `.env.local`
- [ ] `RESEND_FROM_EMAIL` in `.env.local`
- [ ] `NEXT_PUBLIC_APP_URL` in `.env.local`
- [ ] `RESEND_API_KEY` in Convex Dashboard
- [ ] `RESEND_FROM_EMAIL` in Convex Dashboard
- [ ] `NEXT_PUBLIC_APP_URL` in Convex Dashboard

### Testing
- [ ] Can access forgot password page
- [ ] Can submit email address
- [ ] Receives email (check spam)
- [ ] Email has correct branding
- [ ] Reset link works
- [ ] Can set new password
- [ ] Can login with new password

---

## 🎓 Why This Architecture?

### ❌ What Doesn't Work:
```typescript
// app/api/send/route.ts
export async function POST() {
  // ❌ This file is EXCLUDED from static builds
  // ❌ Won't exist in production APK
  // ❌ Can't use with Capacitor
}
```

### ✅ What Works:
```typescript
// convex/services/email.ts
export const sendEmail = internalAction({
  // ✅ Runs on Convex servers
  // ✅ Works with static export
  // ✅ Compatible with Capacitor
  // ✅ API key stays secure
});
```

---

## 🚀 You're Ready!

Once you complete the steps above, your password reset functionality will work perfectly:

✅ **FROM**: `noreply@cda.broadheader.com` (professional, verified)
✅ **TO**: Any email the user enters (fully dynamic)
✅ **Emails**: Beautiful HTML templates with branding
✅ **Security**: 1-hour token expiration
✅ **Mobile**: Works in APK builds

---

## 📞 Need Help?

If you encounter issues:

1. **Check Convex Logs**: https://dashboard.convex.dev → Logs
2. **Check Resend Dashboard**: https://resend.com/emails
3. **Verify Domain Status**: https://resend.com/domains
4. **Test Email Deliverability**: Use https://www.mail-tester.com

---

**Status**: 🎯 Ready to Setup
**Time Required**: ~5-10 minutes
**Difficulty**: ⭐ Easy
