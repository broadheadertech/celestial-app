# Push Notification Diagnosis & Fix

## 🔍 The Real Problem

The **SMSConfirmationModal is just UI** - it shows that push will be sent, but doesn't actually send it. The push notifications are supposed to be sent by **Convex backend** when `updateReservationStatus()` or `markReservationReadyForPickup()` is called.

## 🧐 What's Happening

### Current Flow
```
1. Admin clicks "Confirm Reservation" → SMS Modal shows
2. Admin clicks confirm → Calls Convex updateReservationStatus()
3. Convex calls notifyReservationStatusChanged()
4. notifyReservationStatusChanged() calls scheduler.runAfter() → sendPushToUser()
5. sendPushToUser() fetches user's push token from database
6. Sends push via Pushy API
```

### Potential Failure Points

**❌ Issue 1: Device Token Not Saved**
- User opens app → AuthInitializer tries to save token
- But token might not be saved if user not logged in yet
- Token might be saved for wrong user

**❌ Issue 2: User ID Mismatch**
- Reservation has userId (or guestId)
- But token saved with different userId
- Token lookup fails → no push sent

**❌ Issue 3: Guest Users**
- Guest makes reservation (no userId, only guestId)
- Token saved requires userId
- Guests never get push notifications

**❌ Issue 4: Facebook Users**
- Facebook users have string ID (not Convex ID)
- Token saved with Facebook ID
- Lookup fails because ID format mismatch

## ✅ What Was Fixed

### Fix 1: Added Comprehensive Diagnostic Logging

**Files Updated:**
1. `convex/services/pushNotifications.ts`
   - Added logging to `getUserPushToken()` query
   - Shows every step: looking for token, found user, has token, etc.
   - Added logging to `sendPushToUser()` action
   - Shows userId, email, title, message, token found, push sent

2. `convex/services/notifications.ts`
   - Added logging to `notifyReservationStatusChanged()`
   - Shows when client notifications are needed
   - Shows customer details (name, email, userId)
   - Shows push title and message being sent
   - Shows when push is scheduled

### Fix 2: Better Error Messages

All console logs now use emojis for easy identification:
- 🔍 Looking up data
- ✅ Success
- ❌ Error
- ⚠️ Warning
- 📤 Sending
- 📱 Push notification
- 👆 User action

### Fix 3: Graceful Failure Handling

- If no token found, logs explain why
- If user not found, shows which lookup failed
- Returns clear error messages

## 📊 What You'll See in Convex Logs

### When Reservation Status Changes

```
🔔 Checking if client notification needed. New status: confirmed, Is client status: true
📱 Creating client notification for status: confirmed
   Customer: John Doe, Email: john@example.com, UserId: abc123
   Push title: ✅ Reservation Confirmed
   Push message: Your reservation has been confirmed!
📤 Scheduling push notification to client via scheduler.runAfter
✅ Push notification scheduled successfully
```

### When sendPushToUser Executes

**Success Case:**
```
📤 sendPushToUser called - userId: abc123, userEmail: john@example.com
   Title: ✅ Reservation Confirmed
   Message: Your reservation has been confirmed!
🔍 Looking for push token - userId: abc123, userEmail: john@example.com
✅ Found user by ID: john@example.com, has token: true
✅ Found push token for John Doe (john@example.com)
   Token: abc123def456789...
📱 Sending push notification via Pushy API...
✅ Push notification sent successfully to John Doe
```

**Failure Case (No Token):**
```
📤 sendPushToUser called - userId: abc123, userEmail: john@example.com
   Title: ✅ Reservation Confirmed
   Message: Your reservation has been confirmed!
🔍 Looking for push token - userId: abc123, userEmail: john@example.com
✅ Found user by ID: john@example.com, has token: false
❌ No push token found for user: abc123
   This user may not have opened the mobile app yet
```

## 🎯 How to Debug Now

### Step 1: Deploy Convex Functions

The diagnostic logging is in the Convex functions. Make sure they're deployed:
- Convex should auto-deploy when you save files
- Or run: `npx convex dev` (if using dev mode)
- Check Convex dashboard → Functions → Last deployed time

### Step 2: Build and Install APK

```bash
npm run clean
npm run build
npx cap sync android
npm run android:build
```

### Step 3: Check Three Places

**Place 1: Android Logcat** (for token registration)
```bash
npx cap open android
# View → Tool Windows → Logcat
# Filter: "Pushy" or "AuthInitializer"
```

Look for:
```
✅ Pushy device token: abc123...
✅ Push token saved to database
```

**Place 2: Convex Data Browser** (for token storage)
- Go to Convex dashboard
- Data → users table
- Find your user
- Check `pushToken` field has value

**Place 3: Convex Logs** (for push sending)
- Go to Convex dashboard
- Logs tab
- Filter for recent function calls
- Look for `sendPushToUser` and related logs

### Step 4: Test Flow

1. Login as client on Android device
2. Check Logcat → Verify token saved
3. Check Convex users table → Verify pushToken field
4. Admin confirms reservation (from web or another device)
5. Check Convex logs → See all the diagnostic logs
6. Look for the exact failure point

## 💡 What to Look For

### If Token Not Saved

**Symptoms:**
- Logcat shows token generated but not "saved to database"
- Convex users table shows `pushToken: undefined`

**Possible Causes:**
- User not logged in when app started
- savePushToken mutation failed
- Network error

**Solution:**
- Make sure user is logged in
- Logout and login again
- Check Convex dashboard for savePushToken errors

### If Token Saved But Not Found

**Symptoms:**
- Convex users table shows pushToken with value
- But sendPushToUser logs show "No push token found"

**Possible Causes:**
- Wrong userId in reservation
- Facebook ID vs Convex ID mismatch
- User email doesn't match

**Solution:**
- Check reservation userId vs users table _id
- Verify they match exactly
- Check Convex logs to see which lookup method was tried

### If Token Found But Not Received

**Symptoms:**
- Logs show "Push notification sent successfully"
- But device doesn't receive it

**Possible Causes:**
- Pushy API error
- Wrong API key
- Device offline
- Notification permission not granted

**Solution:**
- Check Pushy dashboard delivery logs
- Verify Pushy API key
- Check device internet connection
- Grant notification permission

## 📝 Next Steps

1. **Deploy Convex functions** (with diagnostic logging)
2. **Build fresh APK** with all fixes
3. **Install on Android device**
4. **Login as client**
5. **Check Convex users table** for pushToken
6. **Admin confirms reservation**
7. **Check Convex logs** for detailed execution trace
8. **Identify exact failure point**

---

## 🚀 Quick Commands

```bash
# Full rebuild
npm run clean && npm run build && npx cap sync android && npm run android:build

# Open Android Studio for Logcat
npx cap open android

# Check Convex deployment (if using dev mode)
npx convex dev
```

---

**Status**: ✅ Diagnostic logging added
**Next**: Deploy Convex, build APK, test and check logs
**Docs**: See `PUSH_TOKEN_DEBUG_GUIDE.md` for detailed debugging steps
