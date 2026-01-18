/**
 * Offline Storage Utility for BTS Delivery App
 * Uses IndexedDB for caching order history data for offline viewing
 */

const DB_NAME = 'bts-delivery-offline';
const DB_VERSION = 1;
const ORDER_STORE = 'orders';
const CACHE_METADATA_STORE = 'cache-metadata';

interface CacheMetadata {
  key: string;
  timestamp: number;
  expiresAt: number;
}

interface CachedOrder {
  id: string;
  orderNumber: string;
  restaurantName: string;
  restaurantId: string;
  status: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: {
    street: string;
    barangay: string;
    city: string;
    province: string;
  };
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  scheduledFor?: string;
  createdAt: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
}

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

let dbInstance: IDBDatabase | null = null;

/**
 * Opens and returns the IndexedDB database instance
 */
async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create order store
      if (!db.objectStoreNames.contains(ORDER_STORE)) {
        const orderStore = db.createObjectStore(ORDER_STORE, { keyPath: 'id' });
        orderStore.createIndex('orderNumber', 'orderNumber', { unique: false });
        orderStore.createIndex('status', 'status', { unique: false });
        orderStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create cache metadata store
      if (!db.objectStoreNames.contains(CACHE_METADATA_STORE)) {
        db.createObjectStore(CACHE_METADATA_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Saves orders to IndexedDB cache
 */
export async function saveOrders(orders: CachedOrder[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([ORDER_STORE, CACHE_METADATA_STORE], 'readwrite');
    const orderStore = transaction.objectStore(ORDER_STORE);
    const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);

    // Clear existing orders first
    await new Promise<void>((resolve, reject) => {
      const clearRequest = orderStore.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Save each order
    for (const order of orders) {
      await new Promise<void>((resolve, reject) => {
        const putRequest = orderStore.put(order);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      });
    }

    // Update cache metadata
    const now = Date.now();
    const metadata: CacheMetadata = {
      key: 'orders',
      timestamp: now,
      expiresAt: now + CACHE_DURATION_MS,
    };

    await new Promise<void>((resolve, reject) => {
      const metaRequest = metadataStore.put(metadata);
      metaRequest.onsuccess = () => resolve();
      metaRequest.onerror = () => reject(metaRequest.error);
    });

    console.log('[OfflineStorage] Orders cached successfully:', orders.length);
  } catch (error) {
    console.error('[OfflineStorage] Failed to save orders:', error);
    throw error;
  }
}

/**
 * Retrieves cached orders from IndexedDB
 * Returns null if cache is expired or doesn't exist
 */
export async function getOrders(): Promise<{ orders: CachedOrder[]; isStale: boolean } | null> {
  try {
    const db = await openDB();

    // Check cache metadata first
    const metadata = await new Promise<CacheMetadata | undefined>((resolve, reject) => {
      const transaction = db.transaction([CACHE_METADATA_STORE], 'readonly');
      const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);
      const request = metadataStore.get('orders');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!metadata) {
      console.log('[OfflineStorage] No cached orders found');
      return null;
    }

    const now = Date.now();
    const isStale = now > metadata.expiresAt;

    // Get all orders
    const orders = await new Promise<CachedOrder[]>((resolve, reject) => {
      const transaction = db.transaction([ORDER_STORE], 'readonly');
      const orderStore = transaction.objectStore(ORDER_STORE);
      const request = orderStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    console.log('[OfflineStorage] Retrieved cached orders:', orders.length, 'isStale:', isStale);
    return { orders, isStale };
  } catch (error) {
    console.error('[OfflineStorage] Failed to get orders:', error);
    return null;
  }
}

/**
 * Clears all cached orders
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([ORDER_STORE, CACHE_METADATA_STORE], 'readwrite');
    const orderStore = transaction.objectStore(ORDER_STORE);
    const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = orderStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = metadataStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    ]);

    console.log('[OfflineStorage] Cache cleared successfully');
  } catch (error) {
    console.error('[OfflineStorage] Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Gets the cache timestamp
 */
export async function getCacheTimestamp(): Promise<number | null> {
  try {
    const db = await openDB();
    const metadata = await new Promise<CacheMetadata | undefined>((resolve, reject) => {
      const transaction = db.transaction([CACHE_METADATA_STORE], 'readonly');
      const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);
      const request = metadataStore.get('orders');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return metadata?.timestamp || null;
  } catch (error) {
    console.error('[OfflineStorage] Failed to get cache timestamp:', error);
    return null;
  }
}

/**
 * Checks if the app is currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Creates a persister for React Query that uses IndexedDB
 * This can be used with @tanstack/react-query-persist-client
 */
export const createIDBPersister = () => {
  const QUERY_CACHE_KEY = 'react-query-cache';
  const QUERY_CACHE_STORE = 'query-cache';

  return {
    persistClient: async (client: unknown) => {
      try {
        const db = await openDB();

        // Ensure query cache store exists (may need to upgrade DB version if not)
        if (!db.objectStoreNames.contains(QUERY_CACHE_STORE)) {
          console.warn('[OfflineStorage] Query cache store not available');
          return;
        }

        const transaction = db.transaction([QUERY_CACHE_STORE], 'readwrite');
        const store = transaction.objectStore(QUERY_CACHE_STORE);

        await new Promise<void>((resolve, reject) => {
          const request = store.put({ key: QUERY_CACHE_KEY, data: client });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error('[OfflineStorage] Failed to persist query client:', error);
      }
    },
    restoreClient: async () => {
      try {
        const db = await openDB();

        if (!db.objectStoreNames.contains(QUERY_CACHE_STORE)) {
          return undefined;
        }

        const transaction = db.transaction([QUERY_CACHE_STORE], 'readonly');
        const store = transaction.objectStore(QUERY_CACHE_STORE);

        const result = await new Promise<{ key: string; data: unknown } | undefined>((resolve, reject) => {
          const request = store.get(QUERY_CACHE_KEY);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        return result?.data;
      } catch (error) {
        console.error('[OfflineStorage] Failed to restore query client:', error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        const db = await openDB();

        if (!db.objectStoreNames.contains(QUERY_CACHE_STORE)) {
          return;
        }

        const transaction = db.transaction([QUERY_CACHE_STORE], 'readwrite');
        const store = transaction.objectStore(QUERY_CACHE_STORE);

        await new Promise<void>((resolve, reject) => {
          const request = store.delete(QUERY_CACHE_KEY);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error('[OfflineStorage] Failed to remove query client:', error);
      }
    },
  };
};
