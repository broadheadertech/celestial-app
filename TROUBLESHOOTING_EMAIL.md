# 🔧 Email Troubleshooting Guide

## Quick Diagnostics

Run these checks if emails aren't working:

### 1. Check Environment Variables

**Local (.env.local)**:
```bash
# Check if variables are set
cat .env.local | grep RESEND
```

Expected output:
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@cda.broadheader.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Convex Dashboard**:
1. Go to: https://dashboard.convex.dev
2. Settings → Environment Variables
3. Check for:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `NEXT_PUBLIC_APP_URL`

### 2. Check Domain Verification

1. Go to: https://resend.com/domains
2. Find `cda.broadheader.com`
3. Status should be: ✅ **Verified**

If not verified:
- Check DNS records
- Wait 10-15 minutes
- Click "Verify" again

### 3. Check Convex Logs

1. Go to: https://dashboard.convex.dev
2. Click **Logs** tab
3. Look for:
   - ✅ `sendPasswordResetEmail` success logs
   - ❌ Error messages

Common errors:
```
❌ "RESEND_API_KEY is not set"
   → Add API key to Convex Dashboard

❌ "Failed to send email"
   → Check domain verification

❌ "Invalid from address"
   → Check FROM email format
```

---

## Common Issues

### Issue 1: "Not receiving emails"

**Checklist**:
- [ ] Check spam/junk folder
- [ ] Verify domain in Resend
- [ ] Check API key is correct
- [ ] Check Convex logs for errors
- [ ] Try different email address

**Test with Resend test email**:
```
delivered@resend.dev
```
This always works (no domain verification needed)

### Issue 2: "Domain not verified"

**DNS Records Required**:

Go to your domain DNS settings and add:

```
Type: TXT
Name: _resend
Value: [from Resend dashboard]

Type: CNAME  
Name: resend._domainkey
Value: [from Resend dashboard]

Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**Check DNS propagation**:
```bash
# Check if DNS is updated (Windows)
nslookup -type=TXT _resend.cda.broadheader.com

# Or use online tool:
# https://dnschecker.org
```

### Issue 3: "Invalid API key"

**Symptoms**:
- Convex logs show: "Failed to send email"
- Resend dashboard shows: "Unauthorized"

**Fix**:
1. Go to: https://resend.com/api-keys
2. Create new API key
3. Copy it (starts with `re_`)
4. Update in both:
   - `.env.local`
   - Convex Dashboard

### Issue 4: "Wrong FROM address format"

**❌ Wrong formats**:
```env
RESEND_FROM_EMAIL=cda.broadheader.com
RESEND_FROM_EMAIL=noreply@cda.broadheader.com
RESEND_FROM_EMAIL=<noreply@cda.broadheader.com>
```

**✅ Correct format**:
```env
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@cda.broadheader.com>
```

Format: `Name <email@domain.com>`

### Issue 5: "Reset link not working"

**Check URL configuration**:
```env
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production (update for your domain)
NEXT_PUBLIC_APP_URL=https://celestialdrakon.com
```

**Verify token is in URL**:
```
✅ http://localhost:3000/auth/reset_password?token=abc123xyz
❌ http://localhost:3000/auth/reset_password (no token)
```

### Issue 6: "Emails going to spam"

**Solutions**:

1. **Verify domain** (most important)
   - Status must be "Verified" in Resend

2. **Add all DNS records**:
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: CNAME record from Resend
   - DMARC: `v=DMARC1; p=none; rua=mailto:admin@cda.broadheader.com`

3. **Warm up domain** (for production):
   - Start with small volume
   - Gradually increase over days
   - Monitor delivery rates

4. **Test deliverability**:
   - Use: https://www.mail-tester.com
   - Send test email to their address
   - Check score (aim for 10/10)

---

## Testing Steps

### 1. Local Development Test

```bash
# Start dev server
npm run dev

# Open browser
http://localhost:3000/auth/forgot_password

# Test with:
delivered@resend.dev  # Always works

# Or your email (if domain verified):
your@email.com
```

### 2. Check Email Delivery

**In Resend Dashboard**:
1. Go to: https://resend.com/emails
2. Find your test email
3. Check status:
   - ✅ Delivered
   - ⏳ Queued
   - ❌ Failed (click for details)

### 3. Verify Email Content

**Check email has**:
- [ ] Subject: "Reset Your Password - Celestial Drakon Aquatics"
- [ ] FROM: Celestial Drakon Aquatics <noreply@cda.broadheader.com>
- [ ] TO: User's email
- [ ] Reset button
- [ ] Reset link (text version)
- [ ] Branding (orange colors, logo)
- [ ] Expiry notice (1 hour)

### 4. Test Reset Flow

1. **Click reset link** → Should go to reset password page
2. **Page should show**:
   - User's email
   - Password input fields
   - Strength indicator
   - Requirements checklist
3. **Enter password** → Strong password (8+ chars, etc.)
4. **Submit** → Should see success message
5. **Redirect** → Should go to login page
6. **Login** → New password should work ✅

---

## Debug Mode

### Enable Detailed Logging

Add console logs to debug:

**In `convex/services/email.ts`**:
```typescript
console.log("🔧 Sending email to:", to);
console.log("🔧 From:", process.env.RESEND_FROM_EMAIL);
console.log("🔧 Reset URL:", resetUrl);
console.log("🔧 API Key exists:", !!process.env.RESEND_API_KEY);
```

**Check logs in**:
- Convex Dashboard → Logs
- Browser Console (Network tab)

### Test Resend API Directly

**Using curl**:
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Celestial Drakon Aquatics <noreply@cda.broadheader.com>",
    "to": ["your@email.com"],
    "subject": "Test Email",
    "html": "<h1>Test</h1>"
  }'
```

Expected response:
```json
{
  "id": "abc-123-xyz",
  "from": "noreply@cda.broadheader.com",
  "to": ["your@email.com"],
  "created_at": "2025-02-15T..."
}
```

---

## Error Messages Explained

### "RESEND_API_KEY is not set"

**Cause**: Environment variable missing in Convex

**Fix**:
1. Go to Convex Dashboard
2. Settings → Environment Variables
3. Add `RESEND_API_KEY`
4. Restart Convex functions (redeploy)

### "Email service is not configured"

**Cause**: Same as above

**Fix**: Add `RESEND_API_KEY` to Convex Dashboard

### "No account found with this email address"

**Cause**: Email doesn't exist in database

**Expected behavior**: This is correct - user must have account first

**Test**: Register account first, then test password reset

### "This account uses Facebook login"

**Cause**: User registered with Facebook OAuth

**Expected behavior**: Correct - Facebook users can't reset password

**Test**: Use email/password account instead

### "Failed to send email"

**Causes**:
1. Domain not verified
2. Invalid API key
3. Wrong FROM email format
4. Resend API down (rare)

**Fix**: Check all environment variables and domain verification

### "Invalid or expired reset token"

**Causes**:
1. Token was already used
2. Token expired (1 hour limit)
3. Token doesn't exist

**Test**: Request new reset, use immediately

---

## Production Checklist

Before going live:

### Domain Setup
- [ ] Domain `cda.broadheader.com` verified in Resend
- [ ] All DNS records added (SPF, DKIM, DMARC)
- [ ] DNS propagation complete (wait 24 hours)
- [ ] Test email delivery to multiple providers (Gmail, Outlook, Yahoo)

### Environment Variables
- [ ] `RESEND_API_KEY` in Convex (production key)
- [ ] `RESEND_FROM_EMAIL` correct format
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] All variables saved in Convex Dashboard

### Testing
- [ ] Test forgot password flow
- [ ] Test email delivery (check spam)
- [ ] Test reset link works
- [ ] Test password update
- [ ] Test login with new password
- [ ] Test from mobile device
- [ ] Test from mobile email apps

### Monitoring
- [ ] Set up Resend webhooks (optional)
- [ ] Monitor delivery rates
- [ ] Check spam complaints
- [ ] Monitor Convex logs

---

## Contact Support

If issues persist:

**Resend Support**:
- Email: support@resend.com
- Docs: https://resend.com/docs
- Status: https://status.resend.com

**Convex Support**:
- Discord: https://convex.dev/community
- Docs: https://docs.convex.dev

**Domain/DNS Issues**:
- Contact your domain registrar
- Or your DNS provider

---

## Quick Reference

### Essential Links

- **Resend Dashboard**: https://resend.com/dashboard
- **Convex Dashboard**: https://dashboard.convex.dev
- **Email Logs**: https://resend.com/emails
- **Domain Status**: https://resend.com/domains
- **DNS Checker**: https://dnschecker.org
- **Email Tester**: https://www.mail-tester.com

### Environment Variables

```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@cda.broadheader.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Test Emails

```
Development: delivered@resend.dev
Production: your@email.com
```

---

**Last Updated**: February 2025
**Status**: 🔧 Troubleshooting Ready
