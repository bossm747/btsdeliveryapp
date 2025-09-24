// Service Worker for BTS Delivery Platform
// Handles push notifications, caching, and offline functionality

const CACHE_NAME = 'bts-delivery-v1';
const API_CACHE_NAME = 'bts-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icons/order-confirmed.png',
  '/icons/preparing.png',
  '/icons/ready.png',
  '/icons/picked-up.png',
  '/icons/in-transit.png',
  '/icons/delivered.png',
  '/icons/rider-nearby.png',
  '/icons/payment-success.png',
  '/icons/payment-failed.png',
  '/icons/promotion.png',
  '/icons/new-order.png',
  '/icons/delivery-assignment.png',
  '/icons/admin-alert.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response before caching
          const responseClone = response.clone();
          
          // Cache successful API responses
          if (response.status === 200) {
            caches.open(API_CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
          }
          
          return response;
        })
        .catch(() => {
          // Fallback to cache for API requests
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response before caching
            const responseClone = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
            
            return response;
          });
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const notificationOptions = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      image: data.image,
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag,
      requireInteraction: data.requireInteraction || false,
      silent: false,
      timestamp: data.timestamp || Date.now(),
      vibrate: [200, 100, 200] // Vibration pattern for mobile devices
    };

    // Add default actions if none provided
    if (!notificationOptions.actions.length) {
      notificationOptions.actions = [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ];
    }

    event.waitUntil(
      self.registration.showNotification(data.title, notificationOptions)
    );
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    
    // Show a generic notification as fallback
    event.waitUntil(
      self.registration.showNotification('BTS Delivery', {
        body: 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  let url = '/';
  
  // Handle different notification actions
  switch (action) {
    case 'view':
    case 'track':
    case 'view_order':
    case 'view_details':
    case 'view_promotion':
      url = data.url || '/';
      break;
    case 'call_rider':
      if (data.riderPhone) {
        url = `tel:${data.riderPhone}`;
      }
      break;
    case 'accept_order':
      url = `/vendor/orders/${data.orderId}/accept`;
      break;
    case 'accept_delivery':
      url = `/rider/orders/${data.orderId}/accept`;
      break;
    case 'order_now':
      url = '/restaurants';
      break;
    case 'dismiss':
      return; // Just close notification
    default:
      url = data.url || '/';
      break;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notification closed:', event.notification);
  
  // Track notification dismissal analytics
  const data = event.notification.data || {};
  
  if (data.analyticsId) {
    // Send analytics data about notification dismissal
    fetch('/api/analytics/notification-dismissed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: data.analyticsId,
        dismissedAt: Date.now()
      })
    }).catch(error => {
      console.error('[SW] Failed to send dismissal analytics:', error);
    });
  }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'order-updates') {
    event.waitUntil(syncOrderUpdates());
  }
  
  if (event.tag === 'notification-actions') {
    event.waitUntil(syncNotificationActions());
  }
});

// Sync order updates when back online
async function syncOrderUpdates() {
  try {
    console.log('[SW] Syncing order updates...');
    
    // Get pending order updates from IndexedDB or cache
    const pendingUpdates = await getPendingOrderUpdates();
    
    for (const update of pendingUpdates) {
      try {
        await fetch('/api/orders/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(update)
        });
        
        // Remove from pending updates after successful sync
        await removePendingOrderUpdate(update.id);
      } catch (error) {
        console.error('[SW] Failed to sync order update:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync notification actions when back online
async function syncNotificationActions() {
  try {
    console.log('[SW] Syncing notification actions...');
    
    const pendingActions = await getPendingNotificationActions();
    
    for (const action of pendingActions) {
      try {
        await fetch('/api/notifications/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(action)
        });
        
        await removePendingNotificationAction(action.id);
      } catch (error) {
        console.error('[SW] Failed to sync notification action:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Notification action sync failed:', error);
  }
}

// IndexedDB helper functions for offline storage
async function getPendingOrderUpdates() {
  // Simplified for now - in a full implementation, this would use IndexedDB
  return [];
}

async function removePendingOrderUpdate(id) {
  // Remove from IndexedDB
}

async function getPendingNotificationActions() {
  return [];
}

async function removePendingNotificationAction(id) {
  // Remove from IndexedDB
}

// Message handling for communication with main thread
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLAIM_CLIENTS':
      self.clients.claim();
      break;
    case 'CACHE_URLS':
      cacheUrls(payload.urls);
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(urls);
}

console.log('[SW] Service worker script loaded');