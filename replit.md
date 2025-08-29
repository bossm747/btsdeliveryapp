# BTS Delivery Platform

## Overview

BTS Delivery is a comprehensive multi-service delivery platform designed for Batangas Province, Philippines. The platform connects customers with local businesses and service providers, offering food delivery, shopping assistance (Pabili), bill payment services (Pabayad), and parcel delivery. Built with a modern full-stack architecture, it features real-time order tracking, multiple payment options, merchant integration, and rider management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built using React with TypeScript, leveraging modern development practices:

- **UI Framework**: React 18 with functional components and hooks
- **Styling**: Tailwind CSS with custom design system using CSS variables for theming
- **Component Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable UI elements
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context for cart management and React Query for server state
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
The server-side follows a REST API pattern with Express.js:

- **Runtime**: Node.js with TypeScript for type safety
- **Framework**: Express.js for HTTP server and API routing
- **Database Layer**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless) for persistent data storage
- **Validation**: Zod schemas for runtime type validation shared between client and server

### Data Storage Solutions
The application uses a relational database design optimized for delivery platform operations:

- **Primary Database**: PostgreSQL with Drizzle ORM for migrations and queries
- **Schema Design**: Comprehensive tables for users, restaurants, menu items, orders, riders, and reviews
- **Shared Types**: TypeScript interfaces generated from database schema using Drizzle-Zod
- **Migration Strategy**: Drizzle Kit for database schema versioning and deployment

### Authentication and Authorization
The platform implements role-based access control:

- **User Roles**: Customer, vendor, rider, and admin roles with different permissions
- **Multi-Auth**: Support for email, mobile, and social login options
- **Session Management**: Express sessions with PostgreSQL session store
- **Account Management**: User profile management with email/phone verification

### External Service Integrations
The platform integrates with various third-party services:

- **Payment Gateways**: Multiple payment methods including GCash, Maya, card payments, and cash on delivery
- **Real-time Features**: WebSocket support for live order tracking and updates
- **Maps Integration**: GPS-based delivery tracking and location services
- **File Storage**: Image upload and storage for restaurant and user profiles

### Key Design Patterns
- **Separation of Concerns**: Clear separation between client, server, and shared code
- **Type Safety**: End-to-end TypeScript with shared schemas between frontend and backend
- **Component Composition**: Modular React components with consistent prop interfaces
- **API Design**: RESTful endpoints with consistent error handling and response formats
- **Database Design**: Normalized schema with proper relationships and constraints

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for database connectivity
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router for navigation

### UI and Styling
- **@radix-ui/***: Comprehensive suite of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Type-safe component variant styling
- **lucide-react**: Icon library for consistent iconography

### Form and Validation
- **react-hook-form**: Performant forms with minimal re-renders
- **@hookform/resolvers**: Integration between React Hook Form and validation libraries
- **zod**: Runtime type validation and schema definition

### Development Tools
- **vite**: Fast build tool with HMR for development
- **typescript**: Static type checking and enhanced developer experience
- **esbuild**: Fast JavaScript bundler for server-side code
- **tsx**: TypeScript execution for development server

### Session and Storage
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **date-fns**: Date manipulation and formatting utilities