/**
 * Token Revocation Middleware
 * 
 * Handles JWT token blacklisting for:
 * - Logout (immediate token invalidation)
 * - Password change (invalidate all tokens)
 * - Account suspension
 * - Security incidents
 * 
 * Uses in-memory store with periodic cleanup.
 * For production scale, use Redis.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';

// In-memory token blacklist
// Key: token hash (or jti), Value: expiration timestamp
const tokenBlacklist = new Map<string, number>();

// Blacklist entries by user ID for bulk revocation
const userTokens = new Map<string, Set<string>>();

// Cleanup interval (run every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Generate a hash for token storage (avoid storing full tokens)
 */
function hashToken(token: string): string {
  // Use last 32 chars as identifier (unique enough, not full token)
  return token.slice(-32);
}

/**
 * Add a token to the blacklist
 */
export function revokeToken(token: string, expiresAt: Date, userId?: string): void {
  const tokenHash = hashToken(token);
  const expTimestamp = expiresAt.getTime();
  
  tokenBlacklist.set(tokenHash, expTimestamp);
  
  // Track by user for bulk revocation
  if (userId) {
    if (!userTokens.has(userId)) {
      userTokens.set(userId, new Set());
    }
    userTokens.get(userId)!.add(tokenHash);
  }
  
  logger.info('Token revoked', { 
    tokenHash: tokenHash.substring(0, 8) + '...', 
    userId,
    expiresAt 
  });
}

/**
 * Revoke all tokens for a user (password change, account suspension, etc.)
 */
export function revokeAllUserTokens(userId: string): number {
  const tokens = userTokens.get(userId);
  if (!tokens) {
    return 0;
  }
  
  // Add all user's tokens to blacklist with 24h expiry
  // (longer than max token lifetime to ensure coverage)
  const expTimestamp = Date.now() + 24 * 60 * 60 * 1000;
  
  for (const tokenHash of tokens) {
    tokenBlacklist.set(tokenHash, expTimestamp);
  }
  
  const count = tokens.size;
  userTokens.delete(userId);
  
  logger.info('All user tokens revoked', { userId, count });
  return count;
}

/**
 * Check if a token is revoked
 */
export function isTokenRevoked(token: string): boolean {
  const tokenHash = hashToken(token);
  return tokenBlacklist.has(tokenHash);
}

/**
 * Middleware to check token revocation
 * Apply AFTER JWT verification
 */
export const checkTokenRevocation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    return next(); // Let auth middleware handle missing token
  }
  
  if (isTokenRevoked(token)) {
    logger.warn('Revoked token used', {
      ip: req.ip,
      path: req.path,
      tokenHash: hashToken(token).substring(0, 8) + '...'
    });
    
    return res.status(401).json({
      message: 'Token has been revoked',
      code: 'TOKEN_REVOKED'
    });
  }
  
  next();
};

/**
 * Cleanup expired entries from blacklist
 */
function cleanupBlacklist(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [tokenHash, expTimestamp] of tokenBlacklist.entries()) {
    if (expTimestamp < now) {
      tokenBlacklist.delete(tokenHash);
      cleaned++;
    }
  }
  
  // Also cleanup user token tracking
  for (const [userId, tokens] of userTokens.entries()) {
    for (const tokenHash of tokens) {
      if (!tokenBlacklist.has(tokenHash)) {
        tokens.delete(tokenHash);
      }
    }
    if (tokens.size === 0) {
      userTokens.delete(userId);
    }
  }
  
  if (cleaned > 0) {
    logger.debug('Token blacklist cleanup', { cleaned, remaining: tokenBlacklist.size });
  }
}

// Start cleanup interval
setInterval(cleanupBlacklist, CLEANUP_INTERVAL);

/**
 * Get blacklist stats (for monitoring)
 */
export function getBlacklistStats(): {
  totalTokens: number;
  totalUsers: number;
} {
  return {
    totalTokens: tokenBlacklist.size,
    totalUsers: userTokens.size
  };
}

export default {
  revokeToken,
  revokeAllUserTokens,
  isTokenRevoked,
  checkTokenRevocation,
  getBlacklistStats
};
