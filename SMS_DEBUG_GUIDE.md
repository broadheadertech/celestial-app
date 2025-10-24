# SMS Detection Issue - Debugging Guide

## Problem
SMS cannot detect phone number for newly created users even though the phone number exists in the database.

## Root Cause Analysis

### Data Flow
1. **User Registration** (`convex/services/auth.ts` line ~110):
   ```typescript
   phone: phone?.trim(),  // Phone is stored with optional trim
   ```

2. **Order Query** (`convex/services/orders.ts` line ~260):
   ```typescript
   user: user ? {
     id: user._id,
     firstName: user.firstName,
     lastName: user.lastName,
     email: user.email,
     phone: user.phone,  // ✅ Phone is included
   } : null,
   ```

3. **Reservation Query** (`convex/services/reservations.ts`):
   ```typescript
   user: user ? {
     id: user._id,
     firstName: user.firstName,
     lastName: user.lastName,
     email: user.email,
     phone: user.phone,  // ✅ Phone is included
   } : null,
   ```

4. **Frontend Mapping** (`app/admin/orders/page.tsx` line ~203):
   ```typescript
   // For orders
   customer: order.user ? { 
     name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(), 
     email: order.user.email || '', 
     phone: order.user.phone  // ✅ Phone is mapped
   } : undefined,
   
   // For reservations
   customer: reservation.guestInfo 
     ? { name: reservation.guestInfo.name, email: reservation.guestInfo.email, phone: reservation.guestInfo.phone }
     : reservation.user 
       ? { name: `${reservation.user.firstName || ''} ${reservation.user.lastName || ''}`.trim(), 
           email: reservation.user.email || '', 
           phone: reservation.user.phone  // ✅ Phone is mapped
         }
       : undefined,
   ```

5. **SMS Modal** (`app/admin/orders/page.tsx` line ~577):
   ```typescript
   const customerPhone = item.customer?.phone;  // ✅ Phone is extracted
   ```

6. **SMS Validation** (`lib/sms.ts` line ~133):
   ```typescript
   export function isValidPhoneNumber(phone: string): boolean {
     if (!phone) return false;  // ⚠️ Fails if phone is undefined, null, or ""
     
     const cleaned = phone.replace(/[\s\-()]/g, '');
     const phoneRegex = /^(\+63|0)?[0-9]{9,10}$/;
     
     return phoneRegex.test(cleaned);
   }
   ```

## Potential Issues

### Issue 1: Phone is `undefined` or empty string
**Symptom**: User exists in database but phone shows as unavailable

**Possible Causes**:
1. User didn't provide phone during registration (optional field)
2. Phone was provided but stored as empty string `""`
3. Phone field is null in database

**Fix**: Check if phone was actually provided during registration

### Issue 2: Phone format doesn't match validation regex
**Symptom**: Phone exists but validation fails

**Valid Formats**:
- `+639123456789` ✅
- `09123456789` ✅
- `9123456789` ✅
- `+63 912 345 6789` ✅ (spaces removed during validation)

**Invalid Formats**:
- `912-345-6789` ❌ (only 9 digits)
- `12345` ❌ (too short)
- `abc123` ❌ (contains letters)

### Issue 3: Database query not returning phone
**Symptom**: Phone exists in DB but not returned in query

**Check**:
1. Is phone field in user schema?
2. Is query selecting phone field?
3. Is user object properly populated?

## Debugging Steps

### Step 1: Check Database
```typescript
// In Convex dashboard, check users table
// Verify phone field exists and has value for the specific user
```

### Step 2: Add Console Logs in Frontend
```typescript
// In app/admin/orders/page.tsx, line ~200
console.log('Order user data:', order.user);
console.log('Reservation user data:', reservation.user);

// Line ~577
console.log('Customer phone:', customerPhone);
console.log('Has valid phone:', hasValidPhone);
```

### Step 3: Check SMS Modal
```typescript
// In components/modal/SMSConfirmationModal.tsx, line ~39
console.log('Customer phone prop:', customerPhone);
console.log('Is valid:', isValidPhoneNumber(customerPhone || ''));
```

### Step 4: Test Phone Validation
```typescript
// Test different phone formats
const testPhones = [
  '+639123456789',
  '09123456789',
  '9123456789',
  undefined,
  '',
  null
];

testPhones.forEach(phone => {
  console.log(`Phone: ${phone}, Valid: ${isValidPhoneNumber(phone)}`);
});
```

## Solution

The issue is most likely that:
1. **Phone is optional during registration** - Users may skip it
2. **No server-side default** - If skipped, phone is `undefined` not `""`

### Fix 1: Make Phone Required During Registration
```typescript
// In app/auth/register/page.tsx
// Make phone field required with validation
<input
  type="tel"
  value={formData.phone}
  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
  required  // Add required attribute
  className="..."
  placeholder="+63 or 09 followed by 9 digits"
/>
```

### Fix 2: Add Phone Field to Profile
```typescript
// In app/client/profile/page.tsx
// Allow users to add phone number after registration if missing
{!user?.phone && (
  <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
    <p className="text-sm text-warning">
      Please add your phone number to receive SMS notifications
    </p>
    <Button onClick={() => setShowPhoneModal(true)}>
      Add Phone Number
    </Button>
  </div>
)}
```

### Fix 3: Enhance SMS Modal to Handle Missing Phone
```typescript
// Already implemented in SMSConfirmationModal.tsx
// Shows warning when phone is missing:
<div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
  <Phone className="w-5 h-5 text-orange-500 flex-shrink-0" />
  <div className="flex-1">
    <p className="text-xs text-orange-500/80">No Phone Number</p>
    <p className="text-xs text-foreground/60">
      SMS notification is not available for this customer
    </p>
  </div>
</div>
```

## Verification Checklist

- [ ] Check if phone field exists in database for the user
- [ ] Verify phone format matches validation regex
- [ ] Confirm phone is being returned from Convex query
- [ ] Check if phone is properly mapped in frontend
- [ ] Test SMS modal with valid phone number
- [ ] Test SMS modal with missing phone number
- [ ] Verify registration form includes phone field
- [ ] Check if phone validation works correctly

## Expected Behavior

### When Phone Exists:
1. ✅ SMS modal shows phone number formatted
2. ✅ SMS checkbox is enabled and checked by default
3. ✅ Clicking confirm opens SMS app with pre-filled message
4. ✅ Character count shows message length

### When Phone is Missing:
1. ⚠️ SMS modal shows "No Phone Number" warning
2. ⚠️ SMS message preview is hidden
3. ⚠️ SMS checkbox is hidden
4. ℹ️ Info message says "Push notification will be sent"
5. ✅ User can still confirm the action

## Quick Fix Implementation

If phone is missing for existing users, add a migration or update script:

```typescript
// In convex/migrations/add_default_phone.ts
import { mutation } from "../_generated/server";

export const addDefaultPhoneToUsers = mutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    for (const user of users) {
      if (!user.phone) {
        await ctx.db.patch(user._id, {
          phone: "", // or null, depending on schema
          updatedAt: Date.now()
        });
      }
    }
    
    return { updated: users.length };
  }
});
```

## Testing Scenarios

1. **New User Registration with Phone**:
   - Register with valid phone → Check if SMS modal works

2. **New User Registration without Phone**:
   - Register without phone → Check if warning shows

3. **Existing User with Phone**:
   - Create order/reservation → Verify SMS works

4. **Existing User without Phone**:
   - Create order/reservation → Verify warning shows

5. **Guest Reservation with Phone**:
   - Guest provides phone in guestInfo → Verify SMS works

6. **Guest Reservation without Phone**:
   - Guest skips phone → Verify warning shows
