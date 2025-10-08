# Push Notification - Action Plan to Fix

## 🎯 Goal
Fix push notifications not working on native device when admin confirms reservation (SMS works fine).

## 📋 Diagnosis Steps (Do These First)

### Step 1: Check Convex Logs (CRITICAL)
**This will tell you EXACTLY what's wrong**

1. Go to https://dashboard.convex.dev/
2. Open your project
3. Click "Logs" tab
4. Test: Have admin confirm a reservation
5. Immediately check logs for these messages:

**What to look for:**

```
🔔 Calling notifyReservationStatusChanged with:
   reservationId: RES-123456
   customerName: John Doe
   customerEmail: john@example.com
   userId: [LOOK HERE] ← Is this undefined or has a value?
   productName: 2x product
   oldStatus: pending → newStatus: confirmed
```

**If userId is `undefined`:**
→ **This is your problem!** (90% chance)
→ Client made reservation as guest
→ **Solution**: Client must be logged in
→ Skip to "Fix #1" below

**If userId has a value (like "j97abc123..."):**
→ Continue reading the logs...

```
🔔 Checking if client notification needed. New status: confirmed, Is client status: true
📱 Creating client notification for status: confirmed
   Customer: John Doe, Email: john@example.com, UserId: j97abc123...
📤 Scheduling push notification to client via scheduler.runAfter
✅ Push notification scheduled successfully
```

**If logs stop here:**
→ Scheduler issue (unlikely)
→ Check later logs for sendPushToUser

**Continue reading:**

```
📤 sendPushToUser called - userId: j97abc123..., userEmail: john@example.com
🔍 Looking for push token - userId: j97abc123..., userEmail: john@example.com
```

**Then one of these:**

**Option A - Token Found:**
```
✅ Found user by ID: john@example.com, has token: true
✅ Found push token for John Doe (john@example.com)
📱 Sending push notification via Pushy API...
✅ Push notification sent successfully to John Doe
```
→ Backend worked! Problem is device/Pushy
→ Skip to "Fix #3" below

**Option B - No Token:**
```
✅ Found user by ID: john@example.com, has token: false
❌ No push token found for user: j97abc123...
```
→ Device token not saved
→ Skip to "Fix #2" below

**Option C - User Not Found:**
```
⚠️ User not found by direct ID lookup
❌ No push token found for user
```
→ UserId mismatch
→ Skip to "Fix #4" below

---

## 🔧 Fixes (Choose Based on Diagnosis)

### Fix #1: Guest Reservation (userId is undefined)

**Problem**: Client made reservation without logging in

**Immediate Solution - Require Login:**

Add this check before allowing reservations:

**File**: `app/client/cart/page.tsx` or wherever "Reserve" button is

```typescript
const handleReserve = async () => {
  // Check if user is logged in
  if (!isAuthenticated) {
    alert("Please login or create an account to make reservations and receive notifications.");
    router.push('/auth/login?redirect=/client/cart');
    return;
  }
  
  // Continue with reservation...
};
```

**Alternative - Show Warning:**

```typescript
{!isAuthenticated && (
  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
    <p className="text-sm text-yellow-400 font-medium mb-2">
      ⚠️ Guest Reservation
    </p>
    <p className="text-xs text-yellow-300/80">
      You're creating a reservation as a guest. You will receive SMS notifications 
      but NOT push notifications. To receive push notifications, please login or 
      create an account.
    </p>
  </div>
)}
```

**Tell Your Users:**
"Please login before making reservations to receive push notifications on your phone."

---

### Fix #2: Device Token Not Saved

**Problem**: Device registered but token not in database

**Steps**:

1. **Verify Token Not Saved**:
   - Convex Dashboard → Data → users
   - Find client user
   - Check `pushToken` field
   - If undefined/null → Confirmed

2. **Fresh Install**:
```bash
# Build fresh APK
npm run clean
npm run build
npx cap sync android
npm run android:build

# Uninstall old app from device
adb uninstall com.celestial.app

# Install fresh APK
# Location: android/app/build/outputs/apk/debug/app-debug.apk
```

3. **Test Registration**:
   - Open app on device
   - Login as client
   - Check device Logcat (Android Studio)
   - Should see: "✅ Push token saved to database"
   - Verify in Convex users table

4. **If Still Not Saving**:
   - Check Convex logs for savePushToken errors
   - Ensure user logged in BEFORE app initializes
   - Try: Logout → Close app → Open app → Login

---

### Fix #3: Pushy Delivery Issue

**Problem**: Backend sent push but device didn't receive

**Steps**:

1. **Check Pushy Dashboard**:
   - Go to https://dashboard.pushy.me/
   - Select app: 68e49c28b7e2f9df7184b4c8
   - Check "Analytics" for delivery attempts
   - Check "Logs" for errors

2. **Test Manual Push**:
   - Pushy Dashboard → "Send Notification"
   - Enter device token (from Logcat)
   - Enter test message
   - Send
   - If received → Backend issue
   - If not received → Device/Pushy issue

3. **Device Checks**:
   - Is device online?
   - Are notifications enabled in Settings?
   - Is app in background or foreground?
   - Try force-closing and reopening app

4. **Verify API Key**:
   - Check `convex/services/pushNotifications.ts`
   - PUSHY_API_KEY should be: `f4a6c89a619917af76528e00923ab5c8943791d16cf3c387d97137147e4727b9`

---

### Fix #4: User ID Mismatch

**Problem**: Reservation userId doesn't match any user

**Steps**:

1. **Check Both IDs**:
   - Convex → reservations → userId: Copy this value
   - Convex → users → _id: Find matching user
   - Should be identical

2. **If Different**:
   - Possible Facebook ID vs Convex ID issue
   - Check user's `facebookId` field
   - Check reservation's userId format

3. **Solution**:
   - Ensure consistent ID format
   - If using Facebook login, ensure proper ID handling
   - May need to update reservation with correct userId

---

## 📊 Testing Checklist

After implementing fix:

1. **Build fresh APK**:
```bash
npm run clean
npm run build
npx cap sync android
npm run android:build
```

2. **Install on device**

3. **Login as client** (important!)

4. **Check Logcat**: Should see device token and "saved to database"

5. **Verify in Convex**: users table should have pushToken

6. **Create reservation** (while logged in!)

7. **Verify reservation**: Check userId field is populated

8. **Admin confirms** reservation

9. **Check Convex logs**: Should show complete success flow

10. **Device receives notification**: ✅ Success!

---

## 🚀 Quick Commands

### Build and Install
```bash
# Full rebuild
npm run clean && npm run build && npx cap sync android && npm run android:build

# Install APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# View logs
adb logcat | grep -i "pushy\|auth"
```

### Check Database
```
Convex Dashboard → Data
- Check users table → pushToken field
- Check reservations table → userId field
```

### Check Logs
```
Convex Dashboard → Logs
Look for 🔔 📱 📤 ✅ ❌ emojis
```

---

## 💡 Most Likely Scenario

Based on "SMS works but push doesn't":

**90% chance**: Client made reservation as **guest** (not logged in)
- Reservation has `guestId` but no `userId`
- SMS works (uses guestInfo.phone)
- Push fails (no user account, no token)
- **Solution**: Require login for reservations

**8% chance**: Device token not saved to database
- Device registered but savePushToken failed
- **Solution**: Fresh install, ensure logged in

**2% chance**: Other issues (Pushy delivery, ID mismatch, etc.)

---

## 📞 What to Report

If still not working after fixes, provide:

1. **Convex Logs** (screenshot of complete log flow)
2. **Users Table** (screenshot showing pushToken field)
3. **Reservations Table** (screenshot showing userId field)
4. **Device Logcat** (logs from app startup)

This will show the exact failure point.

---

## ✅ Success Criteria

You'll know it's fixed when:

1. ✅ Convex logs show "userId: [actual ID]" (not undefined)
2. ✅ Convex logs show "has token: true"
3. ✅ Convex logs show "Push notification sent successfully"
4. ✅ Device receives notification with bell icon
5. ✅ Tapping notification navigates to correct page

---

**Start with Step 1 (Check Convex Logs) - that will tell you which fix to apply!**
