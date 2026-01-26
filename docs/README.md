# BTS Delivery App Documentation

**BTS Delivery** is a comprehensive multi-service delivery platform serving Batangas Province, Philippines.

## 📚 Documentation Index

### Getting Started
- [Main README](../README.md) - Project overview, setup, and commands
- [CLAUDE.md](../CLAUDE.md) - Developer reference guide

### API Documentation
- [API Reference](./API.md) - REST API overview and Swagger docs
- **Swagger UI**: Available at `/api/docs` when server is running

### Features & Architecture
- [Features List](./FEATURES.md) - Complete list of implemented features
- [Architecture Overview](./ARCHITECTURE.md) - System design and tech stack

### Component Guides
- [Vendor Components Guide](./VENDOR_COMPONENTS_GUIDE.md) - Vendor dashboard components
- [WebSocket Frontend Guide](./WEBSOCKET_FRONTEND_GUIDE.md) - Real-time features implementation

### Code Quality Reports
- [Code Review Report](./CODE_REVIEW_REPORT.md) - Security audit and recommendations
- [Pareng Boyong Review](./PARENG_BOYONG_REVIEW.md) - AI code review summary
- [Codebase Cleanup Report](./CODEBASE_CLEANUP_REPORT.md) - Code organization notes

---

## Quick Links

| Resource | Description |
|----------|-------------|
| [Swagger Docs](http://localhost:5001/api/docs) | Interactive API documentation |
| [Development Server](http://localhost:5001) | Local dev environment |
| [Playwright UI](http://localhost:5001) | E2E test runner (`npm run test:ui`) |

---

## Tech Stack Summary

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript, WebSocket (ws)
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: NexusPay integration (GCash, Maya, Banking, OTC)
- **AI**: OpenRouter (multi-model), Google Gemini
- **Real-time**: WebSocket for live tracking and chat

---

*Last Updated: January 2025*
