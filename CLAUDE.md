# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BTS Delivery is a multi-service delivery platform for Batangas Province, Philippines. It provides food delivery, shopping assistance (Pabili), bill payment (Pabayad), and parcel delivery services.

## Commands

```bash
# Development
npm run dev        # Start development server (tsx with hot-reload, port 5001)
npm run build      # Build for production (Vite + esbuild)
npm run start      # Run production build
npm run check      # TypeScript type checking

# Database
npm run db:push    # Push schema changes to database (Drizzle Kit)

# Testing (Playwright E2E)
npm run test           # Run all E2E tests headless
npm run test:headed    # Run tests with browser visible
npm run test:ui        # Open Playwright UI mode
npm run test:report    # View test report
```

## Architecture

### Stack
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui (Radix primitives), Wouter routing
- **Backend**: Express.js, TypeScript, WebSocket (ws)
- **Database**: PostgreSQL with Drizzle ORM
- **State**: React Query (server state), Zustand (cart), React Context (auth, language)

### Directory Structure
```
client/src/
├── pages/           # Route components by role (admin/, customer/, rider/, vendor/, shared/)
├── components/      # UI components (ui/ for shadcn, role-specific subdirs)
├── contexts/        # AuthContext, LanguageContext
├── stores/          # Zustand stores (cart-store.ts)
├── hooks/           # Custom React hooks
├── lib/             # Utilities, queryClient, types

server/
├── index.ts         # Express entry point with WebSocket setup
├── routes.ts        # All API route definitions
├── db.ts            # Drizzle database connection with pool config
├── storage.ts       # Database storage abstraction layer
├── middleware/      # Auth, security, rate limiting, validation, payments
├── services/        # Business logic (pricing, payments, notifications, chat)
├── integrations/    # External services (email, SMS, maps, push)
├── routes/          # Modular route files (nexuspay, wallet, tax, fraud, etc.)

shared/
└── schema.ts        # Drizzle schema (single source of truth for DB types)

e2e/                 # Playwright E2E tests
```

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets/*` → `./attached_assets/*`

### Role-Based Architecture
Four user roles with dedicated routes and dashboards:
- **customer**: `/customer-dashboard`, `/home`, `/restaurants`, `/cart`, `/pabili`, `/pabayad`, `/parcel`
- **vendor**: `/vendor-dashboard/*` (orders, menu, inventory, earnings, promotions, staff, profile)
- **rider**: `/rider-dashboard`
- **admin**: `/admin/*` (dispatch, analytics, orders, restaurants, users, riders)

Routes are protected via `<ProtectedRoute allowedRoles={[...]}>` wrapper component.

### API Pattern
All backend routes are under `/api/*`. Key prefixes:
- `/api/auth/*` - Authentication (login, register, password reset)
- `/api/customer/*`, `/api/vendor/*`, `/api/rider/*`, `/api/admin/*` - Role-specific endpoints
- `/api/analytics/*` - Analytics and reporting
- `/api/routing/*` - Map routing, geocoding, delivery estimates (public, no auth)
- `/api/docs` - **Swagger UI** (interactive API documentation)

### API Documentation
Swagger UI is available at `/api/docs` when the server is running. It provides:
- Complete endpoint reference with schemas
- Request/response examples
- Live API testing capability
- Authentication flow documentation

### Database
- Schema defined in `shared/schema.ts` (large file, use grep to find specific tables)
- Migrations output to `./migrations/`
- Connection pool: max 20 connections, 30s query timeout
- Requires `DATABASE_URL` environment variable

### Security Middleware Stack
Located in `server/middleware/`. Key middleware configurations in `index.ts`:
- `securityMiddlewareConfig.basic` - All routes (rate limiting, headers, CORS, XSS sanitization)
- `securityMiddlewareConfig.auth` - Login/register (stricter rate limits, account lockout)
- `securityMiddlewareConfig.payment` - Payment routes (PCI compliance, fraud detection)
- `securityMiddlewareConfig.upload` - File uploads (50MB limit)

Auth middleware: `authenticateToken`, `requireRole`, `requireAdmin`, `requireAdminOrVendor`, `requireAdminOrRider`

### Key Services
- `server/services/pricing.ts` - Delivery pricing algorithm with distance, surge, vehicle type factors
- `server/services/nexuspay.ts` - NexusPay payment gateway integration
- `server/services/gemini.ts` - Google Gemini AI integration
- `server/services/notification-service.ts` - Multi-channel notifications (email, SMS, push)
- `server/services/chat-service.ts` - Real-time customer-rider messaging
- `server/services/websocket-manager.ts` - WebSocket connection management
- `server/services/fraud-detection.ts` - Transaction fraud scoring and alerts
- `server/services/audit-logger.ts` - Admin action audit logging
- `server/services/cache-service.ts` - Query result caching
- `server/services/dispatch-service.ts` - Rider assignment and batching
- `server/services/financial-analytics.ts` - Revenue and commission analytics
- `server/services/refund-service.ts` - Order refund processing
- `server/integrations/maps.ts` - Maps service (OpenRouteService primary, Google Maps fallback)
- `server/integrations/openrouteservice.ts` - OpenRouteService client for routing
- `server/routes/routing.ts` - Public routing API endpoints

### Map & Tracking Components
Frontend uses Leaflet (free) with OpenStreetMap tiles:
- `client/src/lib/leaflet-utils.ts` - Shared utilities, markers, polyline decoder
- `client/src/components/shared/leaflet-tracking-map.tsx` - Order tracking for customers
- `client/src/components/shared/leaflet-live-tracking-map.tsx` - Multi-order tracking for admin/vendor
- `client/src/components/rider/leaflet-rider-map-tracking.tsx` - Rider navigation and delivery tracking
- `client/src/components/shared/location-picker.tsx` - Interactive location picker with GPS auto-detect
- `client/src/hooks/use-current-location.ts` - Hook for GPS detection and reverse geocoding

### Location Picker Component
The `LocationPicker` component provides interactive location selection:
- **GPS Auto-detect**: Uses browser Geolocation API to detect current position
- **Map Selection**: Click anywhere on map to select location
- **Drag Marker**: Fine-tune location by dragging the marker
- **Address Search**: Search for addresses with forward geocoding
- **Auto-fill**: Automatically populates address fields via reverse geocoding
- **Coordinates Storage**: Saves lat/lng with addresses for precise delivery

Usage in address forms:
```tsx
import LocationPicker from "@/components/shared/location-picker";
import { useCurrentLocation } from "@/hooks";

<LocationPicker
  value={locationValue}
  onChange={handleLocationChange}
  autoDetect={false}
  showSearch={true}
  height="200px"
  markerType="customer"
/>
```

### Real-time Features
WebSocket server runs alongside Express for:
- Live order tracking
- Rider location updates
- Customer-rider chat

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (required, no fallback)
- `PUBLIC_APP_URL` - Public URL for webhooks and emails
- `SENDGRID_API_KEY` - Email service (optional)
- `NEXUSPAY_*` - Payment gateway credentials
- `OPENROUTE_API_KEY` - OpenRouteService API key for routing (free tier: 2,000 req/day)

### AI Service Configuration
- `OPENROUTER_API_KEY` - OpenRouter API key (primary AI provider, multi-model access)
- `GEMINI_API_KEY` - Google Gemini API key (fallback)

**Available Models via OpenRouter:**
- `google/gemini-3-flash-preview` - Text generation (default)
- `xiaomi/mimo-v2-flash:free` - Free smart model
- `openai/gpt-oss-120b` - Capable model
- `google/gemini-2.5-flash-image` - Image generation

---

## AI Assistant System (2026-01-18)

### Overview
The BTS Delivery AI Assistant is an intelligent, multi-agent system that helps customers, riders, and vendors. It speaks in authentic **Batangas Tagalog dialect** mixed with English (Taglish).

### Key Features

#### 1. Agent-Based Query Routing
Different agents handle different query types:
- `customer_support` - Help with orders, tracking, complaints
- `order_assistant` - Help place/modify orders
- `restaurant_finder` - Find restaurants, recommend food
- `rider_support` - Rider-specific queries
- `vendor_analytics` - Business insights, sales analysis
- `technical_help` - App usage, troubleshooting
- `creative` - Marketing, content generation
- `analytical` - Data analysis, predictions

#### 2. Function Calling
The AI can perform real actions for authenticated users:

**Customer Functions:**
- `browse_restaurants` - List available restaurants
- `get_restaurant_menu` - Get menu with categories and items
- `search_menu_items` - Search for dishes across restaurants
- `create_order` - Place a new order
- `get_order_status` - Check order status
- `get_customer_orders` - List user's orders
- `cancel_order` - Cancel an order
- `apply_promo_code` - Validate and apply promo codes
- `get_saved_addresses` - Retrieve saved delivery addresses

**Rider Functions:**
- `get_rider_assignments` - List assigned deliveries
- `get_delivery_details` - Get full order details for delivery
- `update_delivery_status` - Update order status
- `get_delivery_route` - Get pickup and delivery coordinates

**Vendor Functions:**
- `get_vendor_orders` - List restaurant orders
- `update_order_status` - Update order preparation status
- `create_menu_item` - Add new menu item (with AI image generation)
- `update_menu_item` - Modify existing item
- `create_menu_category` - Add menu category
- `create_promotion` - Create discount/promo
- `generate_menu_content` - AI-generate descriptions, images, promo text

#### 3. File Upload & AI Vision
- **Endpoint:** `POST /api/ai/chat-with-upload`
- Supports image uploads (JPEG, PNG, GIF, WebP) and PDFs
- AI vision analyzes images using OpenRouter/Gemini
- **Menu Analysis:** Can extract menu items from photos and auto-create in database
- Files saved to `/uploads/images/ai-uploads/`

#### 4. Login Awareness
- Uses `optionalAuthenticateToken` middleware
- Anonymous users: Can browse, get info, but prompted to login for actions
- Authenticated users: Full function calling enabled
- Response includes `isLoggedIn` flag for client awareness

### API Endpoints

```
POST /api/ai/chat-support
  - Main AI chat endpoint
  - Body: { query, userRole, userId?, orderId?, restaurantId?, riderId?, conversationHistory? }
  - Returns: { response, suggestedActions, agent, model, functionsExecuted, isLoggedIn }

POST /api/ai/chat-with-upload
  - Chat with file/image uploads
  - FormData: files[], query, userRole, userId?, restaurantId?, action?
  - Actions: "analyze" (analyze only), "create-menu" (analyze + create items)
  - Returns: { success, files[], response, functionsExecuted, isLoggedIn }

POST /api/ai/analyze-menu
  - Analyze menu image
  - FormData: menuImage, restaurantId?, createItems?
  - Returns: { success, analysis, imageUrl, menuCreated? }
```

### Key Files
- `server/services/ai-assistant.ts` - Main AI assistant with agent routing
- `server/services/ai-functions.ts` - Function definitions and execution
- `server/services/ai-vision.ts` - Image analysis and menu extraction
- `server/services/local-storage.ts` - File upload storage
- `client/src/components/ai-chat-interface.tsx` - Rich chat UI component

### Batangas Dialect
The AI uses authentic Batangas expressions:
- "Ala eh!" - Emphasis/agreement
- "Geh/Ge" - Okay (instead of "sige")
- "Ga" - Question particle ("Gusto mo ga?")
- "Anung" - What (instead of "ano")
- "Ara" - Here/there
- "'Di ba ga?" - Isn't it? (Batangas style)

---

## Frontend Module Enhancement Pattern (2026-01-18)

Each role-based module (customer, vendor, rider, admin) follows a consistent enhancement pattern with dedicated components for better UX:

### Module Structure
```
client/src/components/{role}/
├── index.ts                    # Centralized exports
├── {role}-page-wrapper.tsx     # ErrorBoundary + pull-to-refresh wrapper
├── {role}-empty-states.tsx     # Pre-built empty state components
├── {role}-skeletons.tsx        # Loading skeleton components

client/src/hooks/
├── use-{role}-toast.tsx        # Role-specific toast notifications
├── use-pull-to-refresh.ts      # Pull-to-refresh hook (shared)
├── index.ts                    # Hook exports
```

### Available Modules

**Customer Module** (`client/src/components/customer/`):
- `CustomerPageWrapper` - Page wrapper with pull-to-refresh
- `CustomerEmptyState` - Generic empty state component
- `useCustomerToast` - Toast notifications (order placed, cancelled, etc.)
- UI components: `PromoBannerCarousel`, `CategoryPills`, `FlashDealsSection`, `TrendingSection`, `FeaturedCarousel`

**Vendor Module** (`client/src/components/vendor/`):
- `VendorPageWrapper` - Error boundary + pull-to-refresh
- Empty states: `NoOrdersEmptyState`, `NoMenuItemsEmptyState`, `NoPromotionsEmptyState`, etc.
- `VendorOverviewSkeleton`, `VendorOrdersSkeleton`, `VendorMenuSkeleton`
- `useVendorToast` - 30+ toast methods (orderReceived, menuItemAdded, promotionCreated, etc.)

**Rider Module** (`client/src/components/rider/`):
- `RiderPageWrapper` - Error boundary + pull-to-refresh
- Empty states: `NoActiveDeliveriesEmptyState`, `NoAvailableOrdersEmptyState`, `NoEarningsEmptyState`, etc.
- `RiderDashboardSkeleton`, `RiderDeliverySkeleton`, `RiderEarningsSkeleton`
- `useRiderToast` - 35+ toast methods with Taglish/Batangas dialect (deliveryAccepted, pickupCompleted, etc.)

**Admin Module** (`client/src/components/admin/`):
- `AdminPageWrapper` - Error boundary + pull-to-refresh + accessibility
- 30+ empty states: `NoOrdersEmptyState`, `NoUsersEmptyState`, `NoFraudAlertsEmptyState`, `UnderDevelopmentEmptyState`, etc.
- 15+ skeletons: `AdminDashboardSkeleton`, `AdminTableSkeleton`, `AdminFinancialSkeleton`, `AdminFraudSkeleton`, etc.
- `useAdminToast` - 50+ toast methods (restaurantApproved, riderVerified, orderAssigned, fraudAlertConfirmed, etc.)

### Usage Pattern
```tsx
import { RolePageWrapper, NoOrdersEmptyState, OrdersSkeleton } from "@/components/{role}";
import { useRoleToast } from "@/hooks";

function MyPage() {
  const roleToast = useRoleToast();

  // Show contextual toast
  roleToast.orderReceived("ORD-123");

  return (
    <RolePageWrapper refreshQueryKeys={["/api/orders"]}>
      {isLoading ? <OrdersSkeleton /> : orders.length === 0 ? <NoOrdersEmptyState /> : <OrderList />}
    </RolePageWrapper>
  );
}
```

### Key Features
- **ErrorBoundary**: Automatic crash recovery with user-friendly error display
- **Pull-to-Refresh**: Mobile-friendly data refresh with visual feedback
- **Query Invalidation**: Automatic React Query cache refresh on pull
- **Accessibility**: Skip links, ARIA labels, screen reader announcements
- **Skeleton Loaders**: Matching loading states for each page layout
- **Empty States**: Contextual illustrations with optional CTA buttons
- **Toast Hooks**: Pre-defined, consistent notification messages per role

---

## VPS Deployment

### Production Setup
```bash
# Build for production
npm run build

# Start production server (port 5001)
NODE_ENV=production npm start
```

### Required Directories
- `./uploads/` - File uploads (images, documents)
- `./logs/` - Application logs

### Process Management
Use PM2 or systemd for production process management:
```bash
pm2 start npm --name "bts-delivery" -- start
```
