# Quick Start: Resend Email Setup

## 🚀 5-Minute Setup

### Step 1: Create Resend Account (2 minutes)
1. Go to https://resend.com/signup
2. Sign up (free - 3,000 emails/month)
3. Verify your email

### Step 2: Get API Key (1 minute)
1. In Resend dashboard → **API Keys**
2. Click **Create API Key**
3. Name it: "Celestial Drakon - Dev"
4. Copy the key (starts with `re_`)
5. ⚠️ Save it - you won't see it again!

### Step 3: Add to Your Project (2 minutes)

#### For Development
Create `.env.local` file in project root:
```env
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=Celestial Drakon <onboarding@resend.dev>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### For Convex Backend
Add to **Convex Dashboard** → **Settings** → **Environment Variables**:
```
RESEND_API_KEY = re_your_key_here
```

### Step 4: Test It! (1 minute)
```bash
npm run dev
```

1. Go to http://localhost:3000/auth/forgot_password
2. Enter your email
3. Check your inbox
4. Click the reset link
5. Set new password
6. Done! ✅

---

## 📧 Email Testing (Development)

### Option 1: Sandbox Email (Easiest)
Use Resend's test email - **no setup needed**:
```
delivered@resend.dev
```

This email works immediately, perfect for development.

### Option 2: Your Own Email
1. In Resend dashboard → **Domains**
2. Click **Verify Email**
3. Enter your email
4. Check inbox and verify
5. Now you can send to your email!

---

## 🌐 Production Setup (Before Launch)

### 1. Verify Your Domain (IMPORTANT)
**Why?** Without this, emails may go to spam.

**Steps**:
1. Resend Dashboard → **Domains** → **Add Domain**
2. Enter your domain (e.g., `celestialdrakon.com`)
3. Add these DNS records to your domain provider:

```
Type: TXT
Name: _resend
Value: [Resend will provide]

Type: CNAME  
Name: resend._domainkey
Value: [Resend will provide]

Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

4. Wait 5-10 minutes for DNS propagation
5. Click **Verify** in Resend

### 2. Update Production Variables
In **Convex Dashboard** → **Environment Variables**:
```
RESEND_API_KEY = re_your_production_key
RESEND_FROM_EMAIL = Celestial Drakon <noreply@celestialdrakon.com>
NEXT_PUBLIC_APP_URL = https://your-production-url.com
```

---

## ✅ Quick Test Checklist

- [ ] Resend account created
- [ ] API key obtained
- [ ] `.env.local` file created with API key
- [ ] Convex environment variable added
- [ ] Development server running
- [ ] Can access forgot password page
- [ ] Email received (check spam folder)
- [ ] Reset link works
- [ ] Password updated successfully
- [ ] Can login with new password

---

## 🆘 Troubleshooting

### "Email not sending"
**Check**:
1. Is `RESEND_API_KEY` set in Convex dashboard?
2. Is the key correct? (starts with `re_`)
3. Check Convex logs for errors

### "Email going to spam"
**Solutions**:
1. Verify your domain (see Production Setup above)
2. Use a professional "from" email
3. Check Resend dashboard for delivery status

### "Reset link not working"
**Check**:
1. Is `NEXT_PUBLIC_APP_URL` set correctly?
2. Has the token expired? (1 hour limit)
3. Was the link already used?

---

## 📊 Resend Dashboard

Monitor your emails:
- **Logs**: See all sent emails
- **Analytics**: Track delivery rates
- **API Keys**: Manage keys
- **Domains**: Verify domains

URL: https://resend.com/dashboard

---

## 💰 Pricing

### Free Tier (Perfect for Development)
- 3,000 emails/month
- 100 emails/day
- All features included

### Pro Tier (When You Scale)
- $20/month
- 50,000 emails/month
- 10,000 emails/day

---

## 📝 Quick Commands

```bash
# Start development
npm run dev

# Build for production
npm run build

# Test email locally
curl -X POST http://localhost:3000/auth/forgot_password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## 🔗 Useful Links

- **Resend Dashboard**: https://resend.com/dashboard
- **Resend Docs**: https://resend.com/docs
- **Convex Dashboard**: https://dashboard.convex.dev
- **Setup Guide**: See `RESEND_EMAIL_SETUP.md`
- **Implementation Details**: See `PASSWORD_RESET_IMPLEMENTATION.md`

---

## 🎯 That's It!

You're ready to go! The password reset functionality is fully implemented and just needs your Resend API key.

**Need Help?** Check the comprehensive guides:
- `RESEND_EMAIL_SETUP.md` - Detailed setup instructions
- `PASSWORD_RESET_IMPLEMENTATION.md` - Technical details

---

**Setup Time**: ~5 minutes  
**Difficulty**: ⭐ Easy  
**Status**: ✅ Ready to Use
