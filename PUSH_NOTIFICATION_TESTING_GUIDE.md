# Push Notification Testing Guide

## 🔧 Fixes Applied

### ✅ What Was Fixed

1. **Notification Icon Created**
   - Added `ic_notification.xml` in Android drawable folder
   - Bell icon design for push notifications
   - Works across all Android versions

2. **Platform Detection Added**
   - Push only initializes on Android/iOS devices
   - Gracefully handles web browser (no errors)
   - Better logging for debugging

3. **Android Permissions Added**
   - `POST_NOTIFICATIONS` (Android 13+)
   - `WAKE_LOCK` (keep device awake for notifications)
   - `RECEIVE_BOOT_COMPLETED` (notifications after reboot)
   - `c2dm.permission.RECEIVE` (Google Cloud Messaging)

4. **Improved Error Handling**
   - Better try-catch blocks
   - Clearer console messages with emojis
   - Graceful degradation

5. **Capacitor Synced**
   - All changes applied to Android project
   - Pushy plugins loaded correctly

## 📱 Testing Steps

### Step 1: Clean Build

```bash
# Clean everything
npm run clean

# Build fresh
npm run build

# Sync to Android
npx cap sync android
```

### Step 2: Build APK

```bash
# Build debug APK
npm run android:build

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Install on Device

**Option A: Via Android Studio**
```bash
npm run android:open
# Click Run button in Android Studio
```

**Option B: Via ADB**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Option C: Manual Install**
- Copy APK to device
- Tap to install
- Enable "Install from Unknown Sources" if needed

### Step 4: Grant Permissions

**On Android 13+:**
1. After installing, open app
2. You'll see notification permission request
3. Tap "Allow"

**If missed:**
1. Go to Settings → Apps → CelestialApp
2. Tap "Notifications"
3. Enable "All CelestialApp notifications"

### Step 5: Verify Registration

**Open Android Studio Logcat:**
```bash
npx cap open android
# Then: View → Tool Windows → Logcat
```

**Filter for "Pushy"**

**Expected Console Output:**
```
✅ Platform: android detected - Initializing push notifications
Initializing Pushy on native device...
✅ Pushy initialized successfully
Notification icon set successfully
Registering device with Pushy...
Device registration status: false
✅ Pushy device token: [your-long-token-here]
✅ Push token saved to database
✅ Subscribed to topic: admins (or clients)
✅ Push notification setup complete
```

**❌ Bad Signs (Need fixing):**
```
Pushy SDK not loaded on native platform
Failed to register device - no token received
Error initializing Pushy: [error]
```

### Step 6: Test Push Notifications

#### Test 1: Admin Notification (New Reservation)

**Setup:**
- Have admin device with app installed and logged in
- Have client device (or use web browser)

**Steps:**
1. On client: Create a new reservation
2. On admin device: Should receive push notification within 2-3 seconds

**Expected:**
- Notification appears in status bar
- Bell icon shown
- Title: "🔔 New Reservation Created"
- Message: "[Customer Name] reserved [quantity] x [product]"
- Tap notification → opens reservation detail

#### Test 2: Client Notification (Reservation Confirmed)

**Setup:**
- Have client device with app installed and logged in
- Have admin device (or use web browser)

**Steps:**
1. On admin: Go to `/admin/orders`
2. Find pending reservation
3. Click three dots → "Confirm Reservation"
4. SMS modal appears with purple push notification indicator
5. Click "Confirm Reservation"
6. On client device: Should receive push notification

**Expected:**
- Notification appears in status bar
- Bell icon shown
- Title: "✅ Reservation Confirmed"
- Message: "Your reservation has been confirmed!"
- Tap notification → opens reservations page

#### Test 3: Client Notification (Ready for Pickup)

**Steps:**
1. On admin: Find confirmed reservation
2. Click three dots → "Mark as Ready"
3. SMS modal appears with push notification indicator
4. Click "Mark as Ready"
5. On client device: Should receive push notification

**Expected:**
- Notification appears
- Bell icon shown
- Title: "📦 Reservation Ready For Pickup"
- Message: "Your reservation is ready for pickup!"
- Tap notification → opens reservations page

## 🐛 Troubleshooting

### Issue: "Pushy SDK not available" on Native Device

**Cause:** Pushy Cordova plugin not loaded

**Solution:**
```bash
# Reinstall Pushy
npm uninstall pushy-cordova pushy-cordova-receiver
npm install pushy-cordova
npm install ./node_modules/pushy-cordova/receiver/
npx cap sync android

# Clean rebuild
npm run clean
npm run build
npm run android:build
```

### Issue: No Device Token Generated

**Cause:** Registration failed

**Check:**
1. Internet connection on device
2. Google Play Services installed (Android)
3. Pushy service status: https://status.pushy.me/

**Solution:**
```bash
# Check Logcat for errors
# Look for "registration error"
# Verify API key in lib/pushy.ts
```

### Issue: Token Not Saved to Database

**Cause:** Convex mutation failed

**Check:**
1. User is logged in
2. Convex API accessible
3. Check Convex dashboard logs

**Solution:**
```bash
# In Convex dashboard:
# Functions → pushNotifications → savePushToken
# Check for errors
```

### Issue: Push Notification Not Received

**Possible Causes:**
1. Device token not in database
2. Pushy API error
3. Network issue
4. Wrong topic subscription

**Debug Steps:**
1. Check Pushy dashboard: https://dashboard.pushy.me/
2. View delivery logs
3. Verify device token in Convex database
4. Check topic subscription logs
5. Try sending test push from Pushy dashboard

**Test from Pushy Dashboard:**
1. Go to https://dashboard.pushy.me/
2. Select your app
3. Go to "Send Notification"
4. Enter device token (from Logcat)
5. Enter message
6. Send

### Issue: Notification Received but No Icon

**Cause:** Icon file not found

**Solution:**
```bash
# Verify file exists:
dir android\app\src\main\res\drawable\ic_notification.xml

# If missing, create it again (see PUSH_NOTIFICATION_FIX_SUMMARY.md)

# Rebuild
npx cap sync android
npm run android:build
```

### Issue: Notification Permission Denied (Android 13+)

**Solution:**
1. Go to Settings → Apps → CelestialApp
2. Tap "Permissions"
3. Tap "Notifications"
4. Enable "Allow"

**Or reinstall:**
```bash
adb uninstall com.celestial.app
# Then reinstall fresh APK
```

## ✅ Verification Checklist

### Pre-Testing
- [ ] Clean build completed
- [ ] Capacitor synced
- [ ] APK built successfully
- [ ] APK installed on actual device
- [ ] Device has internet connection
- [ ] Notification permission granted (Android 13+)

### During Testing
- [ ] No warnings in web browser about Pushy
- [ ] Platform detection logs show "android"
- [ ] Pushy initializes successfully
- [ ] Device token generated
- [ ] Token saved to Convex database
- [ ] Topic subscription successful

### Admin Flow
- [ ] Admin creates account and logs in
- [ ] Device registered as admin
- [ ] Subscribed to "admins" topic
- [ ] Receives push when client creates reservation
- [ ] Notification shows with icon
- [ ] Tapping notification navigates correctly

### Client Flow
- [ ] Client creates account and logs in
- [ ] Device registered as client
- [ ] Subscribed to "clients" topic
- [ ] Receives push when admin confirms reservation
- [ ] Receives push when marked ready for pickup
- [ ] Notification shows with icon
- [ ] Tapping notification navigates correctly

## 📊 Expected Console Logs

### Web Browser
```
Platform: web - Push notifications only available on native devices
```
**This is normal!** Push only works on native devices.

### Android Device (Success)
```
✅ Platform: android detected - Initializing push notifications
Initializing Pushy on native device...
✅ Pushy initialized successfully
Notification icon set successfully
Registering device with Pushy...
Device registration status: false
✅ Pushy device token: abc123...xyz789
✅ Push token saved to database
✅ Subscribed to topic: admins
✅ Push notification setup complete
```

### When Notification Received
```
📱 Received notification: {title: "...", message: "...", type: "reservation", ...}
```

### When Notification Tapped
```
👆 Notification clicked: {reservationId: "RES-123456", action: "view_reservation"}
👆 Notification tapped - handling navigation
```

## 🎯 Success Criteria

You know it's working when:

1. ✅ **No errors in Logcat** during initialization
2. ✅ **Device token appears** in console and Convex database
3. ✅ **Admin receives push** when client creates reservation
4. ✅ **Client receives push** when admin confirms/marks ready
5. ✅ **Notification icon displays** (bell icon)
6. ✅ **Tapping notification navigates** to correct page
7. ✅ **Web browser shows info log** (not error) about platform

## 📞 Need Help?

If push notifications still don't work after following this guide:

1. **Check Pushy Status**: https://status.pushy.me/
2. **View Pushy Dashboard**: https://dashboard.pushy.me/
3. **Check Convex Dashboard**: View function logs
4. **Review Logcat**: Look for specific errors
5. **Test from Pushy Dashboard**: Send manual test push

### Common Questions

**Q: Can I test on emulator?**
A: Yes, but emulator must have Google Play Services. Real device is better.

**Q: Do I need internet?**
A: Yes, device must have internet to receive push notifications.

**Q: How long does push take to arrive?**
A: Usually 1-3 seconds. If longer, check network/Pushy status.

**Q: Can I use custom notification sound?**
A: Yes, but requires additional configuration. Currently uses default sound.

**Q: Will push work on iOS?**
A: Yes, but requires APNs configuration in Pushy dashboard.

---

## 🚀 Quick Start Commands

**Full clean build and test:**
```bash
npm run clean
npm run build
npx cap sync android
npm run android:build

# Then install APK on device and test
```

**Re-sync only (after code changes):**
```bash
npx cap sync android
npm run android:build
```

**Open Android Studio for debugging:**
```bash
npx cap open android
# View → Tool Windows → Logcat
```

---

**Status**: ✅ Ready for Testing
**Last Updated**: February 2025
**Requires**: Clean build, fresh APK, actual Android device
