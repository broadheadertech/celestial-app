# APK Build Issues - Analysis & Solutions

## Issues Found

### ❌ Issue 1: Button Component Import Error (CRITICAL)

**Error Message:**
```
Attempted import error: 'Button' is not exported from '@/components/ui/Button' (imported as 'Button').
```

**Affected Files:**
- `components/modal/SMSConfirmationModal.tsx`
- Imported by: `app/admin/reservation-detail/ReservationDetailsClient.tsx`

**Root Cause:**
The `SMSConfirmationModal.tsx` uses **named import**:
```typescript
import { Button } from '@/components/ui/Button';
```

But `components/ui/Button.tsx` uses **default export**:
```typescript
export default Button;
```

**Impact:** Build completes with warnings but the SMS modal will crash in the APK when opened.

---

### ⚠️ Issue 2: Location API Usage During Static Build

**Error Message:**
```
ReferenceError: location is not defined
at app/client/profile-edit/page.js
```

**Root Cause:**
The `profile-edit/page.tsx` performs role-based redirects using:
```typescript
if (user?.role === 'admin') {
  router.push('/admin/dashboard');
  return null;
}
```

During **static generation** (server-side), `router.push()` attempts to access browser APIs (`window.location`) which don't exist in Node.js environment.

**Impact:** Warnings during build but works in the APK because these checks run client-side in the browser.

---

### ℹ️ Issue 3: Convex URL in Static Build

**Potential Issue:**
```typescript
// components/ConvexProvider.tsx
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');
```

**Risk:** If `NEXT_PUBLIC_CONVEX_URL` is not set during build, the app will create a Convex client with an empty string, causing all API calls to fail.

**Status:** Currently working because `.env.local` has the URL set, but it's a point of failure.

---

## Solutions

### ✅ Solution 1: Fix Button Import (CRITICAL FIX)

**Option A: Change Button.tsx to named export (Recommended)**
```typescript
// components/ui/Button.tsx
export { Button };  // Add this line
export default Button;  // Keep for backward compatibility
```

**Option B: Change SMSConfirmationModal.tsx import**
```typescript
// components/modal/SMSConfirmationModal.tsx
import Button from '@/components/ui/Button';  // Remove curly braces
```

**Recommendation:** Use Option B as it requires minimal changes and maintains existing pattern.

---

### ✅ Solution 2: Fix Profile Edit Redirects

**Wrap redirects in useEffect:**
```typescript
'use client';

import { useEffect } from 'react';

export default function ProfileEditPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();

  // Redirect checks in useEffect (client-side only)
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    if (user?.role === 'super_admin') {
      router.push('/control_panel');
      return;
    }
  }, [isAuthenticated, user, router]);

  // Don't return null during SSG
  if (!isAuthenticated || user?.role === 'admin' || user?.role === 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  // Rest of component...
}
```

---

### ✅ Solution 3: Validate Convex URL (PREVENTIVE)

**Add runtime validation:**
```typescript
// components/ConvexProvider.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { ConvexProvider as ConvexReactProvider, ConvexReactClient } from 'convex/react';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL || CONVEX_URL === '') {
  console.error('CRITICAL: NEXT_PUBLIC_CONVEX_URL is not set!');
}

const convex = new ConvexReactClient(CONVEX_URL || 'https://missing-url.convex.cloud');

interface ConvexProviderProps {
  children: ReactNode;
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  useEffect(() => {
    if (!CONVEX_URL) {
      alert('Configuration Error: Convex URL is not set. Please check your environment variables.');
    }
  }, []);

  return (
    <ConvexReactProvider client={convex}>
      {children}
    </ConvexReactProvider>
  );
}
```

---

## Additional Issues to Check

### 1. Environment Variables in APK

**Problem:** `.env.local` is NOT bundled in the APK. Environment variables must be baked into the build.

**Check:**
```bash
# During build, verify env vars are loaded
npm run build
# Look for: "- Environments: .env.local"
```

**Solution:** Ensure all `NEXT_PUBLIC_*` variables are set BEFORE running `npm run build`.

---

### 2. Client-Side Routing in APK

**Problem:** Static export uses client-side routing. Deep links may not work properly.

**Check Capacitor config:**
```typescript
// capacitor.config.ts
server: {
  androidScheme: 'https',  // ✅ Correct
  hostname: 'localhost'     // ✅ Correct
}
```

**Verification:** Test navigating directly to `/admin/dashboard` in APK.

---

### 3. Push Notification Permissions

**Problem:** Push notifications require runtime permissions in Android.

**Check:** Verify `AndroidManifest.xml` includes:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

**Verification:** Test if notifications appear when reservation status changes.

---

### 4. SMS Functionality on Device

**Problem:** SMS links require device SMS capability.

**Verification Steps:**
1. Build APK with SMS fix applied
2. Install on device
3. Update reservation to "Confirmed"
4. Verify SMS modal appears
5. Click "Confirm" with SMS checked
6. Verify SMS app opens with pre-filled message

---

## Critical Fix Priority

| Priority | Issue | Impact | Fix Difficulty |
|----------|-------|--------|---------------|
| **P0** | Button import error | **APK CRASH** when opening SMS modal | Easy (5 min) |
| **P1** | Profile edit redirects | Build warnings | Medium (15 min) |
| **P2** | Convex URL validation | Silent failure if misconfigured | Easy (10 min) |
| **P3** | Environment variable docs | Developer confusion | Easy (5 min) |

---

## Testing Checklist

After applying fixes:

### Build Test:
```bash
npm run build
# Should complete with NO errors
# Warnings about static export are expected
```

### Sync Test:
```bash
npx cap sync android
# Should copy /out to android/app/src/main/assets/public
```

### APK Build Test:
```bash
cd android
./gradlew assembleDebug
# Should complete successfully
# APK location: app/build/outputs/apk/debug/app-debug.apk
```

### Device Tests:
1. **Install APK**
   ```bash
   adb install app-debug.apk
   ```

2. **Test Navigation**
   - Open app → Home
   - Navigate to each section
   - Verify no crashes

3. **Test SMS Feature**
   - Login as admin
   - Open reservation
   - Update status to "Confirmed"
   - **SMS modal should appear** (this will crash without fix)
   - Verify customer info displays
   - Check SMS checkbox
   - Click confirm
   - SMS app should open

4. **Test Push Notifications**
   - Confirm reservation from admin
   - Check if client device receives push notification
   - Tap notification → Should open reservation

5. **Test Auth**
   - Logout
   - Login again
   - Verify session persists

---

## Quick Fix Command

Apply all critical fixes at once:

```bash
# 1. Fix Button import in SMSConfirmationModal
# Already using default import pattern in other files
# Just need to change the import line

# 2. Check current Button import
grep "import.*Button.*from '@/components/ui/Button'" components/modal/SMSConfirmationModal.tsx

# 3. Apply fix (use default import)
# Edit components/modal/SMSConfirmationModal.tsx
# Change: import { Button } from '@/components/ui/Button';
# To: import Button from '@/components/ui/Button';
```

---

## Summary

### Critical Issues:
1. ❌ **Button import error** - Will cause APK crash

### Warning Issues:
2. ⚠️ **Profile edit redirects** - Build warnings only
3. ⚠️ **Convex URL validation** - Preventive measure

### Next Steps:
1. **Apply Button import fix immediately**
2. Test build after fix
3. Build APK and test on device
4. Apply other fixes if build warnings persist

The build **DOES complete successfully** but the Button import error will cause the SMS modal to crash when opened in the APK. This is the **only critical issue** that prevents the app from working correctly.
