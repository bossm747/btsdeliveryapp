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
    {
      name: 'Analytics',
      description: 'Platform analytics and reporting (Admin)',
    },
    {
      name: 'Notifications',
      description: 'Push notifications and notification management',
    },
    {
      name: 'Vendor Onboarding',
      description: 'Vendor registration and KYC verification',
    },
    {
      name: 'Routing',
      description: 'Map routing, geocoding, and delivery estimation (public endpoints)',
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

      // ==================== ANALYTICS SCHEMAS ====================
      AnalyticsOrderSummary: {
        type: 'object',
        properties: {
          totalOrders: { type: 'integer', example: 1250 },
          completedOrders: { type: 'integer', example: 1150 },
          cancelledOrders: { type: 'integer', example: 50 },
          pendingOrders: { type: 'integer', example: 50 },
          averageOrderValue: { type: 'number', example: 285.50 },
          totalRevenue: { type: 'number', example: 356875.00 },
          completionRate: { type: 'number', example: 92.0 },
        },
      },
      AnalyticsRevenueSummary: {
        type: 'object',
        properties: {
          totalRevenue: { type: 'number', example: 356875.00 },
          deliveryFees: { type: 'number', example: 61250.00 },
          serviceFees: { type: 'number', example: 31250.00 },
          commissions: { type: 'number', example: 35687.50 },
          netRevenue: { type: 'number', example: 128187.50 },
          growth: {
            type: 'object',
            properties: {
              percentage: { type: 'number', example: 15.5 },
              trend: { type: 'string', enum: ['up', 'down', 'stable'] },
            },
          },
        },
      },
      AnalyticsDashboard: {
        type: 'object',
        properties: {
          orders: { $ref: '#/components/schemas/AnalyticsOrderSummary' },
          revenue: { $ref: '#/components/schemas/AnalyticsRevenueSummary' },
          users: {
            type: 'object',
            properties: {
              totalUsers: { type: 'integer' },
              newUsers: { type: 'integer' },
              activeUsers: { type: 'integer' },
              byRole: {
                type: 'object',
                properties: {
                  customers: { type: 'integer' },
                  vendors: { type: 'integer' },
                  riders: { type: 'integer' },
                },
              },
            },
          },
          riders: {
            type: 'object',
            properties: {
              totalRiders: { type: 'integer' },
              activeRiders: { type: 'integer' },
              averageDeliveryTime: { type: 'number' },
              averageRating: { type: 'number' },
            },
          },
          restaurants: {
            type: 'object',
            properties: {
              totalRestaurants: { type: 'integer' },
              activeRestaurants: { type: 'integer' },
              topPerformers: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      AnalyticsRealtime: {
        type: 'object',
        properties: {
          orders: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              pending: { type: 'integer' },
              preparing: { type: 'integer' },
              inDelivery: { type: 'integer' },
              delivered: { type: 'integer' },
              cancelled: { type: 'integer' },
            },
          },
          revenue: { type: 'number' },
          activeRiders: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },

      // ==================== NOTIFICATION SCHEMAS ====================
      NotificationPreferences: {
        type: 'object',
        properties: {
          emailNotifications: { type: 'boolean', example: true },
          smsNotifications: { type: 'boolean', example: true },
          pushNotifications: { type: 'boolean', example: true },
          orderUpdates: { type: 'boolean', example: true },
          promotionalEmails: { type: 'boolean', example: false },
          restaurantUpdates: { type: 'boolean', example: true },
          loyaltyRewards: { type: 'boolean', example: true },
          securityAlerts: { type: 'boolean', example: true },
          weeklyDigest: { type: 'boolean', example: false },
          quietHoursStart: { type: 'string', example: '22:00' },
          quietHoursEnd: { type: 'string', example: '08:00' },
        },
      },
      PushSubscription: {
        type: 'object',
        required: ['subscription'],
        properties: {
          subscription: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', format: 'uri' },
              keys: {
                type: 'object',
                properties: {
                  p256dh: { type: 'string' },
                  auth: { type: 'string' },
                },
              },
            },
          },
        },
      },
      NotificationCampaign: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Weekend Promo' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['promotional', 'announcement', 'alert'] },
          channels: { type: 'array', items: { type: 'string', enum: ['email', 'sms', 'push'] } },
          targetAudience: {
            type: 'object',
            properties: {
              roles: { type: 'array', items: { type: 'string' } },
              locations: { type: 'array', items: { type: 'string' } },
            },
          },
          templateData: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              imageUrl: { type: 'string', format: 'uri' },
              ctaText: { type: 'string' },
              ctaUrl: { type: 'string', format: 'uri' },
            },
          },
          status: { type: 'string', enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'] },
          scheduledFor: { type: 'string', format: 'date-time' },
          totalRecipients: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ==================== VENDOR KYC SCHEMAS ====================
      VendorRegistrationRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'phone', 'password', 'businessName', 'businessType', 'businessAddress'],
        properties: {
          firstName: { type: 'string', example: 'Maria' },
          lastName: { type: 'string', example: 'Santos' },
          email: { type: 'string', format: 'email', example: 'maria@lomiking.ph' },
          phone: { type: 'string', example: '+639171234567' },
          password: { type: 'string', minLength: 6 },
          businessName: { type: 'string', example: 'Lomi King Batangas' },
          businessType: {
            type: 'string',
            enum: ['restaurant', 'food_stall', 'catering', 'bakery', 'grocery', 'convenience_store', 'other'],
          },
          businessAddress: { $ref: '#/components/schemas/Address' },
          businessCategory: { type: 'string', example: 'Filipino Food' },
          businessDescription: { type: 'string' },
        },
      },
      VendorOnboardingStatus: {
        type: 'object',
        properties: {
          currentStep: { type: 'string', enum: ['kyc_documents', 'bank_account', 'review', 'completed'] },
          kycStatus: { type: 'string', enum: ['not_started', 'in_progress', 'pending_review', 'approved', 'rejected'] },
          kycSubmittedAt: { type: 'string', format: 'date-time' },
          kycReviewedAt: { type: 'string', format: 'date-time' },
          kycRejectionReason: { type: 'string' },
          requiredDocuments: { type: 'array', items: { type: 'string' } },
          submittedDocuments: { type: 'array', items: { type: 'string' } },
          bankAccountAdded: { type: 'boolean' },
          bankAccountVerified: { type: 'boolean' },
          businessProfileComplete: { type: 'boolean' },
          isOnboardingComplete: { type: 'boolean' },
          onboardingCompletedAt: { type: 'string', format: 'date-time' },
        },
      },
      VendorKycDocument: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          docType: {
            type: 'string',
            enum: ['business_permit', 'dti_registration', 'sec_registration', 'bir_registration', 'mayors_permit', 'sanitary_permit', 'food_handler_certificate', 'valid_id', 'proof_of_address', 'other'],
          },
          documentUrl: { type: 'string', format: 'uri' },
          documentName: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          rejectionReason: { type: 'string' },
          expiryDate: { type: 'string', format: 'date' },
          verifiedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      VendorBankAccount: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          bankName: { type: 'string', example: 'BDO' },
          bankCode: { type: 'string' },
          accountName: { type: 'string', example: 'Maria Santos' },
          accountNumber: { type: 'string', example: '****5678' },
          accountType: { type: 'string', enum: ['savings', 'checking'] },
          branchName: { type: 'string' },
          isDefault: { type: 'boolean' },
          isVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      VendorKycUploadRequest: {
        type: 'object',
        required: ['docType', 'documentUrl'],
        properties: {
          docType: {
            type: 'string',
            enum: ['business_permit', 'dti_registration', 'sec_registration', 'bir_registration', 'mayors_permit', 'sanitary_permit', 'food_handler_certificate', 'valid_id', 'proof_of_address', 'other'],
          },
          documentUrl: { type: 'string', format: 'uri' },
          documentName: { type: 'string' },
          expiryDate: { type: 'string', format: 'date' },
        },
      },
      BankAccountRequest: {
        type: 'object',
        required: ['bankName', 'accountName', 'accountNumber'],
        properties: {
          bankName: { type: 'string', example: 'BDO' },
          bankCode: { type: 'string' },
          accountName: { type: 'string', example: 'Maria Santos' },
          accountNumber: { type: 'string', example: '1234567890' },
          accountType: { type: 'string', enum: ['savings', 'checking'], default: 'savings' },
          branchName: { type: 'string' },
          branchCode: { type: 'string' },
          isDefault: { type: 'boolean' },
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

    // ==================== ANALYTICS ENDPOINTS ====================
    '/api/analytics/orders/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Get order analytics summary',
        description: 'Get order summary statistics including totals, completion rates, and averages. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start date for analytics period' },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'End date for analytics period' },
        ],
        responses: {
          200: {
            description: 'Order analytics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/AnalyticsOrderSummary' },
                    period: {
                      type: 'object',
                      properties: {
                        startDate: { type: 'string', format: 'date-time' },
                        endDate: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/analytics/orders/trends': {
      get: {
        tags: ['Analytics'],
        summary: 'Get order trends',
        description: 'Get order trend analysis over time. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Order trends data' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/analytics/orders/by-status': {
      get: {
        tags: ['Analytics'],
        summary: 'Get orders by status',
        description: 'Get order breakdown by status (pending, preparing, delivered, etc.). **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Orders by status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
                        totalOrders: { type: 'integer' },
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
    '/api/analytics/orders/by-type': {
      get: {
        tags: ['Analytics'],
        summary: 'Get orders by type',
        description: 'Get order breakdown by type (food, pabili, pabayad, parcel). **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month'] } },
          { name: 'orderType', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Orders by type data' },
        },
      },
    },
    '/api/analytics/revenue/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Get revenue summary',
        description: 'Get revenue summary including fees, commissions, and net revenue. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Revenue summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/AnalyticsRevenueSummary' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/analytics/revenue/trends': {
      get: {
        tags: ['Analytics'],
        summary: 'Get revenue trends',
        description: 'Get revenue trend analysis over time. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Revenue trends data' },
        },
      },
    },
    '/api/analytics/financial': {
      get: {
        tags: ['Analytics'],
        summary: 'Get comprehensive financial analytics',
        description: 'Get detailed financial analytics including profit margins and projections. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'timeRange', in: 'query', schema: { type: 'string', default: '30d' }, description: 'Time range (7d, 30d, 90d, 1y)' },
        ],
        responses: {
          200: { description: 'Financial analytics data' },
        },
      },
    },
    '/api/analytics/users/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Get user statistics',
        description: 'Get user statistics and growth metrics. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'User analytics' },
        },
      },
    },
    '/api/analytics/users/growth': {
      get: {
        tags: ['Analytics'],
        summary: 'Get user growth trends',
        description: 'Get daily user growth by role (customers, vendors, riders). **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'User growth data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        dailyGrowth: { type: 'object' },
                        totalNew: { type: 'integer' },
                        byRole: {
                          type: 'object',
                          properties: {
                            customers: { type: 'integer' },
                            vendors: { type: 'integer' },
                            riders: { type: 'integer' },
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
    },
    '/api/analytics/riders/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Get rider performance summary',
        description: 'Get rider performance statistics. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Rider analytics' },
        },
      },
    },
    '/api/analytics/riders/performance': {
      get: {
        tags: ['Analytics'],
        summary: 'Get individual rider performance',
        description: 'Get performance metrics for all riders (deliveries, ratings). **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Rider performance data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          riderId: { type: 'string' },
                          name: { type: 'string' },
                          totalDeliveries: { type: 'integer' },
                          avgRating: { type: 'number' },
                          isOnline: { type: 'boolean' },
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
    '/api/analytics/restaurants/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Get restaurant statistics',
        description: 'Get restaurant performance statistics. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Restaurant analytics' },
        },
      },
    },
    '/api/analytics/restaurants/{id}': {
      get: {
        tags: ['Analytics'],
        summary: 'Get specific restaurant analytics',
        description: 'Get analytics for a specific restaurant. Vendors can access their own restaurant data.',
        'x-roles': ['admin', 'vendor'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        ],
        responses: {
          200: { description: 'Restaurant analytics data' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/analytics/restaurants/top-performers': {
      get: {
        tags: ['Analytics'],
        summary: 'Get top performing restaurants',
        description: 'Get restaurants ranked by revenue and orders. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: {
            description: 'Top performers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          totalOrders: { type: 'integer' },
                          revenue: { type: 'number' },
                          avgRating: { type: 'number' },
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
    '/api/analytics/geographic': {
      get: {
        tags: ['Analytics'],
        summary: 'Get geographic analytics',
        description: 'Get order distribution by geographic area. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Geographic analytics data' },
        },
      },
    },
    '/api/analytics/geographic/heatmap': {
      get: {
        tags: ['Analytics'],
        summary: 'Get order heatmap data',
        description: 'Get coordinate data for order heatmap visualization. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Heatmap data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          lat: { type: 'number' },
                          lng: { type: 'number' },
                          weight: { type: 'number' },
                        },
                      },
                    },
                    totalPoints: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Get aggregated dashboard data',
        description: 'Get all key metrics in a single call for admin dashboard. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Dashboard analytics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/AnalyticsDashboard' },
                    period: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/analytics/realtime': {
      get: {
        tags: ['Analytics'],
        summary: 'Get real-time statistics',
        description: 'Get real-time metrics with minimal caching. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Real-time data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/AnalyticsRealtime' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/analytics/cache/stats': {
      get: {
        tags: ['Analytics'],
        summary: 'Get cache statistics',
        description: 'Get analytics cache statistics for monitoring. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Cache statistics' },
        },
      },
    },
    '/api/analytics/cache/clear': {
      post: {
        tags: ['Analytics'],
        summary: 'Clear analytics cache',
        description: 'Clear analytics cache entries. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pattern: { type: 'string', description: 'Optional pattern to clear specific entries' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cache cleared' },
        },
      },
    },

    // ==================== NOTIFICATION ENDPOINTS ====================
    '/api/notifications/vapid-public-key': {
      get: {
        tags: ['Notifications'],
        summary: 'Get VAPID public key',
        description: 'Get the VAPID public key for push notification subscription.',
        responses: {
          200: {
            description: 'VAPID public key',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    publicKey: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/notifications/subscribe': {
      post: {
        tags: ['Notifications'],
        summary: 'Subscribe to push notifications',
        description: 'Register a push subscription for the authenticated user.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PushSubscription' },
            },
          },
        },
        responses: {
          200: { description: 'Successfully subscribed' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/notifications/unsubscribe': {
      post: {
        tags: ['Notifications'],
        summary: 'Unsubscribe from push notifications',
        description: 'Remove a push subscription.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['endpoint'],
                properties: {
                  endpoint: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Successfully unsubscribed' },
        },
      },
    },
    '/api/notifications/test': {
      post: {
        tags: ['Notifications'],
        summary: 'Send test notification',
        description: 'Send a test push notification to the authenticated user.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Test notification sent' },
        },
      },
    },
    '/api/notifications/preferences': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification preferences',
        description: 'Get the authenticated user\'s notification preferences.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Notification preferences',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotificationPreferences' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Notifications'],
        summary: 'Update notification preferences',
        description: 'Update the authenticated user\'s notification preferences.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NotificationPreferences' },
            },
          },
        },
        responses: {
          200: {
            description: 'Preferences updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotificationPreferences' },
              },
            },
          },
        },
      },
    },
    '/api/notifications/analytics': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification analytics',
        description: 'Get notification engagement analytics for the authenticated user.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Notification analytics' },
        },
      },
    },
    '/api/notifications/track/{notificationId}/{action}': {
      post: {
        tags: ['Notifications'],
        summary: 'Track notification interaction',
        description: 'Track when a notification is opened or clicked.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'notificationId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'action', in: 'path', required: true, schema: { type: 'string', enum: ['opened', 'clicked'] } },
        ],
        responses: {
          200: { description: 'Interaction tracked' },
        },
      },
    },
    '/api/notifications/campaigns': {
      get: {
        tags: ['Notifications'],
        summary: 'List notification campaigns',
        description: 'Get all notification campaigns. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Campaigns list',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/NotificationCampaign' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Create notification campaign',
        description: 'Create a new notification campaign. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type', 'channels', 'templateData'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  type: { type: 'string', enum: ['promotional', 'announcement', 'alert'] },
                  channels: { type: 'array', items: { type: 'string', enum: ['email', 'sms', 'push'] } },
                  targetAudience: { type: 'object' },
                  templateData: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      content: { type: 'string' },
                      imageUrl: { type: 'string' },
                      ctaText: { type: 'string' },
                      ctaUrl: { type: 'string' },
                    },
                  },
                  scheduledFor: { type: 'string', format: 'date-time' },
                },
              },
              example: {
                name: 'Weekend Promo',
                description: 'Free delivery this weekend',
                type: 'promotional',
                channels: ['push', 'email'],
                targetAudience: { roles: ['customer'] },
                templateData: {
                  title: '🎉 Free Delivery Weekend!',
                  content: 'Enjoy free delivery on all orders this weekend. Use code WEEKEND2024.',
                  ctaText: 'Order Now',
                  ctaUrl: '/order'
                }
              }
            },
          },
        },
        responses: {
          201: {
            description: 'Campaign created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotificationCampaign' },
              },
            },
          },
        },
      },
    },
    '/api/notifications/campaigns/{id}': {
      get: {
        tags: ['Notifications'],
        summary: 'Get campaign details',
        description: 'Get details of a specific notification campaign. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Campaign details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotificationCampaign' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/notifications/campaigns/{id}/send': {
      post: {
        tags: ['Notifications'],
        summary: 'Send notification campaign',
        description: 'Execute/send a notification campaign to target recipients. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Campaign queued for delivery',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    totalRecipients: { type: 'integer' },
                    channels: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          400: { description: 'Campaign cannot be sent in current status' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },

    // ==================== VENDOR ONBOARDING ENDPOINTS ====================
    '/api/vendor/register': {
      post: {
        tags: ['Vendor Onboarding'],
        summary: 'Register as a vendor',
        description: `Register a new vendor account with business information.

**Registration Flow:**
1. Submit registration with business details
2. Verify email
3. Upload required KYC documents
4. Add bank account for settlements
5. Wait for admin approval
6. Start accepting orders

**Required Documents (varies by business type):**
- Valid ID
- Business Permit
- BIR Registration
- Sanitary Permit (food businesses)
- Food Handler Certificate (food businesses)`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VendorRegistrationRequest' },
              example: {
                firstName: 'Maria',
                lastName: 'Santos',
                email: 'maria@lomiking.ph',
                phone: '+639171234567',
                password: 'SecurePass123!',
                businessName: 'Lomi King Batangas',
                businessType: 'restaurant',
                businessAddress: {
                  street: '123 P. Burgos Street',
                  barangay: 'Poblacion',
                  city: 'Batangas City',
                  province: 'Batangas',
                  zipCode: '4200'
                },
                businessCategory: 'Filipino Food',
                businessDescription: 'Authentic Batangas lomi and local delicacies'
              }
            },
          },
        },
        responses: {
          201: {
            description: 'Vendor registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                    restaurant: { $ref: '#/components/schemas/Restaurant' },
                    onboardingStatus: { $ref: '#/components/schemas/VendorOnboardingStatus' },
                    token: { type: 'string' },
                    requiresEmailVerification: { type: 'boolean' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/vendor/kyc/upload-documents': {
      post: {
        tags: ['Vendor Onboarding'],
        summary: 'Upload KYC document',
        description: 'Upload a KYC document for verification. Vendors must upload all required documents.',
        security: [{ BearerAuth: [] }],
        'x-roles': ['vendor'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VendorKycUploadRequest' },
              example: {
                docType: 'business_permit',
                documentUrl: 'https://storage.btsdelivery.ph/docs/vendor-123/business-permit.pdf',
                documentName: 'Business Permit 2024',
                expiryDate: '2024-12-31'
              }
            },
          },
        },
        responses: {
          200: {
            description: 'Document uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    document: { $ref: '#/components/schemas/VendorKycDocument' },
                    progress: {
                      type: 'object',
                      properties: {
                        submittedDocuments: { type: 'array', items: { type: 'string' } },
                        requiredDocuments: { type: 'array', items: { type: 'string' } },
                        allDocsSubmitted: { type: 'boolean' },
                        kycStatus: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/vendor/kyc/status': {
      get: {
        tags: ['Vendor Onboarding'],
        summary: 'Get KYC status',
        description: 'Get current KYC approval status and document status.',
        security: [{ BearerAuth: [] }],
        'x-roles': ['vendor'],
        responses: {
          200: {
            description: 'KYC status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    onboardingStatus: { $ref: '#/components/schemas/VendorOnboardingStatus' },
                    documents: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/VendorKycDocument' },
                    },
                    bankAccounts: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/VendorBankAccount' },
                    },
                    restaurant: { $ref: '#/components/schemas/Restaurant' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/api/vendor/kyc/bank-account': {
      post: {
        tags: ['Vendor Onboarding'],
        summary: 'Add bank account',
        description: 'Add a bank account for settlement payments.',
        security: [{ BearerAuth: [] }],
        'x-roles': ['vendor'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BankAccountRequest' },
              example: {
                bankName: 'BDO',
                accountName: 'Maria Santos',
                accountNumber: '1234567890',
                accountType: 'savings',
                branchName: 'Batangas City Branch',
                isDefault: true
              }
            },
          },
        },
        responses: {
          201: {
            description: 'Bank account added',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    bankAccount: { $ref: '#/components/schemas/VendorBankAccount' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/vendors/pending': {
      get: {
        tags: ['Vendor Onboarding'],
        summary: 'List pending vendor applications',
        description: 'Get all vendor applications pending KYC review. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Pending vendors list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vendors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          vendor: { $ref: '#/components/schemas/User' },
                          onboarding: { $ref: '#/components/schemas/VendorOnboardingStatus' },
                          documents: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/VendorKycDocument' },
                          },
                          restaurant: { $ref: '#/components/schemas/Restaurant' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
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
    '/api/admin/vendor/{id}': {
      get: {
        tags: ['Vendor Onboarding'],
        summary: 'Get vendor details',
        description: 'Get detailed information about a vendor including documents and bank accounts. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Vendor details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vendor: { $ref: '#/components/schemas/User' },
                    onboarding: { $ref: '#/components/schemas/VendorOnboardingStatus' },
                    documents: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/VendorKycDocument' },
                    },
                    bankAccounts: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/VendorBankAccount' },
                    },
                    restaurant: { $ref: '#/components/schemas/Restaurant' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/admin/vendor/{id}/approve': {
      post: {
        tags: ['Vendor Onboarding'],
        summary: 'Approve vendor application',
        description: 'Approve a vendor KYC application, activating their account and restaurant. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  adminNotes: { type: 'string', description: 'Internal notes for the approval' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Vendor approved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    vendor: { $ref: '#/components/schemas/User' },
                    kycStatus: { type: 'string', example: 'approved' },
                    isOnboardingComplete: { type: 'boolean' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/admin/vendor/{id}/reject': {
      post: {
        tags: ['Vendor Onboarding'],
        summary: 'Reject vendor application',
        description: 'Reject a vendor KYC application with reason. **Admin only.**',
        'x-roles': ['admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rejectionReason'],
                properties: {
                  rejectionReason: { type: 'string', description: 'Reason for rejection' },
                  rejectedDocuments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        docType: { type: 'string' },
                        reason: { type: 'string' },
                      },
                    },
                    description: 'Specific documents that were rejected',
                  },
                  adminNotes: { type: 'string', description: 'Internal notes' },
                },
              },
              example: {
                rejectionReason: 'Business permit is expired. Please upload a valid permit.',
                rejectedDocuments: [
                  { docType: 'business_permit', reason: 'Document has expired' }
                ]
              }
            },
          },
        },
        responses: {
          200: {
            description: 'Vendor rejected',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    vendor: { $ref: '#/components/schemas/User' },
                    kycStatus: { type: 'string', example: 'rejected' },
                    rejectionReason: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Rejection reason is required' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },

    // ==================== ROUTING API ENDPOINTS ====================
    '/api/routing/directions': {
      post: {
        tags: ['Routing'],
        summary: 'Calculate route between two points',
        description: `Calculate the route between an origin and destination using OpenRouteService.

**Public endpoint** - No authentication required.

Returns distance, duration, and an encoded polyline for map display.`,
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['origin', 'destination'],
                properties: {
                  origin: { $ref: '#/components/schemas/Coordinates' },
                  destination: { $ref: '#/components/schemas/Coordinates' },
                  waypoints: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Coordinates' },
                    description: 'Optional waypoints to include in route',
                  },
                },
              },
              example: {
                origin: { lat: 13.7565, lng: 121.0583 },
                destination: { lat: 13.7465, lng: 121.0683 },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Route calculated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    route: {
                      type: 'object',
                      properties: {
                        distance: { type: 'number', description: 'Distance in meters', example: 2498 },
                        duration: { type: 'number', description: 'Duration in seconds', example: 373 },
                        polyline: { type: 'string', description: 'Encoded polyline for map display' },
                        distanceKm: { type: 'string', example: '2.50' },
                        durationMinutes: { type: 'number', example: 7 },
                      },
                    },
                    optimizedWaypoints: { type: 'array', nullable: true },
                    provider: { type: 'string', example: 'OpenRouteService' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/routing/distance-matrix': {
      post: {
        tags: ['Routing'],
        summary: 'Calculate distances for multiple destinations',
        description: `Calculate distances from one origin to multiple destinations.

**Public endpoint** - No authentication required.

Useful for finding the nearest restaurant or rider.`,
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['origin', 'destinations'],
                properties: {
                  origin: { $ref: '#/components/schemas/Coordinates' },
                  destinations: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Coordinates' },
                    minItems: 1,
                    maxItems: 25,
                  },
                },
              },
              example: {
                origin: { lat: 13.7565, lng: 121.0583 },
                destinations: [
                  { lat: 13.7465, lng: 121.0683 },
                  { lat: 13.7365, lng: 121.0783 },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Distance matrix calculated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          destinationIndex: { type: 'number' },
                          distance: { type: 'number', description: 'Distance in meters' },
                          duration: { type: 'number', description: 'Duration in seconds' },
                          distanceKm: { type: 'string' },
                          durationMinutes: { type: 'number' },
                        },
                      },
                    },
                    provider: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/routing/geocode': {
      post: {
        tags: ['Routing'],
        summary: 'Geocode an address to coordinates',
        description: `Convert a text address to geographic coordinates.

**Public endpoint** - No authentication required.`,
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['address'],
                properties: {
                  address: { type: 'string', minLength: 3, maxLength: 500 },
                },
              },
              example: {
                address: '123 Rizal Street, Batangas City, Batangas, Philippines',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Address geocoded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    location: { $ref: '#/components/schemas/Coordinates' },
                    provider: { type: 'string' },
                  },
                },
              },
            },
          },
          404: { description: 'Address not found' },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/routing/reverse-geocode': {
      post: {
        tags: ['Routing'],
        summary: 'Reverse geocode coordinates to address',
        description: `Convert geographic coordinates to a human-readable address.

**Public endpoint** - No authentication required.`,
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lat', 'lng'],
                properties: {
                  lat: { type: 'number', minimum: -90, maximum: 90 },
                  lng: { type: 'number', minimum: -180, maximum: 180 },
                },
              },
              example: {
                lat: 13.7565,
                lng: 121.0583,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Coordinates reverse geocoded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    address: { type: 'string' },
                    location: { $ref: '#/components/schemas/Coordinates' },
                    provider: { type: 'string' },
                  },
                },
              },
            },
          },
          404: { description: 'Unable to find address for coordinates' },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/routing/provider': {
      get: {
        tags: ['Routing'],
        summary: 'Get current maps provider info',
        description: `Get information about the current maps/routing provider.

**Public endpoint** - No authentication required.`,
        'x-roles': ['public'],
        responses: {
          200: {
            description: 'Provider information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    provider: {
                      type: 'object',
                      properties: {
                        primary: { type: 'string', example: 'OpenRouteService' },
                        fallback: { type: 'string', example: 'Google Maps' },
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
    '/api/routing/delivery-estimate': {
      post: {
        tags: ['Routing'],
        summary: 'Get delivery fee and time estimate',
        description: `Calculate delivery fee and estimated delivery time for a route.

**Public endpoint** - No authentication required.

Includes preparation time in the estimate.`,
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['origin', 'destination'],
                properties: {
                  origin: { $ref: '#/components/schemas/Coordinates' },
                  destination: { $ref: '#/components/schemas/Coordinates' },
                  preparationTime: {
                    type: 'number',
                    minimum: 0,
                    maximum: 120,
                    default: 15,
                    description: 'Restaurant preparation time in minutes',
                  },
                },
              },
              example: {
                origin: { lat: 13.7565, lng: 121.0583 },
                destination: { lat: 13.7465, lng: 121.0683 },
                preparationTime: 20,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Delivery estimate calculated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    estimate: {
                      type: 'object',
                      properties: {
                        distance: { type: 'number', description: 'Distance in meters' },
                        distanceKm: { type: 'string', example: '2.50' },
                        deliveryFee: { type: 'number', description: 'Delivery fee in PHP', example: 49 },
                        estimatedTime: { type: 'number', description: 'Total estimated time in minutes', example: 27 },
                        travelTime: { type: 'number', description: 'Travel time only in minutes', example: 7 },
                        preparationTime: { type: 'number', description: 'Preparation time in minutes', example: 20 },
                        polyline: { type: 'string', description: 'Encoded polyline' },
                      },
                    },
                    provider: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/routing/check-delivery-zone': {
      post: {
        tags: ['Routing'],
        summary: 'Check if location is within delivery zone',
        description: `Check if a customer location is within the delivery zone of a restaurant.

**Public endpoint** - No authentication required.`,
        'x-roles': ['public'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['customerLocation', 'restaurantLocation'],
                properties: {
                  customerLocation: { $ref: '#/components/schemas/Coordinates' },
                  restaurantLocation: { $ref: '#/components/schemas/Coordinates' },
                  maxRadiusKm: {
                    type: 'number',
                    minimum: 1,
                    maximum: 50,
                    default: 15,
                    description: 'Maximum delivery radius in kilometers',
                  },
                },
              },
              example: {
                customerLocation: { lat: 13.7465, lng: 121.0683 },
                restaurantLocation: { lat: 13.7565, lng: 121.0583 },
                maxRadiusKm: 10,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Delivery zone check result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    isWithinZone: { type: 'boolean', example: true },
                    maxRadiusKm: { type: 'number', example: 10 },
                    actualDistanceKm: { type: 'string', example: '2.50' },
                    provider: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
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
