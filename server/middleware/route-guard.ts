/**
 * Route Guard Middleware
 * 
 * Enforces authentication by DEFAULT on all /api routes.
 * Public routes must be explicitly whitelisted.
 * 
 * SECURITY: This prevents accidentally exposing routes without auth.
 */

import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from './auth';
import { logger } from './logging';

// Routes that don't require authentication (whitelist approach)
const PUBLIC_ROUTES: { method: string; path: RegExp }[] = [
  // Auth routes
  { method: 'POST', path: /^\/api\/auth\/register$/ },
  { method: 'POST', path: /^\/api\/auth\/login$/ },
  { method: 'POST', path: /^\/api\/auth\/forgot-password$/ },
  { method: 'POST', path: /^\/api\/auth\/reset-password$/ },
  { method: 'POST', path: /^\/api\/auth\/verify-email$/ },
  { method: 'POST', path: /^\/api\/auth\/refresh$/ },
  
  // Public config
  { method: 'GET', path: /^\/api\/config\/public$/ },
  
  // Public restaurant/menu browsing (read-only)
  { method: 'GET', path: /^\/api\/restaurants$/ },
  { method: 'GET', path: /^\/api\/restaurants\/[^/]+$/ },
  { method: 'GET', path: /^\/api\/restaurants\/[^/]+\/menu$/ },
  { method: 'GET', path: /^\/api\/restaurants\/[^/]+\/categories$/ },
  { method: 'GET', path: /^\/api\/search\/restaurants$/ },
  
  // NexusPay methods (public info)
  { method: 'GET', path: /^\/api\/nexuspay\/methods$/ },
  
  // Webhooks (use signature verification instead of JWT)
  { method: 'POST', path: /^\/api\/payment\/webhook$/ },
  { method: 'POST', path: /^\/api\/nexuspay\/webhook$/ },
  
  // Health check
  { method: 'GET', path: /^\/api\/health$/ },

  // Swagger/API docs
  { method: 'GET', path: /^\/api-docs/ },
  { method: 'GET', path: /^\/swagger/ },

  // Routing API (public for map/route calculation without client-side API keys)
  { method: 'POST', path: /^\/api\/routing\/directions$/ },
  { method: 'POST', path: /^\/api\/routing\/distance-matrix$/ },
  { method: 'POST', path: /^\/api\/routing\/geocode$/ },
  { method: 'POST', path: /^\/api\/routing\/reverse-geocode$/ },
  { method: 'GET', path: /^\/api\/routing\/provider$/ },
  { method: 'POST', path: /^\/api\/routing\/delivery-estimate$/ },
  { method: 'POST', path: /^\/api\/routing\/check-delivery-zone$/ },
];

// Routes that should NEVER be accessed without auth even if accidentally whitelisted
const PROTECTED_PATTERNS: RegExp[] = [
  /^\/api\/admin\//,
  /^\/api\/orders$/,  // List all orders
  /^\/api\/orders\/[^/]+$/,  // Single order (should check ownership)
  /^\/api\/riders$/,  // List all riders
  /^\/api\/users\//,  // User data
  /^\/api\/payment\/create/,
  /^\/api\/payment\/refund/,
];

/**
 * Check if a route is explicitly public
 */
function isPublicRoute(method: string, path: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    route.method === method && route.path.test(path)
  );
}

/**
 * Check if a route must always be protected
 */
function mustBeProtected(path: string): boolean {
  return PROTECTED_PATTERNS.some(pattern => pattern.test(path));
}

/**
 * Global route guard middleware
 * 
 * Apply this BEFORE route registration to enforce auth by default.
 * Routes must be explicitly whitelisted to be public.
 */
export const globalRouteGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip non-API routes (static files, etc.)
  if (!req.path.startsWith('/api')) {
    return next();
  }
  
  const method = req.method;
  const path = req.path;
  
  // Check if route is explicitly public
  if (isPublicRoute(method, path)) {
    // Double-check it's not a protected pattern
    if (mustBeProtected(path)) {
      logger.warn('Route guard: Protected route matched public whitelist, requiring auth', {
        method,
        path,
        ip: req.ip
      });
      return authenticateToken(req, res, next);
    }
    
    // Route is public, proceed without auth
    return next();
  }
  
  // Route is not whitelisted - require authentication
  logger.debug('Route guard: Requiring authentication', { method, path });
  return authenticateToken(req, res, next);
};

/**
 * Audit middleware to log all route access attempts
 */
export const routeAuditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.path.startsWith('/api')) {
    return next();
  }
  
  const isPublic = isPublicRoute(req.method, req.path);
  const userId = (req as any).user?.id || 'anonymous';
  
  // Log access attempt
  logger.info('API access', {
    method: req.method,
    path: req.path,
    isPublic,
    userId,
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 100)
  });
  
  next();
};

/**
 * Helper to add a route to the public whitelist at runtime
 * Use sparingly - prefer static whitelist
 */
export function addPublicRoute(method: string, pathPattern: RegExp): void {
  PUBLIC_ROUTES.push({ method, path: pathPattern });
  logger.info('Added public route to whitelist', { method, pattern: pathPattern.toString() });
}

// Named export for isPublicRoute
export { isPublicRoute };

export default {
  globalRouteGuard,
  routeAuditLogger,
  addPublicRoute,
  isPublicRoute,
  PUBLIC_ROUTES
};
