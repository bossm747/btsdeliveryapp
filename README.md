# 🛵 BTS Delivery App

A comprehensive multi-service delivery platform for Batangas Province, Philippines.

## 🚀 Features

- **Food Delivery** - Restaurant ordering and delivery
- **Pabili Service** - Personal shopping assistance
- **Pabayad Service** - Bill payment service
- **Parcel Delivery** - Package delivery service

### Platform Capabilities

- 👥 **Multi-Role System** - Customer, Vendor, Rider, Admin dashboards
- 💳 **Payment Integration** - NexusPay (GCash, Maya, Banking, OTC)
- 📍 **Real-time Tracking** - WebSocket-based live updates
- 🤖 **AI Assistant** - Intelligent chat with function calling
- 📊 **Analytics** - Comprehensive business intelligence
- 🔒 **Security** - PCI-compliant, fraud detection, rate limiting

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd btsdeliveryapp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## 📦 Commands

```bash
# Development
npm run dev          # Start dev server (port 5001)
npm run build        # Build for production
npm start            # Run production build
npm run check        # TypeScript type checking

# Database
npm run db:push      # Push schema changes

# Testing
npm run test         # Run E2E tests (headless)
npm run test:headed  # Run tests with browser
npm run test:ui      # Open Playwright UI
npm run test:report  # View test report
```

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript, WebSocket (ws) |
| Database | PostgreSQL, Drizzle ORM |
| Payments | NexusPay |
| AI | OpenRouter, Google Gemini |
| Testing | Playwright |

## 📁 Project Structure

```
btsdeliveryapp/
├── client/           # React frontend
│   └── src/
│       ├── pages/    # Route components (by role)
│       ├── components/
│       ├── contexts/
│       ├── stores/
│       └── hooks/
├── server/           # Express backend
│   ├── middleware/   # Auth, security, validation
│   ├── services/     # Business logic
│   └── routes/       # API routes
├── shared/           # Shared types (schema.ts)
├── e2e/              # Playwright tests
└── docs/             # Documentation
```

## 🔐 Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

### Optional
```env
PUBLIC_APP_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com

# Payments
NEXUSPAY_MERCHANT_ID=
NEXUSPAY_KEY=
NEXUSPAY_WEBHOOK_SECRET=

# Email
SENDGRID_API_KEY=

# AI
OPENROUTER_API_KEY=
GEMINI_API_KEY=

# Maps
GOOGLE_MAPS_API_KEY=
```

## 📚 Documentation

- [API Documentation](./docs/API.md) - REST API reference
- [Features List](./docs/FEATURES.md) - Complete feature list
- [Architecture](./docs/ARCHITECTURE.md) - System design
- [CLAUDE.md](./CLAUDE.md) - Developer reference

**Swagger UI** available at `/api/docs` when server is running.

## 🧪 Testing

```bash
# Run all E2E tests
npm run test

# Run with browser visible
npm run test:headed

# Interactive UI mode
npm run test:ui
```

## 🚢 Deployment

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start
```

### Recommended Setup
- Use PM2 for process management
- Configure reverse proxy (nginx)
- Set up SSL certificates
- Enable database backups

## 📊 API Documentation

Interactive API documentation available at:
- **Development**: http://localhost:5001/api/docs
- **Production**: https://api.btsdelivery.ph/api/docs

## 🛡️ Security Features

- JWT authentication with short expiry
- Account lockout after failed attempts
- Rate limiting on all endpoints
- CORS origin restrictions
- Content Security Policy
- PCI-compliant payment handling
- Fraud detection scoring
- File upload validation

## 📞 Support

For issues and feature requests, please use the issue tracker.

---

**BTS Delivery** - Serving Batangas Province 🇵🇭

*Built with ❤️ in the Philippines*
