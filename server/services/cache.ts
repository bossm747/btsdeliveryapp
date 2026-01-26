/**
 * Redis Cache Service
 * 
 * Provides Redis-based caching for high-traffic endpoints.
 * Falls back to in-memory cache if Redis is unavailable.
 */

import Redis from 'ioredis';

// Redis connection
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;
let isConnected = false;

// In-memory fallback cache
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

/**
 * Initialize Redis connection
 */
function initRedis(): Redis {
  if (redis) return redis;
  
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    isConnected = true;
    console.log('[Redis Cache] Connected to Redis');
  });

  redis.on('error', (err) => {
    console.error('[Redis Cache] Redis error:', err.message);
    isConnected = false;
  });

  redis.on('close', () => {
    isConnected = false;
    console.log('[Redis Cache] Connection closed');
  });

  // Attempt connection
  redis.connect().catch((err) => {
    console.warn('[Redis Cache] Could not connect to Redis, using in-memory fallback:', err.message);
  });

  return redis;
}

// Initialize on module load
initRedis();

/**
 * Get cached value by key
 */
export async function get<T>(key: string): Promise<T | null> {
  try {
    if (isConnected && redis) {
      const value = await redis.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    }
    
    // Fallback to memory cache
    const entry = memoryCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return JSON.parse(entry.value) as T;
    }
    memoryCache.delete(key);
    return null;
  } catch (error) {
    console.error('[Redis Cache] Get error:', error);
    return null;
  }
}

/**
 * Set cached value with TTL in seconds
 */
export async function set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
  try {
    const serialized = JSON.stringify(value);
    
    if (isConnected && redis) {
      await redis.setex(key, ttlSeconds, serialized);
      return true;
    }
    
    // Fallback to memory cache
    memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  } catch (error) {
    console.error('[Redis Cache] Set error:', error);
    return false;
  }
}

/**
 * Delete cached key
 */
export async function del(key: string): Promise<boolean> {
  try {
    if (isConnected && redis) {
      await redis.del(key);
      return true;
    }
    
    memoryCache.delete(key);
    return true;
  } catch (error) {
    console.error('[Redis Cache] Delete error:', error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function delPattern(pattern: string): Promise<number> {
  try {
    if (isConnected && redis) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    }
    
    // Fallback: match pattern in memory cache
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let deleted = 0;
    const keys = Array.from(memoryCache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        deleted++;
      }
    }
    return deleted;
  } catch (error) {
    console.error('[Redis Cache] Delete pattern error:', error);
    return 0;
  }
}

/**
 * Cache a database query result
 * Returns cached value if exists, otherwise executes query and caches result
 */
export async function cacheQuery<T>(
  key: string,
  ttlSeconds: number,
  queryFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Execute query and cache result
  const result = await queryFn();
  await set(key, result, ttlSeconds);
  return result;
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  // Restaurant keys
  restaurants: (city?: string) => city ? `restaurants:city:${city}` : 'restaurants:all',
  restaurantMenu: (id: string) => `restaurant:${id}:menu`,
  restaurant: (id: string) => `restaurant:${id}`,
  
  // Customer order keys
  customerOrders: (userId: string) => `customer:${userId}:orders`,
  
  // Invalidation patterns
  allRestaurants: 'restaurants:*',
  allMenus: 'restaurant:*:menu',
  restaurantMenuPattern: (id: string) => `restaurant:${id}:menu`,
};

/**
 * TTL constants (in seconds)
 */
export const CacheTTL = {
  RESTAURANTS: 300,      // 5 minutes
  MENU: 120,             // 2 minutes  
  CUSTOMER_ORDERS: 30,   // 30 seconds
  SHORT: 60,             // 1 minute
  MEDIUM: 300,           // 5 minutes
  LONG: 900,             // 15 minutes
};

/**
 * Cache invalidation helpers
 */
export const invalidate = {
  // Invalidate all restaurant listings
  restaurants: async () => {
    await delPattern(CacheKeys.allRestaurants);
    console.log('[Redis Cache] Invalidated all restaurant caches');
  },
  
  // Invalidate specific restaurant and its menu
  restaurant: async (id: string) => {
    await del(CacheKeys.restaurant(id));
    await del(CacheKeys.restaurantMenu(id));
    await delPattern(CacheKeys.allRestaurants);
    console.log(`[Redis Cache] Invalidated restaurant ${id} cache`);
  },
  
  // Invalidate restaurant menu
  menu: async (restaurantId: string) => {
    await del(CacheKeys.restaurantMenu(restaurantId));
    console.log(`[Redis Cache] Invalidated menu cache for restaurant ${restaurantId}`);
  },
  
  // Invalidate customer orders
  customerOrders: async (userId: string) => {
    await del(CacheKeys.customerOrders(userId));
    console.log(`[Redis Cache] Invalidated orders cache for customer ${userId}`);
  },
};

/**
 * Get cache statistics (for monitoring)
 */
export async function getStats(): Promise<{
  connected: boolean;
  backend: 'redis' | 'memory';
  memorySize: number;
}> {
  return {
    connected: isConnected,
    backend: isConnected ? 'redis' : 'memory',
    memorySize: memoryCache.size,
  };
}

// Cleanup memory cache periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(memoryCache.entries());
  for (const [key, entry] of entries) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
}, 60000);

export default {
  get,
  set,
  del,
  delPattern,
  cacheQuery,
  CacheKeys,
  CacheTTL,
  invalidate,
  getStats,
};
