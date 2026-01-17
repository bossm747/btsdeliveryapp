/**
 * WebSocket Manager Service
 *
 * Centralized WebSocket management for real-time location broadcasting,
 * order tracking, vendor alerts, and admin dispatch notifications.
 */

import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { storage } from '../storage';
import { userSessions, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// ============= TYPE DEFINITIONS =============

export interface ExtendedWebSocket extends WebSocket {
  id: string;
  userId?: string;
  userRole?: string;
  riderId?: string;
  vendorId?: string;
  isAlive: boolean;
  subscriptions: Set<string>;
  lastActivity: Date;
  metadata?: {
    deviceType?: string;
    appVersion?: string;
    platform?: string;
  };
}

export interface LocationUpdate {
  riderId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
  orderId?: string;
  activityType?: 'idle' | 'traveling_to_pickup' | 'traveling_to_delivery' | 'at_restaurant' | 'at_customer';
}

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  previousStatus?: string;
  message?: string;
  updatedBy?: string;
  estimatedDelivery?: string;
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

export interface AdminDispatchEvent {
  type: 'order_created' | 'rider_online' | 'rider_offline' | 'delivery_delayed' |
        'sla_violation' | 'zone_congestion' | 'rider_location_batch';
  data: any;
  timestamp: string;
}

export type SubscriptionChannel =
  | `order:${string}`           // Customer tracking their order
  | `rider:${string}`           // Subscribe to specific rider location
  | `vendor:${string}`          // Vendor order alerts
  | `admin:dispatch`            // Admin dispatch console
  | `order_status:${string}`    // Order status updates
  | `rider_location:${string}`  // Rider location for specific order
  | `eta_updates:${string}`     // ETA updates for order
  | `tracking_events:${string}` // Tracking events for order
  | string;                     // Generic channel support

// ============= WEBSOCKET MANAGER CLASS =============

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ExtendedWebSocket> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> clientIds
  private riderConnections: Map<string, string> = new Map(); // riderId -> clientId
  private vendorConnections: Map<string, Set<string>> = new Map(); // vendorId -> clientIds
  private channelSubscribers: Map<string, Set<string>> = new Map(); // channel -> clientIds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly JWT_SECRET: string;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT = 90000; // 90 seconds
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET!;
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required for WebSocket authentication');
    }
  }

  // ============= INITIALIZATION =============

  /**
   * Initialize WebSocket server with existing HTTP server
   */
  initialize(server: any, path: string = '/ws'): WebSocketServer {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws as ExtendedWebSocket);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocketManager] Server error:', error);
    });

    this.wss.on('close', () => {
      this.shutdown();
    });

    // Start heartbeat and cleanup intervals
    this.startHeartbeat();
    this.startCleanup();

    console.log(`[WebSocketManager] Initialized on path: ${path}`);
    return this.wss;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: ExtendedWebSocket): void {
    const clientId = nanoid();

    // Initialize extended properties
    ws.id = clientId;
    ws.isAlive = true;
    ws.subscriptions = new Set();
    ws.lastActivity = new Date();

    this.clients.set(clientId, ws);

    // Send connection acknowledgment
    this.sendToClient(ws, {
      type: 'connection',
      status: 'connected',
      clientId,
      reconnectHint: {
        heartbeatInterval: this.HEARTBEAT_INTERVAL,
        timeout: this.CLIENT_TIMEOUT,
        retryDelays: [1000, 2000, 5000, 10000, 30000]
      },
      timestamp: new Date().toISOString()
    });

    // Set up event handlers
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastActivity = new Date();
    });

    ws.on('message', (message: Buffer) => {
      this.handleMessage(ws, message);
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnection(ws, code, reason.toString());
    });

    ws.on('error', (error) => {
      console.error(`[WebSocketManager] Client ${clientId} error:`, error);
    });

    console.log(`[WebSocketManager] Client connected: ${clientId}`);
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: ExtendedWebSocket, rawMessage: Buffer): Promise<void> {
    ws.lastActivity = new Date();

    try {
      const message = JSON.parse(rawMessage.toString());

      switch (message.type) {
        case 'auth':
          await this.handleAuthentication(ws, message);
          break;

        case 'subscribe':
          this.handleSubscription(ws, message);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(ws, message);
          break;

        case 'rider_location':
          await this.handleRiderLocationUpdate(ws, message);
          break;

        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        case 'get_subscriptions':
          this.sendToClient(ws, {
            type: 'subscriptions_list',
            subscriptions: Array.from(ws.subscriptions),
            timestamp: new Date().toISOString()
          });
          break;

        default:
          this.sendToClient(ws, {
            type: 'error',
            message: `Unknown message type: ${message.type}`,
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error(`[WebSocketManager] Message parse error for ${ws.id}:`, error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format. Expected JSON.',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle client authentication
   */
  private async handleAuthentication(ws: ExtendedWebSocket, message: any): Promise<void> {
    try {
      if (!message.token) {
        this.sendToClient(ws, {
          type: 'auth',
          success: false,
          error: 'JWT token required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(message.token, this.JWT_SECRET) as any;

      // Check session validity
      const [session] = await db.select()
        .from(userSessions)
        .where(eq(userSessions.sessionToken, message.token));

      if (!session || new Date() > session.expiresAt) {
        this.sendToClient(ws, {
          type: 'auth',
          success: false,
          error: 'Token expired or invalid session',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get user data
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, decoded.userId));

      if (!user) {
        this.sendToClient(ws, {
          type: 'auth',
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Set user properties on socket
      ws.userId = user.id;
      ws.userRole = user.role;

      // Track user connection
      if (!this.userConnections.has(user.id)) {
        this.userConnections.set(user.id, new Set());
      }
      this.userConnections.get(user.id)!.add(ws.id);

      // If rider, get rider profile and track
      if (user.role === 'rider') {
        const rider = await storage.getRiderByUserId(user.id);
        if (rider) {
          ws.riderId = rider.id;
          this.riderConnections.set(rider.id, ws.id);

          // Auto-subscribe rider to their own channel
          this.subscribeToChannel(ws, `rider:${rider.id}`);
        }
      }

      // If vendor, track vendor connection
      if (user.role === 'vendor') {
        const restaurants = await storage.getRestaurantsByOwner(user.id);
        if (restaurants.length > 0) {
          ws.vendorId = restaurants[0].id;
          if (!this.vendorConnections.has(restaurants[0].id)) {
            this.vendorConnections.set(restaurants[0].id, new Set());
          }
          this.vendorConnections.get(restaurants[0].id)!.add(ws.id);

          // Auto-subscribe vendor to their own channel
          this.subscribeToChannel(ws, `vendor:${restaurants[0].id}`);
        }
      }

      // Admin auto-subscribes to dispatch
      if (user.role === 'admin') {
        this.subscribeToChannel(ws, 'admin:dispatch');
      }

      // Store device metadata if provided
      if (message.metadata) {
        ws.metadata = message.metadata;
      }

      this.sendToClient(ws, {
        type: 'auth',
        success: true,
        userId: user.id,
        role: user.role,
        riderId: ws.riderId,
        vendorId: ws.vendorId,
        autoSubscriptions: Array.from(ws.subscriptions),
        timestamp: new Date().toISOString()
      });

      console.log(`[WebSocketManager] Client ${ws.id} authenticated as ${user.role} (${user.id})`);
    } catch (error) {
      console.error(`[WebSocketManager] Auth error for ${ws.id}:`, error);
      this.sendToClient(ws, {
        type: 'auth',
        success: false,
        error: 'Invalid JWT token',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle subscription request
   */
  private async handleSubscription(ws: ExtendedWebSocket, message: any): Promise<void> {
    const { channel, orderId, riderId, vendorId } = message;

    // Build channel name from various formats
    let channelName = channel;
    if (!channelName) {
      if (orderId) channelName = `order:${orderId}`;
      else if (riderId) channelName = `rider:${riderId}`;
      else if (vendorId) channelName = `vendor:${vendorId}`;
    }

    if (!channelName) {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Channel or identifier required for subscription',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify permissions for certain channels
    const hasPermission = await this.verifyChannelPermission(ws, channelName);
    if (!hasPermission) {
      this.sendToClient(ws, {
        type: 'subscription_denied',
        channel: channelName,
        reason: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Subscribe to main channel
    this.subscribeToChannel(ws, channelName);

    // For order subscriptions, also subscribe to related channels
    if (channelName.startsWith('order:')) {
      const orderIdFromChannel = channelName.split(':')[1];
      this.subscribeToChannel(ws, `order_status:${orderIdFromChannel}`);
      this.subscribeToChannel(ws, `rider_location:${orderIdFromChannel}`);
      this.subscribeToChannel(ws, `eta_updates:${orderIdFromChannel}`);
      this.subscribeToChannel(ws, `tracking_events:${orderIdFromChannel}`);
    }

    this.sendToClient(ws, {
      type: 'subscription_confirmed',
      channel: channelName,
      subscriptions: Array.from(ws.subscriptions),
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocketManager] Client ${ws.id} subscribed to: ${channelName}`);
  }

  /**
   * Verify if client has permission to subscribe to channel
   */
  private async verifyChannelPermission(ws: ExtendedWebSocket, channel: string): Promise<boolean> {
    // Admin can subscribe to anything
    if (ws.userRole === 'admin') return true;

    // Parse channel type
    const [channelType, channelId] = channel.split(':');

    switch (channelType) {
      case 'order':
      case 'order_status':
      case 'rider_location':
      case 'eta_updates':
      case 'tracking_events':
        // Verify user has access to this order
        if (!ws.userId) return false;
        const order = await storage.getOrder(channelId);
        if (!order) return false;

        // Customer can track their own orders
        if (order.customerId === ws.userId) return true;

        // Rider can track assigned orders
        if (order.riderId === ws.userId || order.riderId === ws.riderId) return true;

        // Vendor can track orders from their restaurant
        if (ws.vendorId && order.restaurantId === ws.vendorId) return true;

        // Check if user owns the restaurant
        if (order.restaurantId) {
          const restaurant = await storage.getRestaurant(order.restaurantId);
          if (restaurant?.ownerId === ws.userId) return true;
        }

        return false;

      case 'rider':
        // Riders can only subscribe to their own location channel
        if (ws.riderId === channelId) return true;
        // Customers can subscribe if they have an active order with this rider
        // This would require additional checks
        return ws.userRole === 'admin';

      case 'vendor':
        // Vendors can only subscribe to their own channel
        if (ws.vendorId === channelId) return true;
        return false;

      case 'admin':
        // Only admins can subscribe to admin channels
        return ws.userRole === 'admin';

      default:
        // Default: require authentication
        return !!ws.userId;
    }
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscription(ws: ExtendedWebSocket, message: any): void {
    const { channel, orderId, riderId, vendorId } = message;

    let channelName = channel;
    if (!channelName) {
      if (orderId) channelName = `order:${orderId}`;
      else if (riderId) channelName = `rider:${riderId}`;
      else if (vendorId) channelName = `vendor:${vendorId}`;
    }

    if (!channelName) {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Channel or identifier required for unsubscription',
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.unsubscribeFromChannel(ws, channelName);

    // For order unsubscriptions, also unsubscribe from related channels
    if (channelName.startsWith('order:')) {
      const orderIdFromChannel = channelName.split(':')[1];
      this.unsubscribeFromChannel(ws, `order_status:${orderIdFromChannel}`);
      this.unsubscribeFromChannel(ws, `rider_location:${orderIdFromChannel}`);
      this.unsubscribeFromChannel(ws, `eta_updates:${orderIdFromChannel}`);
      this.unsubscribeFromChannel(ws, `tracking_events:${orderIdFromChannel}`);
    }

    this.sendToClient(ws, {
      type: 'unsubscription_confirmed',
      channel: channelName,
      subscriptions: Array.from(ws.subscriptions),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle rider location update from WebSocket
   */
  private async handleRiderLocationUpdate(ws: ExtendedWebSocket, message: any): Promise<void> {
    if (!ws.riderId && ws.userRole !== 'rider') {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Only authenticated riders can send location updates',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { lat, lng, heading, speed, accuracy, orderId, activityType } = message;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Valid lat and lng coordinates required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const riderId = ws.riderId || message.riderId;
    if (!riderId) {
      this.sendToClient(ws, {
        type: 'error',
        message: 'Rider ID not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Broadcast location update
    await this.broadcastRiderLocation({
      riderId,
      lat,
      lng,
      heading,
      speed,
      accuracy,
      orderId,
      activityType,
      timestamp: new Date().toISOString()
    });

    // Acknowledge receipt
    this.sendToClient(ws, {
      type: 'location_acknowledged',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: ExtendedWebSocket, code: number, reason: string): void {
    console.log(`[WebSocketManager] Client ${ws.id} disconnected: ${code} - ${reason}`);

    // Clean up subscriptions
    ws.subscriptions.forEach(channel => {
      this.channelSubscribers.get(channel)?.delete(ws.id);
    });

    // Clean up user connections
    if (ws.userId) {
      const userClients = this.userConnections.get(ws.userId);
      if (userClients) {
        userClients.delete(ws.id);
        if (userClients.size === 0) {
          this.userConnections.delete(ws.userId);
        }
      }
    }

    // Clean up rider connections
    if (ws.riderId) {
      this.riderConnections.delete(ws.riderId);
    }

    // Clean up vendor connections
    if (ws.vendorId) {
      const vendorClients = this.vendorConnections.get(ws.vendorId);
      if (vendorClients) {
        vendorClients.delete(ws.id);
        if (vendorClients.size === 0) {
          this.vendorConnections.delete(ws.vendorId);
        }
      }
    }

    // Remove from clients map
    this.clients.delete(ws.id);
  }

  // ============= SUBSCRIPTION MANAGEMENT =============

  private subscribeToChannel(ws: ExtendedWebSocket, channel: string): void {
    ws.subscriptions.add(channel);

    if (!this.channelSubscribers.has(channel)) {
      this.channelSubscribers.set(channel, new Set());
    }
    this.channelSubscribers.get(channel)!.add(ws.id);
  }

  private unsubscribeFromChannel(ws: ExtendedWebSocket, channel: string): void {
    ws.subscriptions.delete(channel);
    this.channelSubscribers.get(channel)?.delete(ws.id);
  }

  // ============= BROADCAST METHODS =============

  /**
   * Send message to specific client
   */
  private sendToClient(ws: ExtendedWebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast to all subscribers of a channel
   */
  broadcastToChannel(channel: string, data: any): void {
    const message = JSON.stringify({
      ...data,
      channel,
      timestamp: data.timestamp || new Date().toISOString()
    });

    const subscribers = this.channelSubscribers.get(channel);
    if (!subscribers) return;

    subscribers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast rider location update
   */
  async broadcastRiderLocation(location: LocationUpdate): Promise<void> {
    const { riderId, orderId } = location;

    // Broadcast to rider's own channel
    this.broadcastToChannel(`rider:${riderId}`, {
      type: 'rider_location_update',
      ...location
    });

    // If there's an active order, broadcast to order tracking channels
    if (orderId) {
      this.broadcastToChannel(`rider_location:${orderId}`, {
        type: 'rider_location_update',
        ...location
      });

      this.broadcastToChannel(`order:${orderId}`, {
        type: 'rider_location_update',
        ...location
      });
    } else {
      // Find active orders for this rider and broadcast to them
      const rider = await storage.getRider(riderId);
      if (rider?.userId) {
        const activeOrders = await storage.getOrdersByRider(rider.userId);
        const inProgressOrders = activeOrders.filter(o =>
          ['picked_up', 'in_transit', 'ready'].includes(o.status)
        );

        inProgressOrders.forEach(order => {
          this.broadcastToChannel(`rider_location:${order.id}`, {
            type: 'rider_location_update',
            ...location,
            orderId: order.id
          });

          this.broadcastToChannel(`order:${order.id}`, {
            type: 'rider_location_update',
            ...location,
            orderId: order.id
          });
        });
      }
    }

    // Notify admin dispatch
    this.broadcastToChannel('admin:dispatch', {
      type: 'rider_location_update',
      ...location
    });
  }

  /**
   * Broadcast order status update
   */
  broadcastOrderStatusUpdate(update: OrderStatusUpdate): void {
    const { orderId } = update;

    // Broadcast to all order-related channels
    this.broadcastToChannel(`order:${orderId}`, {
      type: 'order_status_update',
      ...update
    });

    this.broadcastToChannel(`order_status:${orderId}`, {
      type: 'order_status_update',
      ...update
    });

    // Notify admin dispatch
    this.broadcastToChannel('admin:dispatch', {
      type: 'order_status_update',
      ...update
    });
  }

  /**
   * Send vendor alert for new orders and other events
   */
  broadcastVendorAlert(alert: VendorAlert): void {
    const { vendorId } = alert;

    // Broadcast to vendor channel
    this.broadcastToChannel(`vendor:${vendorId}`, {
      ...alert,
      messageType: 'vendor_alert'
    });

    // Also notify admin dispatch
    this.broadcastToChannel('admin:dispatch', {
      ...alert,
      messageType: 'vendor_alert'
    });
  }

  /**
   * Send admin dispatch event
   */
  broadcastAdminDispatchEvent(event: AdminDispatchEvent): void {
    this.broadcastToChannel('admin:dispatch', {
      ...event,
      messageType: 'admin_dispatch_event'
    });
  }

  /**
   * Broadcast ETA update for an order
   */
  broadcastETAUpdate(orderId: string, estimatedArrival: string, estimatedMinutes: number): void {
    const update = {
      type: 'eta_update',
      orderId,
      estimatedArrival,
      estimatedMinutes,
      timestamp: new Date().toISOString()
    };

    this.broadcastToChannel(`eta_updates:${orderId}`, update);
    this.broadcastToChannel(`order:${orderId}`, update);
  }

  /**
   * Broadcast tracking event
   */
  broadcastTrackingEvent(orderId: string, event: any): void {
    const trackingEvent = {
      type: 'tracking_event',
      orderId,
      event,
      timestamp: new Date().toISOString()
    };

    this.broadcastToChannel(`tracking_events:${orderId}`, trackingEvent);
    this.broadcastToChannel(`order:${orderId}`, trackingEvent);
  }

  /**
   * Broadcast to specific user(s)
   */
  broadcastToUser(userId: string, data: any): void {
    const userClients = this.userConnections.get(userId);
    if (!userClients) return;

    const message = JSON.stringify({
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    });

    userClients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast to users by role
   */
  broadcastToRole(role: string, data: any): void {
    const message = JSON.stringify({
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    });

    this.clients.forEach(client => {
      if (client.userRole === role && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // ============= UTILITY METHODS =============

  /**
   * Check if rider is currently connected
   */
  isRiderOnline(riderId: string): boolean {
    const clientId = this.riderConnections.get(riderId);
    if (!clientId) return false;

    const client = this.clients.get(clientId);
    return !!client && client.readyState === WebSocket.OPEN;
  }

  /**
   * Get all online riders
   */
  getOnlineRiders(): string[] {
    return Array.from(this.riderConnections.keys()).filter(riderId =>
      this.isRiderOnline(riderId)
    );
  }

  /**
   * Get subscriber count for a channel
   */
  getChannelSubscriberCount(channel: string): number {
    return this.channelSubscribers.get(channel)?.size || 0;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    riderConnections: number;
    vendorConnections: number;
    adminConnections: number;
    channelCount: number;
  } {
    let authenticatedConnections = 0;
    let adminConnections = 0;

    this.clients.forEach(client => {
      if (client.userId) authenticatedConnections++;
      if (client.userRole === 'admin') adminConnections++;
    });

    return {
      totalConnections: this.clients.size,
      authenticatedConnections,
      riderConnections: this.riderConnections.size,
      vendorConnections: this.vendorConnections.size,
      adminConnections,
      channelCount: this.channelSubscribers.size
    };
  }

  // ============= HEARTBEAT & CLEANUP =============

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws, clientId) => {
        if (!ws.isAlive) {
          console.log(`[WebSocketManager] Terminating inactive client: ${clientId}`);
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean up empty channel subscriptions
      this.channelSubscribers.forEach((subscribers, channel) => {
        if (subscribers.size === 0) {
          this.channelSubscribers.delete(channel);
        }
      });

      // Clean up stale connections
      this.clients.forEach((ws, clientId) => {
        const lastActivity = ws.lastActivity.getTime();
        if (now - lastActivity > this.CLIENT_TIMEOUT) {
          console.log(`[WebSocketManager] Cleaning up stale client: ${clientId}`);
          ws.terminate();
        }
      });
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    console.log('[WebSocketManager] Shutting down...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all client connections
    this.clients.forEach((ws, clientId) => {
      ws.close(1001, 'Server shutting down');
    });

    this.clients.clear();
    this.userConnections.clear();
    this.riderConnections.clear();
    this.vendorConnections.clear();
    this.channelSubscribers.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('[WebSocketManager] Shutdown complete');
  }

  /**
   * Get the WebSocket server instance
   */
  getServer(): WebSocketServer | null {
    return this.wss;
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();
