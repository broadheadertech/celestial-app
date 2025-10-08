# Push Notification Fix for Native Devices

## Issues Identified

### 1. **Missing Notification Icon**
- No `ic_notification.png` in Android drawable folders
- Pushy tries to set notification icon that doesn't exist
- Results in generic/no icon for notifications

### 2. **Platform Detection Missing**
- Code tries to initialize Pushy on web browser (where it's not available)
- Should only run on native devices (Android/iOS)

### 3. **Missing Android Permissions**
- Android Manifest missing POST_NOTIFICATIONS permission (Android 13+)
- Missing other Pushy-required permissions

### 4. **Pushy SDK Loading**
- Need to verify Pushy is properly loaded before initialization
- Need better error handling for missing SDK

## Fixes Applied

### Fix 1: Create Notification Icon

**Created**: Simple notification icon XML drawable that works across all Android versions

**File**: `android/app/src/main/res/drawable/ic_notification.xml`

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.89,2 2,2zM18,16v-5c0,-3.07 -1.64,-5.64 -4.5,-6.32V4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z"/>
</vector>
```

### Fix 2: Update Pushy Service with Platform Detection

**Updated**: `lib/pushy.ts`

**Changes**:
- Added `isPlatformAvailable()` check
- Uses Capacitor to detect if running on native device
- Only initializes Pushy on Android/iOS
- Better error handling and logging

### Fix 3: Update AuthInitializer with Platform Check

**Updated**: `components/AuthInitializer.tsx`

**Changes**:
- Check if running on native device before initializing Pushy
- Only subscribe to topics on native devices
- Better error messages and logging
- Graceful degradation for web

### Fix 4: Update Android Manifest

**Updated**: `android/app/src/main/AndroidManifest.xml`

**Added Permissions**:
```xml
<!-- Push Notification Permissions -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />
```

## Testing Instructions

### 1. Clean and Rebuild

```bash
# Clean everything
npm run clean

# Rebuild
npm run build

# Sync to Android
npx cap sync android
```

### 2. Test on Device

```bash
# Run on actual device (recommended)
npm run android:run

# OR build APK and install
npm run android:build
```

### 3. Verify in Logcat

Open Android Studio Logcat and filter for:
- `Pushy`
- `PushNotification`
- `AuthInitializer`

**Expected Logs**:
```
✅ Platform: Android detected
✅ Pushy SDK available
✅ Pushy initialized successfully
✅ Device registered with token: [token]
✅ Push token saved to database
✅ Subscribed to admins topic (or clients topic)
```

### 4. Test Push Notifications

**Admin Test**:
1. Login as client
2. Create a reservation
3. Admin device should receive push notification
4. Notification should show with icon

**Client Test**:
1. Login as admin
2. Confirm a reservation
3. Client device should receive confirmation push
4. Tap notification should navigate to reservations

## Verification Checklist

### Before Testing
- [ ] Clean build completed
- [ ] Capacitor synced
- [ ] APK installed on device
- [ ] Device has internet connection
- [ ] Android 13+ notification permission granted

### During Testing
- [ ] No "Pushy SDK not available" warnings in web browser
- [ ] Pushy initializes on Android device
- [ ] Device token generated and logged
- [ ] Token saved to Convex database
- [ ] Topic subscription successful

### After Testing
- [ ] Push notifications received on device
- [ ] Notification icon displays correctly
- [ ] Notification title and message correct
- [ ] Tapping notification navigates correctly
- [ ] No crashes or errors

## Common Issues and Solutions

### Issue: "Pushy SDK not available"
**Solution**: This is normal on web browser. Push only works on native devices.

### Issue: "No notification icon"
**Solution**: The new XML drawable is created. Re-sync Capacitor: `npx cap sync android`

### Issue: "Permission denied"
**Solution**: 
1. Check Android Manifest has POST_NOTIFICATIONS permission
2. On Android 13+, manually grant notification permission in Settings

### Issue: "Token not saved to database"
**Solution**:
1. Check user is logged in
2. Check Convex API is accessible
3. Check network connection

### Issue: "Notification received but no icon"
**Solution**:
1. Verify `ic_notification.xml` exists in drawable folder
2. Clean and rebuild project
3. Reinstall APK

## What Was Changed

### New Files
1. `android/app/src/main/res/drawable/ic_notification.xml` - Notification icon

### Modified Files
1. `lib/pushy.ts` - Added platform detection
2. `components/AuthInitializer.tsx` - Added native device check
3. `android/app/src/main/AndroidManifest.xml` - Added permissions

## Platform Behavior

### Web Browser
- Pushy SDK not loaded
- Warnings logged (normal)
- App works normally without push
- No errors or crashes

### Android Device
- Pushy SDK loads automatically
- Device registers for push
- Token saved to database
- Push notifications work

### iOS Device (Future)
- Will need APNs configuration
- Same code will work
- Need to upload APNs Auth Key to Pushy dashboard

## Next Steps

1. ✅ **Test on actual Android device** (required)
2. ✅ **Verify push notifications are received**
3. ✅ **Check notification icon displays**
4. ✅ **Test all reservation flows**
5. ⏳ **Optional: Add custom notification icon design**
6. ⏳ **Optional: Configure iOS support**

## Support

If issues persist:
1. Check Android Studio Logcat for errors
2. Verify in Pushy dashboard: https://dashboard.pushy.me/
3. Check Convex dashboard for function logs
4. Review this document for common issues

---

**Status**: ✅ Fixed and Ready for Testing
**Last Updated**: February 2025
**Requires**: Clean build and fresh APK install
