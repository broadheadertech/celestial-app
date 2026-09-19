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
- **Zustand Store:** Client-side auth state with localStorage (`user`, `sessionToken`)
- **Guest Sessions:** Auto-generated guest IDs for non-authenticated users

### Server-Side Authorization (Convex)
Middleware can't run in the static export, so authorization is enforced inside Convex functions:
1. `auth.login` / `auth.register` create a row in `sessions` and return a `sessionToken`.
2. `components/ConvexProvider.tsx` exchanges it for a 1-hour RS256 JWT via `session.issueToken`
   and calls `convex.setAuth`; logout revokes the session.
3. Convex verifies the JWT (`convex/auth.config.ts`, public key served by `convex/http.ts`).
4. Functions call helpers from `convex/lib/authz.ts` — `getViewer`, `requireUser`, `requireStaff`,
   `requireSuperAdmin`, `requireSelfOrStaff`. **Never trust a `userId`/`actorId` argument for
   authorization**; use the viewer.
5. `components/admin/AdminGuard.tsx` gates `/admin/*` in the UI using `session.me`.

Deployment env vars: `JWT_PRIVATE_KEY` (base64 PKCS#8) and `JWKS` must be set on each Convex deployment.
Storefront pages must use public queries (e.g. `products.getCatalogProducts`), never `admin.*`.

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

### Storefront Sales Channels & Content
- **Purchase mode:** `products.purchaseMode` is `"enquire"` (showcase + WhatsApp/viewing, e.g. live fish)
  or `"cart"` (add to cart + checkout, e.g. food, lights, gear). Unset = default by category
  (`convex/lib/purchaseMode.ts`). Set per product in the admin product form.
- **Visibility:** `products.visibility` `"internal"` = inventory/POS only. Use `isListedPublicly()` from
  `convex/lib/purchaseMode.ts` in every customer-facing query/mutation (catalog, product lookups, cart,
  wishlist, web orders, customer reservations); staff paths may still use internal products.
- **Videos:** `products.videos` (max 5) — uploaded clips in Convex storage (`kind: "file"`, poster
  frame captured in the browser) or YouTube/Facebook links, validated by `convex/lib/video.ts`.
  Admin: `components/admin/ProductVideosField.tsx`. Storefront gallery + player in the product page;
  `components/dc/VideoBadge.tsx` on tiles. Removing an uploaded clip deletes it from storage.
- **Display names:** `products.name` is the internal inventory name; optional `displayName` is what
  customers see. Public payloads put `publicName()` (`convex/lib/productName.ts`) in `name` and add
  `internalName`; embedded products in cart/wishlist/orders/reservations use `customerProduct()`.
  Storefront classification (Catalog vs Cave, bloodline) must use `kindName(p)` from
  `components/dc/fish.ts`, display must use `titleOf(p)`. Staff/admin payloads keep the raw `name`.
  Setting a display name for the first time regenerates the product slug.
- **Messenger & sharing:** the Facebook page link in Business Details also drives the Messenger
  buttons (`messengerUrl()` in `components/dc/links.ts` → m.me). Messenger can't prefill text, so
  `components/dc/MessengerButton.tsx` copies the enquiry first. Product pages have
  `components/dc/ShareButton.tsx` (native share sheet, else Facebook/WhatsApp/copy link); shared
  links always use `productUrl()` (the live site's readable URL).
- **Recently rehomed:** `products.getRehomedSpecimens` lists public live fish at 0 stock that are in an active
  reservation ("reserved") or whose last stock decrease was a sale/reservation ("sold"); damage, adjustments or
  no recorded movement never count as sold. Shown by `components/dc/RehomedStrip.tsx` under Catalog and Cave.
- **Image uploads:** every admin photo upload goes through `uploadOptimizedImage()` (`lib/optimizeImage.ts`):
  max 1600px, WebP, EXIF (incl. GPS) stripped, HEIC rejected with instructions. Use it for new upload fields.
- **Photo tools** (Admin → Products): Photos filter (no photo / only 1 / over 1 MB) and a banner that shrinks
  photos over 1 MB in the browser and swaps them in (`convex/services/productPhotos.ts`, `components/admin/ProductPhotoTools.tsx`).
- **Website rebuilds:** `convex/services/siteBuild.ts` calls a Vercel deploy hook (Convex env `VERCEL_DEPLOY_HOOK_URL`)
  daily when products changed (cron) or on demand ("Update website" on Admin → Products, 10-min cooldown), so new
  products get prerendered pages/link previews. No-op until the env var is set.
- **Visitor stats:** `components/SiteAnalytics.tsx` loads Vercel Web Analytics on dc.broadheader.com only (not the
  app, previews or localhost); admin/account/client/auth pages are excluded and query strings stripped.
- **Stock audit trail:** always write stock movements with `logStockMovement()` (`convex/lib/stockLog.ts`), never
  `ctx.db.insert("stockMovements")` — it stamps who (`performedBy/performedByName`) and why (`note`) and raises a
  deduplicated low-stock alert (per-product `reorderPoint`, else App Settings threshold). Setting stock to a number
  (product form edit, stock count) must use `setCountedStock()` (`convex/lib/stockCount.ts`) so batches stay in step.
- **Restock list** (Admin → Restock List, `convex/services/restock.ts`): out / low / selling-fast shop items with
  30-day sales, suggested qty, last supplier & cost, per-item alert level, "ordered" marks (cleared by restockProduct).
- **Inventory audit** (Admin → Inventory Audit, `convex/services/stockAudit.ts`): activity feed of stock movements
  with person/note/totals + CSV; Stock check lists products whose stock ≠ batch totals or with no batches, fixed via
  "Record count" (`recordStockCount`).
- **Corrections need a password:** sales are never edited in place — `salesCorrections.voidSale` (cancel, stock back,
  kept as voided) or `correctSale` (void + re-enter at the original prices/date). Deliveries use
  `restockCorrections.correctDelivery` / `voidDelivery` (Inventory Audit → Deliveries). All call
  `confirmStaffPassword()` (`convex/lib/staffConfirm.ts`; returns `{ok:false,error}` instead of throwing so failed
  attempts are counted, 5 → 15-min lock) plus a reason, and are audited. Paid orders can't be cancelled via status.
- **Sale date & channel:** `adminCreateOrder` takes an optional `orderDate` (≤ 1 year back, not future; `enteredAt`
  records when it was keyed in). `orders.channel` is "pos" | "web" | "app" (older rows inferred by `orderChannel()`);
  the Orders page filters by it. Products with any transactions can't be deleted — only deactivated.
- **updateProduct saves an explicit field list** — when adding a product field, add it there too
  (`purchaseMode: "auto"` clears the explicit setting).
- **Checkout** (`app/(site)/checkout`) accepts cart-mode products only (`orders.placeWebOrder` enforces it);
  orders are created pending/unpaid — no online payment.
- **Business Details** (Admin → Business Details, `convex/services/business.ts`): the single source for
  phone, WhatsApp, email, address, hours, GCash/bank details. Storefront reads it via
  `components/dc/business.ts` (`useBusiness`). Never hardcode contact details in pages; unset values are hidden.
- **Testimonials** (Admin → Testimonials, `convex/services/testimonials.ts`): client photo + quote; only
  published ones show on the home page.
- **FAQs** (Admin → FAQs, `convex/services/faqs.ts`): plain-text Q&A in display order; only published ones show
  on the Contact page (with FAQPage JSON-LD). The section hides when none are published.
- **Order tracking** (`/track`, `convex/services/tracking.ts`): guests look up ORD-/RES- codes with the
  email used at checkout; returns customer-safe fields only.
- **Product URLs:** every product has a unique `slug` (set on create, kept on rename; `convex/lib/slug.ts`).
  Readable URLs `/specimen/<slug>` are prerendered per product at build time (`app/(site)/specimen/[slug]`,
  per-product title/description/og:image for link previews; catalog fetched via `lib/buildCatalog.ts`).
  Products created after the last deploy fall back to the `vercel.json` rewrite to `/specimen-detail`
  (Vercel serves files before rewrites). The page UI is `components/dc/SpecimenView.tsx`, which also accepts `?id=`. In-app links keep using `?id=` because the Capacitor app has no
  rewrites. The page sets title/description/canonical + Product JSON-LD client-side, and
  `app/sitemap.ts` lists in-stock product URLs at build time (fetched via node:https to avoid Next's
  build fetch cache). Hosting is **Vercel** (`public/_redirects` is ignored).
- **Journal** (Admin → Journal, `convex/services/journal.ts`): staff write/publish posts; `/journal` and
  `/journal/article?slug=` show published posts only (body rendered by `components/dc/JournalBody.tsx`).
- **Notifications:** each row has `audience` (`"staff"` team inbox with shared `isRead`, or
  `"customer"`). Customer read/dismiss state lives in `notificationReceipts` per user — never modify
  or delete shared rows on a customer's behalf. Web orders, viewing requests and contact messages
  create staff notifications and send best-effort confirmation emails (`convex/services/email.ts`).
- **Auth hardening:** passwords are PBKDF2 (`convex/lib/password.ts`); login/reset throttling in
  `convex/lib/throttle.ts`; a daily cron (`convex/crons.ts`) prunes stale auth rows.

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
- **Prerendered storefront:** `components/ConvexProvider.tsx` renders public pages (`PUBLIC_PATHS`) during
  static export so their HTML has real content; other routes wait for mount. Public pages must not read
  localStorage-backed stores (auth, cart) during render — gate those parts behind a mounted flag.
  Storefront code must import `useQuery` from `components/dc/useQuery.ts`, not `convex/react`: it reports
  "loading" until hydration finishes, so query results arriving mid-hydration can't cause React error #418.
- **Responsive storefront:** inline grid templates are overridden on small screens by utility classes in
  `components/dc/styles.tsx` (`dc-split`, `dc-cols-2/3/4`, `dc-hide-md/sm`, `dc-sticky-md`).
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
- **Backend tests:** `npm test` — Vitest + `convex-test` (pinned to 0.0.41 for convex 1.27) in
  `tests/convex/`. Covers staff-only access, revoked/deactivated sessions, role changes, sign-up
  role, login lockout + PBKDF2 storage, public catalog (no cost fields, purchase modes), web
  checkout rules, and order tracking. Helpers in `tests/convex/setup.ts` (`signedInAs`,
  `seedCatalog`). Use fake timers in tests that trigger scheduled functions. Pure storefront helpers
  are tested in `tests/site/`.
- **Storefront smoke test:** `npm run build && npm run test:smoke` — serves `out/`, opens key pages
  in headless Chrome at phone and desktop widths, fails on console errors or horizontal overflow.
- **TypeScript:** builds fail on type errors (`next.config.ts` `ignoreBuildErrors: false`).
- **ESLint:** builds fail on lint errors too (`eslint.dirs` in `next.config.ts` covers app, components,
  lib, hooks, store, convex). Warnings are allowed.
- **Smoke test extras:** `SMOKE_EXTRA=/specimen/<slug>,... npm run test:smoke` checks additional paths;
  the smoke server applies `vercel.json` rewrites.

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
