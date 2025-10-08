# Push Token Debug Guide

## 🔍 The Real Issue

**Push notifications aren't working because device tokens aren't being saved or found.**

## 🧪 How to Debug

### Step 1: Check Convex Dashboard

1. Go to your Convex dashboard
2. Open "Data" tab
3. Click on "users" table
4. Look for your user account
5. **Check if `pushToken` field has a value**

**Expected**: `pushToken: "abc123def456..."`  
**Problem**: `pushToken: undefined` or `null`

### Step 2: Check Android Logcat

After building and running the app on Android device:

```bash
npx cap open android
# In Android Studio: View → Tool Windows → Logcat
# Filter for "Pushy" or "AuthInitializer"
```

**Look for these logs:**

✅ **Success Pattern:**
```
✅ Platform: android detected - Initializing push notifications
✅ Pushy initialized successfully
✅ Pushy device token: abc123def456...
✅ Push token saved to database
✅ Subscribed to topic: clients
✅ Push notification setup complete
```

❌ **Failure Pattern:**
```
Failed to register device - no token received
// OR
Error saving push token: [error]
// OR
Cannot register: platform not available
```

### Step 3: Check Convex Function Logs

When admin confirms a reservation:

1. Go to Convex dashboard
2. Click "Logs" tab
3. Filter for recent function calls
4. Look for `sendPushToUser` calls

**Expected logs:**
```
📤 sendPushToUser called - userId: [id], userEmail: [email]
🔍 Looking for push token - userId: [id], userEmail: [email]
✅ Found user by ID: [email], has token: true
✅ Found push token for [name] ([email])
📱 Sending push notification via Pushy API...
✅ Push notification sent successfully to [name]
```

**Problem logs:**
```
🔍 Looking for push token - userId: [id], userEmail: [email]
✅ Found user by ID: [email], has token: false
❌ No push token found for user
```

## 🔧 Common Problems & Solutions

### Problem 1: Token Never Saved

**Symptom**: User opens app, but `pushToken` field in database stays empty

**Causes**:
1. User not logged in when app opened
2. Platform detection failed
3. Pushy registration failed
4. savePushToken mutation failed

**Solution**:
1. Make sure user is logged in
2. Check Logcat for errors
3. Verify internet connection
4. Check Convex dashboard logs for `savePushToken` calls

### Problem 2: Token Saved for Wrong User

**Symptom**: Token saved, but not found when sending push

**Causes**:
1. User logged out and back in (different session)
2. Facebook ID vs Convex ID mismatch
3. Email not matching

**Solution**:
1. Check userId in reservation vs userId in users table
2. Verify both have same format (Convex ID or Facebook ID)
3. Log out and log back in on mobile device
4. Wait for token to be re-saved

### Problem 3: Guest Users

**Symptom**: Guest reservations never get push notifications

**Cause**: Guests don't have userId, so token can't be saved

**Solution**: This is expected behavior. Guests need to register/login to receive push notifications.

### Problem 4: Token Found But Push Not Received

**Symptom**: Logs show "Push notification sent successfully" but device doesn't get it

**Causes**:
1. Pushy API error
2. Wrong API key
3. Device offline
4. Notification permission not granted

**Solution**:
1. Check Pushy dashboard delivery logs
2. Verify API key in `lib/pushy.ts`
3. Check device internet connection
4. Grant notification permission in device settings

## 📝 Testing Checklist

### Before Testing
- [ ] App built fresh (`npm run build`)
- [ ] Capacitor synced (`npx cap sync android`)
- [ ] APK installed on device
- [ ] User logged in on device
- [ ] Notification permission granted

### During Testing
- [ ] Check Logcat for "Pushy device token" log
- [ ] Check Convex users table for pushToken
- [ ] Verify pushToken is not undefined/null
- [ ] Admin confirms reservation
- [ ] Check Convex logs for sendPushToUser call
- [ ] Check if token was found in logs
- [ ] Check Pushy dashboard for delivery

### If Still Not Working

1. **Logout and Login Again on Device**
   - This forces AuthInitializer to run again
   - Check Logcat for token save

2. **Manually Test Token**
   - Copy device token from Logcat
   - Go to Pushy dashboard
   - Send manual test push
   - If this works, problem is in Convex lookup

3. **Check Token in Database**
   - Go to Convex dashboard → Data → users
   - Find your user
   - Verify pushToken field has value
   - Copy token, compare with Logcat token

## 🚀 Quick Fix Commands

**Rebuild everything:**
```bash
npm run clean
npm run build
npx cap sync android
npm run android:build
```

**Check if token is saved (requires Convex CLI):**
```bash
# This would require Convex CLI query, not available via npm scripts
# Instead, check via Convex dashboard web UI
```

## 📊 Expected Flow

### Successful Flow
```
1. User opens app on Android
   → Platform: android detected ✅
   
2. Pushy initializes
   → Device registers ✅
   → Token: abc123... ✅
   
3. Token saved to Convex
   → savePushToken called ✅
   → pushToken field updated ✅
   
4. Admin confirms reservation
   → notifyReservationStatusChanged called ✅
   → sendPushToUser scheduled ✅
   
5. sendPushToUser executes
   → getUserPushToken called ✅
   → Token found ✅
   → Pushy API called ✅
   
6. Device receives push ✅
   → Notification shows ✅
   → User taps → Navigates ✅
```

### Failed Flow (Token Not Saved)
```
1. User opens app on Android
   → Platform: android detected ✅
   
2. Pushy initializes
   → Device registers ✅
   → Token: abc123... ✅
   
3. Token save FAILS ❌
   → User not logged in ❌
   → OR savePushToken error ❌
   → pushToken field stays undefined ❌
   
4. Admin confirms reservation
   → notifyReservationStatusChanged called ✅
   → sendPushToUser scheduled ✅
   
5. sendPushToUser executes
   → getUserPushToken called ✅
   → Token NOT found ❌
   → "No push token found for user" ❌
   
6. Device does NOT receive push ❌
```

## 💡 Key Insights

1. **Login BEFORE opening app** - Token is saved when app starts IF user is logged in
2. **Check Convex users table** - This is the source of truth
3. **Convex logs show everything** - All the diagnostic logs are there now
4. **Pushy dashboard** - Shows if push was actually sent
5. **Two separate issues**:
   - Token not saved (AuthInitializer problem)
   - Token not found (Convex lookup problem)

## 🎯 Next Steps

1. Build fresh APK with diagnostic logging
2. Install on Android device
3. Login as client
4. Check Convex users table for pushToken
5. If no token → Check Logcat for AuthInitializer errors
6. If has token → Admin confirms reservation
7. Check Convex logs for sendPushToUser
8. If token found but not received → Check Pushy dashboard

---

**With all the diagnostic logging added, you should now be able to see exactly where the flow is breaking!**
