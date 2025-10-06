# SMS Notification Feature - Guide

## Overview

The SMS notification feature automatically triggers when admins update reservation statuses to **"Confirmed"** or **"Ready for Pickup"**. It uses native device SMS functionality, requiring zero cost and works across all platforms.

## How It Works

### User Flow

1. **Admin Updates Status**
   - Navigate to Admin → Reservations → Select Reservation
   - Change status to "Confirmed" or "Ready for Pickup"
   - Click update button

2. **SMS Modal Appears**
   - Shows customer name
   - Shows customer phone number (if available)
   - Displays SMS message preview
   - Checkbox to enable/disable SMS (checked by default)

3. **Admin Confirms**
   - Check/uncheck SMS option
   - Click "Confirm Reservation" or "Mark as Ready"
   - If SMS enabled: Device's SMS app opens automatically

4. **SMS App Opens**
   - Phone number pre-filled
   - Message pre-filled
   - Admin just taps "Send"

### SMS Message Templates

#### Confirmation Message
```
Hi {CustomerName}! Your reservation {ReservationCode} for {Quantity}x {ProductName} has been CONFIRMED. Please pick up within 48 hours. Thank you for choosing Celestial Drakon Aquatics!
```

#### Ready for Pickup Message
```
Hi {CustomerName}! Your reservation {ReservationCode} for {Quantity}x {ProductName} is now READY FOR PICKUP! Location: {PickupLocation}. Please pick up on {PickupDate} at {PickupTime}. Note: {Notes} - Celestial Drakon Aquatics
```

## Platform Support

### ✅ Supported Platforms

| Platform | SMS Link Support | Notes |
|----------|------------------|-------|
| **Web (Mobile)** | ✅ Yes | Opens default SMS app |
| **Web (Desktop)** | ✅ Yes | Opens default messaging app or redirects to mobile |
| **Android APK** | ✅ Yes | Native SMS app integration |
| **iOS (Safari)** | ✅ Yes | Native Messages app |
| **iOS (App)** | ✅ Yes | Native Messages app |
| **Tablets** | ✅ Yes | SMS-capable tablets only |

### Protocol Details

- Uses **`sms:` protocol** (universally supported)
- iOS format: `sms:+639123456789&body=Message`
- Android format: `sms:+639123456789?body=Message`
- Automatic detection handles both formats

## Features

### 1. Automatic Triggering
- No manual SMS sending required
- Triggers on specific status changes only
- Works alongside push notifications

### 2. Phone Number Validation
- Validates Philippines phone format
- Accepts: `+639123456789`, `09123456789`, `9123456789`
- Shows warning if no phone number available

### 3. Message Customization
- Customer name personalized
- Reservation code included
- Product details included
- Pickup details (date/time/location)
- Custom notes from admin

### 4. Conditional Display
- SMS checkbox only shows if customer has phone number
- Gracefully handles guests without phones
- Clear UI indicators for phone availability

### 5. No Cost
- Uses device's native SMS
- No API charges
- No third-party service fees
- Admin's phone plan applies

## Implementation Files

### New Files Created

1. **`lib/sms.ts`** - SMS utility functions
   - `getConfirmationSMSMessage()` - Confirmation template
   - `getReadyForPickupSMSMessage()` - Pickup template
   - `generateSMSLink()` - Creates SMS protocol link
   - `openSMSApp()` - Opens SMS app
   - `formatPhoneNumber()` - Display formatting
   - `isValidPhoneNumber()` - Validation

2. **`components/modal/SMSConfirmationModal.tsx`** - SMS modal UI
   - Customer info display
   - Phone number display
   - SMS message preview
   - Send SMS checkbox
   - Action confirmation

### Modified Files

1. **`app/admin/reservation-detail/ReservationDetailsClient.tsx`**
   - Added SMS modal state
   - Updated `handleStatusUpdate()` to show SMS modal
   - Updated `handleMarkReadyForPickup()` to show SMS modal
   - Added `handleSMSConfirm()` for processing
   - Integrated `SMSConfirmationModal` component

## Testing Guide

### Test Case 1: Confirmed Status with SMS

**Setup:**
1. Open app as admin
2. Navigate to reservation with valid phone number
3. Reservation should be in "pending" status

**Steps:**
1. Click "Update Status"
2. Select "Confirmed"
3. Click "Update"
4. **SMS Modal appears**

**Verify:**
- ✅ Customer name displayed correctly
- ✅ Phone number displayed (formatted: +63 912 345 6789)
- ✅ SMS message preview shows correct details
- ✅ SMS checkbox is checked by default
- ✅ Character count displayed

**Action:**
1. Keep SMS checkbox checked
2. Click "Confirm Reservation"

**Result:**
- ✅ SMS app opens automatically
- ✅ Phone number pre-filled
- ✅ Message pre-filled with confirmation text
- ✅ Success notification appears
- ✅ Reservation status updated to "confirmed"

### Test Case 2: Ready for Pickup with SMS

**Setup:**
1. Have reservation in "confirmed" status
2. Customer has valid phone number

**Steps:**
1. Click "Mark as Ready for Pickup"
2. Fill pickup date and time
3. Add optional notes
4. Click "Mark Ready for Pickup"
5. **SMS Modal appears**

**Verify:**
- ✅ Pickup date/time included in SMS preview
- ✅ Notes included in SMS preview
- ✅ Message shows "READY FOR PICKUP"

**Action:**
1. Click "Mark as Ready"

**Result:**
- ✅ SMS app opens
- ✅ Message includes pickup schedule
- ✅ Message includes notes
- ✅ Status updated to "ready_for_pickup"

### Test Case 3: No Phone Number

**Setup:**
1. Reservation with NO phone number
2. Guest didn't provide phone OR user has no phone

**Steps:**
1. Try to update status to "confirmed"
2. SMS Modal appears

**Verify:**
- ✅ Warning message: "No Phone Number"
- ✅ SMS checkbox is disabled/hidden
- ✅ Message: "SMS notification is not available"
- ✅ Info: "Push notification will be sent"

**Action:**
1. Click "Confirm Reservation"

**Result:**
- ✅ Only push notification sent
- ✅ SMS app does NOT open
- ✅ Status updated successfully

### Test Case 4: Uncheck SMS Option

**Setup:**
1. Reservation with valid phone number

**Steps:**
1. Update status to "confirmed"
2. SMS Modal appears
3. **Uncheck SMS checkbox**
4. Click "Confirm"

**Verify:**
- ✅ SMS app does NOT open
- ✅ Status still updates
- ✅ Push notification still sent
- ✅ Success message: "Customer notified via push notification"

### Test Case 5: Web Browser (Mobile)

**Platform:** Mobile browser (Chrome, Safari)

**Steps:**
1. Follow Test Case 1 on mobile browser
2. When SMS checkbox checked and confirmed

**Result:**
- ✅ Browser requests permission to open SMS app
- ✅ Default SMS app opens
- ✅ Message pre-filled correctly

### Test Case 6: Web Browser (Desktop)

**Platform:** Desktop browser

**Steps:**
1. Follow Test Case 1 on desktop

**Result:**
- ✅ May prompt to open messaging app
- ✅ Or redirect to mobile device
- ✅ Or show "Continue on Phone" option
- ✅ Behavior varies by OS and installed apps

## SMS Message Examples

### Example 1: Confirmation (Single Item)
```
Hi John Doe! Your reservation RES-123456 for 2x Blue Tang Fish has been CONFIRMED. Please pick up within 48 hours. Thank you for choosing Celestial Drakon Aquatics!
```

### Example 2: Confirmation (Multiple Items)
```
Hi Jane Smith! Your reservation RES-789012 for 3 items has been CONFIRMED. Please pick up within 48 hours. Thank you for choosing Celestial Drakon Aquatics!
```

### Example 3: Ready for Pickup (Full Details)
```
Hi John Doe! Your reservation RES-123456 for 2x Blue Tang Fish is now READY FOR PICKUP! Location: Main Store. Please pick up on February 15, 2025 at 2:00 PM. Note: Please bring a container - Celestial Drakon Aquatics
```

### Example 4: Ready for Pickup (Minimal Details)
```
Hi Jane Smith! Your reservation RES-789012 for 3 items is now READY FOR PICKUP! - Celestial Drakon Aquatics
```

## Troubleshooting

### SMS App Doesn't Open

**Possible Causes:**
1. Browser blocking popup/redirect
2. Device doesn't have SMS capability
3. SMS app not configured

**Solutions:**
- Check browser permissions
- Use mobile device with SMS
- Test on different browser
- Verify default SMS app is set

### Phone Number Not Showing

**Possible Causes:**
1. Guest didn't provide phone number
2. User profile missing phone
3. Phone number validation failed

**Solutions:**
- Edit user/guest information
- Add phone number in profile
- Check phone format (must be valid PH number)

### SMS Message Too Long

**Note:** Standard SMS is 160 characters. Messages over 160 are sent as multiple texts.

**Character Counts:**
- Confirmation: ~120-150 characters
- Ready for Pickup (full): ~180-250 characters

**Solutions:**
- Keep admin notes brief
- Long messages will auto-split into multiple SMS

### Wrong Phone Format

**Philippines Format Required:**
- ✅ `+639123456789` (with country code)
- ✅ `09123456789` (with leading zero)
- ✅ `9123456789` (without leading zero)

**Auto-formatted Display:**
- Displays as: `+63 912 345 6789`
- SMS link uses: `+639123456789`

## Best Practices

### 1. Always Verify Details
- Check customer name before sending
- Verify phone number is correct
- Review SMS message content

### 2. Keep Messages Concise
- Use brief product names
- Keep notes under 50 characters
- Essential info only

### 3. Professional Tone
- Messages are customer-facing
- Maintain brand voice
- Include company name

### 4. Timing Matters
- Send confirmation immediately after confirming
- Send pickup ready when truly ready
- Don't spam customers

### 5. Phone Number Hygiene
- Encourage users to add phone in profile
- Collect phone during guest reservation
- Validate format during data entry

## FAQ

**Q: Does this cost money?**
A: No API costs. Uses admin's phone plan (standard SMS rates apply).

**Q: Can customers reply to SMS?**
A: Yes, replies go to admin's phone number.

**Q: What if customer doesn't have phone?**
A: Push notification is sent instead. SMS is optional.

**Q: Can I customize messages?**
A: Yes, edit templates in `lib/sms.ts` file.

**Q: Does this work on iOS?**
A: Yes, uses native Messages app.

**Q: What about international numbers?**
A: Currently optimized for Philippines (+63). Can be extended for other countries.

**Q: Can I disable SMS feature?**
A: Yes, simply uncheck the SMS checkbox in the modal.

**Q: Is SMS sent automatically?**
A: No, admin must tap "Send" in the SMS app (one extra tap).

## Future Enhancements

### Phase 2 Possibilities
- **Automated SMS** via Twilio/SMS gateway
- **Message templates** customization UI
- **SMS history** tracking
- **Bulk SMS** for multiple reservations
- **International support** for other countries
- **SMS scheduling** for later delivery

### Current Limitations
- Requires admin to tap "Send" in SMS app
- One SMS at a time (no bulk)
- Admin's phone number visible to customer
- Standard SMS length limits

## Summary

The SMS feature provides a **free, simple, and universal** way to notify customers about reservation updates. It works across all platforms without any API integration or costs, leveraging the device's native SMS capabilities.

**Key Benefits:**
- 💰 **Free** - No API costs
- 📱 **Universal** - Works everywhere
- 🚀 **Fast** - Opens SMS app instantly
- ✅ **Simple** - One tap to send
- 🔒 **Private** - Uses device's SMS
- 🌍 **Cross-platform** - Web, Android, iOS

Start using it today by updating reservation statuses in the admin panel!
