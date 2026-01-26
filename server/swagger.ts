import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express, Request, Response } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'BTS Delivery App API',
    version: '1.0.0',
    description: `
# BTS Delivery App API Documentation

Complete REST API documentation for the BTS Delivery application serving Batangas Province, Philippines.

## Overview
BTS Delivery is a comprehensive delivery platform offering:
- **Food Delivery** - Restaurant food ordering and delivery
- **Pabili Service** - Personal shopping service
- **Pabayad Service** - Bill payment service  
- **Parcel Delivery** - Package delivery service

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

### Token Lifecycle
- Access tokens expire in **15 minutes**
- Refresh tokens expire in **30 days**
- Use \`/api/auth/refresh\` to get new access tokens

## Rate Limiting
- Standard endpoints: 100 requests/minute
- Authentication endpoints: 10 requests/minute
- Payment endpoints: 30 requests/minute

## Role-Based Access Control
Endpoints are protected based on user roles:
- **Public** - No authentication required
- **Authenticated** - Any logged-in user
- **Customer** - Customer role only
- **Vendor** - Vendor/restaurant owner role
- **Rider** - Delivery rider role
- **Admin** - Administrator role

Look for the \`x-roles\` field in each endpoint to see required roles.

## Error Responses
All errors follow this format:
\`\`\`json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [] // Validation errors if applicable
}
\`\`\`

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions for this action |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Request validation failed |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
    `,
    contact: {
      name: 'BTS Delivery Support',
      email: 'support@btsdelivery.ph',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Development server',
    },
    {
      url: 'https://api.btsdelivery.ph',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Users',
      description: 'User profile and account management',
    },
    {
      name: 'Restaurants',
      description: 'Restaurant and menu management',
    },
    {
      name: 'Orders',
      description: 'Order creation, tracking, and management',
    },
    {
      name: 'Payments',
      description: 'Payment processing and methods',
    },
    {
      name: 'Pricing',
      description: 'Dynamic pricing and fee calculations',
    },
    {
      name: 'Riders',
      description: 'Rider operations, deliveries, and earnings',
    },
    {
      name: 'Vendors',
      description: 'Vendor/restaurant management operations',
    },
    {
      name: 'Admin',
      description: 'Administrative operations',
    },
    {
      name: 'Services',
      description: 'Pabili, Pabayad, and Parcel services',
    },
    {
      name: 'Tracking',
      description: 'Real-time order and rider tracking',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    schemas: {
      // ==================== COMMON SCHEMAS ====================
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Error message' },
          code: { type: 'string', description: 'Error code' },
          errors: {
            type: 'array',
            items: { type: 'object' },
            description: 'Validation errors',
          },
        },
      },
      Coordinates: {
        type: 'object',
        properties: {
          lat: { type: 'number', example: 13.7565 },
          lng: { type: 'number', example: 121.0583 },
        },
      },
      Address: {
        type: 'object',
        properties: {
          street: { type: 'string', example: '123 Rizal Street' },
          barangay: { type: 'string', example: 'Poblacion' },
          city: { type: 'string', example: 'Batangas City' },
          province: { type: 'string', example: 'Batangas' },
          zipCode: { type: 'string', example: '4200' },
          landmark: { type: 'string', example: 'Near SM Batangas' },
          coordinates: { $ref: '#/components/schemas/Coordinates' },
        },
      },

      // ==================== USER SCHEMAS ====================
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', example: '+639123456789' },
          firstName: { type: 'string', example: 'Juan' },
          lastName: { type: 'string', example: 'Dela Cruz' },
          role: {
            type: 'string',
            enum: ['customer', 'vendor', 'rider', 'admin'],
          },
          status: {
            type: 'string',
            enum: ['active', 'pending', 'suspended', 'inactive'],
          },
          profileImageUrl: { type: 'string', format: 'uri' },
          emailVerifiedAt: { type: 'string', format: 'date-time' },
          onboardingCompleted: { type: 'boolean' },
          onboardingStep: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'role'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 6, example: 'securepassword123' },
          firstName: { type: 'string', example: 'Juan' },
          lastName: { type: 'string', example: 'Dela Cruz' },
          phone: { type: 'string', example: '+639123456789' },
          role: {
            type: 'string',
            enum: ['customer', 'vendor', 'rider'],
            default: 'customer',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string', description: 'JWT access token' },
          refreshToken: { type: 'string', description: 'JWT refresh token' },
          expiresIn: { type: 'integer', description: 'Token expiry in seconds', example: 900 },
          requiresEmailVerification: { type: 'boolean' },
          onboardingStep: { type: 'string' },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },

      // ==================== RESTAURANT SCHEMAS ====================
      Restaurant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ownerId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Lomi King' },
          description: { type: 'string' },
          category: { type: 'string', example: 'Filipino Food' },
          logoUrl: { type: 'string', format: 'uri' },
          imageUrl: { type: 'string', format: 'uri' },
          address: { $ref: '#/components/schemas/Address' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          operatingHours: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                open: { type: 'string', example: '08:00' },
                close: { type: 'string', example: '22:00' },
                isClosed: { type: 'boolean' },
              },
            },
          },
          deliveryFee: { type: 'number', example: 49.00 },
          minimumOrder: { type: 'number', example: 100.00 },
          estimatedDeliveryTime: { type: 'integer', example: 30 },
          isActive: { type: 'boolean' },
          isFeatured: { type: 'boolean' },
          isAcceptingOrders: { type: 'boolean' },
          rating: { type: 'number', example: 4.5 },
          totalOrders: { type: 'integer' },
          totalReviews: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      MenuCategory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          restaurantId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Main Dishes' },
          description: { type: 'string' },
          imageUrl: { type: 'string', format: 'uri' },
          displayOrder: { type: 'integer' },
          isActive: { type: 'boolean' },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          restaurantId: { type: 'string', format: 'uuid' },
          categoryId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Lomi Special' },
          description: { type: 'string' },
          price: { type: 'number', example: 150.00 },
          compareAtPrice: { type: 'number', example: 180.00 },
          isAvailable: { type: 'boolean' },
          imageUrl: { type: 'string', format: 'uri' },
          preparationTime: { type: 'integer', example: 15 },
          tags: { type: 'array', items: { type: 'string' } },
          allergens: { type: 'array', items: { type: 'string' } },
          stockQuantity: { type: 'integer' },
          rating: { type: 'number' },
        },
      },

      // ==================== ORDER SCHEMAS ====================
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          quantity: { type: 'integer' },
          modifiers: { type: 'array', items: { type: 'object' } },
          specialInstructions: { type: 'string' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orderNumber: { type: 'string', example: 'BTS-2024-123456' },
          customerId: { type: 'string', format: 'uuid' },
          restaurantId: { type: 'string', format: 'uuid' },
          riderId: { type: 'string', format: 'uuid' },
          orderType: {
            type: 'string',
            enum: ['food', 'pabili', 'pabayad', 'parcel'],
          },
          status: {
            type: 'string',
            enum: [
              'payment_pending',
              'pending',
              'confirmed',
              'preparing',
              'ready',
              'picked_up',
              'in_transit',
              'delivered',
              'completed',
              'cancelled',
            ],
          },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
          },
          subtotal: { type: 'string', example: '350.00' },
          deliveryFee: { type: 'string', example: '49.00' },
          serviceFee: { type: 'string', example: '25.00' },
          tax: { type: 'string', example: '42.00' },
          tip: { type: 'string', example: '20.00' },
          discount: { type: 'string', example: '50.00' },
          totalAmount: { type: 'string', example: '436.00' },
          paymentMethod: { type: 'string', enum: ['cash', 'gcash', 'maya', 'card'] },
          paymentStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
          },
          deliveryAddress: { $ref: '#/components/schemas/Address' },
          specialInstructions: { type: 'string' },
          scheduledFor: { type: 'string', format: 'date-time' },
          estimatedDeliveryTime: { type: 'string', format: 'date-time' },
          actualDeliveryTime: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateOrderRequest: {
        type: 'object',
        required: ['customerId', 'restaurantId', 'items', 'deliveryAddress'],
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          restaurantId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
          },
          deliveryAddress: { $ref: '#/components/schemas/Address' },
          paymentMethod: { type: 'string', default: 'cash' },
          specialInstructions: { type: 'string' },
          scheduledFor: { type: 'string', format: 'date-time' },
          promoCode: { type: 'string' },
          tip: { type: 'number' },
        },
      },
      OrderTracking: {
        type: 'object',
        properties: {
          order: { $ref: '#/components/schemas/Order' },
          tracking: {
            type: 'object',
            properties: {
              currentStatus: { type: 'string' },
              stages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    label: { type: 'string' },
                    icon: { type: 'string' },
                  },
                },
              },
              currentStageIndex: { type: 'integer' },
              events: { type: 'array', items: { type: 'object' } },
              isCompleted: { type: 'boolean' },
            },
          },
          rider: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phone: { type: 'string' },
              vehicleType: { type: 'string' },
              vehiclePlate: { type: 'string' },
              rating: { type: 'number' },
            },
          },
          riderLocation: { $ref: '#/components/schemas/Coordinates' },
          eta: {
            type: 'object',
            properties: {
              estimatedArrival: { type: 'string', format: 'date-time' },
              estimatedMinutes: { type: 'integer' },
            },
          },
        },
      },

      // ==================== PAYMENT SCHEMAS ====================
      CreatePaymentRequest: {
        type: 'object',
        required: ['amount', 'orderId'],
        properties: {
          amount: { type: 'number', minimum: 0.01, maximum: 500000 },
          currency: { type: 'string', default: 'php' },
          orderId: { type: 'string', format: 'uuid' },
          paymentProvider: { type: 'string', enum: ['nexuspay'], default: 'nexuspay' },
          paymentMethodType: { type: 'string', example: 'gcash' },
          orderType: { type: 'string', enum: ['food', 'pabili', 'pabayad', 'parcel'] },
          serviceFees: {
            type: 'object',
            properties: {
              deliveryFee: { type: 'number' },
              serviceFee: { type: 'number' },
              processingFee: { type: 'number' },
              tip: { type: 'number' },
              tax: { type: 'number' },
            },
          },
        },
      },
      PaymentResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          paymentProvider: { type: 'string' },
          paymentLink: { type: 'string', format: 'uri' },
          transactionId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
        },
      },
      PaymentMethod: {
        type: 'object',
        properties: {
          provider: { type: 'string', example: 'nexuspay' },
          type: { type: 'string', example: 'gcash' },
          name: { type: 'string', example: 'GCash' },
          description: { type: 'string' },
          category: { type: 'string', example: 'ewallet' },
          icon: { type: 'string' },
          enabled: { type: 'boolean' },
        },
      },

      // ==================== PRICING SCHEMAS ====================
      PricingRequest: {
        type: 'object',
        required: ['orderType', 'baseAmount'],
        properties: {
          orderType: { type: 'string', enum: ['food', 'pabili', 'pabayad', 'parcel'] },
          baseAmount: { type: 'number', minimum: 0.01 },
          coordinates: { $ref: '#/components/schemas/Coordinates' },
          city: { type: 'string', example: 'Batangas City' },
          distance: { type: 'number', description: 'Distance in km' },
          weight: { type: 'number', description: 'Weight in kg' },
          vehicleType: { type: 'string', enum: ['motorcycle', 'bicycle', 'car', 'truck'] },
          paymentMethod: { type: 'string', enum: ['cash', 'gcash', 'maya', 'card', 'bank_transfer'] },
          isInsured: { type: 'boolean' },
          isExpress: { type: 'boolean' },
          loyaltyPoints: { type: 'integer' },
          promoCode: { type: 'string' },
          tip: { type: 'number' },
        },
      },
      PricingResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          pricing: {
            type: 'object',
            properties: {
              baseAmount: { type: 'number' },
              finalTotal: { type: 'number' },
              breakdown: {
                type: 'object',
                properties: {
                  baseDeliveryFee: { type: 'number' },
                  distanceFee: { type: 'number' },
                  surgeFee: { type: 'number' },
                  totalDeliveryFee: { type: 'number' },
                },
              },
              discounts: { type: 'object' },
              surgeInfo: {
                type: 'object',
                properties: {
                  isActive: { type: 'boolean' },
                  multiplier: { type: 'number' },
                },
              },
            },
          },
          calculatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // ==================== RIDER SCHEMAS ====================
      Rider: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          vehicleType: { type: 'string', enum: ['motorcycle', 'bicycle', 'car', 'truck'] },
          licenseNumber: { type: 'string' },
          vehiclePlate: { type: 'string' },
          isOnline: { type: 'boolean' },
          isVerified: { type: 'boolean' },
          currentLocation: { $ref: '#/components/schemas/Coordinates' },
          rating: { type: 'number' },
          totalDeliveries: { type: 'integer' },
          earningsBalance: { type: 'number' },
        },
      },
      RiderLocation: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
          heading: { type: 'number' },
          speed: { type: 'number' },
          accuracy: { type: 'number' },
          orderId: { type: 'string', format: 'uuid' },
          activityType: {
            type: 'string',
            enum: ['idle', 'en_route_pickup', 'at_pickup', 'en_route_delivery', 'at_delivery'],
          },
        },
      },
      RiderEarnings: {
        type: 'object',
        properties: {
          today: { type: 'number' },
          thisWeek: { type: 'number' },
          thisMonth: { type: 'number' },
          trips: { type: 'integer' },
          tips: { type: 'number' },
          bonus: { type: 'number' },
          completionRate: { type: 'number' },
          acceptanceRate: { type: 'number' },
        },
      },
      BatchOffer: {
        type: 'object',
        properties: {
          batchId: { type: 'string' },
          batchNumber: { type: 'string' },
          orderCount: { type: 'integer' },
          totalEarnings: { type: 'number' },
          totalDistance: { type: 'number' },
          estimatedTime: { type: 'integer' },
          expiresAt: { type: 'string', format: 'date-time' },
          orders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                orderNumber: { type: 'string' },
                restaurantName: { type: 'string' },
              },
            },
          },
        },
      },

      // ==================== VENDOR SCHEMAS ====================
      VendorDashboard: {
        type: 'object',
        properties: {
          todayOrders: { type: 'integer' },
          todayRevenue: { type: 'number' },
          pendingOrders: { type: 'integer' },
          averageRating: { type: 'number' },
          recentOrders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
        },
      },
      VendorSettlement: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          settlementNumber: { type: 'string' },
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd: { type: 'string', format: 'date-time' },
          grossAmount: { type: 'number' },
          commissionAmount: { type: 'number' },
          commissionRate: { type: 'number' },
          netAmount: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'approved', 'processing', 'paid', 'disputed'] },
        },
      },

      // ==================== SERVICE SCHEMAS ====================
      PabiliRequest: {
        type: 'object',
        required: ['items', 'estimatedBudget', 'deliveryAddress'],
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'integer' },
                notes: { type: 'string' },
              },
            },
          },
          estimatedBudget: { type: 'number' },
          deliveryAddress: { type: 'string' },
          specialInstructions: { type: 'string' },
        },
      },
      PabayRequest: {
        type: 'object',
        required: ['billType', 'accountNumber', 'amount'],
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          billType: { type: 'string', example: 'Electric' },
          accountNumber: { type: 'string' },
          amount: { type: 'number' },
          dueDate: { type: 'string', format: 'date' },
          contactNumber: { type: 'string' },
        },
      },
      ParcelRequest: {
        type: 'object',
        required: ['sender', 'receiver', 'packageSize'],
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          sender: { $ref: '#/components/schemas/Address' },
          receiver: { $ref: '#/components/schemas/Address' },
          packageSize: { type: 'string', enum: ['small', 'medium', 'large', 'xlarge'] },
          itemDescription: { type: 'string' },
          itemValue: { type: 'number' },
          specialInstructions: { type: 'string' },
        },
      },

      // ==================== ADMIN SCHEMAS ====================
      AdminStats: {
        type: 'object',
        properties: {
          totalUsers: { type: 'integer' },
          totalOrders: { type: 'integer' },
          totalRevenue: { type: 'number' },
          activeRiders: { type: 'integer' },
          activeVendors: { type: 'integer' },
          pendingApprovals: { type: 'integer' },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required or token expired',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'Authentication required', code: 'UNAUTHORIZED' },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'Insufficient permissions', code: 'FORBIDDEN' },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'Resource not found', code: 'NOT_FOUND' },
          },
        },
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              errors: [{ field: 'email', message: 'Invalid email format' }],
            },
          },
        },
      },
    },
  },
  paths: {
    // ==================== AUTHENTICATION ====================
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Create a new user account. Email verification is required before login.',
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              example: {
                email: 'juan.delacruz@email.com',
                password: 'SecurePass123!',
                firstName: 'Juan',
                lastName: 'Dela Cruz',
                phone: '+639171234567',
                role: 'customer'
              }
            },
          },
        },
        responses: {
          201: {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: {
                  message: 'Account created successfully! Please check your email to verify your account.',
                  user: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    email: 'juan.delacruz@email.com',
                    firstName: 'Juan',
                    lastName: 'Dela Cruz',
                    role: 'customer',
                    status: 'pending'
                  },
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  expiresIn: 900,
                  requiresEmailVerification: true,
                  onboardingStep: 'personal_info'
                }
              },
            },
          },
          400: { 
            $ref: '#/components/responses/ValidationError',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate user and receive JWT tokens. Account must be verified.',
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: {
                email: 'juan.delacruz@email.com',
                password: 'SecurePass123!'
              }
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: {
                  message: 'Login successful',
                  user: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    email: 'juan.delacruz@email.com',
                    firstName: 'Juan',
                    lastName: 'Dela Cruz',
                    role: 'customer',
                    status: 'active'
                  },
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  expiresIn: 900
                }
              },
            },
          },
          401: {
            description: 'Invalid credentials or unverified email',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  invalidCredentials: {
                    summary: 'Invalid credentials',
                    value: { message: 'Invalid email or password' }
                  },
                  emailNotVerified: {
                    summary: 'Email not verified',
                    value: { 
                      message: 'Please verify your email address before logging in.',
                      requiresEmailVerification: true 
                    }
                  },
                  accountSuspended: {
                    summary: 'Account suspended',
                    value: { message: 'Account is suspended or inactive' }
                  }
                }
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Retrieve the authenticated user\'s profile.',
        'x-roles': ['customer', 'vendor', 'rider', 'admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Invalidate current session.',
        'x-roles': ['customer', 'vendor', 'rider', 'admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                },
                example: { message: 'Logged out successfully' }
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Get a new access token using a refresh token. The refresh token is rotated for security.',
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Token refreshed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify email address',
        description: 'Verify user email with token sent via email.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: { token: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Email verified successfully',
          },
          400: {
            description: 'Invalid or expired token',
          },
        },
      },
    },
    '/api/auth/resend-verification': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend verification email',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Verification email sent' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request password reset',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Reset email sent if account exists' },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: { type: 'string' },
                  newPassword: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset successful' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },

    // ==================== RESTAURANTS ====================
    '/api/restaurants': {
      get: {
        tags: ['Restaurants'],
        summary: 'List all restaurants',
        description: 'Get all active restaurants. Can filter by city.',
        'x-roles': ['public'],
        parameters: [
          {
            name: 'city',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by city (e.g., "Batangas City")',
          },
        ],
        responses: {
          200: {
            description: 'List of restaurants',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Restaurant' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Restaurants'],
        summary: 'Create a restaurant',
        description: 'Register a new restaurant. Requires vendor role.',
        'x-roles': ['vendor', 'admin'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Restaurant' },
            },
          },
        },
        responses: {
          201: {
            description: 'Restaurant created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Restaurant' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/restaurants/{id}': {
      get: {
        tags: ['Restaurants'],
        summary: 'Get restaurant by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Restaurant details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Restaurant' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/restaurants/{id}/categories': {
      get: {
        tags: ['Restaurants'],
        summary: 'Get menu categories',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Menu categories',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MenuCategory' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Restaurants'],
        summary: 'Create menu category',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MenuCategory' },
            },
          },
        },
        responses: {
          201: { description: 'Category created' },
        },
      },
    },
    '/api/restaurants/{id}/menu': {
      get: {
        tags: ['Restaurants'],
        summary: 'Get menu items',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Menu items',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MenuItem' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Restaurants'],
        summary: 'Create menu item',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MenuItem' },
            },
          },
        },
        responses: {
          201: { description: 'Menu item created' },
        },
      },
    },
    '/api/search/restaurants': {
      get: {
        tags: ['Restaurants'],
        summary: 'Search restaurants',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query' },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Restaurant' },
                },
              },
            },
          },
        },
      },
    },

    // ==================== ORDERS ====================
    '/api/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List orders',
        description: 'List orders filtered by customer or restaurant. Admins can see all orders.',
        'x-roles': ['customer', 'vendor', 'admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { 
            name: 'customerId', 
            in: 'query', 
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by customer ID'
          },
          { 
            name: 'restaurantId', 
            in: 'query', 
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by restaurant ID (for vendors)'
          },
        ],
        responses: {
          200: {
            description: 'List of orders',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Order' },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      post: {
        tags: ['Orders'],
        summary: 'Create order',
        description: `Create a new order. 

**Payment Flow:**
- For COD (Cash on Delivery): Order starts in \`pending\` status, vendor notified immediately
- For online payments: Order starts in \`payment_pending\` status, vendor notified after payment confirmed

**Pre-order Scheduling:**
- \`scheduledFor\` must be at least 1 hour from now
- Maximum 48 hours in advance`,
        'x-roles': ['customer'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOrderRequest' },
              example: {
                customerId: '550e8400-e29b-41d4-a716-446655440000',
                restaurantId: '550e8400-e29b-41d4-a716-446655440001',
                items: [
                  {
                    id: 'menu-item-1',
                    name: 'Lomi Special',
                    price: 150.00,
                    quantity: 2,
                    modifiers: [
                      { name: 'Extra Egg', price: 20 }
                    ]
                  },
                  {
                    id: 'menu-item-2', 
                    name: 'Iced Tea',
                    price: 35.00,
                    quantity: 2
                  }
                ],
                deliveryAddress: {
                  street: '123 Rizal Street',
                  barangay: 'Poblacion',
                  city: 'Batangas City',
                  province: 'Batangas',
                  zipCode: '4200',
                  landmark: 'Near SM Batangas',
                  coordinates: { lat: 13.7565, lng: 121.0583 }
                },
                paymentMethod: 'gcash',
                specialInstructions: 'Extra sauce on the side please',
                tip: 20
              }
            },
          },
        },
        responses: {
          201: {
            description: 'Order created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' },
                example: {
                  id: '550e8400-e29b-41d4-a716-446655440002',
                  orderNumber: 'BTS-2024-123456',
                  status: 'payment_pending',
                  totalAmount: '436.00',
                  createdAt: '2024-01-15T10:30:00Z'
                }
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Order details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Update order status',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
                  },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated' },
        },
      },
    },
    '/api/orders/{id}/tracking': {
      get: {
        tags: ['Tracking'],
        summary: 'Get order tracking',
        description: 'Get comprehensive tracking information including rider location, ETA, and status history.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Tracking information',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderTracking' },
              },
            },
          },
        },
      },
    },
    '/api/orders/{orderId}/modify': {
      patch: {
        tags: ['Orders'],
        summary: 'Modify order',
        description: 'Modify an order within the 2-minute modification window.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
                  specialInstructions: { type: 'string' },
                  deliveryAddress: { $ref: '#/components/schemas/Address' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Order modified' },
          400: { description: 'Modification window expired' },
        },
      },
    },
    '/api/orders/{orderId}/can-modify': {
      get: {
        tags: ['Orders'],
        summary: 'Check if order can be modified',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Modification status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    canModify: { type: 'boolean' },
                    remainingSeconds: { type: 'integer' },
                    expiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/orders/{orderId}/payment-status': {
      get: {
        tags: ['Orders'],
        summary: 'Get order payment status',
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Payment status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    orderId: { type: 'string' },
                    orderStatus: { type: 'string' },
                    paymentStatus: { type: 'string' },
                    isPaymentPending: { type: 'boolean' },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== PAYMENTS ====================
    '/api/payment/create': {
      post: {
        tags: ['Payments'],
        summary: 'Create payment',
        description: `Create a payment intent and get payment link via NexusPay.

**Supported Payment Methods:**
- GCash
- Maya (PayMaya)
- BPI, BDO, UnionBank (Online Banking)
- 7-Eleven, Cebuana, MLhuillier (Over-the-Counter)

**Flow:**
1. Create payment → Get payment link
2. Redirect customer to payment link
3. Customer completes payment
4. Webhook notifies success → Order activated`,
        'x-roles': ['customer'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePaymentRequest' },
              example: {
                amount: 436.00,
                currency: 'php',
                orderId: '550e8400-e29b-41d4-a716-446655440001',
                paymentProvider: 'nexuspay',
                paymentMethodType: 'gcash',
                orderType: 'food',
                serviceFees: {
                  deliveryFee: 49,
                  serviceFee: 25,
                  tax: 42
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: 'Payment created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentResponse' },
                example: {
                  success: true,
                  paymentProvider: 'nexuspay',
                  paymentLink: 'https://pay.nexuspay.ph/checkout/abc123',
                  transactionId: 'NXP-2024-123456',
                  amount: 436.00,
                  currency: 'PHP'
                }
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/payment/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Payment webhook',
        description: `Webhook endpoint for NexusPay payment callbacks. **Called by payment provider, not users.**

**Webhook Events:**
- \`success/paid\`: Payment completed → Order activated, vendor notified
- \`failed/declined\`: Payment failed → Order cancelled if payment_pending
- \`canceled/cancelled\`: Payment cancelled → Inventory released

Webhook signature is verified via \`X-NexusPay-Signature\` header.`,
        'x-roles': ['webhook'],
        requestBody: {
          content: {
            'application/json': {
              schema: { 
                type: 'object',
                properties: {
                  transactionId: { type: 'string' },
                  status: { type: 'string', enum: ['success', 'paid', 'failed', 'declined', 'canceled', 'cancelled'] },
                  amount: { type: 'string' },
                  orderId: { type: 'string' }
                }
              },
              example: {
                transactionId: 'NXP-2024-123456',
                status: 'success',
                amount: '436.00',
                orderId: '550e8400-e29b-41d4-a716-446655440001'
              }
            },
          },
        },
        responses: {
          200: { 
            description: 'Webhook processed',
            content: {
              'application/json': {
                example: { received: true }
              }
            }
          },
        },
      },
    },
    '/api/payment/confirm/{orderId}': {
      post: {
        tags: ['Payments'],
        summary: 'Confirm payment manually',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Payment confirmed' },
        },
      },
    },
    '/api/payment/status/{transactionId}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment status',
        parameters: [
          {
            name: 'transactionId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Payment status' },
        },
      },
    },
    '/api/payment/methods/available': {
      get: {
        tags: ['Payments'],
        summary: 'Get available payment methods',
        responses: {
          200: {
            description: 'Payment methods',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    methods: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PaymentMethod' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/payment/refund': {
      post: {
        tags: ['Payments'],
        summary: 'Process refund',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['paymentIntentId', 'orderId'],
                properties: {
                  paymentIntentId: { type: 'string' },
                  orderId: { type: 'string', format: 'uuid' },
                  amount: { type: 'number' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Refund processed' },
        },
      },
    },

    // ==================== PRICING ====================
    '/api/pricing/calculate': {
      post: {
        tags: ['Pricing'],
        summary: 'Calculate pricing',
        description: 'Calculate comprehensive pricing with fees, discounts, and commissions.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PricingRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Pricing calculation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PricingResponse' },
              },
            },
          },
        },
      },
    },
    '/api/pricing/estimate': {
      post: {
        tags: ['Pricing'],
        summary: 'Get pricing estimate',
        description: 'Get pricing estimate before placing order (no auth required).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PricingRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Pricing estimate' },
        },
      },
    },
    '/api/pricing/surge-status': {
      get: {
        tags: ['Pricing'],
        summary: 'Get surge pricing status',
        parameters: [
          {
            name: 'coordinates',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'JSON encoded coordinates',
          },
          { name: 'serviceType', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Surge status' },
        },
      },
    },
    '/api/pricing/zones': {
      get: {
        tags: ['Pricing'],
        summary: 'Get pricing zone',
        parameters: [
          {
            name: 'coordinates',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Zone information' },
        },
      },
    },

    // ==================== RIDER ENDPOINTS ====================
    '/api/rider/profile': {
      get: {
        tags: ['Riders'],
        summary: 'Get rider profile',
        description: 'Get the authenticated rider\'s profile with stats. **Rider only.**',
        'x-roles': ['rider'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Rider profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Rider' },
                example: {
                  id: '550e8400-e29b-41d4-a716-446655440000',
                  name: 'Pedro Santos',
                  vehicleType: 'motorcycle',
                  licenseNumber: 'N01-12-345678',
                  vehiclePlate: 'ABC 1234',
                  rating: 4.8,
                  totalDeliveries: 523,
                  earningsBalance: 2500.50,
                  isOnline: true,
                  isVerified: true
                }
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/rider/status': {
      patch: {
        tags: ['Riders'],
        summary: 'Update rider online status',
        description: 'Go online/offline to start/stop receiving orders. **Rider only.**',
        'x-roles': ['rider'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isOnline: { type: 'boolean' },
                  currentLocation: { $ref: '#/components/schemas/Coordinates' },
                },
              },
              example: {
                isOnline: true,
                currentLocation: { lat: 13.7565, lng: 121.0583 }
              }
            },
          },
        },
        responses: {
          200: { 
            description: 'Status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    isOnline: { type: 'boolean' },
                    riderId: { type: 'string' }
                  }
                }
              }
            }
          },
        },
      },
    },
    '/api/rider/location': {
      post: {
        tags: ['Riders'],
        summary: 'Update rider location',
        description: `Real-time location update for tracking. Should be called frequently (every 5-10 seconds) during active deliveries. **Rider only.**
        
Location data is broadcast via WebSocket to:
- Customers tracking their orders
- Vendors monitoring pickups
- Admin dashboard`,
        'x-roles': ['rider'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RiderLocation' },
              example: {
                lat: 13.7565,
                lng: 121.0583,
                heading: 45.5,
                speed: 25.3,
                accuracy: 10,
                orderId: '550e8400-e29b-41d4-a716-446655440001',
                activityType: 'en_route_delivery'
              }
            },
          },
        },
        responses: {
          200: { 
            description: 'Location updated and broadcast',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    locationId: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/rider/available-orders': {
      get: {
        tags: ['Riders'],
        summary: 'Get available orders',
        description: 'Get orders available for rider to accept.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Available orders',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Order' },
                },
              },
            },
          },
        },
      },
    },
    '/api/rider/orders/{orderId}/accept': {
      post: {
        tags: ['Riders'],
        summary: 'Accept order',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Order accepted' },
        },
      },
    },
    '/api/rider/orders/{orderId}/reject': {
      post: {
        tags: ['Riders'],
        summary: 'Reject/skip order',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Order rejected' },
        },
      },
    },
    '/api/rider/deliveries/active': {
      get: {
        tags: ['Riders'],
        summary: 'Get active deliveries',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Active deliveries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Order' },
                },
              },
            },
          },
        },
      },
    },
    '/api/rider/deliveries/history': {
      get: {
        tags: ['Riders'],
        summary: 'Get delivery history',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Delivery history',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Order' },
                },
              },
            },
          },
        },
      },
    },
    '/api/rider/earnings': {
      get: {
        tags: ['Riders'],
        summary: 'Get rider earnings',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Earnings summary',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RiderEarnings' },
              },
            },
          },
        },
      },
    },
    '/api/rider/performance': {
      get: {
        tags: ['Riders'],
        summary: 'Get rider performance',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Performance metrics' },
        },
      },
    },
    '/api/rider/batch-offers': {
      get: {
        tags: ['Riders'],
        summary: 'Get batch order offers',
        description: 'Get available batch delivery offers for optimized routes.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Batch offers',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/BatchOffer' },
                },
              },
            },
          },
        },
      },
    },
    '/api/rider/batch-preview/{batchId}': {
      get: {
        tags: ['Riders'],
        summary: 'Preview batch details',
        parameters: [
          {
            name: 'batchId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
        ],
        responses: {
          200: { description: 'Batch preview' },
        },
      },
    },
    '/api/rider/batch/{batchId}/accept': {
      post: {
        tags: ['Riders'],
        summary: 'Accept batch',
        parameters: [
          {
            name: 'batchId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderIds: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Batch accepted' },
        },
      },
    },
    '/api/rider/optimize-route': {
      post: {
        tags: ['Riders'],
        summary: 'Optimize delivery route',
        description: 'AI-powered route optimization for multiple deliveries.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  deliveries: { type: 'array', items: { type: 'object' } },
                  currentLocation: { $ref: '#/components/schemas/Coordinates' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Optimized route' },
        },
      },
    },
    '/api/rider/payout': {
      post: {
        tags: ['Riders'],
        summary: 'Request payout',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['riderId', 'amount', 'accountNumber', 'name', 'paymentMethod'],
                properties: {
                  riderId: { type: 'string' },
                  amount: { type: 'number' },
                  accountNumber: { type: 'string' },
                  name: { type: 'string' },
                  paymentMethod: { type: 'string', enum: ['gcash', 'maya'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Payout initiated' },
        },
      },
    },

    // ==================== SERVICES ====================
    '/api/pabili': {
      post: {
        tags: ['Services'],
        summary: 'Create pabili order',
        description: `**Pabili (Personal Shopping) Service**

Customer provides a shopping list and budget. A rider will:
1. Go to the specified store/market
2. Purchase items on the list
3. Deliver to customer

Fees:
- Service fee: ₱50
- Delivery fee: ₱49 (may vary by distance)`,
        'x-roles': ['customer', 'public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PabiliRequest' },
              example: {
                customerId: '550e8400-e29b-41d4-a716-446655440000',
                items: [
                  { name: 'Rice (5kg)', quantity: 1, notes: 'Any brand is fine' },
                  { name: 'Eggs', quantity: 1, notes: 'Tray of 30' },
                  { name: 'Cooking oil', quantity: 2, notes: 'Palm oil, 1L bottles' }
                ],
                estimatedBudget: 850,
                deliveryAddress: '123 Rizal Street, Poblacion, Batangas City',
                specialInstructions: 'Please get from Puregold near the plaza'
              }
            },
          },
        },
        responses: {
          201: { 
            description: 'Order created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          },
        },
      },
    },
    '/api/pabayad': {
      post: {
        tags: ['Services'],
        summary: 'Create pabayad order',
        description: `**Pabayad (Bill Payment) Service**

Customer provides bill details. A rider will:
1. Receive payment from customer
2. Go to payment center
3. Pay the bill
4. Return receipt to customer

Service fee: ₱25`,
        'x-roles': ['customer', 'public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PabayRequest' },
              example: {
                customerId: '550e8400-e29b-41d4-a716-446655440000',
                billType: 'MERALCO',
                accountNumber: '1234567890',
                amount: 2500.50,
                dueDate: '2024-01-31',
                contactNumber: '+639171234567'
              }
            },
          },
        },
        responses: {
          201: { 
            description: 'Order created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          },
        },
      },
    },
    '/api/parcel': {
      post: {
        tags: ['Services'],
        summary: 'Create parcel order',
        description: `**Parcel Delivery Service**

Send packages anywhere within Batangas Province.

Package sizes and rates:
- **Small** (up to 3kg, fits in shoebox): ₱60
- **Medium** (up to 10kg, small balikbayan box): ₱100
- **Large** (up to 20kg, large balikbayan box): ₱150
- **XLarge** (up to 50kg, appliances): ₱250`,
        'x-roles': ['customer', 'public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ParcelRequest' },
              example: {
                customerId: '550e8400-e29b-41d4-a716-446655440000',
                sender: {
                  street: '123 Rizal Street',
                  barangay: 'Poblacion',
                  city: 'Batangas City',
                  province: 'Batangas'
                },
                receiver: {
                  street: '456 Mabini Street',
                  barangay: 'Balagtas',
                  city: 'Lipa City',
                  province: 'Batangas'
                },
                packageSize: 'medium',
                itemDescription: 'Documents and small electronics',
                itemValue: 5000,
                specialInstructions: 'Fragile, handle with care'
              }
            },
          },
        },
        responses: {
          201: { 
            description: 'Order created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          },
        },
      },
    },

    // ==================== ADMIN ENDPOINTS ====================
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users',
        description: 'Get a list of all registered users. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Users list',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/admin/restaurants': {
      get: {
        tags: ['Admin'],
        summary: 'List all restaurants',
        description: 'Get a list of all restaurants including pending approval. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Restaurants list',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Restaurant' },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'List all orders',
        description: 'Get a list of all orders across the platform. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Orders list',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Order' },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/admin/riders': {
      get: {
        tags: ['Admin'],
        summary: 'List all riders',
        description: 'Get a list of all riders including pending verification. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Riders list',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Rider' },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/admin/riders/online': {
      get: {
        tags: ['Admin'],
        summary: 'Get online riders',
        description: 'Get all riders currently online for real-time monitoring. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { 
            description: 'Online riders list',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Rider' },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/admin/restaurants/{id}/approve': {
      patch: {
        tags: ['Admin'],
        summary: 'Approve restaurant',
        description: 'Approve a restaurant application, making it visible to customers. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Restaurant ID to approve'
          },
        ],
        responses: {
          200: { 
            description: 'Restaurant approved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Restaurant' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/admin/riders/{id}/verify': {
      patch: {
        tags: ['Admin'],
        summary: 'Verify rider',
        description: 'Verify a rider after document review, allowing them to accept orders. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Rider ID to verify'
          },
        ],
        responses: {
          200: { 
            description: 'Rider verified',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Rider' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },

    // ==================== CONFIG ====================
    '/api/config/public': {
      get: {
        tags: ['Config'],
        summary: 'Get public configuration',
        description: 'Get public app configuration including payment providers, features, and service fees.',
        responses: {
          200: {
            description: 'Public configuration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    config: {
                      type: 'object',
                      properties: {
                        googleMapsApiKey: { type: 'string' },
                        googleMapsEnabled: { type: 'boolean' },
                        appName: { type: 'string' },
                        appVersion: { type: 'string' },
                        features: { type: 'object' },
                        paymentProviders: { type: 'object' },
                        serviceFees: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: [], // We're defining paths inline
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Serve swagger documentation
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin-bottom: 20px }
        .swagger-ui .info .title { font-size: 2.5em; font-weight: bold; color: #3b82f6; }
        .swagger-ui .info .description { margin-top: 10px; }
      `,
      customSiteTitle: 'BTS Delivery API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    })
  );

  // Serve raw swagger JSON
  app.get('/api/docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('[Swagger] API documentation available at /api/docs');
}

export { swaggerSpec };
