# SMS Feature - Quick Start

## ⚡ What It Does

When you update a reservation to **"Confirmed"** or **"Ready for Pickup"**, a modal appears that lets you send an SMS to the customer. The SMS app opens automatically with the message pre-filled — you just tap "Send".

## 🎯 Quick Demo (2 Minutes)

### Step 1: Open Reservation
1. Login as admin
2. Go to **Admin → Reservations**
3. Click on any reservation with a phone number

### Step 2: Update Status
1. Click **"Update Status"** or **"Mark as Ready for Pickup"**
2. Select **"Confirmed"** or **"Ready for Pickup"**
3. Click **"Update"**

### Step 3: SMS Modal Appears
✅ Shows customer name
✅ Shows phone number
✅ Shows SMS message preview
✅ SMS checkbox (checked by default)

### Step 4: Send SMS
1. Keep SMS checkbox checked
2. Click **"Confirm Reservation"**
3. **SMS app opens automatically** 📱
4. Phone number is pre-filled
5. Message is pre-filled
6. **Tap "Send" in SMS app** ✉️

## 💡 Key Features

### ✅ Zero Cost
- Uses your device's SMS app
- No API charges
- No subscription needed

### ✅ Works Everywhere
- Web browsers (mobile & desktop)
- Android APK
- iOS devices
- Tablets with SMS

### ✅ Automatic
- Triggers on status change
- Message auto-generated
- Phone number auto-filled

### ✅ Optional
- Checkbox to enable/disable
- Works with push notifications
- Graceful fallback if no phone

## 📝 SMS Message Examples

### Confirmation:
```
Hi John Doe! Your reservation RES-123456 for 2x Blue Tang Fish has been CONFIRMED. Please pick up within 48 hours. Thank you for choosing Celestial Drakon Aquatics!
```

### Ready for Pickup:
```
Hi John Doe! Your reservation RES-123456 for 2x Blue Tang Fish is now READY FOR PICKUP! Location: Main Store. Please pick up on February 15, 2025 at 2:00 PM. - Celestial Drakon Aquatics
```

## 🚀 Testing Steps

### Test 1: Confirmed Status
```
1. Open reservation (has phone number)
2. Update status to "Confirmed"
3. SMS modal appears
4. Click "Confirm Reservation"
5. SMS app opens → Tap "Send"
```

### Test 2: Ready for Pickup
```
1. Reservation in "Confirmed" status
2. Click "Mark as Ready for Pickup"
3. Fill pickup date/time
4. Click "Mark Ready"
5. SMS modal appears → Click "Mark as Ready"
6. SMS app opens → Tap "Send"
```

### Test 3: No Phone Number
```
1. Reservation without phone number
2. Update status to "Confirmed"
3. Modal shows "No Phone Number" warning
4. SMS option disabled
5. Push notification sent instead
```

## ⚙️ How It Works

```
Admin Updates Status
       ↓
SMS Modal Appears
       ↓
Admin Reviews & Confirms
       ↓
SMS App Opens (if SMS enabled)
       ↓
Pre-filled Message Ready
       ↓
Admin Taps "Send" in SMS App
       ↓
Customer Receives SMS
```

## 🎛️ Modal Controls

| Element | Description |
|---------|-------------|
| **Customer Name** | Shows who will receive SMS |
| **Phone Number** | Formatted: +63 912 345 6789 |
| **SMS Message** | Preview of exact message |
| **Character Count** | Shows message length |
| **SMS Checkbox** | Enable/disable SMS sending |
| **Confirm Button** | Triggers SMS app opening |

## 🐛 Troubleshooting

### SMS App Doesn't Open
- **Check:** Browser permissions
- **Try:** Different browser or device
- **Verify:** Default SMS app is configured

### No Phone Number Showing
- **Add:** Phone number in user profile
- **Or:** Collect during guest reservation
- **Format:** Must be valid Philippines number

### Message Too Long
- **Note:** Over 160 chars = multiple SMS
- **Tip:** Keep admin notes brief
- **Current:** ~120-250 characters

## 📋 Checklist

Before sending SMS:
- [ ] Verify customer name is correct
- [ ] Check phone number is valid
- [ ] Review SMS message content
- [ ] Confirm pickup details (if applicable)
- [ ] Check SMS checkbox state
- [ ] Click confirm button
- [ ] Tap "Send" in SMS app

## 🎨 UI Preview

### Modal Structure:
```
┌─────────────────────────────────────┐
│  📱 Confirm Reservation             │
│                                     │
│  👤 Customer: John Doe              │
│  📞 Phone: +63 912 345 6789         │
│                                     │
│  📝 SMS Message Preview:            │
│  ┌─────────────────────────────┐   │
│  │ Hi John Doe! Your          │   │
│  │ reservation RES-123456...   │   │
│  └─────────────────────────────┘   │
│  Character count: 145 characters    │
│                                     │
│  ☑️ Send SMS Notification          │
│  ℹ️ Opens your SMS app with        │
│     message pre-filled              │
│                                     │
│  [Cancel]  [Confirm Reservation]   │
└─────────────────────────────────────┘
```

## 🔗 Related Features

This SMS feature works alongside:
- **Push Notifications** - Sent automatically
- **In-app Notifications** - Always created
- **Email** (future) - Coming soon

## 💼 Best Practices

1. **Always review** SMS content before sending
2. **Keep notes brief** to avoid multi-part SMS
3. **Verify phone** numbers are correct
4. **Send immediately** after status change
5. **Be professional** - messages are customer-facing

## 📚 Full Documentation

For detailed information:
- **`SMS_FEATURE_GUIDE.md`** - Complete guide
- **`lib/sms.ts`** - Message templates
- **`components/modal/SMSConfirmationModal.tsx`** - Modal code

## ✅ Summary

**The SMS feature is:**
- ✅ FREE to use
- ✅ Works on all platforms
- ✅ Automatic and easy
- ✅ Optional (can be disabled)
- ✅ Integrated with status updates
- ✅ Ready to use now!

**Just update a reservation status and try it out!** 🚀
