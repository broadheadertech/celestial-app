# Push Notifications Setup Guide

This document explains how push notifications are implemented in the Celestial Drakon Aquatics app using **Pushy.me**.

## Overview

The app uses Pushy.me for cross-platform push notifications with the following features:

- **Admin notifications**: New reservations, cancelled reservations
- **Client notifications**: Reservation confirmed, ready for pickup, completed, cancelled
- **Role-based topics**: Admins subscribe to "admins" topic, clients to "clients" topic
- **Deep linking**: Tapping notifications navigates to relevant pages

## Architecture

### Components

1. **Pushy Service** (`lib/pushy.ts`)
   - Device registration
   - Notification listeners
   - Topic subscription management

2. **Convex Backend** (`convex/services/pushNotifications.ts`)
   - Push token storage
   - Push notification API calls
   - Admin/client targeting

3. **Auth Initializer** (`components/AuthInitializer.tsx`)
   - Auto-registers device on app launch
   - Subscribes to role-based topics
   - Sets up notification handlers

4. **Notification System** (`convex/services/notifications.ts`)
   - Triggers push notifications on reservation events
   - Stores notification metadata for in-app display

## API Configuration

**API Key**: `f4a6c89a619917af76528e00923ab5c8943791d16cf3c387d97137147e4727b9`

This key is configured in:
- `lib/pushy.ts` (client-side)
- `convex/services/pushNotifications.ts` (server-side)

## Push Notification Flows

### 1. New Reservation Created (Admin)
**Trigger**: When a customer creates a new reservation
**Target**: All admins
**Data**:
```json
{
  "title": "🔔 New Reservation Created",
  "message": "John Doe reserved 2 x Blue Tang Fish",
  "type": "reservation",
  "reservationId": "RES-123456",
  "action": "view_reservation"
}
```

### 2. Reservation Cancelled by Customer (Admin)
**Trigger**: When a customer cancels their reservation
**Target**: All admins
**Data**:
```json
{
  "title": "📋 Reservation Status Updated",
  "message": "Reservation by John Doe for Blue Tang Fish changed from pending to cancelled",
  "type": "reservation",
  "reservationId": "RES-123456",
  "action": "view_reservation"
}
```

### 3. Reservation Confirmed (Client)
**Trigger**: When admin confirms a reservation
**Target**: Specific customer (by userId or email)
**Data**:
```json
{
  "title": "✅ Reservation Confirmed",
  "message": "Your reservation has been confirmed!",
  "type": "reservation",
  "reservationId": "RES-123456",
  "action": "view_reservation"
}
```

### 4. Reservation Ready for Pickup (Client)
**Trigger**: When admin marks reservation as ready
**Target**: Specific customer
**Data**:
```json
{
  "title": "📦 Reservation Ready For Pickup",
  "message": "Your reservation is ready for pickup!",
  "type": "reservation",
  "reservationId": "RES-123456",
  "action": "view_reservation"
}
```

### 5. Reservation Completed (Client)
**Trigger**: When admin marks reservation as completed
**Target**: Specific customer
**Data**:
```json
{
  "title": "🎉 Reservation Completed",
  "message": "Your reservation has been completed. Thank you!",
  "type": "reservation",
  "reservationId": "RES-123456",
  "action": "view_reservation"
}
```

### 6. Reservation Cancelled by Admin (Client)
**Trigger**: When admin cancels a reservation
**Target**: Specific customer
**Data**:
```json
{
  "title": "❌ Reservation Cancelled",
  "message": "Your reservation has been cancelled.",
  "type": "reservation",
  "reservationId": "RES-123456",
  "action": "view_reservation"
}
```

## Database Schema Updates

### Users Table
Added fields:
- `pushToken`: Device push notification token
- `pushTokenUpdatedAt`: Last update timestamp

### Notifications Table
Added fields:
- `targetUserId`: Target user for client notifications
- `targetUserEmail`: Target email for guest notifications
- `targetUserRole`: "admin" or "client"
- `pushNotificationSent`: Whether push was sent
- `pushNotificationId`: Pushy notification ID
- `scheduledPushTime`: When to send push
- `metadata.pushAction`: Action to perform on click
- `metadata.pushData`: Data for deep linking

## Setup Instructions

### 1. Install Dependencies
Already installed:
```bash
npm install pushy-cordova
npm install ./node_modules/pushy-cordova/receiver/
```

### 2. Sync Capacitor
```bash
npx cap sync android
```

### 3. Build and Test
```bash
# Build for Android
npm run android:build

# Or run directly on device
npm run android:run
```

### 4. iOS Setup (Optional)
For iOS support, you need to:
1. Configure APNs authentication in Pushy dashboard
2. Enable Push Notifications capability in Xcode
3. Upload APNs Auth Key to Pushy dashboard

See: https://pushy.me/docs/additional-platforms/capacitor

## Testing Push Notifications

### 1. Test from Pushy Dashboard
Visit: https://dashboard.pushy.me/apps
- Select your app
- Go to "Send Notification" tab
- Input device token (check console logs)
- Send test push

### 2. Test Reservation Flow
1. Create a new reservation as a client
2. Admin should receive push notification
3. Confirm the reservation as admin
4. Client should receive confirmation push
5. Mark as ready for pickup
6. Client should receive pickup notification

### 3. Console Logs
Check for these logs in Android Studio Logcat:
```
Pushy device token: [token]
Device registered with token: [token]
Push token saved to database
Subscribed to admins topic
Received notification: {data}
Notification clicked: {data}
```

## Troubleshooting

### Push notifications not received
1. **Check device token**: Verify token is registered in database
2. **Check API key**: Ensure correct key in both client and server
3. **Check subscriptions**: Verify user subscribed to correct topic
4. **Check network**: Ensure device has internet connection
5. **Check Pushy dashboard**: View delivery status

### Notifications received but not displayed
1. **Check Android permissions**: Ensure notification permission granted
2. **Check notification icon**: Verify `ic_notification` exists in drawable
3. **Check foreground handling**: Review `setNotificationListener` implementation

### Deep linking not working
1. **Check notification click listener**: Verify `setNotificationClickListener` is set
2. **Check action data**: Ensure correct `action` and `reservationId` in payload
3. **Check routing**: Verify routes exist in Next.js

## API Reference

### Client-Side (Pushy Service)

```typescript
// Initialize Pushy
await pushyService.initialize();

// Register device
const token = await pushyService.register();

// Subscribe to topic
await pushyService.subscribeToTopic("admins");

// Set notification listener
pushyService.setNotificationListener((data) => {
  console.log("Received:", data);
});

// Set click listener
pushyService.setNotificationClickListener((data) => {
  console.log("Clicked:", data);
});
```

### Server-Side (Convex Functions)

```typescript
// Save push token
await savePushToken({
  userId: user._id,
  pushToken: token,
});

// Send to all admins
await sendPushToAdmins({
  title: "New Reservation",
  message: "John Doe reserved 2 items",
  data: {
    type: "reservation",
    reservationId: "RES-123",
    action: "view_reservation",
  },
});

// Send to specific user
await sendPushToUser({
  userId: user._id,
  title: "Reservation Confirmed",
  message: "Your reservation is confirmed!",
  data: {
    type: "reservation",
    reservationId: "RES-123",
    action: "view_reservation",
  },
});

// Send to topic
await sendPushToTopic({
  topic: "clients",
  title: "New Feature",
  message: "Check out our new products!",
});
```

## Best Practices

1. **Error Handling**: Always wrap push operations in try-catch
2. **Graceful Degradation**: App should work without push notifications
3. **User Consent**: Request notification permission appropriately
4. **Token Updates**: Update token on login/logout
5. **Topic Management**: Subscribe/unsubscribe based on role changes
6. **Testing**: Test on actual devices, not just emulators
7. **Monitoring**: Track push delivery rates in Pushy dashboard

## Security Considerations

- API key is embedded in client code (acceptable for Pushy)
- Push tokens are stored securely in Convex database
- User role validation performed server-side
- Push notifications don't contain sensitive data
- Deep linking validates user permissions

## Resources

- **Pushy Dashboard**: https://dashboard.pushy.me/
- **Pushy Docs**: https://pushy.me/docs/
- **Pushy Capacitor Guide**: https://pushy.me/docs/additional-platforms/capacitor
- **Pushy API**: https://pushy.me/docs/api/send-notifications

## Support

For issues with:
- **Pushy service**: Contact Pushy support at https://pushy.me/support
- **App implementation**: Check console logs and review this guide
- **Convex backend**: Review Convex dashboard and function logs
