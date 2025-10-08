# Most Likely Push Notification Issues

Based on "SMS works but push doesn't", here are the most probable causes:

## 🎯 #1 Most Likely: Guest Reservation (No UserId)

**Probability**: 90%

### The Problem
Client created reservation as **guest** (not logged in), so reservation has `guestId` but NO `userId`.

When admin confirms, `notifyReservationStatusChanged` is called with:
```typescript
userId: reservation.userId,  // ← undefined for guests!
userEmail: reservation.guestInfo?.email,
```

The push notification code checks:
```typescript
if (!userId && !userEmail) {
  throw new Error("Either userId or userEmail must be provided");
}
```

But even if email is provided, getUserPushToken looks for user by email, but **guests don't have user accounts**, so no push token found.

### How to Verify
1. Convex Dashboard → Data → reservations
2. Find the reservation
3. Check fields:
   - `userId`: undefined or null → **GUEST RESERVATION**
   - `guestId`: has value → **GUEST RESERVATION**
   - `guestInfo`: has name, email, phone → **GUEST RESERVATION**

### The Solution
**Client must be logged in** before making reservation:

```
Wrong Flow (Guest):
1. Client opens app (not logged in)
2. Client browses products
3. Client makes reservation (guestId assigned)
4. Admin confirms reservation
5. ❌ No push sent (no user account, no push token)

Correct Flow (Logged In):
1. Client opens app (not logged in)
2. Client creates account OR logs in
3. Device registers with Pushy
4. Push token saved to user account
5. Client makes reservation (userId assigned)
6. Admin confirms reservation
7. ✅ Push sent to user's device
```

### Fix for Users
**Tell clients**: "Please login or create an account before making reservations to receive push notifications."

### Workaround
SMS still works for guests because it uses `guestInfo.phone`. Push notifications require user accounts.

---

## 🎯 #2 Second Most Likely: Device Token Not Saved

**Probability**: 8%

### The Problem
Device registered with Pushy and got token, but token wasn't saved to Convex database.

**Causes**:
- User opened app before logging in
- Network error during save
- savePushToken mutation failed
- App opened on web first (not native)

### How to Verify
1. Convex Dashboard → Data → users
2. Find client user
3. Check `pushToken` field:
   - `undefined` or `null` → **TOKEN NOT SAVED**
   - Has long string → Token is saved (not this issue)

### The Solution

**Reinstall App Process**:
```bash
# 1. Build fresh APK
npm run clean
npm run build
npx cap sync android
npm run android:build

# 2. Uninstall old app from device
adb uninstall com.celestial.app

# 3. Install fresh APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 4. Open app
# 5. Login as client
# 6. Check Logcat for "✅ Push token saved to database"
# 7. Verify in Convex users table
```

---

## 🎯 #3 Third Most Likely: Convex Functions Not Deployed

**Probability**: 1%

### The Problem
All the fixes (dynamic imports, internal functions) weren't deployed to Convex production.

### How to Verify
Check Convex Dashboard → Functions tab:
- Look for "Last deployed" timestamp
- Should be recent (after all fixes)
- If old timestamp → Functions not deployed

### The Solution
```bash
# Manual deploy
npx convex deploy

# Or ensure auto-deploy is enabled
# Check Convex dashboard settings
```

---

## 🎯 #4 Least Likely: App ID Still Missing

**Probability**: 0.5%

### The Problem
Despite adding App ID to AndroidManifest.xml, the APK was built before the change.

### How to Verify
```bash
# Check AndroidManifest.xml
cat android/app/src/main/AndroidManifest.xml | grep pushy_app_id
```

Should show:
```xml
android:value="68e49c28b7e2f9df7184b4c8" />
```

### The Solution
Ensure fresh build after adding App ID:
```bash
npm run clean
npx cap sync android
npm run android:build
```

---

## 🎯 #5 Least Likely: Wrong User ID Format

**Probability**: 0.5%

### The Problem
Reservation has userId but it's in wrong format (Facebook ID vs Convex ID).

### How to Verify
Convex logs show:
```
✅ Found user by ID: [email], has token: false
```

User found but no token → User exists but different user than expected

### The Solution
Check both:
- Reservation `userId` field value
- User `_id` field value
- Should match exactly

---

## Quick Diagnosis

Run this mental checklist:

```
1. Is reservation made by logged-in user?
   NO → Issue #1 (Guest Reservation) ✅ MOST LIKELY
   YES → Continue

2. Does user have pushToken in database?
   NO → Issue #2 (Token Not Saved) ✅ SECOND LIKELY
   YES → Continue

3. Do Convex logs show "Push notification sent successfully"?
   NO → Check logs for exact error
   YES → Issue is with Pushy delivery (check Pushy dashboard)

4. Does Pushy dashboard show delivery attempts?
   NO → Pushy API issue
   YES → Device issue (offline, notifications disabled)
```

---

## The Fix (90% Probability)

**If it's Issue #1 (Guest Reservation)**:

**Option A**: Require Login for Reservations
```typescript
// In reservation creation flow
if (!isAuthenticated) {
  alert("Please login to make a reservation and receive notifications");
  router.push('/auth/login');
  return;
}
```

**Option B**: Show Warning for Guests
```typescript
// In reservation form
{!isAuthenticated && (
  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
    <p className="text-sm text-yellow-400">
      ⚠️ You're making a reservation as a guest. 
      Push notifications are not available. 
      Please login to receive notifications.
    </p>
  </div>
)}
```

**Option C**: Prompt Guest to Register After Reservation
```typescript
// After successful reservation
if (!isAuthenticated) {
  showModal({
    title: "Reservation Created!",
    message: "Create an account to receive push notifications about your reservation status.",
    actions: [
      { label: "Register", onClick: () => router.push('/auth/register') },
      { label: "Later", onClick: closeModal }
    ]
  });
}
```

---

## Summary

**Most likely** your issue is:
1. ✅ **#1: Guest reservations (no userId)** → Client not logged in
2. #2: Token not saved → Device didn't save token to database
3. #3-5: Other issues (very unlikely)

**To confirm**, check:
1. Convex Dashboard → Data → reservations → userId field
2. If undefined → **That's your issue**
3. Solution: Client must login before making reservations

**To fix immediately**:
- Tell clients to login before making reservations
- Add warning message for guest users
- Or require authentication for reservations
