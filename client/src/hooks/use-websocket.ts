/**
 * WebSocket Hook for BTS Delivery App
 * 
 * Reusable hook for WebSocket connections with:
 * - Automatic authentication
 * - Channel subscriptions
 * - Reconnection with exponential backoff
 * - Message parsing and event handling
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ============= TYPES =============

export type WebSocketStatus = 'connecting' | 'connected' | 'authenticated' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  channel?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  previousStatus?: string;
  message?: string;
  estimatedDelivery?: string;
  timestamp: string;
}

export interface RiderLocationUpdate {
  riderId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  orderId?: string;
  activityType?: 'idle' | 'traveling_to_pickup' | 'traveling_to_delivery' | 'at_restaurant' | 'at_customer';
  timestamp: string;
}

export interface VendorAlert {
  type: 'new_order' | 'order_cancelled' | 'rider_assigned' | 'order_timeout' | 'order_issue';
  orderId: string;
  orderNumber: string;
  vendorId: string;
  data: any;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface ETAUpdate {
  orderId: string;
  estimatedArrival: string;
  estimatedMinutes: number;
  timestamp: string;
}

export interface UseWebSocketOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Auto-authenticate with stored token */
  autoAuth?: boolean;
  /** Channels to subscribe to after authentication */
  channels?: string[];
  /** Event handlers */
  onMessage?: (message: WebSocketMessage) => void;
  onOrderStatusUpdate?: (update: OrderStatusUpdate) => void;
  onRiderLocationUpdate?: (update: RiderLocationUpdate) => void;
  onVendorAlert?: (alert: VendorAlert) => void;
  onETAUpdate?: (update: ETAUpdate) => void;
  onTrackingEvent?: (event: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onAuthSuccess?: (data: any) => void;
  onAuthFailure?: (error: string) => void;
}

export interface UseWebSocketReturn {
  /** Current connection status */
  status: WebSocketStatus;
  /** Whether authenticated */
  isAuthenticated: boolean;
  /** Current reconnection attempt (0 if connected) */
  reconnectAttempt: number;
  /** Whether currently attempting to reconnect */
  isReconnecting: boolean;
  /** Connect to WebSocket server */
  connect: () => void;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
  /** Subscribe to a channel */
  subscribe: (channel: string) => void;
  /** Subscribe to an order (includes all related channels) */
  subscribeToOrder: (orderId: string) => void;
  /** Unsubscribe from a channel */
  unsubscribe: (channel: string) => void;
  /** Unsubscribe from an order */
  unsubscribeFromOrder: (orderId: string) => void;
  /** Send a raw message */
  send: (message: any) => void;
  /** Send rider location update (for riders only) */
  sendRiderLocation: (location: { lat: number; lng: number; heading?: number; speed?: number; orderId?: string }) => void;
  /** Current subscriptions */
  subscriptions: string[];
}

// ============= CONSTANTS =============

const WS_PATH = '/ws/v2';
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff
const HEARTBEAT_INTERVAL = 25000; // 25 seconds (server expects 30s)

// ============= HOOK =============

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    autoAuth = true,
    channels = [],
    onMessage,
    onOrderStatusUpdate,
    onRiderLocationUpdate,
    onVendorAlert,
    onETAUpdate,
    onTrackingEvent,
    onConnect,
    onDisconnect,
    onError,
    onAuthSuccess,
    onAuthFailure,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChannelsRef = useRef<string[]>([...channels]);
  
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${WS_PATH}`;
  }, []);

  // Clear heartbeat interval
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }, [clearHeartbeat]);

  // Handle incoming message
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle different message types
      switch (message.type) {
        case 'connection':
          // Connection established, authenticate if needed
          if (autoAuth) {
            const token = localStorage.getItem('authToken');
            if (token && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'auth', token }));
            }
          }
          break;

        case 'auth':
          if (message.success) {
            setIsAuthenticated(true);
            setStatus('authenticated');
            onAuthSuccess?.(message);
            
            // Subscribe to pending channels
            pendingChannelsRef.current.forEach(channel => {
              wsRef.current?.send(JSON.stringify({ type: 'subscribe', channel }));
            });
            pendingChannelsRef.current = [];
          } else {
            setIsAuthenticated(false);
            onAuthFailure?.(message.error || 'Authentication failed');
          }
          break;

        case 'subscription_confirmed':
          setSubscriptions(message.subscriptions || []);
          break;

        case 'unsubscription_confirmed':
          setSubscriptions(message.subscriptions || []);
          break;

        case 'subscriptions_list':
          setSubscriptions(message.subscriptions || []);
          break;

        case 'order_status_update':
          onOrderStatusUpdate?.(message as unknown as OrderStatusUpdate);
          break;

        case 'rider_location_update':
          onRiderLocationUpdate?.(message as unknown as RiderLocationUpdate);
          break;

        case 'vendor_alert':
          onVendorAlert?.(message as unknown as VendorAlert);
          break;

        case 'eta_update':
          onETAUpdate?.(message as unknown as ETAUpdate);
          break;

        case 'tracking_event':
          onTrackingEvent?.(message);
          break;

        case 'pong':
          // Heartbeat response, connection is alive
          break;

        case 'error':
          console.warn('[WebSocket] Server error:', message.message);
          onError?.(new Error(message.message));
          break;

        default:
          // Pass to generic handler
          break;
      }

      // Always call generic onMessage handler
      onMessage?.(message);
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }, [autoAuth, onMessage, onOrderStatusUpdate, onRiderLocationUpdate, onVendorAlert, onETAUpdate, onTrackingEvent, onAuthSuccess, onAuthFailure, onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setStatus('connected');
        reconnectAttemptRef.current = 0;
        setReconnectAttempt(0);
        startHeartbeat();
        onConnect?.();
      };

      ws.onmessage = handleMessage;

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setStatus('error');
        onError?.(new Error('WebSocket connection error'));
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setStatus('disconnected');
        setIsAuthenticated(false);
        clearHeartbeat();
        onDisconnect?.();

        // Attempt reconnection with exponential backoff
        if (event.code !== 1000) { // Not a clean close
          const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
          reconnectAttemptRef.current++;
          setReconnectAttempt(reconnectAttemptRef.current);
          
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setStatus('error');
      onError?.(error as Error);
    }
  }, [getWsUrl, handleMessage, startHeartbeat, clearHeartbeat, onConnect, onDisconnect, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    clearHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setStatus('disconnected');
    setIsAuthenticated(false);
    setSubscriptions([]);
  }, [clearHeartbeat]);

  // Subscribe to a channel
  const subscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticated) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
    } else {
      // Queue for later subscription
      pendingChannelsRef.current.push(channel);
    }
  }, [isAuthenticated]);

  // Subscribe to an order (includes all related channels)
  const subscribeToOrder = useCallback((orderId: string) => {
    // Subscribing to `order:{orderId}` automatically subscribes to all related channels
    // on the server side (order_status, rider_location, eta_updates, tracking_events)
    subscribe(`order:${orderId}`);
  }, [subscribe]);

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
    // Remove from pending if queued
    pendingChannelsRef.current = pendingChannelsRef.current.filter(c => c !== channel);
  }, []);

  // Unsubscribe from an order
  const unsubscribeFromOrder = useCallback((orderId: string) => {
    unsubscribe(`order:${orderId}`);
  }, [unsubscribe]);

  // Send a raw message
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }, []);

  // Send rider location update
  const sendRiderLocation = useCallback((location: { 
    lat: number; 
    lng: number; 
    heading?: number; 
    speed?: number; 
    orderId?: string 
  }) => {
    send({
      type: 'rider_location',
      ...location,
    });
  }, [send]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update pending channels when options change
  useEffect(() => {
    const newChannels = channels.filter(c => !subscriptions.includes(c) && !pendingChannelsRef.current.includes(c));
    if (newChannels.length > 0) {
      if (isAuthenticated && wsRef.current?.readyState === WebSocket.OPEN) {
        newChannels.forEach(channel => {
          wsRef.current?.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      } else {
        pendingChannelsRef.current.push(...newChannels);
      }
    }
  }, [channels, isAuthenticated, subscriptions]);

  return {
    status,
    isAuthenticated,
    reconnectAttempt,
    isReconnecting: reconnectAttempt > 0 && status === 'disconnected',
    connect,
    disconnect,
    subscribe,
    subscribeToOrder,
    unsubscribe,
    unsubscribeFromOrder,
    send,
    sendRiderLocation,
    subscriptions,
  };
}

/**
 * Hook specifically for order tracking
 */
export function useOrderWebSocket(orderId: string | undefined, options: Omit<UseWebSocketOptions, 'channels'> = {}) {
  const [orderStatus, setOrderStatus] = useState<OrderStatusUpdate | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocationUpdate | null>(null);
  const [eta, setEta] = useState<ETAUpdate | null>(null);

  const ws = useWebSocket({
    ...options,
    autoConnect: !!orderId,
    channels: orderId ? [`order:${orderId}`] : [],
    onOrderStatusUpdate: (update) => {
      if (update.orderId === orderId) {
        setOrderStatus(update);
      }
      options.onOrderStatusUpdate?.(update);
    },
    onRiderLocationUpdate: (update) => {
      if (update.orderId === orderId) {
        setRiderLocation(update);
      }
      options.onRiderLocationUpdate?.(update);
    },
    onETAUpdate: (update) => {
      if (update.orderId === orderId) {
        setEta(update);
      }
      options.onETAUpdate?.(update);
    },
  });

  // Subscribe/unsubscribe when orderId changes
  useEffect(() => {
    if (orderId && ws.isAuthenticated) {
      ws.subscribeToOrder(orderId);
    }
  }, [orderId, ws.isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...ws,
    orderStatus,
    riderLocation,
    eta,
  };
}

/**
 * Hook specifically for vendor alerts
 */
export function useVendorWebSocket(vendorId: string | undefined, options: Omit<UseWebSocketOptions, 'channels'> = {}) {
  const [alerts, setAlerts] = useState<VendorAlert[]>([]);
  const [latestAlert, setLatestAlert] = useState<VendorAlert | null>(null);

  const ws = useWebSocket({
    ...options,
    autoConnect: !!vendorId,
    channels: vendorId ? [`vendor:${vendorId}`] : [],
    onVendorAlert: (alert) => {
      setLatestAlert(alert);
      setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
      options.onVendorAlert?.(alert);
    },
  });

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setLatestAlert(null);
  }, []);

  return {
    ...ws,
    alerts,
    latestAlert,
    clearAlerts,
  };
}

/**
 * Hook specifically for rider with new order alerts
 */
export function useRiderWebSocket(riderId: string | undefined, options: Omit<UseWebSocketOptions, 'channels'> = {}) {
  const [newOrderAlerts, setNewOrderAlerts] = useState<VendorAlert[]>([]);
  const [latestAlert, setLatestAlert] = useState<VendorAlert | null>(null);

  const ws = useWebSocket({
    ...options,
    autoConnect: !!riderId,
    channels: riderId ? [`rider:${riderId}`] : [],
    onVendorAlert: (alert) => {
      // Riders receive order-related alerts
      if (alert.type === 'new_order' || alert.type === 'rider_assigned') {
        setLatestAlert(alert);
        setNewOrderAlerts(prev => [alert, ...prev].slice(0, 20));
      }
      options.onVendorAlert?.(alert);
    },
    onMessage: (message) => {
      // Handle rider-specific messages like new assignments
      if (message.type === 'new_assignment' || message.type === 'order_assigned') {
        const alert: VendorAlert = {
          type: 'new_order',
          orderId: message.orderId,
          orderNumber: message.orderNumber || message.orderId,
          vendorId: message.vendorId || '',
          data: message,
          urgency: 'high',
          timestamp: message.timestamp || new Date().toISOString(),
        };
        setLatestAlert(alert);
        setNewOrderAlerts(prev => [alert, ...prev].slice(0, 20));
      }
      options.onMessage?.(message);
    },
  });

  const clearAlerts = useCallback(() => {
    setNewOrderAlerts([]);
    setLatestAlert(null);
  }, []);

  const acknowledgeAlert = useCallback((orderId: string) => {
    setNewOrderAlerts(prev => prev.filter(a => a.orderId !== orderId));
    if (latestAlert?.orderId === orderId) {
      setLatestAlert(null);
    }
  }, [latestAlert]);

  return {
    ...ws,
    newOrderAlerts,
    latestAlert,
    clearAlerts,
    acknowledgeAlert,
  };
}

export default useWebSocket;
