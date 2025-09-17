# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Important Notes
- This project uses Turbopack for faster builds and development
- No type checking command is defined - use ESLint for code quality

## Project Architecture

### Technology Stack
- **Framework**: Next.js 15.5.3 (App Router)
- **Database**: Convex (real-time backend)
- **Authentication**: NextAuth.js with Facebook OAuth integration
- **State Management**: Zustand for client state
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Custom components in `/components/ui/`
- **TypeScript**: Strict mode enabled

### Core Architecture Patterns

**Application Structure**:
- `app/` - Next.js App Router pages and API routes
- `convex/` - Convex backend functions and schema
- `components/` - Reusable UI components
- `store/` - Zustand stores for state management
- `types/` - TypeScript type definitions
- `lib/` - Utility libraries and configurations

**Authentication Flow**:
- NextAuth.js handles OAuth with Facebook provider
- Convex integration for user management
- Role-based routing (admin/client dashboards)
- Guest session support for non-authenticated users

**Data Layer**:
- Convex provides real-time database with type-safe queries
- Schema includes: users, products, categories, orders, reservations, cart, notifications
- Support for both authenticated users and guest sessions

### Routing Structure

**Public Routes**:
- `/` - Landing page with auto-redirect for authenticated users
- `/auth/login` - Authentication page
- `/auth/register` - User registration

**Protected Routes**:
- `/admin/*` - Admin dashboard and management pages
- `/client/*` - Client dashboard and shopping interface

**API Routes**:
- `/api/auth/[...nextauth]` - NextAuth authentication handler

### Key Components

**Authentication**:
- `AuthProvider` - NextAuth session provider
- `ConvexProvider` - Convex client provider
- `AuthInitializer` - Handles authentication state initialization
- Middleware protects routes and handles redirects

**State Management**:
- `useAuthStore` - Authentication state (Zustand)
- Persistent storage using localStorage
- Guest session management

**Business Logic**:
- Aquarium/fish products with detailed specifications (tank data, fish data)
- Shopping cart supporting both users and guests
- Reservation system with multi-item support
- Order management with status tracking

## Environment Configuration

Required environment variables:
- `FACEBOOK_CLIENT_ID` - Facebook OAuth app ID
- `FACEBOOK_CLIENT_SECRET` - Facebook OAuth app secret
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - NextAuth encryption secret
- `NEXT_PUBLIC_CONVEX_URL` - Convex backend URL

## Database Schema

### Key Tables
- `users` - User accounts with Facebook integration
- `products` - Product catalog with pricing and stock
- `categories` - Product categorization
- `fish` - Fish-specific product data (scientific name, temperature, pH, etc.)
- `tank` - Tank-specific product data (dimensions, capacity, materials)
- `cart` - Shopping cart (supports users and guests)
- `reservations` - Product reservations with expiry dates
- `orders` - Complete order management
- `notifications` - System notifications with priority levels

### Important Indexes
- User lookup by email and Facebook ID
- Product filtering by category and status
- Cart/reservation lookup by user and guest ID
- Order tracking by user and status

## Development Guidelines

### Code Organization
- Use the established component pattern with variants (Button, Card, Input)
- Follow the existing TypeScript patterns with strict typing
- Maintain the role-based access control system
- Preserve guest user functionality alongside authenticated features

### Facebook Integration
- Facebook OAuth is fully configured with NextAuth
- See `FACEBOOK_SETUP.md` for detailed setup instructions
- ConvexAdapter handles user synchronization between NextAuth and Convex

### Testing & Quality
- Run `npm run lint` before committing changes
- Ensure TypeScript strict mode compliance
- Test both authenticated and guest user flows
- Verify role-based access controls

## Business Context

This is an e-commerce application for "Celestial Drakon Aquatics" - a business selling aquarium fish, tanks, and accessories in the Philippines. The application supports:

- Product browsing with detailed fish and tank specifications
- Guest shopping and reservation system
- User registration and Facebook login
- Admin dashboard for inventory and order management
- Real-time notifications and updates via Convex

The codebase was migrated from a React Native application to Next.js while preserving the core business logic and data structures.