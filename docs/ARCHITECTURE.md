# BTS Delivery - System Architecture

## Overview

BTS Delivery is a full-stack TypeScript application using a monorepo structure with shared types between frontend and backend.

```
┌─────────────────────────────────────────────────────────────┐
│                     BTS Delivery Platform                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Customer   │  │    Vendor    │  │    Rider     │      │
│  │     App      │  │  Dashboard   │  │     App      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│  ┌──────┴─────────────────┴──────────────────┴───────┐     │
│  │              React Frontend (Vite)                 │     │
│  │     Tailwind CSS • shadcn/ui • React Query        │     │
│  └────────────────────────┬──────────────────────────┘     │
│                           │                                 │
│  ┌────────────────────────┴──────────────────────────┐     │
│  │              Express.js Backend                    │     │
│  │         REST API • WebSocket • Middleware         │     │
│  └───────┬───────────────┬──────────────────┬────────┘     │
│          │               │                  │              │
│  ┌───────┴───────┐ ┌─────┴─────┐  ┌────────┴────────┐     │
│  │  PostgreSQL   │ │ NexusPay  │  │  External APIs  │     │
│  │   (Drizzle)   │ │ Payments  │  │ (Maps, AI, SMS) │     │
│  └───────────────┘ └───────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | UI component library |
| Radix UI | Accessible primitives |
| React Query | Server state management |
| Zustand | Client state (cart) |
| Wouter | Lightweight routing |

### Backend
| Technology | Purpose |
|------------|---------|
| Express.js | HTTP server |
| TypeScript | Type safety |
| Drizzle ORM | Database queries |
| ws | WebSocket server |
| Zod | Schema validation |
| Helmet | Security headers |
| JWT | Authentication |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database |
| Drizzle Kit | Migrations |

### External Services
| Service | Purpose |
|---------|---------|
| NexusPay | Payment processing |
| SendGrid | Email delivery |
| OpenRouter | AI (multi-model) |
| Google Gemini | AI fallback |
| Google Maps | Geocoding & routes |

---

## Directory Structure

```
btsdeliveryapp/
├── client/                 # Frontend application
│   └── src/
│       ├── pages/          # Route components
│       │   ├── admin/      # Admin dashboard pages
│       │   ├── customer/   # Customer pages
│       │   ├── rider/      # Rider pages
│       │   ├── vendor/     # Vendor dashboard pages
│       │   └── shared/     # Shared pages
│       ├── components/     # Reusable components
│       │   ├── ui/         # shadcn/ui components
│       │   ├── admin/      # Admin components
│       │   ├── customer/   # Customer components
│       │   ├── rider/      # Rider components
│       │   └── vendor/     # Vendor components
│       ├── contexts/       # React contexts
│       ├── stores/         # Zustand stores
│       ├── hooks/          # Custom hooks
│       └── lib/            # Utilities
│
├── server/                 # Backend application
│   ├── index.ts            # Express entry point
│   ├── routes.ts           # Main route definitions
│   ├── db.ts               # Database connection
│   ├── storage.ts          # Data access layer
│   ├── swagger.ts          # API documentation
│   ├── middleware/         # Express middleware
│   │   ├── auth.ts         # Authentication
│   │   ├── security.ts     # Security headers
│   │   ├── rateLimiting.ts # Rate limits
│   │   ├── validation.ts   # Input validation
│   │   ├── paymentSecurity.ts # Payment fraud
│   │   ├── fileUpload.ts   # Upload handling
│   │   └── errorHandler.ts # Error handling
│   ├── services/           # Business logic
│   │   ├── ai-assistant.ts # AI chat
│   │   ├── ai-functions.ts # AI function calling
│   │   ├── ai-vision.ts    # Image analysis
│   │   ├── pricing.ts      # Pricing engine
│   │   ├── nexuspay.ts     # Payment gateway
│   │   ├── notification-service.ts
│   │   ├── websocket-manager.ts
│   │   ├── dispatch-service.ts
│   │   ├── fraud-detection.ts
│   │   └── ...
│   ├── routes/             # Modular routes
│   │   ├── analytics.ts
│   │   ├── fraud.ts
│   │   ├── nexuspay.ts
│   │   ├── notifications.ts
│   │   ├── rider-verification.ts
│   │   ├── tax.ts
│   │   └── wallet.ts
│   └── integrations/       # External service clients
│
├── shared/                 # Shared code
│   └── schema.ts           # Drizzle schema (source of truth)
│
├── e2e/                    # Playwright E2E tests
├── migrations/             # Database migrations
├── uploads/                # File uploads (gitignored)
└── docs/                   # Documentation
```

---

## Authentication Architecture

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│  Login  │────▶│  JWT    │────▶│  Store  │
│         │     │ Request │     │ Tokens  │     │ Tokens  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │                               │
     │         ┌─────────────────────┘
     │         ▼
     │    ┌─────────┐     ┌─────────┐
     └───▶│  API    │────▶│  Auth   │
          │ Request │     │ Middle- │
          │ + Token │     │  ware   │
          └─────────┘     └────┬────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
          ┌─────────┐                    ┌─────────┐
          │ Verify  │                    │ Check   │
          │   JWT   │                    │ Session │
          └─────────┘                    └─────────┘
```

### Token Lifecycle
1. **Access Token**: 15-minute expiry, used for API requests
2. **Refresh Token**: 30-day expiry, used to get new access tokens
3. **Session**: Stored in database, validated on each request

### Security Features
- Account lockout after 5 failed attempts (30 min)
- Rate limiting on auth endpoints (10/15min)
- Session invalidation on logout
- Token revocation support

---

## Database Schema Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    users    │────▶│  sessions   │     │  orders     │
│             │     │             │     │             │
│ id          │     │ userId      │     │ customerId  │
│ email       │     │ token       │     │ restaurantId│
│ password    │     │ expiresAt   │     │ riderId     │
│ role        │     └─────────────┘     │ status      │
│ status      │                         │ items       │
└──────┬──────┘                         │ totalAmount │
       │                                └─────────────┘
       │
       ├──────────────┐
       ▼              ▼
┌─────────────┐ ┌─────────────┐
│ restaurants │ │   riders    │
│             │ │             │
│ ownerId     │ │ userId      │
│ name        │ │ vehicleType │
│ address     │ │ isOnline    │
│ isActive    │ │ isVerified  │
└─────────────┘ └─────────────┘
       │
       ▼
┌─────────────┐
│ menu_items  │
│             │
│restaurantId │
│ categoryId  │
│ name        │
│ price       │
└─────────────┘
```

Key tables: `users`, `sessions`, `restaurants`, `menu_items`, `menu_categories`, `orders`, `order_items`, `riders`, `rider_locations`, `payments`, `notifications`, `promotions`, `reviews`

---

## API Architecture

### Route Organization

```
/api
├── /auth/*           # Authentication
├── /restaurants/*    # Restaurant & menu CRUD
├── /orders/*         # Order lifecycle
├── /customer/*       # Customer operations
├── /vendor/*         # Vendor operations
├── /rider/*          # Rider operations
├── /admin/*          # Admin operations
├── /payment/*        # NexusPay integration
├── /pricing/*        # Dynamic pricing
├── /analytics/*      # Reports & stats
├── /notifications/*  # Notification management
├── /wallet/*         # Wallet operations
├── /tax/*            # Tax calculations
├── /fraud/*          # Fraud detection
├── /ai/*             # AI assistant
└── /docs             # Swagger UI
```

### Middleware Stack

```
Request
   │
   ▼
┌─────────────────┐
│  Rate Limiting  │ ◄── General: 1000/15min, Auth: 10/15min
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Security Headers│ ◄── Helmet, CSP, CORS
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Validation   │ ◄── Zod schemas, XSS sanitization
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authentication  │ ◄── JWT verification, session check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Authorization  │ ◄── Role-based access control
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Route Handler  │
└─────────────────┘
```

---

## Real-time Architecture

### WebSocket System

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Client    │◀───▶│ WebSocket Server│◀───▶│   Client    │
│  (Customer) │     │                 │     │   (Rider)   │
└─────────────┘     └────────┬────────┘     └─────────────┘
                             │
                    ┌────────┴────────┐
                    │  Channel Types  │
                    │                 │
                    │ • order:{id}    │
                    │ • rider:{id}    │
                    │ • vendor:{id}   │
                    │ • chat:{id}     │
                    └─────────────────┘
```

### Features
- JWT authentication for sensitive operations
- Heartbeat mechanism (30-second interval)
- Automatic client cleanup (90-second timeout)
- Channel subscription system
- Message broadcasting

---

## Payment Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Customer│────▶│ Create  │────▶│NexusPay │────▶│ Payment │
│ Checkout│     │ Order   │     │   API   │     │  Link   │
└─────────┘     └─────────┘     └─────────┘     └────┬────┘
                                                     │
     ┌───────────────────────────────────────────────┘
     │
     ▼
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Customer│────▶│Complete │────▶│ Webhook │────▶│ Order   │
│  Pays   │     │ Payment │     │ Received│     │Activated│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```

### Security
- HMAC-SHA256 webhook verification
- PCI compliance middleware
- Fraud detection scoring
- Velocity tracking

---

## AI System Architecture

```
┌─────────────┐     ┌─────────────────────┐
│  User Query │────▶│   Agent Router      │
└─────────────┘     │                     │
                    │ Determines best     │
                    │ agent for query     │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │     │   Order     │     │  Vendor     │
│  Support    │     │  Assistant  │     │  Analytics  │
└─────────────┘     └─────────────┘     └─────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Function Calling   │
                    │                     │
                    │ • browse_restaurants│
                    │ • create_order      │
                    │ • get_order_status  │
                    │ • update_delivery   │
                    │ • generate_content  │
                    └─────────────────────┘
```

### Agents
1. **customer_support** - Order issues, complaints
2. **order_assistant** - Order placement/modification
3. **restaurant_finder** - Restaurant recommendations
4. **rider_support** - Rider-specific queries
5. **vendor_analytics** - Business insights
6. **technical_help** - App troubleshooting
7. **creative** - Marketing content
8. **analytical** - Data analysis

---

## Deployment Architecture

### Development
```bash
npm run dev    # Starts Vite + Express (port 5001)
```

### Production
```bash
npm run build  # Vite + esbuild
npm start      # Runs production build
```

### Infrastructure
- **Process Manager**: PM2 recommended
- **Database**: PostgreSQL with connection pooling
- **File Storage**: Local `/uploads` directory
- **Logs**: `/logs` directory

---

## Security Architecture

### Defense Layers

1. **Network Level**
   - CORS restrictions
   - Rate limiting
   - Request size limits

2. **Application Level**
   - Input validation (Zod)
   - XSS sanitization
   - SQL injection prevention (parameterized queries)
   - CSRF protection

3. **Authentication Level**
   - JWT with short expiry
   - Session validation
   - Account lockout
   - Password hashing (bcrypt)

4. **Authorization Level**
   - Role-based access control
   - Resource ownership verification
   - Admin action audit logging

5. **Payment Level**
   - Fraud scoring
   - PCI compliance
   - Webhook verification
   - Amount validation

---

*Last Updated: January 2025*
