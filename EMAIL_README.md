# 📧 Email System - Quick Reference

## Overview

Celestial Drakon Aquatics uses **Resend** for sending emails via **Convex Actions**. This document provides quick access to all email-related information.

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [EMAIL_IMPLEMENTATION_GUIDE.md](./EMAIL_IMPLEMENTATION_GUIDE.md) | Complete setup and architecture guide |
| [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md) | Summary of recent improvements |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | How to test email functionality |
| [EMAIL_README.md](./EMAIL_README.md) | This file - quick reference |

## 🚀 Quick Start

### For Developers

1. **Ensure environment variables are set in Convex:**
   ```bash
   npx convex env list
   ```
   Should show: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`

2. **Test the forgot password flow:**
   - Start dev server: `npm run dev`
   - Go to: `http://localhost:3000/auth/forgot_password`
   - Enter a valid user email
   - Check inbox for reset email

3. **Monitor logs:**
   ```bash
   npx convex logs --watch
   ```

## 📁 Key Files

### Email Templates
```
components/emails/
├── PasswordResetEmail.tsx   # Password reset template
└── WelcomeEmail.tsx          # New user welcome template
```

### Email Service
```
convex/services/
├── email.ts                  # Resend integration
└── auth.ts                   # Password reset logic
```

### Frontend Pages
```
app/auth/
├── forgot_password/page.tsx  # Request reset
└── reset_password/page.tsx   # Complete reset
```

## 🔧 Common Commands

### Check Environment Variables
```bash
npx convex env list
```

### Set Environment Variable
```bash
npx convex env set VARIABLE_NAME value
```

### View Convex Logs
```bash
npx convex logs
```

### Test Build
```bash
npm run build
```

## 🎨 Email Templates

### PasswordResetEmail
**Props:**
- `userName: string` - User's full name
- `resetUrl: string` - Full URL with token

**Features:**
- Branded header with gradient
- Prominent CTA button
- 1-hour expiration warning
- Fallback plain-text link
- Mobile-responsive

### WelcomeEmail
**Props:**
- `userName: string` - User's full name
- `appUrl?: string` - Optional app URL

**Features:**
- Welcome message
- Feature highlights
- Call-to-action button
- Support information

## 🔐 Environment Variables

### Required in Convex Dashboard

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### How to Set
1. Go to [Convex Dashboard](https://dashboard.convex.dev/)
2. Select your project
3. Settings → Environment Variables
4. Add each variable
5. Redeploy: `npx convex dev`

## 🧪 Testing

### Quick Test
```bash
# 1. Start server
npm run dev

# 2. Visit
http://localhost:3000/auth/forgot_password

# 3. Enter test email and submit

# 4. Check Resend dashboard
https://resend.com/emails
```

### Test Checklist
- [ ] Email received
- [ ] Design looks professional
- [ ] Reset button works
- [ ] Can reset password
- [ ] Can login with new password

## 🐛 Troubleshooting

### Email Not Received

**Quick Checks:**
1. Check spam folder
2. Verify Convex env vars: `npx convex env list`
3. Check Resend dashboard: [resend.com/emails](https://resend.com/emails)
4. View Convex logs: `npx convex logs`

### Common Errors

| Error | Solution |
|-------|----------|
| "Email service is not configured" | Set `RESEND_API_KEY` in Convex |
| "Invalid or expired reset token" | Token expired or already used |
| Wrong reset URL | Update `NEXT_PUBLIC_APP_URL` |
| Email in spam | Check domain verification in Resend |

## 📊 Architecture

```
Frontend Page (forgot_password)
         ↓
Convex Mutation (requestPasswordReset)
         ↓
Generate Token & Save to DB
         ↓
Schedule Internal Action
         ↓
Convex Action (sendPasswordResetEmail)
         ↓
Resend SDK → Email Sent 📬
```

## 🎯 Current Status

✅ **Implemented:**
- Password reset emails
- Welcome emails (ready to use)
- Professional email templates
- Convex Actions integration
- Environment variables configured
- Comprehensive documentation

📝 **Future Enhancements:**
- Order confirmation emails
- Reservation confirmation emails
- Shipping notification emails
- Custom email preferences

## 🔗 Quick Links

### External Resources
- [Resend Dashboard](https://resend.com/emails)
- [Resend Documentation](https://resend.com/docs)
- [Convex Dashboard](https://dashboard.convex.dev/)
- [Convex Actions Docs](https://docs.convex.dev/functions/actions)

### Project Documentation
- [CLAUDE.md](./CLAUDE.md) - Complete project specification
- [agents.md](./agents.md) - AI agent context and architecture

## 💡 Tips

### For Development
- Use `delivered@resend.dev` for testing without domain verification
- Watch Convex logs in real-time: `npx convex logs --watch`
- Test with multiple email clients (Gmail, Outlook, etc.)

### For Production
- Verify domain in Resend dashboard
- Set up SPF, DKIM, DMARC records
- Update `NEXT_PUBLIC_APP_URL` to production domain
- Monitor email delivery rates
- Set up Resend webhooks for tracking

### For Customization
- Edit templates in `components/emails/`
- All styles must be inline CSS
- Test with email client previews
- Use mobile-first responsive design

## 🆘 Getting Help

### If Something Breaks

1. **Check the logs first:**
   ```bash
   npx convex logs | grep -i error
   ```

2. **Verify configuration:**
   ```bash
   npx convex env list
   ```

3. **Test with Resend's test email:**
   - Send to: `delivered@resend.dev`
   - This always works without domain setup

4. **Check Resend status:**
   - [status.resend.com](https://status.resend.com)

5. **Review documentation:**
   - [EMAIL_IMPLEMENTATION_GUIDE.md](./EMAIL_IMPLEMENTATION_GUIDE.md)
   - [TESTING_GUIDE.md](./TESTING_GUIDE.md)

## 📝 Quick Notes

- ⚠️ API route at `/app/api/send/route.ts` is **non-functional** (static export limitation)
- ✅ Use Convex Actions for all email sending
- 🔒 Tokens expire after 1 hour
- 📱 Mobile-compatible (works in APK)
- 🎨 Professional branded templates
- 📧 Powered by Resend SDK

## 🎉 Success Criteria

Your email system is working correctly when:
- ✅ Emails are delivered within 5 seconds
- ✅ Templates look professional in all clients
- ✅ Reset links work correctly
- ✅ Users can complete password reset
- ✅ No errors in Convex logs
- ✅ Delivery rate > 95% in Resend dashboard

---

**Last Updated:** February 2025  
**Status:** ✅ Production Ready  
**Resend SDK Version:** 6.2.2  
**Integration Method:** Convex Actions

**Need detailed information?** See [EMAIL_IMPLEMENTATION_GUIDE.md](./EMAIL_IMPLEMENTATION_GUIDE.md)
