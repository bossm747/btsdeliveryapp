# BTS Delivery API Documentation

## Overview

The BTS Delivery API is a RESTful service providing endpoints for food delivery, shopping assistance (Pabili), bill payment (Pabayad), and parcel delivery services.

## 📖 Interactive Documentation

**Swagger UI is available at:** `/api/docs`

When the development server is running, visit:
- **Local**: http://localhost:5001/api/docs
- **Production**: https://api.btsdelivery.ph/api/docs

The Swagger documentation includes:
- Complete endpoint reference
- Request/response schemas
- Authentication requirements
- Live API testing

---

## Base URL

```
Development: http://localhost:5001/api
Production:  https://api.btsdelivery.ph/api
```

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Lifecycle
- **Access tokens**: Expire in 15 minutes
- **Refresh tokens**: Expire in 30 days
- Use `POST /api/auth/refresh` to get new access tokens

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get tokens |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/verify-email` | Verify email address |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

---

## Rate Limiting

The API implements rate limiting to protect against abuse:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General | 1,000 requests | 15 minutes |
| Authentication | 10 attempts | 15 minutes |
| Password Reset | 3 attempts | 1 hour |
| Order Creation | 5 orders | 1 minute |
| File Uploads | 50 uploads | 15 minutes |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Role-Based Access Control

Endpoints are protected based on user roles:

| Role | Description |
|------|-------------|
| `public` | No authentication required |
| `customer` | Registered customers |
| `vendor` | Restaurant/vendor owners |
| `rider` | Delivery riders |
| `admin` | Administrators |

---

## API Sections

### Core Endpoints

| Prefix | Description |
|--------|-------------|
| `/api/auth/*` | Authentication & sessions |
| `/api/restaurants/*` | Restaurant & menu management |
| `/api/orders/*` | Order lifecycle |
| `/api/customer/*` | Customer operations |
| `/api/vendor/*` | Vendor operations |
| `/api/rider/*` | Rider operations |
| `/api/admin/*` | Admin operations |

### Service Endpoints

| Prefix | Description |
|--------|-------------|
| `/api/payment/*` | Payment processing (NexusPay) |
| `/api/pricing/*` | Dynamic pricing calculation |
| `/api/pabili/*` | Shopping service |
| `/api/pabayad/*` | Bill payment service |
| `/api/parcel/*` | Parcel delivery service |

### Feature Endpoints

| Prefix | Description |
|--------|-------------|
| `/api/analytics/*` | Analytics & reporting |
| `/api/notifications/*` | Notification management |
| `/api/wallet/*` | Wallet operations |
| `/api/tax/*` | Tax calculations & reporting |
| `/api/fraud/*` | Fraud detection |
| `/api/ai/*` | AI assistant & vision |
| `/api/routing/*` | Map routing, geocoding, delivery estimates |

---

## Routing API (Public)

The Routing API provides map routing, geocoding, and delivery estimation endpoints. These are **public endpoints** that don't require authentication, enabling map functionality without exposing API keys to the client.

**Provider:** OpenRouteService (primary), Google Maps (fallback)

### Routing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/routing/directions` | Calculate route between two points |
| POST | `/api/routing/distance-matrix` | Calculate distances for multiple destinations |
| POST | `/api/routing/geocode` | Convert address to coordinates |
| POST | `/api/routing/reverse-geocode` | Convert coordinates to address |
| GET | `/api/routing/provider` | Get current maps provider info |
| POST | `/api/routing/delivery-estimate` | Get delivery fee and time estimate |
| POST | `/api/routing/check-delivery-zone` | Check if location is within delivery zone |

### Example: Calculate Route

```bash
curl -X POST http://localhost:5001/api/routing/directions \
  -H "Content-Type: application/json" \
  -d '{
    "origin": { "lat": 13.7565, "lng": 121.0583 },
    "destination": { "lat": 13.7465, "lng": 121.0683 }
  }'
```

Response:
```json
{
  "success": true,
  "route": {
    "distance": 2498,
    "duration": 373,
    "polyline": "ey}rAue{aV...",
    "distanceKm": "2.50",
    "durationMinutes": 7
  },
  "provider": "OpenRouteService"
}
```

### Example: Delivery Estimate

```bash
curl -X POST http://localhost:5001/api/routing/delivery-estimate \
  -H "Content-Type: application/json" \
  -d '{
    "origin": { "lat": 13.7565, "lng": 121.0583 },
    "destination": { "lat": 13.7465, "lng": 121.0683 },
    "preparationTime": 20
  }'
```

Response:
```json
{
  "success": true,
  "estimate": {
    "distance": 2498,
    "distanceKm": "2.50",
    "deliveryFee": 49,
    "estimatedTime": 27,
    "travelTime": 7,
    "preparationTime": 20
  },
  "provider": "OpenRouteService"
}
```

### Example: Geocode (Address to Coordinates)

```bash
curl -X POST http://localhost:5001/api/routing/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "Batangas City, Philippines"}'
```

Response:
```json
{
  "success": true,
  "location": {
    "lat": 13.7567,
    "lng": 121.0584,
    "address": "Batangas City, BT, Philippines"
  },
  "provider": "OpenRouteService"
}
```

### Example: Reverse Geocode (Coordinates to Address)

```bash
curl -X POST http://localhost:5001/api/routing/reverse-geocode \
  -H "Content-Type: application/json" \
  -d '{"lat": 13.7565, "lng": 121.0583}'
```

Response:
```json
{
  "success": true,
  "address": "Street Name, Barangay, Batangas City, BT, Philippines",
  "location": {
    "lat": 13.7565,
    "lng": 121.0583
  },
  "provider": "OpenRouteService"
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": []
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## WebSocket API

Real-time features use WebSocket connections for:
- Live order tracking
- Rider location updates
- Customer-rider chat
- Order notifications

See [WebSocket Frontend Guide](./WEBSOCKET_FRONTEND_GUIDE.md) for implementation details.

---

## Webhooks

### NexusPay Payment Webhooks

```
POST /api/payment/webhook
```

Webhook payloads are verified using HMAC-SHA256 signatures.

---

*For complete endpoint documentation, visit the [Swagger UI](/api/docs)*
