# Push Token Assignment to Users - Complete Guide

## How Push Tokens Are Assigned to Specific Users

The push token is **device-specific**, not user-specific. Here's how it gets associated with users:

---

## Key Concept: Token ≠ User (Initially)

**Important:** The push token is generated for the **device**, not for a user.

- **1 Device** = **1 Token** (regardless of who's logged in)
- **Multiple Users** on same device = **Same Token**
- **Same User** on different devices = **Different Tokens**

The token gets **associated** with a user when:
1. User logs in (existing user)
2. User registers (new user)
3. User switches accounts

---

## Scenario 1: Existing User Logs In

### Flow for User Already in Database

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER OPENS APP (Not Logged In)                          │
│    - App starts                                             │
│    - AuthInitializer runs                                   │
│    - Push token generated: "abc123..."                      │
│    - user = null (not logged in)                            │
│    - Token stored in memory only                            │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. USER LOGS IN                                             │
│    - User enters email/password                             │
│    - Convex authenticates user                              │
│    - Zustand store updated: user = { _id, email, ... }      │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AUTH STATE CHANGES (useEffect Triggered)                │
│    components/AuthInitializer.tsx (line 118-141)           │
│                                                              │
│    useEffect(() => {                                        │
│      if (!user || !pushInitialized) return;                │
│                                                              │
│      const token = pushyService.getDeviceToken();          │
│      // token = "abc123..." (from memory)                  │
│                                                              │
│      if (token) {                                           │
│        await savePushToken({                                │
│          userId: user._id,    // ← USER ID HERE            │
│          pushToken: token      // ← TOKEN HERE             │
│        });                                                   │
│      }                                                       │
│    }, [user, pushInitialized]);                             │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. TOKEN SAVED TO DATABASE                                  │
│    convex/services/pushNotifications.ts                     │
│                                                              │
│    - Finds user by userId (user._id)                        │
│    - Updates user record in database:                       │
│                                                              │
│      users: {                                               │
│        _id: "jd7abc123",          ← Existing user ID       │
│        email: "john@example.com",                           │
│        firstName: "John",                                   │
│        lastName: "Doe",                                     │
│        pushToken: "abc123...",    ← TOKEN ASSIGNED!        │
│        pushTokenUpdatedAt: 1738886400000                    │
│      }                                                       │
└─────────────────────────────────────────────────────────────┘
```

### Code Implementation

**AuthInitializer.tsx** (lines 118-141):
```typescript
// Update push token when user logs in
useEffect(() => {
  if (!user || !pushInitialized) return;

  const updatePushToken = async () => {
    const token = pushyService.getDeviceToken();
    if (token) {
      try {
        // ⭐ THIS ASSIGNS TOKEN TO USER ⭐
        await savePushToken({
          userId: user._id,      // User's database ID
          pushToken: token,      // Device token from Pushy
        });
        console.log("Push token updated for logged-in user");

        // Subscribe to appropriate topic based on role
        if (user.role === "admin" || user.role === "super_admin") {
          await pushyService.subscribeToTopic("admins");
        } else {
          await pushyService.subscribeToTopic("clients");
        }
      } catch (error) {
        console.error("Error updating push token:", error);
      }
    }
  };

  updatePushToken();
}, [user, pushInitialized, savePushToken]);
```

---

## Scenario 2: New User Signs Up

### Flow for User Registration

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER OPENS APP (First Time)                             │
│    - App starts                                             │
│    - AuthInitializer runs                                   │
│    - Push token generated: "xyz789..."                      │
│    - user = null (not registered yet)                       │
│    - Token stored in memory only                            │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. USER FILLS REGISTRATION FORM                             │
│    - Email: newuser@example.com                             │
│    - Password: ********                                     │
│    - First Name: Jane                                       │
│    - Last Name: Smith                                       │
│    - Clicks "Sign Up"                                       │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. USER CREATED IN DATABASE                                 │
│    convex/services/auth.ts (registerUser mutation)          │
│                                                              │
│    const newUserId = await ctx.db.insert("users", {        │
│      email: "newuser@example.com",                          │
│      firstName: "Jane",                                     │
│      lastName: "Smith",                                     │
│      passwordHash: "...",                                   │
│      role: "client",                                        │
│      pushToken: undefined,   // ← NO TOKEN YET             │
│      createdAt: Date.now(),                                 │
│      updatedAt: Date.now()                                  │
│    });                                                       │
│                                                              │
│    // User auto-logged in after registration                │
│    Zustand store updated: user = { _id: newUserId, ... }   │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. AUTH STATE CHANGES (useEffect Triggered)                │
│    Same as Scenario 1 - AuthInitializer useEffect runs     │
│                                                              │
│    const token = pushyService.getDeviceToken();            │
│    // token = "xyz789..." (from memory)                    │
│                                                              │
│    await savePushToken({                                    │
│      userId: newUserId,      // ← NEW USER ID              │
│      pushToken: token         // ← TOKEN                   │
│    });                                                       │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. TOKEN ASSIGNED TO NEW USER                               │
│    Database updated:                                         │
│                                                              │
│      users: {                                               │
│        _id: "kf8def456",          ← New user ID            │
│        email: "newuser@example.com",                        │
│        firstName: "Jane",                                   │
│        lastName: "Smith",                                   │
│        pushToken: "xyz789...",    ← TOKEN ASSIGNED!        │
│        pushTokenUpdatedAt: 1738886400000                    │
│      }                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Scenario 3: User Switches Accounts

### What Happens When Different User Logs In on Same Device

```
┌─────────────────────────────────────────────────────────────┐
│ INITIAL STATE                                               │
│                                                              │
│ Device Token: "token123..."                                 │
│                                                              │
│ User A (John):                                              │
│   _id: "user_A_id"                                          │
│   email: "john@example.com"                                 │
│   pushToken: "token123..."    ← Currently assigned         │
│                                                              │
│ User B (Jane):                                              │
│   _id: "user_B_id"                                          │
│   email: "jane@example.com"                                 │
│   pushToken: "old_token_from_janes_device"                 │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. USER A LOGS OUT                                          │
│    - Zustand: user = null                                   │
│    - Device token still in memory: "token123..."           │
│    - Optional: Remove token from User A's record           │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. USER B LOGS IN                                           │
│    - Zustand: user = User B data                            │
│    - AuthInitializer useEffect triggers                     │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. TOKEN REASSIGNED                                         │
│                                                              │
│    await savePushToken({                                    │
│      userId: "user_B_id",    // ← User B's ID              │
│      pushToken: "token123..."  // ← Same device token      │
│    });                                                       │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ FINAL STATE                                                 │
│                                                              │
│ User A (John):                                              │
│   _id: "user_A_id"                                          │
│   email: "john@example.com"                                 │
│   pushToken: "token123..."    ← Still has it (stale)       │
│                                 or undefined (if cleared)   │
│                                                              │
│ User B (Jane):                                              │
│   _id: "user_B_id"                                          │
│   email: "jane@example.com"                                 │
│   pushToken: "token123..."    ← Now updated!               │
│                                                              │
│ Result: Notifications now go to User B on this device      │
└─────────────────────────────────────────────────────────────┘
```

**Important:** User A may still have the old token in their record. This is generally fine because:
- When you send notifications, you send to the token that's currently active
- If User A has another device, they'll have a different token there
- You can optionally clear the token on logout (see removePushToken function)

---

## Scenario 4: Same User, Multiple Devices

### How Tokens Work Across Devices

```
User: John (john@example.com, _id: "user_john_123")

┌─────────────────────┐    ┌─────────────────────┐
│  Device 1: Phone    │    │  Device 2: Tablet   │
│                     │    │                     │
│  Token: "phone_tok" │    │  Token: "tablet_tok"│
└──────────┬──────────┘    └──────────┬──────────┘
           │                          │
           └────────────┬─────────────┘
                        ↓
           ┌────────────────────────┐
           │  Database (Convex)     │
           │                        │
           │  users: {              │
           │    _id: "user_john_123"│
           │    email: "john@..."   │
           │    pushToken: ?????    │ ← PROBLEM!
           │  }                     │
           └────────────────────────┘
```

**Issue:** The schema only stores ONE token per user.

**What Happens:**
- If John logs in on **Phone** first → `pushToken: "phone_tok"`
- Then logs in on **Tablet** → `pushToken: "tablet_tok"` (overwrites phone token)
- Now only Tablet receives notifications!

**Solution (if needed):**
You would need to change the schema to support multiple tokens:

```typescript
// Current (single token):
users: {
  pushToken: v.optional(v.string())
}

// Better (multiple tokens):
users: {
  pushTokens: v.optional(v.array(v.object({
    token: v.string(),
    deviceId: v.string(),
    platform: v.string(),
    lastUsed: v.number()
  })))
}
```

---

## The Convex Mutation: savePushToken

### How the Assignment Actually Happens

**File:** `convex/services/pushNotifications.ts` (lines 8-44)

```typescript
export const savePushToken = mutation({
  args: {
    userId: v.union(v.id("users"), v.string()),  // Can be Convex ID or Facebook ID
    pushToken: v.string(),
  },
  handler: async (ctx, { userId, pushToken }) => {
    try {
      // Try to get user by ID (Convex ID)
      const user = await ctx.db.get(userId as any);
      
      if (user) {
        // ⭐ THIS IS THE ASSIGNMENT ⭐
        await ctx.db.patch(user._id, {
          pushToken,                    // Save the token
          pushTokenUpdatedAt: Date.now(), // Timestamp
          updatedAt: Date.now(),
        });
        return { success: true, message: "Push token saved successfully" };
      }

      // If not found by Convex ID, try Facebook ID
      const userByFacebook = await ctx.db
        .query("users")
        .withIndex("by_facebook_id", (q) => q.eq("facebookId", userId as string))
        .first();

      if (userByFacebook) {
        // ⭐ THIS IS THE ASSIGNMENT (Facebook user) ⭐
        await ctx.db.patch(userByFacebook._id, {
          pushToken,
          pushTokenUpdatedAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { success: true, message: "Push token saved successfully" };
      }

      throw new Error("User not found");
    } catch (error) {
      console.error("Error saving push token:", error);
      throw error;
    }
  },
});
```

**What it does:**
1. Receives `userId` and `pushToken`
2. Finds user in database by ID
3. Updates user's record with `pushToken` field
4. Adds timestamp for tracking

---

## Timeline: Token Assignment Process

### Complete Timeline from App Start to Token Saved

```
Time    Event                           Token Status        User Status
────────────────────────────────────────────────────────────────────────
0ms     App starts                      None                null
500ms   MainActivity.onCreate()          None                null
1000ms  Web view loads                  None                null
1500ms  AuthInitializer mounts          Generating...       null
2000ms  Pushy.register() called         Generating...       null
2500ms  Token received from server      "abc123..." (mem)   null
        ℹ️  Not saved yet - no user!

[USER LOGS IN OR REGISTERS]

3000ms  Login/Register complete         "abc123..." (mem)   user = {...}
3001ms  useEffect detects user change   "abc123..." (mem)   user = {...}
3002ms  savePushToken() called          Saving...           user = {...}
3100ms  Database updated                "abc123..." (DB)    user = {...}
        ✅ TOKEN ASSIGNED TO USER!
```

---

## Summary: How Assignment Works

### The 3 Key Moments

1. **Token Generation** (Step 6 in PUSH_TOKEN_GENERATION_FLOW.md)
   - Happens when: App starts, Pushy.register() called
   - Token stored: In memory only (via `pushyService.deviceToken`)
   - User association: None yet

2. **User Authentication** (Login or Register)
   - Happens when: User logs in or signs up
   - Zustand store: `user` state changes from `null` to user object
   - Triggers: useEffect in AuthInitializer

3. **Token Assignment** (Database Update)
   - Happens when: useEffect detects user + token both exist
   - Action: Calls `savePushToken({ userId, pushToken })`
   - Result: User record updated with token in database

### Key Code Locations

**Token Generation:**
- `lib/pushy.ts` → `pushyService.register()`

**User Detection:**
- `store/auth.ts` → `login()` or registration flow

**Token Assignment:**
- `components/AuthInitializer.tsx` → useEffect (line 118-141)
- `convex/services/pushNotifications.ts` → `savePushToken()`

### Database Result

```javascript
// Before login:
users: [
  {
    _id: "user_123",
    email: "john@example.com",
    pushToken: undefined  // ← No token
  }
]

// After login on device:
users: [
  {
    _id: "user_123",
    email: "john@example.com",
    pushToken: "9f8e7d6c5b4a3210fedcba9876543210abcdef12"  // ← Token assigned!
  }
]
```

---

## FAQ

### Q: What if user logs in before token is generated?

**A:** There are two useEffect hooks that handle this:

1. First useEffect (lines 24-117): Generates token, saves if user already exists
2. Second useEffect (lines 118-141): Monitors user changes, saves token when user logs in

Both check: `if (user && token)` before saving, so it works regardless of timing.

### Q: What if token generation fails?

**A:** Token simply won't be saved. User can still use the app, but won't receive push notifications.

### Q: Can one token belong to multiple users?

**A:** No. The token is device-specific. If multiple users log in on the same device, the token gets reassigned to whoever logged in most recently.

### Q: What happens to old tokens when user logs in on new device?

**A:** With current schema (single token per user), old token is overwritten. Only the most recent device receives notifications.

### Q: How to clear token on logout?

**A:** Use `removePushToken` mutation:
```typescript
await removePushToken({ userId: user._id });
```

This sets `pushToken: undefined` in the user record.

---

**Created:** February 2025  
**Purpose:** Understanding Push Token to User Assignment
