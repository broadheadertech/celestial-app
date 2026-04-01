# Celestial Drakon Aquatics - Application Specification

## 1. Project Overview

**Application Name:** Celestial Drakon Aquatics
**Business Type:** E-commerce platform for aquarium fish, tanks, and aquatic accessories
**Target Market:** Philippines
**Application Type:** Cross-platform (Web + Mobile via Capacitor)

### Core Business Model
- **Products:** Aquarium fish, tanks, and aquatic accessories
- **Sales Model:** E-commerce with reservation system for live fish
- **User Types:** Customers, Admins, Super Admins
- **Special Features:** Guest shopping, Facebook authentication, multi-platform deployment

## 2. Technical Architecture

### Technology Stack
- **Frontend Framework:** Next.js 15.5.3 (App Router)
- **Backend:** Convex (real-time database and API)
- **Authentication:** NextAuth.js with Facebook OAuth
- **State Management:** Zustand
- **Styling:** Tailwind CSS 4.0
- **Mobile:** Capacitor (Android support)
- **Language:** TypeScript (strict mode)
- **Build Tool:** Turbopack

### Architecture Patterns
- **App Router:** File-system based routing
- **Real-time Updates:** Convex reactive queries
- **Component-Based:** Custom UI components with variants
- **Role-Based Access:** Middleware-protected routes
- **Guest Support:** Persistent guest sessions

## 3. Database Schema (Convex)

### Core Tables

#### Users
```typescript
{
  _id: string,
  email: string,
  firstName: string,
  lastName: string,
  phone?: string,
  passwordHash?: string, // Optional for Facebook users
  role: "client" | "admin" | "super_admin",
  isActive?: boolean,
  // Facebook integration
  facebookId?: string,
  profilePicture?: string,
  loginMethod?: "email" | "facebook",
  createdAt: number,
  updatedAt: number
}
```

#### Products
```typescript
{
  _id: string,
  name: string,
  description?: string,
  price: number,
  originalPrice?: number,
  categoryId: string,
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
```

#### Specialized Product Data
- **Fish Data:** Scientific name, size, temperature, pH, origin, diet
- **Tank Data:** Type, material, capacity, dimensions, thickness, lighting

#### Orders & Reservations
- **Orders:** Full e-commerce orders with shipping
- **Reservations:** Multi-item reservation system for live fish
- **Cart:** Supports both authenticated users and guests

#### Notifications
```typescript
{
  _id: string,
  title: string,
  message: string,
  type: "reservation" | "order" | "user" | "product" | "payment" | "alert" | "warning" | "success" | "system",
  isRead: boolean,
  priority: "low" | "medium" | "high" | "urgent",
  relatedId?: string,
  relatedType?: string,
  metadata?: object,
  createdAt: number,
  updatedAt: number
}
```

## 4. Authentication & Authorization

### Authentication Methods
1. **Email/Password:** Traditional authentication
2. **Facebook OAuth:** Social login with profile integration
3. **Guest Mode:** Persistent guest sessions for browsing

### User Roles
- **Client:** Regular customers, can browse, purchase, make reservations
- **Admin:** Store management, inventory, order processing
- **Super Admin:** Full system access, user management

### Route Protection
```typescript
// Middleware configuration
- /auth/* - Public authentication routes
- /admin/* - Admin role required
- /control_panel/* - Admin or Super Admin required
- /client/* - Authentication required (redirects to login)
```

### Session Management
- **NextAuth.js:** Handles OAuth and session persistence
- **Zustand Store:** Client-side auth state with localStorage
- **Guest Sessions:** Auto-generated guest IDs for non-authenticated users

## 5. Application Structure

### Directory Structure
```
app/
├── admin/           # Admin dashboard and management
├── auth/            # Authentication pages
├── client/          # Customer-facing features
├── control_panel/   # Super admin panel
├── api/             # API routes (NextAuth)
└── layout.tsx       # Root layout with providers

components/
├── ui/              # Reusable UI components
├── admin/           # Admin-specific components
├── client/          # Client-specific components
├── modal/           # Modal components
└── notifications/   # Notification components

convex/
├── schema.ts        # Database schema
├── services/        # Business logic functions
└── _generated/      # Auto-generated Convex files

store/               # Zustand stores (auth, cart)
types/               # TypeScript definitions
hooks/               # Custom React hooks
lib/                 # Utility functions
```

### Key Components

#### UI Components (components/ui/)
- **Button:** Multiple variants (primary, secondary, outline, ghost)
- **Input:** Form inputs with validation states
- **Card:** Container components with glass morphism
- **ProductCard:** Product display component

#### Business Components
- **AuthProvider:** NextAuth session provider
- **ConvexProvider:** Convex client provider
- **AuthInitializer:** Handles auth state initialization
- **ClientBottomNavbar:** Mobile navigation for clients

## 6. Business Features

### Customer Features
1. **Product Browsing:** Categories, search, filtering
2. **Shopping Cart:** Add/remove items, quantity management
3. **Reservations:** Reserve live fish with pickup scheduling
4. **Guest Shopping:** Browse and reserve without registration
5. **Profile Management:** Edit personal information
6. **Order History:** Track past orders and reservations

### Admin Features
1. **Dashboard:** Analytics, statistics, recent activity
2. **Inventory Management:** Products, categories, stock levels
3. **Order Processing:** Manage orders and reservations
4. **User Management:** View and manage customers
5. **Notifications:** System alerts and customer notifications
6. **Reports:** Sales analytics and business insights

### Super Admin Features
1. **Control Panel:** Full system administration
2. **User Role Management:** Assign and modify user roles
3. **System Settings:** Global configuration
4. **Advanced Analytics:** Detailed business reporting

## 7. Mobile App (Capacitor)

### Configuration
- **App ID:** com.celestial.app
- **App Name:** CelestialApp
- **Web Directory:** out (Next.js static export)
- **Architecture:** Standalone static SPA with client-side routing

### Build Process

The app uses Next.js static export with catch-all routes for dynamic pages:

1. **Build Next.js Static Export:**
   ```bash
   npm run build
   # Creates static files in /out directory
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync android
   # Copies /out to Android assets
   ```

3. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleDebug    # For testing
   ./gradlew assembleRelease  # For production
   ```

4. **APK Location:**
   - Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `android/app/build/outputs/apk/release/app-release.apk`

### Dynamic Routes Implementation

Dynamic routes use catch-all patterns for static export compatibility:
- `/client/product/[[...id]]` - Handles all product detail pages
- `/admin/products/[[...id]]` - Handles admin product management
- `/admin/reservations/[[...id]]` - Handles reservation management

All routes are pre-built as static HTML and use client-side routing with `useParams()` to fetch data from Convex.

### Mobile-Specific Features
- **Standalone APK:** No server required, all static files bundled
- **Client-Side Data:** Real-time data fetching from Convex
- **Responsive Design:** Mobile-first UI components
- **Native Navigation:** Bottom navigation for mobile
- **Native Features:** Camera, push notifications via Capacitor plugins
- **Offline-Ready:** Static assets cached by service worker (future)

## 8. API & Data Flow

### Convex Functions
- **Queries:** Real-time data fetching (products, orders, etc.)
- **Mutations:** Data modifications (create, update, delete)
- **Actions:** External API calls and complex operations

### Key Services (convex/services/)
- **auth.ts:** User authentication and management
- **products.ts:** Product catalog operations
- **orders.ts:** Order processing
- **reservations.ts:** Reservation management
- **cart.ts:** Shopping cart operations
- **notifications.ts:** Notification system
- **admin.ts:** Admin operations

### Data Flow
1. **Frontend:** React components with Zustand state
2. **Convex:** Real-time database with reactive queries
3. **NextAuth:** Authentication and session management
4. **Local Storage:** Persistent state (auth, cart)

## 9. Development Guidelines

### Code Standards
- **TypeScript:** Strict mode enabled
- **ESLint:** Code quality and consistency
- **Component Pattern:** Consistent prop interfaces
- **Error Handling:** Try-catch with user-friendly messages

### File Naming
- **Pages:** `page.tsx` (App Router convention)
- **Layouts:** `layout.tsx`
- **Components:** PascalCase (e.g., `Button.tsx`)
- **Hooks:** camelCase with `use` prefix
- **Types:** Interfaces in `types/index.ts`

### State Management
- **Global State:** Zustand stores (auth, cart)
- **Component State:** React hooks (useState, useEffect)
- **Server State:** Convex reactive queries
- **Form State:** Local component state

## 10. Environment Configuration

### Required Environment Variables
```env
# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_string

# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_url
```

### Development Commands
```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build static export for production
npm run lint             # Run ESLint

# Mobile APK Build (Complete Process)
npm run build                    # 1. Build Next.js static export
npx cap sync android             # 2. Sync to Android
cd android && ./gradlew assembleDebug    # 3. Build debug APK
cd android && ./gradlew assembleRelease  # 3. Build release APK (for production)

# Development Testing
npx cap open android     # Open Android Studio
npx cap run android      # Build and run on device/emulator
```

## 11. Business Rules & Constraints

### Product Management
- **Live Fish:** Require reservations with pickup scheduling
- **Stock Tracking:** Real-time inventory management
- **Pricing:** Support for original price and sale price
- **Categories:** Hierarchical product organization

### Order Processing
- **Guest Orders:** Require contact information
- **Order Status:** pending → confirmed → processing → shipped → delivered
- **Reservation Status:** pending → confirmed → completed → expired
- **Payment:** Integration points ready (currently mock)

### User Experience
- **Guest Mode:** Full browsing and reservation capability
- **Mobile First:** Responsive design for all screen sizes
- **Real-time Updates:** Live notifications and data sync
- **Offline Support:** Local storage for essential data

## 12. Integration Points

### External Services
- **Facebook OAuth:** User authentication and profile data
- **Convex:** Real-time database and API
- **Capacitor:** Mobile app deployment
- **Next.js:** SSR/SSG capabilities

### Future Integrations
- **Payment Gateway:** Stripe, PayPal, or local payment methods
- **SMS Notifications:** Order and reservation confirmations
- **Email Service:** Transactional emails
- **Analytics:** Google Analytics or similar

## 13. Security Considerations

### Authentication Security
- **Password Hashing:** Secure password storage
- **Session Management:** NextAuth.js secure sessions
- **OAuth Security:** Facebook OAuth with proper scopes
- **Route Protection:** Middleware-based authorization

### Data Security
- **Input Validation:** Client and server-side validation
- **SQL Injection:** Convex handles query safety
- **XSS Protection:** React's built-in XSS protection
- **CSRF Protection:** NextAuth.js CSRF tokens

## 14. Performance Optimizations

### Frontend Optimizations
- **Turbopack:** Faster builds and development
- **Image Optimization:** Next.js Image component
- **Code Splitting:** Automatic route-based splitting
- **Static Generation:** Pre-built pages where possible

### Backend Optimizations
- **Convex Caching:** Automatic query caching
- **Real-time Updates:** Efficient change subscriptions
- **Database Indexes:** Optimized query performance
- **Pagination:** Large dataset handling

## 15. Testing Strategy

### Current Setup
- **ESLint:** Code quality and consistency
- **TypeScript:** Compile-time error checking
- **Manual Testing:** Feature verification

### Recommended Additions
- **Unit Tests:** Component and utility testing
- **Integration Tests:** API and data flow testing
- **E2E Tests:** User journey testing
- **Performance Tests:** Load and stress testing

## 16. Deployment & DevOps

### Static Export Build Process

The app uses Next.js static export for standalone mobile deployment:

```bash
# 1. Build static export
npm run build
# Output: /out directory with all static files

# 2. Sync to Capacitor
npx cap sync android
# Copies static files to Android assets

# 3. Build APK
cd android
./gradlew assembleDebug    # For testing
./gradlew assembleRelease  # For production
```

### APK Distribution

1. **Debug APK** (for testing):
   - Location: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Install directly on device or emulator

2. **Release APK** (for production):
   - Location: `android/app/build/outputs/apk/release/app-release.apk`
   - Sign with keystore
   - Upload to Google Play Store

### Deployment Architecture

- **Static Files:** All HTML, CSS, JS bundled in APK
- **Data Layer:** Client-side fetching from Convex API
- **No Server Required:** APK runs standalone
- **Updates:** Convex schema updates reflect immediately
- **Versioning:** New features require new APK build

### Benefits
- **Truly Standalone:** No hosting costs for mobile app
- **Fast Performance:** All assets loaded locally
- **Offline-Capable:** UI works without internet (data requires connection)
- **Simple Deployment:** Single APK file distribution

## 17. Monitoring & Analytics

### Current Monitoring
- **Convex Dashboard:** Real-time data monitoring
- **Browser DevTools:** Client-side debugging
- **Console Logging:** Error tracking and debugging

### Recommended Monitoring
- **Error Tracking:** Sentry or similar service
- **Performance Monitoring:** Web Vitals tracking
- **User Analytics:** Behavior and usage patterns
- **Business Metrics:** Sales and conversion tracking

## 18. Future Roadmap

### Short Term
- **Payment Integration:** Complete checkout process
- **SMS Notifications:** Order confirmations
- **Enhanced Analytics:** Business intelligence dashboard

### Long Term
- **iOS App:** Capacitor iOS deployment
- **Multi-language:** Internationalization support
- **Advanced Features:** Wishlist, reviews, loyalty program
- **API Expansion:** Third-party integrations

---

## AI Agent Guidelines

When working with this codebase, AI agents should:

1. **Respect the Architecture:** Follow Next.js App Router patterns and Convex integration
2. **Maintain Type Safety:** Use existing TypeScript interfaces and create new ones as needed
3. **Preserve Business Logic:** Maintain the e-commerce and reservation system functionality
4. **Support Both Users:** Ensure features work for both authenticated users and guests
5. **Mobile Compatibility:** Consider mobile-first design and Capacitor deployment
6. **Follow Patterns:** Use established component patterns and state management approaches
7. **Test Thoroughly:** Verify both authenticated and guest user flows
8. **Document Changes:** Update this spec when making architectural changes

This specification serves as the single source of truth for understanding the Celestial Drakon Aquatics application architecture, business requirements, and technical implementation details.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
