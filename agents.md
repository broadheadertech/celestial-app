# AI Agent Context - Celestial Drakon Aquatics

## Project Overview

**Celestial Drakon Aquatics** is a full-stack e-commerce platform for aquarium fish, tanks, and aquatic accessories targeting the Philippines market. The application supports both web and mobile (Android APK) deployment with a focus on live fish reservations and guest shopping capabilities.

### Key Technologies
- **Framework**: Next.js 15.5.3 (App Router, Static Export)
- **Backend/Database**: Convex 1.27.0 (real-time database)
- **Authentication**: NextAuth.js 4.24.11 + Facebook OAuth
- **Email Service**: Resend 6.2.2 (via Convex Actions)
- **State Management**: Zustand 5.0.8
- **Styling**: Tailwind CSS 4.0
- **Mobile**: Capacitor 7.4.3 (Android)
- **Asset Generation**: @capacitor/assets 3.0.5
- **UI Icons**: Lucide React 0.544.0
- **Charts**: Recharts 3.2.1
- **Language**: TypeScript 5 (strict mode)
- **Build Tool**: Turbopack

---

## Architecture Overview

### Deployment Model
The app uses **Next.js static export** for mobile deployment:
- `npm run build` → generates static files in `/out` directory
- `npx cap sync android` → copies static files to Android assets
- Standalone APK with all assets bundled
- No server required for mobile app
- Data fetched client-side from Convex API

### Authentication & Route Protection
- **NextAuth.js**: Facebook OAuth + Email/Password
- **Zustand Store**: Client-side auth state with localStorage persistence
- **Middleware**: Currently disabled for static export (see `middleware.ts`)
- **Client-side Protection**: Route guards handle access control
- **Guest Mode**: Auto-generated guest IDs for non-authenticated users

### Data Flow
```
React Components → Zustand Store → Convex Queries/Mutations → Database
                    ↓
                localStorage (persistence)
```

---

## Directory Structure

```
celestial-app/
├── app/                      # Next.js App Router pages
│   ├── admin/               # Admin dashboard (role: admin, super_admin)
│   │   ├── dashboard/       # Main admin overview
│   │   ├── products/        # Product management
│   │   ├── orders/          # Order processing
│   │   ├── analytics/       # Business analytics
│   │   ├── users/           # User management
│   │   ├── settings/        # Admin settings
│   │   ├── product-detail/  # Product detail view
│   │   └── reservation-detail/ # Reservation detail view
│   ├── client/              # Customer-facing pages
│   │   ├── dashboard/       # Customer home
│   │   ├── product-detail/  # Product details
│   │   ├── cart/            # Shopping cart
│   │   ├── categories/      # Browse categories
│   │   ├── search/          # Product search
│   │   ├── reservations/    # View reservations
│   │   ├── profile/         # User profile
│   │   └── profile-edit/    # Edit profile
│   ├── control_panel/       # Super admin panel
│   │   ├── overview/        # System overview
│   │   ├── products/        # Advanced product management
│   │   ├── reservations/    # Reservation management
│   │   ├── customer/        # Customer management
│   │   ├── reports/         # Advanced reports
│   │   └── settings/        # System settings
│   ├── auth/                # Authentication pages
│   │   ├── login/           # Login page
│   │   ├── register/        # Registration page
│   │   ├── forgot_password/ # Password reset request (NEW)
│   │   └── reset_password/  # Password reset form (NEW)
│   ├── landing/             # Landing page (public)
│   ├── onboarding/          # Onboarding flow
│   ├── layout.tsx           # Root layout with providers
│   ├── globals.css          # Global styles
│   ├── page.tsx             # Root redirect
│   └── not-found.tsx        # 404 page
│
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   │   ├── Button.tsx       # Button with variants
│   │   ├── Input.tsx        # Form input
│   │   ├── Card.tsx         # Container component
│   │   ├── ProductCard.tsx  # Product display card
│   │   ├── ReservationOverlay.tsx # Reservation modal
│   │   ├── Toast.tsx        # Toast notification
│   │   └── ConfirmationModal.tsx # Confirmation dialog
│   ├── client/              # Client-specific components
│   │   └── ClientBottomNavbar.tsx # Mobile navigation
│   ├── admin/               # Admin-specific components
│   │   └── AdminLayoutWrapper.tsx # Admin layout
│   ├── common/              # Shared components
│   ├── modal/               # Modal components
│   ├── notifications/       # Notification components
│   ├── AuthProvider.tsx     # NextAuth session provider
│   ├── ConvexProvider.tsx   # Convex client provider
│   ├── AuthInitializer.tsx  # Auth state initializer
│   └── ControlPanelNav.tsx  # Control panel navigation
│
├── convex/                  # Convex backend
│   ├── services/            # Business logic functions
│   │   ├── admin.ts         # Admin operations (22KB)
│   │   ├── analytics.ts     # Analytics queries (15KB)
│   │   ├── auth.ts          # Authentication + password reset (18KB)
│   │   ├── cart.ts          # Shopping cart operations (7KB)
│   │   ├── categories.ts    # Category management (2KB)
│   │   ├── email.ts         # Email service via Resend (NEW)
│   │   ├── notifications.ts # Notification system (28KB)
│   │   ├── orders.ts        # Order processing (8KB)
│   │   ├── products.ts      # Product CRUD (26KB)
│   │   ├── reservations.ts  # Reservation system (34KB)
│   │   └── users.ts         # User management (3KB)
│   ├── schema.ts            # Database schema definitions
│   ├── files.ts             # File upload handling
│   ├── migrations/          # Database migrations
│   └── _generated/          # Auto-generated Convex files
│
├── store/                   # Zustand state management
│   ├── auth.ts              # Auth state (user, isAuthenticated, guestId)
│   └── cart.ts              # Cart state (items, addItem, removeItem)
│
├── context/                 # React Context providers
│   └── ReservationContext.tsx # Reservation overlay state
│
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts           # Auth hook (2.9KB)
│   ├── useNotifications.ts  # Notifications hook (8.8KB)
│   └── useWindowSize.ts     # Window size hook (0.9KB)
│
├── lib/                     # Utility functions
│   ├── utils.ts             # General utilities (6.9KB)
│   ├── notifications.ts     # Notification helpers (10.6KB)
│   ├── realtime.ts          # Real-time utilities (3.4KB)
│   ├── webPush.ts           # Push notification setup (2.8KB)
│   └── notifications/       # Notification modules
│       └── localNotifications.ts # Local notifications
│
├── types/                   # TypeScript definitions
│   └── index.ts             # All type definitions (6.8KB)
│
├── public/                  # Static assets
│   ├── images/              # Image files
│   └── icons/               # Icon files
│
├── android/                 # Capacitor Android project
│   └── app/build/outputs/apk/ # APK build output
│
├── app-icons/               # Source app icons
│   └── icon.png             # Main app icon (71KB)
│
├── resources/               # Capacitor assets directory
│   └── icon.png             # Icon for asset generation
│
├── scripts/                 # Build scripts
│   └── capacitor-export.js  # Post-build export script
│
├── middleware.ts            # Middleware (disabled for static export)
├── next.config.ts           # Next.js configuration
├── capacitor.config.ts      # Capacitor configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
├── CLAUDE.md                # Detailed specification
└── agents.md                # This file
```

---

## Database Schema (Convex)

### Core Tables

#### `users`
```typescript
{
  _id: Id<"users">,
  email: string,
  firstName: string,
  lastName: string,
  phone?: string,
  passwordHash?: string,  // Optional for Facebook users
  role: "client" | "admin" | "super_admin",
  isActive?: boolean,
  facebookId?: string,
  profilePicture?: string,
  loginMethod?: "email" | "facebook",
  // Password reset fields
  resetToken?: string,      // Unique token for password reset
  resetTokenExpiry?: number, // Expiry timestamp (1 hour)
  createdAt: number,
  updatedAt: number
}
// Indexes: by_email, by_role, by_facebook_id, by_reset_token
```

#### `products`
```typescript
{
  _id: Id<"products">,
  name: string,
  description?: string,
  price: number,
  originalPrice?: number,
  categoryId: Id<"categories">,
  image: string,
  images?: string[],
  certificate?: string,
  sku?: string | number,
  stock: number,
  rating?: number,
  reviews?: number,
  badge?: string,
  productStatus?: string,
  lifespan?: string,
  isActive: boolean,
  createdAt: number,
  updatedAt: number
}
// Indexes: by_category, by_active
```

#### `fish` (Product Extension)
```typescript
{
  productId: Id<"products">,
  scientificName: string,
  weight?: number,
  size: number,
  temperature: number,
  age: number,
  phLevel: string,
  lifespan: string,
  origin: string,
  diet: string
}
// Index: by_product
```

#### `tank` (Product Extension)
```typescript
{
  productId: Id<"products">,
  tankType: string,
  material: string,
  capacity: number,
  dimensions: { length, width, height },
  weight?: number,
  thickness: number,
  lighting: number,
  filtation: number
}
// Index: by_product
```

#### `categories`
```typescript
{
  _id: Id<"categories">,
  name: string,
  description?: string,
  image?: string,
  isActive: boolean,
  createdAt: number,
  updatedAt: number
}
```

#### `cart`
```typescript
{
  userId?: Id<"users">,     // For authenticated users
  guestId?: string,          // For guest users
  productId: Id<"products">,
  quantity: number,
  createdAt: number,
  updatedAt: number
}
// Indexes: by_user, by_guest, by_user_product, by_guest_product
```

#### `reservations` (Multi-Item Support)
```typescript
{
  _id: Id<"reservations">,
  reservationCode?: string,  // e.g., "RES-001234"
  userId?: Id<"users"> | string,  // Optional, string for Facebook users
  guestId?: string,          // For guest users
  guestInfo?: {              // Guest contact info
    name: string,
    email: string,
    phone: string,
    completeAddress?: string,
    pickupSchedule?: { date: string, time: string },
    notes?: string
  },
  items?: Array<{            // Multi-item reservations
    productId: Id<"products">,
    quantity: number,
    reservedPrice: number
  }>,
  totalAmount?: number,      // Total for all items
  totalQuantity?: number,    // Total quantity
  // Legacy single-item fields (backward compatibility)
  productId?: Id<"products">,
  quantity?: number,
  reservationDate: number,
  expiryDate: number,
  status: "pending" | "confirmed" | "ready_for_pickup" | "completed" | "expired" | "cancelled",
  notes?: string,
  createdAt: number,
  updatedAt: number
}
// Indexes: by_user, by_guest, by_status, by_expiry, by_reservation_code, by_product
```

#### `orders`
```typescript
{
  _id: Id<"orders">,
  userId: Id<"users">,
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
  items: Array<{ productId, quantity, price }>,
  totalAmount: number,
  shippingAddress: { street, city, state, zipCode, country },
  paymentMethod: string,
  notes?: string,
  createdAt: number,
  updatedAt: number
}
// Indexes: by_user, by_status
```

#### `notifications`
```typescript
{
  _id: Id<"notifications">,
  title: string,
  message: string,
  type: "reservation" | "order" | "user" | "product" | "payment" | "alert" | "warning" | "success" | "system",
  isRead: boolean,
  priority: "low" | "medium" | "high" | "urgent",
  relatedId?: string,
  relatedType?: string,
  pushNotificationSent?: boolean,
  pushNotificationId?: number,
  scheduledPushTime?: number,
  targetUserId?: string,
  targetUserEmail?: string,
  metadata?: {
    customerName?: string,
    customerEmail?: string,
    productName?: string,
    amount?: number,
    status?: string,
    pushAction?: string,
    pushData?: { reservationId?, orderId?, productId? }
  },
  createdAt: number,
  updatedAt: number
}
// Indexes: by_read, by_type, by_priority, by_created, by_target_user, by_push_scheduled
```

---

## Key Features & Business Logic

### 1. Guest Shopping System
**Location**: `store/auth.ts`, `convex/services/cart.ts`, `convex/services/reservations.ts`

- Auto-generated `guestId` for non-authenticated users
- Guest users can browse products, add to cart, make reservations
- Guest data persists in localStorage
- `guestId` stored in Zustand store and localStorage

**Guest Flow**:
1. User visits app → `AuthInitializer` checks for existing `guestId`
2. If none exists → Generate UUID → Store in localStorage and Zustand
3. Cart/Reservation operations use `guestId` instead of `userId`
4. Upon registration/login → Merge guest data with user account

### 2. Multi-Item Reservations
**Location**: `convex/services/reservations.ts`

**Features**:
- Reserve multiple products in a single reservation
- Each item has: `productId`, `quantity`, `reservedPrice`
- Reservation code: `RES-XXXXXX` format
- Guest info collection: name, email, phone, address, pickup schedule
- Status flow: `pending` → `confirmed` → `ready_for_pickup` → `completed`
- Expiry tracking with auto-status updates

**Key Functions**:
- `createReservation`: Create multi-item reservation with guest info
- `confirmReservation`: Admin confirms pending reservation
- `updateReservationStatus`: Change status (ready_for_pickup, completed, cancelled)
- `getReservationByCode`: Retrieve reservation by unique code
- `getUserReservations`: Get all reservations for user/guest

### 3. Role-Based Access Control
**Roles**: `client`, `admin`, `super_admin`

**Access Matrix**:
- **Client**: `/client/*`, reservations, cart, profile
- **Admin**: `/admin/*`, product management, order processing, user view
- **Super Admin**: `/control_panel/*`, all admin features + system settings

**Implementation**:
- Currently: Client-side route guards (middleware disabled for static export)
- Convex functions validate user roles server-side
- Zustand store tracks current user role

### 4. Real-Time Features
**Location**: `lib/realtime.ts`, Convex reactive queries

- Product stock updates
- Reservation status changes
- Order status updates
- Notification delivery
- Cart synchronization

**Convex Queries**:
All queries in `convex/services/*.ts` are reactive by default. Components automatically re-render when data changes.

### 5. Notification System
**Location**: `convex/services/notifications.ts`, `lib/notifications.ts`, `hooks/useNotifications.ts`

**Types**:
- Reservation: New, confirmed, ready for pickup, expired
- Order: Status updates, delivery notifications
- Product: Low stock, restocked
- System: Updates, announcements

**Features**:
- In-app notifications (read/unread)
- Push notifications (Capacitor local notifications)
- Priority levels: low, medium, high, urgent
- Scheduled notifications (e.g., pickup reminders)
- Rich metadata for context

**Key Functions**:
- `createNotification`: Create new notification
- `markNotificationAsRead`: Mark as read
- `getUnreadCount`: Get unread notification count
- `scheduleNotification`: Schedule push notification

### 6. Product Management
**Location**: `convex/services/products.ts`, `app/admin/products/*`, `app/control_panel/products/*`

**Features**:
- CRUD operations for products
- Category assignment
- Multiple images support
- Stock tracking
- Product variants (Fish, Tank) with additional data
- SKU management
- Pricing (original + sale price)
- Product status badges

**Key Functions**:
- `createProduct`: Create product with category
- `updateProduct`: Update product details
- `deleteProduct`: Soft delete (set isActive: false)
- `getProductById`: Get product with related data (fish/tank)
- `searchProducts`: Search with filters (category, price, stock)
- `getLowStockProducts`: Products below threshold

### 7. Order Processing
**Location**: `convex/services/orders.ts`, `app/admin/orders/*`

**Order Flow**:
1. `pending` → Order created, awaiting payment
2. `confirmed` → Payment confirmed
3. `processing` → Order being prepared
4. `shipped` → Order in transit
5. `delivered` → Order received by customer
6. `cancelled` → Order cancelled (any stage)

**Key Functions**:
- `createOrder`: Create order from cart
- `updateOrderStatus`: Update order status
- `getUserOrders`: Get orders for user
- `getOrderById`: Get order details

---

## State Management

### Zustand Stores

#### Auth Store (`store/auth.ts`)
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  guestId: string | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setGuestId: (guestId: string) => void;
}
```

**Key Features**:
- Persists to localStorage
- Syncs with Convex auth state
- Guest ID management
- Auto-rehydration on page load

#### Cart Store (`store/cart.ts`)
```typescript
interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}
```

**Key Features**:
- Persists to localStorage
- Syncs with Convex cart data
- Optimistic updates
- Guest cart support

---

## Custom Hooks

### `useAuth()` (`hooks/useAuth.ts`)
**Purpose**: Simplified auth state access

**Returns**:
```typescript
{
  user: User | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  guestId: string | null,
  login: (user: User) => void,
  logout: () => void
}
```

**Usage**:
```typescript
const { user, isAuthenticated } = useAuth();
if (!isAuthenticated) navigate('/auth/login');
```

### `useNotifications()` (`hooks/useNotifications.ts`)
**Purpose**: Notification management

**Returns**:
```typescript
{
  notifications: Notification[],
  unreadCount: number,
  markAsRead: (id: string) => Promise<void>,
  markAllAsRead: () => Promise<void>,
  deleteNotification: (id: string) => Promise<void>
}
```

### `useWindowSize()` (`hooks/useWindowSize.ts`)
**Purpose**: Responsive design utilities

**Returns**:
```typescript
{
  width: number,
  height: number,
  isMobile: boolean,
  isTablet: boolean,
  isDesktop: boolean
}
```

---

## UI Component Library

### Button (`components/ui/Button.tsx`)
**Variants**: `primary`, `secondary`, `outline`, `ghost`
**Sizes**: `xs`, `sm`, `md`, `lg`
**Features**: Loading state, disabled state, icon support

### Input (`components/ui/Input.tsx`)
**Types**: `text`, `email`, `password`, `number`, `tel`
**Features**: Label, placeholder, error state, validation

### Card (`components/ui/Card.tsx`)
**Features**: Glass morphism effect, customizable padding, shadow variants

### ProductCard (`components/ui/ProductCard.tsx`)
**Features**:
- Product image with badge overlay
- Price display (original + sale)
- Stock indicator
- Rating display
- Add to cart button
- Quick view modal
- Responsive design

### ReservationOverlay (`components/ui/ReservationOverlay.tsx`)
**Features**:
- Multi-item reservation form
- Guest info collection
- Pickup schedule selector
- Cart-to-reservation conversion
- Form validation

---

## API Layer (Convex Services)

### Authentication (`convex/services/auth.ts`)
**Key Functions**:
- `loginUser(email, password)`: Authenticate user
- `registerUser(data)`: Create new user account
- `loginWithFacebook(facebookId, profile)`: Facebook OAuth login
- `getCurrentUser()`: Get current user session
- `updateUserProfile(userId, data)`: Update user details
- `requestPasswordReset(email)`: Generate reset token and send email
- `verifyResetToken(token)`: Check if token is valid and not expired
- `resetPassword(token, newPassword)`: Update password with token
- `sendResetEmailInternal(email, userName, token)`: Internal email scheduler

### Email Service (`convex/services/email.ts`) **NEW**
**Key Functions**:
- `sendPasswordResetEmail(to, userName, resetToken)`: Send password reset email via Resend
- `sendWelcomeEmail(to, userName)`: Send welcome email to new users

**Features**:
- Professional HTML email templates
- Branded with company colors
- Mobile-responsive design
- Secure token-based reset links
- 1-hour link expiration
- Uses Resend API for reliable delivery

### Products (`convex/services/products.ts`)
**Key Functions**:
- `getProducts(filters?)`: List products with filters
- `getProductById(productId)`: Get single product
- `createProduct(data)`: Create new product
- `updateProduct(productId, data)`: Update product
- `deleteProduct(productId)`: Soft delete product
- `searchProducts(query)`: Search products by name/description
- `getProductsByCategory(categoryId)`: Filter by category
- `getLowStockProducts(threshold)`: Get low stock alerts

### Reservations (`convex/services/reservations.ts`)
**Key Functions**:
- `createReservation(items, guestInfo?)`: Create reservation
- `confirmReservation(reservationId)`: Confirm pending reservation
- `updateReservationStatus(reservationId, status)`: Change status
- `getReservationByCode(code)`: Get by reservation code
- `getUserReservations(userId?, guestId?)`: Get user/guest reservations
- `getExpiredReservations()`: Find expired reservations
- `cancelReservation(reservationId)`: Cancel reservation
- `completeReservation(reservationId)`: Mark as completed

### Cart (`convex/services/cart.ts`)
**Key Functions**:
- `getCart(userId?, guestId?)`: Get cart items
- `addToCart(productId, quantity, userId?, guestId?)`: Add item
- `updateCartQuantity(itemId, quantity)`: Update quantity
- `removeFromCart(itemId)`: Remove item
- `clearCart(userId?, guestId?)`: Empty cart
- `mergeGuestCart(guestId, userId)`: Merge guest cart on login

### Admin (`convex/services/admin.ts`)
**Key Functions**:
- `getDashboardStats()`: Get dashboard metrics
- `getRecentOrders(limit)`: Recent order list
- `getRecentReservations(limit)`: Recent reservation list
- `updateUserRole(userId, role)`: Change user role
- `toggleUserStatus(userId)`: Activate/deactivate user
- `getSystemLogs(filters)`: System activity logs

### Analytics (`convex/services/analytics.ts`)
**Key Functions**:
- `getSalesTrend(startDate, endDate)`: Sales over time
- `getTopProducts(limit)`: Best-selling products
- `getRevenueByCategory()`: Category revenue breakdown
- `getUserGrowth()`: User registration trends
- `getOrderStatusDistribution()`: Orders by status

---

## Styling & Design System

### Tailwind CSS 4.0 Configuration

**Color Palette**:
```css
--primary: #FF6B00 (Orange)
--background: #121212 (Dark Gray)
--foreground: #FFFFFF (White)
--card: #1E1E1E (Dark Card)
--border: #333333 (Border)
```

**Custom Utilities**:
- `safe-area-wrapper`: Mobile safe area padding
- `min-h-screen-safe`: Full screen height with safe areas
- `glass`: Glass morphism effect
- `gradient-primary`: Primary gradient background

**Responsive Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## Mobile App (Capacitor)

### Build Process

**Development Build**:
```bash
npm run build                    # Build Next.js static export
npx cap sync android             # Sync to Android
npx cap open android             # Open Android Studio
# OR
npx cap run android              # Build and run on device
```

**Production APK**:
```bash
npm run android:release          # Complete release build
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Capacitor Configuration

**App ID**: `com.celestial.app`
**App Name**: CelestialApp
**Web Directory**: `out`
**Icon Source**: `app-icons/icon.png`

**Plugins** (9 total):
- `@capacitor/app` 7.1.0: App lifecycle
- `@capacitor/splash-screen` 7.0.3: Splash screen (3s auto-hide)
- `@capacitor/status-bar` 7.0.3: Status bar styling (light content, dark background)
- `@capacitor/network` 7.0.2: Network status monitoring
- `@capacitor/device` 7.0.2: Device information
- `@capacitor/haptics` 7.0.2: Haptic feedback
- `@capacitor/dialog` 7.0.2: Native dialogs
- `@capacitor/toast` 7.0.2: Toast notifications
- `capacitor-plugin-safe-area` 4.0.0: Safe area insets for notch/punch-hole screens

**Icon Configuration**:
- Generates 74 Android assets (1.91 MB total)
- Adaptive icons (foreground + background layers)
- Round icons for supported launchers
- Multiple densities (ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Splash screens (portrait + landscape, light + dark modes)

### Mobile-Specific Features

**Navigation**: Bottom navigation bar (`ClientBottomNavbar.tsx`)
- Home, Categories, Cart, Reservations, Profile
- Active state highlighting
- Badge counts for cart and notifications

**Safe Areas**: CSS utilities for notch/punch-hole screens (`capacitor-plugin-safe-area`)
**Splash Screen**: 3-second auto-hide with dark background (#121212)
**Status Bar**: Light content on dark background (#121212)
**App Icon**: Custom branded icon with adaptive support

### App Icon Setup & Asset Generation

**Source Icon Location**: `app-icons/icon.png` (71KB)
**Generation Directory**: `resources/icon.png`

**Setup Steps**:
1. Place source icon in `app-icons/` directory (minimum 1024x1024 px recommended)
2. Copy icon to `resources/` directory: `copy app-icons/icon.png resources/icon.png`
3. Run asset generation: `npx @capacitor/assets generate --android`
4. Configure in `capacitor.config.ts`:
   ```typescript
   android: {
     icon: 'app-icons/icon.png'
   }
   ```
5. Sync to Android: `npx cap sync android`

**Generated Assets** (74 files, 1.91 MB total):
- **App Icons**: 6 densities (ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- **Adaptive Icons**: Foreground + background layers for Android 8+
- **Round Icons**: Alternative launcher icons (6 densities)
- **Splash Screens**: Portrait + landscape variants
- **Dark Mode**: Separate splash screens for dark theme

**Asset Locations**:
- Icons: `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- Adaptive: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher*.xml`
- Splash: `android/app/src/main/res/drawable*/splash.png`

**Best Practices**:
- Use square icon (1:1 aspect ratio)
- Minimum 512x512 px, recommended 1024x1024 px
- PNG format with transparency
- Avoid text near edges (safe zone: 80% of canvas)
- Test on multiple devices for visual consistency

---

## Development Workflow

### Common Commands

```bash
# Development
npm run dev                      # Start dev server (Turbopack)
npm run build                    # Build static export + capacitor export script
npm run build:static             # Same as build (alias)
npm run start                    # Start production server
npm run lint                     # Run ESLint

# Mobile Development
npm run android:dev              # Full dev cycle (build + sync + run)
npm run android:build            # Debug APK build (clean + assemble)
npm run android:release          # Release APK bundle
npm run android:sync             # Sync static files to Android
npm run android:open             # Open Android Studio
npm run android:clean            # Clean Android build artifacts
npm run android:test             # Build and test on device/emulator

# Capacitor Commands
npm run cap:add                  # Add Android platform
npm run cap:sync                 # Sync to Android
npm run cap:run                  # Run on device/emulator
npm run cap:open                 # Open Android Studio

# Asset Generation
npx @capacitor/assets generate --android  # Generate icons and splash screens

# Utilities
npm run clean                    # Clean all build artifacts (.next, out, android/build)
npm run clean:build              # Clean and rebuild
```

### Development Guidelines

**TypeScript**:
- Strict mode enabled
- Use existing types from `types/index.ts`
- Create new interfaces as needed

**Component Patterns**:
- Functional components with hooks
- Props interfaces for type safety
- Consistent naming: PascalCase for components

**State Management**:
- Global state: Zustand stores
- Component state: React hooks
- Server state: Convex reactive queries
- Form state: Local component state

**Error Handling**:
- Try-catch in async operations
- User-friendly error messages
- Toast notifications for feedback

**Code Organization**:
- Group related logic in services
- Keep components focused and small
- Extract reusable logic into hooks
- Utility functions in `lib/utils.ts`

---

## Testing Strategy

**Current Setup**:
- TypeScript compile-time checks
- ESLint for code quality
- Manual testing for features

**Recommended Additions**:
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright or Cypress
- Component tests: Storybook

---

## Common Patterns & Examples

### Creating a New Page

1. **Create page file**: `app/client/new-feature/page.tsx`
```typescript
'use client';
import { useAuth } from '@/hooks/useAuth';

export default function NewFeaturePage() {
  const { user, isAuthenticated } = useAuth();
  
  return (
    <div className="p-4">
      <h1>New Feature</h1>
    </div>
  );
}
```

2. **Add to navigation**: Update `ClientBottomNavbar.tsx` or relevant navigation

### Adding a Convex Service Function

1. **In `convex/services/[service].ts`**:
```typescript
import { query, mutation } from '../_generated/server';
import { v } from 'convex/values';

export const myNewFunction = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user;
  }
});
```

2. **Use in component**:
```typescript
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

const data = useQuery(api.services.myService.myNewFunction, { 
  userId: user._id 
});
```

### Creating a Multi-Item Reservation

```typescript
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const createReservation = useMutation(api.services.reservations.createReservation);

const handleReserve = async () => {
  await createReservation({
    items: [
      { productId: 'abc123', quantity: 2, reservedPrice: 100 },
      { productId: 'def456', quantity: 1, reservedPrice: 50 }
    ],
    guestInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '09123456789',
      pickupSchedule: {
        date: '2025-02-15',
        time: '14:00'
      }
    }
  });
};
```

### Guest Mode Implementation

```typescript
// Auto-generate guest ID
import { v4 as uuidv4 } from 'uuid';

const guestId = localStorage.getItem('guestId') || uuidv4();
localStorage.setItem('guestId', guestId);

// Use guest ID in operations
const cart = useQuery(api.services.cart.getCart, {
  guestId: !isAuthenticated ? guestId : undefined,
  userId: isAuthenticated ? user._id : undefined
});
```

---

## Important Considerations for AI Agents

### 1. Static Export Constraints
- **No server-side API routes** - Next.js API routes are excluded from static builds
- **Use Convex Actions for external APIs** - Email, SMS, payment processing must use Convex Actions
- No middleware protection (client-side guards only)
- All dynamic routes must use catch-all patterns: `[[...id]]`
- Images must be unoptimized (`unoptimized: true`)

### 1b. Email Integration (Resend via Convex)
- **Never use Next.js API routes** for email sending (they won't work in static export)
- **Always use Convex Actions** for external API calls like Resend
- Email sending is asynchronous and non-blocking
- Password reset emails sent automatically when user requests reset
- Email templates are HTML-based and mobile-responsive
- Environment variables required:
  - `RESEND_API_KEY`: Your Resend API key
  - `RESEND_FROM_EMAIL`: Verified sender email
  - `NEXT_PUBLIC_APP_URL`: App URL for email links
- See `RESEND_EMAIL_SETUP.md` for detailed setup instructions

### 2. Guest User Handling
- Always check for both `userId` and `guestId` in queries
- Merge guest data when user registers/logs in
- Persist guest ID in localStorage

### 3. Multi-Item Reservations
- Use `items` array for new reservations
- Legacy `productId` and `quantity` fields still exist for backward compatibility
- Always calculate `totalAmount` and `totalQuantity`

### 4. Role-Based Access
- Convex functions should validate user roles server-side
- Client-side guards are for UX only (not security)
- Check user role before executing mutations

### 5. Real-Time Updates
- Convex queries are reactive by default
- Components re-render automatically on data changes
- No need for manual refetch or polling

### 6. Mobile Compatibility
- Always test on mobile viewport
- Use safe area CSS utilities
- Consider touch targets (min 44x44px)
- Test on actual Android device when possible

### 7. Type Safety
- Use existing types from `types/index.ts`
- Create new types for new features
- Convex schema and TypeScript types should match

### 8. Error Handling
- Always wrap async operations in try-catch
- Show user-friendly error messages
- Use toast notifications for feedback

---

## Known Issues & Limitations

1. **Static Export Middleware**: Route protection is client-side only
2. **Image Optimization**: Next.js image optimization disabled for Capacitor
3. **OAuth Redirect**: Facebook OAuth requires specific redirect URL setup
4. **Push Notifications**: Currently using local notifications (no FCM integration)
5. **Payment Gateway**: Not yet integrated (placeholder only)

---

## Future Roadmap

### Short Term
- Payment gateway integration (Stripe/PayPal)
- SMS notifications via Twilio
- ✅ ~~Email service integration~~ (COMPLETED - using Resend)
- Enhanced analytics dashboard
- Email notifications for orders and reservations

### Long Term
- iOS app deployment
- Multi-language support (i18n)
- Wishlist feature
- Product reviews & ratings
- Loyalty program
- Advanced email templates with React Email

---

## Environment Variables

**Required**:
```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# Resend Email Service (for password reset, notifications)
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=Celestial Drakon Aquatics <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your app URL for email links
```

**Note**: For Convex environment variables (like `RESEND_API_KEY`), add them in the Convex dashboard under Settings → Environment Variables.

---

## Quick Reference

### File Import Aliases
```typescript
@/                              # Root directory
@/components/ui/Button          # UI component
@/convex/_generated/api         # Convex API
@/hooks/useAuth                 # Custom hook
@/lib/utils                     # Utilities
@/types                         # TypeScript types
@/store/auth                    # Zustand store
```

### Convex Query/Mutation Patterns
```typescript
// Query (read data)
const data = useQuery(api.services.products.getProducts, { isActive: true });

// Mutation (write data)
const createProduct = useMutation(api.services.products.createProduct);
await createProduct({ name: 'New Product', price: 100, ... });
```

### Route Structure
- `/auth/*` - Public authentication
- `/client/*` - Customer pages (requires auth or guest)
- `/admin/*` - Admin pages (requires admin role)
- `/control_panel/*` - Super admin pages (requires super_admin role)

---

## Contact & Support

For questions or issues related to this codebase, refer to:
- **CLAUDE.md**: Detailed specification document
- **Convex Dashboard**: Real-time database monitoring
- **Android Studio**: Mobile app debugging

---

## Recent Updates

### November 2025 - App Icon Integration (COMPLETED ✅)
- ✅ Integrated app icon using @capacitor/assets
- ✅ Created resources directory for Capacitor asset generation
- ✅ Generated 74 Android assets (icons + splash screens)
- ✅ Configured icon path in capacitor.config.ts
- ✅ Generated adaptive icons with foreground/background layers
- ✅ Created multiple density icons (ldpi through xxxhdpi)
- ✅ Generated round icons for supported launchers
- ✅ Created splash screens for portrait/landscape and light/dark modes

### October 2025 - Recent Feature Updates (COMPLETED ✅)
- ✅ **Admin Password Change**: Implemented password change functionality in admin settings with enhanced validation (8+ chars, uppercase, lowercase, number)
- ✅ **SMS Phone Detection Fix**: Added phone number prompts in profile page for users without phone numbers
- ✅ **Profile Updates**: Enhanced user profile editing with better phone number handling
- ✅ **Registration Improvements**: Added SMS benefit hints to encourage phone number entry during registration

### October 2025 - Email Integration (COMPLETED ✅)
- ✅ Integrated Resend 6.2.2 for email delivery
- ✅ Implemented password reset via email with secure tokens
- ✅ Added professional HTML email templates with branding
- ✅ Used Convex Actions for email sending (static export compatible)
- ✅ Created comprehensive setup documentation
- ✅ Improved email service to use official Resend SDK
- ✅ Configured environment variables in Convex
- ✅ Created React email templates (PasswordReset, Welcome)
- ✅ Added extensive testing and troubleshooting guides

### Key Files & Directories
**New Directories**:
- `app-icons/`: Source app icon files
- `resources/`: Capacitor assets directory for icon generation

**Key Configuration Files**:
- `capacitor.config.ts`: App icon path configured, splash screen settings
- `package.json`: Updated with latest dependencies and comprehensive scripts
- `next.config.ts`: Static export configuration with image optimization disabled

**Recent Documentation**:
- `ADMIN_PASSWORD_CHANGE_FIX.md`: Admin password change implementation details
- `SMS_FIX_COMPLETE.md`: Phone number detection and SMS notification fixes
- `PROFILE_UPDATE_FIX.md`: User profile update improvements
- `EMAIL_IMPLEMENTATION_GUIDE.md`: Complete email setup guide
- `IMPROVEMENTS_SUMMARY.md`: Summary of email improvements
- `TESTING_GUIDE.md`: Step-by-step testing instructions
- `EMAIL_README.md`: Quick reference guide

**Email System Files**:
- `components/emails/PasswordResetEmail.tsx`: Professional password reset template
- `components/emails/WelcomeEmail.tsx`: Welcome email template
- `convex/services/email.ts`: Email service using Resend SDK
- `app/auth/forgot_password/page.tsx`: Password reset request page
- `app/auth/reset_password/page.tsx`: Password reset form
- `convex/services/auth.ts`: Password reset functions with token generation

---

**Last Updated**: November 6, 2025
**Codebase Version**: 0.3.0 (App icon integration + recent fixes)
**Next.js Version**: 15.5.3
**Convex Version**: 1.27.0
**Capacitor Version**: 7.4.3
**Resend SDK Version**: 6.2.2
**TypeScript Version**: 5.x
**React Version**: 19.1.0
**Zustand Version**: 5.0.8
**Status**: ✅ All Core Features Operational
- Email System: ✅ Fully Operational
- Password Reset: ✅ Working with Token Expiry
- Admin Features: ✅ Password Change Implemented
- SMS Notifications: ✅ Phone Detection Fixed
- App Icon: ✅ 74 Assets Generated
- Mobile Build: ✅ APK Generation Ready

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
