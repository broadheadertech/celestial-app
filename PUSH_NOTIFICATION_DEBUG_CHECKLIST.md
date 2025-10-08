# Push Notification Debug Checklist

## Problem Statement
**SMS works, but push notifications don't arrive on native device when admin confirms reservation.**

## Critical Checks

### ✅ Check 1: Device Token Saved
**Where**: Convex Dashboard → Data → users table

1. Go to https://dashboard.convex.dev/
2. Open your Convex project
3. Click "Data" tab
4. Click "users" table
5. Find the client user (the one making reservations)
6. **Look for `pushToken` field**

**Expected**: Long string like `"a1b2c3d4e5f6..."`
**Problem**: If `undefined`, `null`, or empty → Device never registered

### ✅ Check 2: User ID in Reservation
**Where**: Convex Dashboard → Data → reservations table

1. Data → reservations table
2. Find the reservation you're testing with
3. **Look at `userId` field**

**Expected**: Convex ID like `"j97abc123def456..."`
**Problem**: If missing, undefined, or has `guestId` instead → Push won't be sent to user

### ✅ Check 3: Convex Logs (Most Important)
**Where**: Convex Dashboard → Logs tab

**When to check**: Right after admin confirms reservation

**What to look for**:

**Success Pattern:**
```
🔔 Checking if client notification needed. New status: confirmed, Is client status: true
📱 Creating client notification for status: confirmed
   Customer: [Name], Email: [email], UserId: [id]
   Push title: ✅ Reservation Confirmed
   Push message: Your reservation has been confirmed!
📤 Scheduling push notification to client via scheduler.runAfter
✅ Push notification scheduled successfully

[Then a few seconds later:]
📤 sendPushToUser called - userId: [id], userEmail: [email]
   Title: ✅ Reservation Confirmed
   Message: Your reservation has been confirmed!
🔍 Looking for push token - userId: [id], userEmail: [email]
✅ Found user by ID: [email], has token: true
✅ Found push token for [Name] ([email])
   Token: abc123def456...
📱 Sending push notification via Pushy API...
✅ Push notification sent successfully to [Name]
```

**Failure Pattern 1 - No UserId:**
```
🔔 Checking if client notification needed. New status: confirmed, Is client status: true
📱 Creating client notification for status: confirmed
   Customer: [Name], Email: [email], UserId: undefined    ← ❌ PROBLEM
⏭️ Skipping client notification - status confirmed not in client status list
```

**Failure Pattern 2 - No Token:**
```
📤 sendPushToUser called - userId: [id], userEmail: [email]
🔍 Looking for push token - userId: [id], userEmail: [email]
✅ Found user by ID: [email], has token: false    ← ❌ PROBLEM
❌ No push token found for user: [id]
   This user may not have opened the mobile app yet
```

**Failure Pattern 3 - User Not Found:**
```
📤 sendPushToUser called - userId: [id], userEmail: [email]
🔍 Looking for push token - userId: [id], userEmail: [email]
⚠️ User not found by direct ID lookup    ← ❌ PROBLEM
⚠️ User not found by email
❌ No push token found for user
```

### ✅ Check 4: Android Logcat
**Where**: Android Studio Logcat or adb logcat

**When app first opens (Device Registration):**
```
✅ Platform: android detected - Initializing push notifications
✅ Pushy initialized successfully
✅ Pushy device token: abc123def456...
✅ Push token saved to database
✅ Subscribed to topic: clients
```

**If this doesn't appear:**
- App ID missing or wrong
- User not logged in
- Pushy registration failed

### ✅ Check 5: Pushy Dashboard
**Where**: https://dashboard.pushy.me/

1. Login to your Pushy account
2. Select app: `68e49c28b7e2f9df7184b4c8`
3. Check:
   - **Devices** tab → Is your device listed?
   - **Analytics** tab → Any delivery attempts?
   - **Logs** tab → Any errors?

## Step-by-Step Debug Process

### Step 1: Verify Device Registered
```
1. Open app on Android device
2. Login as client
3. Check Android Logcat for "✅ Pushy device token"
4. If no token → App ID issue or Pushy not initializing
```

### Step 2: Verify Token Saved
```
1. Go to Convex Dashboard → Data → users
2. Find client user
3. Check pushToken field has value
4. If empty → savePushToken failed
```

### Step 3: Create Test Reservation
```
1. As client: Create a reservation
2. Note the reservation code (e.g., RES-123456)
```

### Step 4: Check Reservation Has UserId
```
1. Convex Dashboard → Data → reservations
2. Search for your reservation code
3. Verify userId field is populated
4. If missing → Client wasn't logged in when creating reservation
```

### Step 5: Admin Confirms Reservation
```
1. As admin: Confirm the reservation
2. IMMEDIATELY check Convex Dashboard → Logs
3. Look for the diagnostic logs (see Check 3 above)
```

### Step 6: Analyze Logs
Based on what you see in Convex logs:

**If you see "userId: undefined":**
→ Reservation doesn't have userId
→ Client was guest when creating reservation
→ **Solution**: Client must be logged in

**If you see "has token: false":**
→ Device token not in database
→ Device never registered or token not saved
→ **Solution**: Reinstall app, login, check Logcat

**If you see "User not found":**
→ UserId in reservation doesn't match any user
→ Possible ID format mismatch
→ **Solution**: Check userId format in both tables

**If you see "Push notification sent successfully":**
→ Backend worked correctly
→ Problem is with Pushy delivery or device
→ **Solution**: Check Pushy dashboard, device internet

## Common Issues & Solutions

### Issue 1: Guest Reservations
**Symptoms**: Reservation created but no userId

**Cause**: Client not logged in when making reservation

**Solution**:
```
1. Client must login BEFORE creating reservation
2. Or: Register account first, then make reservation
3. Guest reservations can't receive push (no account)
```

### Issue 2: Token Not Saved
**Symptoms**: Device token generated but not in database

**Cause**: savePushToken mutation failed

**Solution**:
```
1. Check Convex logs for savePushToken errors
2. Ensure user is logged in when app opens
3. Try logout → login again
4. Reinstall app
```

### Issue 3: Wrong User ID
**Symptoms**: User found but wrong user

**Cause**: Multiple accounts or Facebook ID mismatch

**Solution**:
```
1. Verify email matches
2. Check if using Facebook login vs email login
3. Ensure only one account per email
```

### Issue 4: Pushy API Error
**Symptoms**: Logs show "sent successfully" but no delivery

**Cause**: Pushy API issue, wrong API key, or device offline

**Solution**:
```
1. Check Pushy dashboard for delivery logs
2. Verify API Secret Key is correct
3. Test device internet connection
4. Try manual push from Pushy dashboard
```

## Quick Test Commands

### View Convex Logs
```bash
# If using Convex CLI
npx convex logs --limit 100

# Or use dashboard: https://dashboard.convex.dev/ → Logs
```

### View Android Logcat
```bash
# If adb is installed
adb logcat | grep -i "pushy\|auth"

# Or use Android Studio → Logcat
```

### Manual Push Test (Pushy Dashboard)
```
1. Go to https://dashboard.pushy.me/
2. Select your app
3. Go to "Send Notification"
4. Enter device token (from Logcat)
5. Enter title and message
6. Click Send
7. If this works → Backend issue
8. If this fails → Device/Pushy issue
```

## What to Report

If still not working, provide:

1. **Convex Logs**: Screenshot of logs after confirming reservation
2. **Users Table**: Screenshot showing pushToken field
3. **Reservations Table**: Screenshot showing userId field
4. **Android Logcat**: Logs from app startup
5. **Pushy Dashboard**: Screenshot of Devices tab

This will show exactly where the flow is breaking.
