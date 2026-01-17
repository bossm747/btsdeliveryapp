# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BTS Delivery is a multi-service delivery platform for Batangas Province, Philippines. It provides food delivery, shopping assistance (Pabili), bill payment (Pabayad), and parcel delivery services.

## Commands

```bash
npm run dev        # Start development server (tsx with hot-reload)
npm run build      # Build for production (Vite + esbuild)
npm run start      # Run production build
npm run check      # TypeScript type checking
npm run db:push    # Push schema changes to database (Drizzle Kit)
```

## Architecture

### Stack
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui (Radix primitives), Wouter routing
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **State**: React Query (server), Zustand (cart), React Context (auth, language)

### Directory Structure
```
client/src/
├── pages/           # Route components organized by role (admin/, customer/, rider/, vendor/, shared/)
├── components/      # UI components (ui/ for shadcn, role-specific subdirs)
├── contexts/        # AuthContext, LanguageContext
├── stores/          # Zustand stores
├── hooks/           # Custom React hooks
├── lib/             # Utilities, queryClient, types

server/
├── index.ts         # Express entry point
├── routes.ts        # All API route definitions
├── db.ts            # Drizzle database connection
├── storage.ts       # Storage abstraction layer
├── middleware/      # Auth, security, rate limiting, validation
├── services/        # Business logic (pricing, payments, notifications)
├── integrations/    # External services (email, SMS, maps, push)

shared/
└── schema.ts        # Drizzle schema (single source of truth for DB types)
```

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

### Role-Based Architecture
Four user roles with dedicated routes and dashboards:
- **customer**: `/customer-dashboard`, `/home`, `/restaurants`, `/cart`, `/pabili`, `/pabayad`, `/parcel`
- **vendor**: `/vendor-dashboard/*` (orders, menu, inventory, earnings, promotions, staff, profile)
- **rider**: `/rider-dashboard`
- **admin**: `/admin/*` (dispatch, analytics, orders, restaurants, users, riders)

Routes are protected via `<ProtectedRoute allowedRoles={[...]}>` wrapper.

### API Pattern
All backend routes are under `/api/*`. Key prefixes:
- `/api/auth/*` - Authentication
- `/api/customer/*`, `/api/vendor/*`, `/api/rider/*`, `/api/admin/*` - Role-specific
- `/api/analytics/*` - Analytics and reporting

### Database
- Schema defined in `shared/schema.ts`
- Migrations output to `./migrations/`
- Requires `DATABASE_URL` environment variable (Neon PostgreSQL connection string)

### Security Middleware Stack
Located in `server/middleware/`. Applied layers include:
- Rate limiting and slow-down
- Helmet security headers
- CORS configuration
- XSS sanitization
- JWT authentication (`authenticateToken`)
- Role verification (`requireRole`, `requireAdmin`, etc.)
- Specialized stacks for auth, payments (PCI compliance, fraud detection), uploads

### Key Services
- `server/services/pricing.ts` - Complex delivery pricing algorithm
- `server/services/nexuspay.ts` - Payment gateway integration
- `server/services/gemini.ts` - Google Gemini AI integration
- `server/services/notification-service.ts` - Multi-channel notifications

### Real-time Features
WebSocket support via `ws` library for live order tracking and rider location updates.
