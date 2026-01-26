/**
 * In-Memory Cache Service with LRU Eviction
 *
 * Provides caching for high-traffic endpoints to reduce database load.
 * Uses Least Recently Used (LRU) eviction policy when cache is full.
 *
 * For production with multiple instances, consider upgrading to Redis:
 * - npm install ioredis
 * - Update this service to use Redis as the backend
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum number of entries
}

const DEFAULT_TTL = 300; // 5 minutes
const DEFAULT_MAX_SIZE = 1000;

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    this.defaultTTL = options.ttl || DEFAULT_TTL;

    // Periodic cleanup of expired entries every 60 seconds
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = Date.now();
    this.hitCount++;
    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL) * 1000;
    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern (supports * wildcard)
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let deleted = 0;

    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get or set pattern - returns cached value or fetches and caches
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
    };
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
export const cache = new CacheService({
  maxSize: 2000,
  ttl: 300, // 5 minutes default
});

// Cache key generators for common patterns
export const CacheKeys = {
  // Restaurant cache keys
  restaurant: (id: string) => `restaurant:${id}`,
  restaurantMenu: (id: string) => `restaurant:${id}:menu`,
  restaurantList: (page: number, limit: number, filters?: string) =>
    `restaurants:list:${page}:${limit}:${filters || 'all'}`,
  restaurantSearch: (query: string, page: number) =>
    `restaurants:search:${query}:${page}`,

  // Analytics cache keys (longer TTL recommended)
  analyticsOrders: (startDate: string, endDate: string) =>
    `analytics:orders:${startDate}:${endDate}`,
  analyticsRevenue: (startDate: string, endDate: string) =>
    `analytics:revenue:${startDate}:${endDate}`,
  analyticsTrends: (period: string, type?: string) =>
    `analytics:trends:${period}:${type || 'all'}`,
  analyticsGeographic: (startDate: string, endDate: string) =>
    `analytics:geographic:${startDate}:${endDate}`,
  dashboardStats: (role: string, userId?: string) =>
    `dashboard:${role}:${userId || 'global'}`,

  // Menu cache keys
  menuItem: (id: string) => `menuItem:${id}`,
  menuCategory: (restaurantId: string) => `menuCategory:${restaurantId}`,

  // User/session cache keys
  userProfile: (id: string) => `user:${id}:profile`,
  userAddresses: (id: string) => `user:${id}:addresses`,
  userOrders: (id: string, page: number) => `user:${id}:orders:${page}`,

  // Pricing cache keys (short TTL recommended)
  pricing: (city: string, orderType: string) =>
    `pricing:${city}:${orderType}`,
  deliveryZone: (lat: number, lng: number) =>
    `deliveryZone:${lat.toFixed(3)}:${lng.toFixed(3)}`,

  // Loyalty/promo cache keys
  loyaltyPoints: (userId: string) => `loyalty:${userId}`,
  promoCode: (code: string) => `promo:${code}`,
  activePromos: () => `promos:active`,
};

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - default
  LONG: 900,        // 15 minutes - for analytics/reports
  VERY_LONG: 3600,  // 1 hour - for rarely changing data
  DAY: 86400,       // 24 hours - for static data
};

/**
 * Express middleware for caching API responses
 */
export function cacheMiddleware(ttl: number = CacheTTL.MEDIUM) {
  return async (req: any, res: any, next: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `api:${req.originalUrl}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json function
    const originalJson = res.json.bind(res);

    // Override json to cache the response
    res.json = (data: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate cache for a specific resource
 */
export function invalidateCache(patterns: string[]): void {
  for (const pattern of patterns) {
    cache.deletePattern(pattern);
  }
}

export default cache;
