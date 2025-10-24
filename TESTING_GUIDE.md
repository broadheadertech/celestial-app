# Email Functionality Testing Guide

## 🧪 How to Test the Password Reset Email Feature

Follow these steps to verify the email improvements are working correctly.

## Prerequisites

✅ Environment variables set in Convex Dashboard
✅ Resend API key configured
✅ Development server running

## Step-by-Step Testing

### 1. Start the Development Server

```bash
npm run dev
```

Wait for the server to start on `http://localhost:3000`

### 2. Test Password Reset Flow

#### Navigate to Forgot Password Page

```
http://localhost:3000/auth/forgot_password
```

#### Enter a Valid User Email

You need to test with a user that already exists in your database. If you don't have a user, create one first:

1. Go to `http://localhost:3000/auth/register`
2. Create a test account
3. Remember the email address

#### Request Password Reset

1. On the forgot password page, enter the email address
2. Click "Send Reset Link"
3. Wait for the success message

**Expected Behavior:**
- Form validates email format
- Shows loading state while sending
- Displays success message with user email
- Automatically redirects to reset password page after 2 seconds

### 3. Check Email Delivery

#### Option A: Check Email Inbox

1. Open the email inbox for the test account
2. Look for an email from "Celestial Drakon Aquatics"
3. Subject should be: "Reset Your Password - Celestial Drakon Aquatics"

**Expected Email Content:**
- Professional branded header with gradient
- Greeting with user's name
- Prominent "Reset Your Password" button
- Warning about 1-hour expiration
- Fallback plain-text link
- Professional footer

#### Option B: Check Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Look for the most recent email
3. Click to view details

**What to Check:**
- Status: Delivered (green)
- From: Celestial Drakon Aquatics <noreply@cda.broadheader.com>
- To: Your test email
- Subject: Reset Your Password - Celestial Drakon Aquatics
- Preview: Should show the email content

### 4. Test the Reset Link

#### Click the Reset Button

1. In the email, click "Reset Your Password" button
2. You should be redirected to the reset password page

**Expected URL:**
```
http://localhost:3000/auth/reset_password?token=XXXXXXXXXXXXX
```

#### Verify Token Validation

The page should:
- Show loading state while verifying token
- Display user email if token is valid
- Show error message if token is invalid/expired

### 5. Complete Password Reset

#### Enter New Password

1. Enter a new password (must meet requirements)
2. Confirm the password
3. Click "Reset Password"

**Password Requirements:**
- At least 8 characters
- One uppercase letter
- One lowercase letter
- One number

**Expected Behavior:**
- Password strength indicator updates
- Requirements checklist shows completion
- Success message appears
- Redirects to login page

### 6. Verify Password Was Changed

#### Login with New Password

1. Go to `http://localhost:3000/auth/login`
2. Enter email and NEW password
3. Click "Login"

**Expected:** You should be logged in successfully

#### Try Old Password (Should Fail)

1. Logout
2. Try to login with the OLD password
3. **Expected:** "Invalid email or password" error

## 🔍 Debugging Failed Tests

### Email Not Received

**Check 1: Convex Logs**
```bash
npx convex logs
```

Look for:
- Email service execution
- Any error messages
- Resend API responses

**Check 2: Resend Dashboard Status**

Go to [https://resend.com/emails](https://resend.com/emails) and check:
- Is the email listed?
- What's the delivery status?
- Any error messages?

**Check 3: Spam Folder**

The email might be in spam/junk folder.

**Check 4: Environment Variables**

Verify in Convex Dashboard:
```bash
npx convex env list
```

Should show:
- `RESEND_API_KEY` (hidden)
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL`

### Reset Link Doesn't Work

**Issue:** "Invalid or expired reset token"

**Possible Causes:**
1. Token already used (tokens are one-time use)
2. Token expired (1 hour limit)
3. User not found
4. Database issue

**Solution:**
- Request a new reset email
- Use the new token within 1 hour

### Email Has Wrong URL

**Issue:** Reset link points to wrong domain

**Check:** `NEXT_PUBLIC_APP_URL` in Convex environment variables

**Fix:**
```bash
npx convex env set NEXT_PUBLIC_APP_URL http://localhost:3000
```

For production:
```bash
npx convex env set NEXT_PUBLIC_APP_URL https://yourdomain.com
```

### "Email service is not configured" Error

**Cause:** `RESEND_API_KEY` not set in Convex

**Fix:**
```bash
npx convex env set RESEND_API_KEY re_your_actual_key
```

## 📊 What to Look For

### ✅ Success Indicators

- [ ] Email received within 5 seconds
- [ ] Email has professional design
- [ ] All email links work
- [ ] User's name appears correctly in email
- [ ] Reset button is clickable
- [ ] Token validates correctly
- [ ] Password can be reset
- [ ] Can login with new password
- [ ] Old password no longer works

### ❌ Failure Indicators

- [ ] Email not received after 30 seconds
- [ ] Email in spam folder consistently
- [ ] Broken or incorrect links
- [ ] "Invalid token" errors immediately
- [ ] Can't complete password reset
- [ ] Old password still works after reset

## 🧹 Cleanup After Testing

### Reset Test Account

If you want to test again with the same account:

1. Request password reset
2. Complete the reset
3. Repeat as needed (tokens are one-time use)

### Check Database

In Convex Dashboard:
1. Go to Data → users table
2. Find your test user
3. Verify `resetToken` and `resetTokenExpiry` are cleared after successful reset

## 📝 Test Scenarios Checklist

### Basic Flow
- [ ] Request reset with valid email
- [ ] Receive email
- [ ] Click reset link
- [ ] Enter new password
- [ ] Login with new password

### Error Handling
- [ ] Request reset with invalid email format
- [ ] Request reset with non-existent email
- [ ] Try to use expired token (wait 1 hour)
- [ ] Try to use token twice
- [ ] Enter mismatched passwords
- [ ] Enter weak password

### Edge Cases
- [ ] User with Facebook login (should show error)
- [ ] Multiple reset requests in quick succession
- [ ] Reset request while already logged in
- [ ] Very long email addresses
- [ ] Special characters in password

## 🎯 Performance Benchmarks

### Expected Timings

| Action | Expected Time |
|--------|---------------|
| Email send request | < 1 second |
| Email delivery | 1-5 seconds |
| Token validation | < 500ms |
| Password reset | < 1 second |
| Total user flow | < 2 minutes |

### Monitoring

Watch Convex logs in real-time:
```bash
npx convex logs --watch
```

## 🐛 Common Issues & Solutions

### Issue: Email Takes Too Long

**Expected:** 1-5 seconds
**If longer:** Check Resend status page

### Issue: Email Design Broken

**Cause:** Email client compatibility
**Solution:** Most common clients supported, test with different clients

### Issue: Can't Find Test User

**Solution:** Create a new test user:
1. Go to register page
2. Create account with test email
3. Use that email for reset testing

## 📞 Need Help?

If tests fail consistently:

1. **Check Convex Logs:**
   ```bash
   npx convex logs | grep -i "email\|error"
   ```

2. **Verify Resend Status:**
   - [https://status.resend.com](https://status.resend.com)

3. **Review Configuration:**
   - Environment variables
   - API key validity
   - Domain verification

4. **Test with Resend Test Email:**
   - Use `delivered@resend.dev` as recipient
   - Should always work without domain verification

---

**Testing Checklist Status:**
- [ ] Basic flow tested
- [ ] Error handling verified
- [ ] Email received and looks good
- [ ] Reset link works
- [ ] Password successfully changed
- [ ] Ready for production

**Tested By:** _____________
**Date:** _____________
**Status:** ☐ PASS ☐ FAIL
**Notes:** _____________
