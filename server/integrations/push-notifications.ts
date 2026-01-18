// Push Notification Service for BTS Delivery Platform
// Web Push Notifications using service workers and WebSocket real-time updates

import webpush from 'web-push';
import { WebSocket } from 'ws';
import { storage } from '../storage.js';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

export interface WebSocketMessage {
  type: string;
  userId?: string;
  role?: string;
  channel?: string;
  data: any;
  timestamp: number;
}

export class PushNotificationService {
  private vapidKeys: {
    publicKey: string;
    privateKey: string;
  };
  private isConfigured: boolean = false;
  private webSocketConnections: Map<string, WebSocket> = new Map();
  private userSubscriptions: Map<string, Set<string>> = new Map(); // userId -> Set of connectionIds
  
  constructor() {
    this.setupVapidKeys();
  }

  private setupVapidKeys() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'admin@btsdelivery.com';

    if (!publicKey || !privateKey) {
      console.warn('VAPID keys not configured. Generating temporary keys for development...');
      
      // Generate VAPID keys for development (in production, these should be persistent)
      const vapidKeys = webpush.generateVAPIDKeys();
      this.vapidKeys = {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      };
      
      console.log('Generated VAPID keys:');
      console.log('Public Key:', this.vapidKeys.publicKey);
      console.log('Private Key:', this.vapidKeys.privateKey);
      console.log('Add these to your environment variables:');
      console.log(`VAPID_PUBLIC_KEY=${this.vapidKeys.publicKey}`);
      console.log(`VAPID_PRIVATE_KEY=${this.vapidKeys.privateKey}`);
    } else {
      this.vapidKeys = { publicKey, privateKey };
      this.isConfigured = true;
    }

    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      `mailto:${email}`,
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey
    );
  }

  getVapidPublicKey(): string {
    return this.vapidKeys.publicKey;
  }

  // WebSocket connection management
  addWebSocketConnection(connectionId: string, ws: WebSocket, userId?: string) {
    this.webSocketConnections.set(connectionId, ws);
    
    if (userId) {
      if (!this.userSubscriptions.has(userId)) {
        this.userSubscriptions.set(userId, new Set());
      }
      this.userSubscriptions.get(userId)!.add(connectionId);
    }

    // Handle connection close
    ws.on('close', () => {
      this.removeWebSocketConnection(connectionId, userId);
    });

    // Handle incoming messages
    ws.on('message', (data) => {
      this.handleWebSocketMessage(connectionId, data, userId);
    });
  }

  removeWebSocketConnection(connectionId: string, userId?: string) {
    this.webSocketConnections.delete(connectionId);
    
    if (userId && this.userSubscriptions.has(userId)) {
      this.userSubscriptions.get(userId)!.delete(connectionId);
      if (this.userSubscriptions.get(userId)!.size === 0) {
        this.userSubscriptions.delete(userId);
      }
    }
  }

  private handleWebSocketMessage(connectionId: string, data: any, userId?: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      // Handle different message types
      switch (message.type) {
        case 'subscribe_to_channel':
          // Subscribe user to specific notification channels
          this.subscribeToChannel(connectionId, message.channel!, userId);
          break;
        case 'unsubscribe_from_channel':
          this.unsubscribeFromChannel(connectionId, message.channel!, userId);
          break;
        case 'ping':
          this.sendToConnection(connectionId, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          console.log('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  subscribeToChannel(connectionId: string, channel: string, userId?: string) {
    // Logic to subscribe connection to specific channels (e.g., order updates, rider tracking)
    const ws = this.webSocketConnections.get(connectionId);
    if (ws) {
      // Add channel subscription metadata to the WebSocket
      (ws as any).channels = (ws as any).channels || new Set();
      (ws as any).channels.add(channel);
      
      this.sendToConnection(connectionId, {
        type: 'subscribed',
        channel,
        message: `Subscribed to ${channel} notifications`
      });
    }
  }

  unsubscribeFromChannel(connectionId: string, channel: string, userId?: string) {
    const ws = this.webSocketConnections.get(connectionId);
    if (ws && (ws as any).channels) {
      (ws as any).channels.delete(channel);
      
      this.sendToConnection(connectionId, {
        type: 'unsubscribed',
        channel,
        message: `Unsubscribed from ${channel} notifications`
      });
    }
  }

  // Send message to specific connection
  sendToConnection(connectionId: string, message: any) {
    const ws = this.webSocketConnections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
    }
  }

  // Send message to specific user (all their connections)
  sendToUser(userId: string, message: any) {
    const connections = this.userSubscriptions.get(userId);
    if (connections) {
      connections.forEach(connectionId => {
        this.sendToConnection(connectionId, message);
      });
    }
  }

  // Send message to all users with specific role
  sendToRole(role: string, message: any) {
    this.webSocketConnections.forEach((ws, connectionId) => {
      if ((ws as any).userRole === role) {
        this.sendToConnection(connectionId, message);
      }
    });
  }

  // Send message to specific channel subscribers
  sendToChannel(channel: string, message: any) {
    this.webSocketConnections.forEach((ws, connectionId) => {
      if ((ws as any).channels && (ws as any).channels.has(channel)) {
        this.sendToConnection(connectionId, {
          ...message,
          channel
        });
      }
    });
  }

  // Broadcast to all connected users
  broadcast(message: any) {
    this.webSocketConnections.forEach((ws, connectionId) => {
      this.sendToConnection(connectionId, message);
    });
  }

  // Push notification to subscribed devices
  async sendPushNotification(
    subscription: PushSubscription,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Push notification would be sent:', payload.title);
      return true; // Return success in development mode
    }

    try {
      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/badge-72x72.png',
        image: payload.image,
        data: payload.data || {},
        actions: payload.actions || [],
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        timestamp: Date.now()
      });

      await webpush.sendNotification(subscription, notificationPayload);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send push notification to user's subscribed devices
  async sendPushToUser(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    try {
      // Get user's push subscriptions from database
      const subscriptions = await storage.getUserPushSubscriptions(userId);
      
      if (!subscriptions || subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return false;
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => 
          this.sendPushNotification(sub.subscription as PushSubscription, payload)
        )
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      if (failed > 0) {
        console.log(`Push notification: ${successful} successful, ${failed} failed for user ${userId}`);
      }

      return successful > 0;
    } catch (error) {
      console.error('Error sending push notification to user:', error);
      return false;
    }
  }

  // Order-specific notification methods
  async notifyOrderStatusUpdate(userId: string, orderData: any) {
    // Get user notification preferences
    const preferences = await storage.getUserNotificationPreferences(userId) || {
      pushNotifications: true,
      orderUpdates: true,
      orderPlaced: true,
      orderConfirmed: true,
      orderPreparing: true,
      orderReady: true,
      orderDelivered: true,
      quietHoursEnabled: false
    };

    // Check if push notifications are enabled
    if (!preferences.pushNotifications) {
      // Still send WebSocket notification for real-time UI updates
      const notification = this.getOrderStatusMessage(orderData);
      if (notification) {
        this.sendToUser(userId, {
          type: 'order_status_update',
          orderId: orderData.orderId,
          status: orderData.status,
          message: notification.body,
          data: orderData
        });
      }
      return;
    }

    // Check granular order status preferences
    const statusPreferenceMap: Record<string, string> = {
      'placed': 'orderPlaced',
      'confirmed': 'orderConfirmed',
      'preparing': 'orderPreparing',
      'ready': 'orderReady',
      'ready_for_pickup': 'orderReady',
      'delivered': 'orderDelivered',
      'completed': 'orderDelivered'
    };

    const preferenceKey = statusPreferenceMap[orderData.status?.toLowerCase()];
    const shouldSendStatusNotification = preferenceKey ? (preferences as any)[preferenceKey] ?? true : true;

    // Check if quiet hours apply (not for critical statuses)
    const shouldSendNow = this.shouldSendNotificationNow(preferences, orderData.status === 'cancelled' ? 'high' : 'medium');

    const notification = this.getOrderStatusMessage(orderData);
    if (notification) {
      // Always send real-time WebSocket notification (doesn't disturb user)
      this.sendToUser(userId, {
        type: 'order_status_update',
        orderId: orderData.orderId,
        status: orderData.status,
        message: notification.body,
        data: orderData
      });

      // Only send push notification if preferences allow
      if (preferences.orderUpdates && shouldSendStatusNotification && shouldSendNow) {
        await this.sendPushToUser(userId, {
          ...notification,
          data: {
            type: 'order_update',
            orderId: orderData.orderId,
            status: orderData.status,
            url: `/orders/${orderData.orderId}/track`
          },
          actions: [
            {
              action: 'track',
              title: 'Track Order',
              icon: '/icons/track.png'
            },
            {
              action: 'view',
              title: 'View Details',
              icon: '/icons/view.png'
            }
          ],
          tag: `order-${orderData.orderId}`
        });
      }
    }
  }

  // Helper method to get order status messages
  private getOrderStatusMessage(orderData: any) {
    const statusMessages = {
      confirmed: {
        title: 'Order Confirmed!',
        body: `Your order from ${orderData.restaurantName} is confirmed and being prepared.`,
        icon: '/icons/order-confirmed.png'
      },
      preparing: {
        title: 'Order Being Prepared',
        body: `${orderData.restaurantName} is preparing your delicious meal!`,
        icon: '/icons/preparing.png'
      },
      ready: {
        title: 'Order Ready!',
        body: `Your order is ready for pickup. A rider will collect it soon.`,
        icon: '/icons/ready.png'
      },
      picked_up: {
        title: 'Order Picked Up',
        body: `Your order has been picked up and is on the way to you!`,
        icon: '/icons/picked-up.png'
      },
      in_transit: {
        title: 'Rider On The Way!',
        body: `Your rider is heading to your location. Track them live!`,
        icon: '/icons/in-transit.png',
        requireInteraction: true
      },
      delivered: {
        title: 'Order Delivered!',
        body: `Enjoy your meal! Please rate your experience.`,
        icon: '/icons/delivered.png',
        requireInteraction: true
      }
    };

    return statusMessages[orderData.status as keyof typeof statusMessages];
  }

  // Check if we should send notification based on quiet hours
  private shouldSendNotificationNow(preferences: any, urgency: 'low' | 'medium' | 'high' | 'critical'): boolean {
    // Critical notifications always go through
    if (urgency === 'critical') return true;

    // If quiet hours not enabled, send notification
    if (!preferences.quietHoursEnabled) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const quietStart = preferences.quietHoursStart || '22:00';
    const quietEnd = preferences.quietHoursEnd || '08:00';

    const [startHour, startMinute] = quietStart.split(':').map(Number);
    const [endHour, endMinute] = quietEnd.split(':').map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    let isQuietHours = false;
    if (startTime > endTime) {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      isQuietHours = currentTime >= startTime || currentTime < endTime;
    } else {
      isQuietHours = currentTime >= startTime && currentTime < endTime;
    }

    // High urgency can bypass quiet hours for push (but not for less urgent)
    if (urgency === 'high') return true;

    return !isQuietHours;
  }

  async notifyRiderProximity(userId: string, riderData: any) {
    // Get user notification preferences
    const preferences = await storage.getUserNotificationPreferences(userId) || {
      pushNotifications: true,
      riderUpdates: true,
      riderArriving: true,
      quietHoursEnabled: false
    };

    // Always send real-time WebSocket location update (doesn't disturb user)
    this.sendToUser(userId, {
      type: 'rider_proximity',
      orderId: riderData.orderId,
      riderLocation: riderData.location,
      estimatedArrival: riderData.estimatedArrival,
      message: `Your rider ${riderData.riderName} is nearby!`
    });

    // Check if push notifications and rider updates are enabled
    if (!preferences.pushNotifications || !preferences.riderUpdates || !preferences.riderArriving) {
      return;
    }

    // Rider proximity is high urgency - check quiet hours but still allow
    const shouldSendNow = this.shouldSendNotificationNow(preferences, 'high');
    if (!shouldSendNow) return;

    // Send push notification
    await this.sendPushToUser(userId, {
      title: 'Rider Nearby!',
      body: `${riderData.riderName} is approaching your location. ETA: ${riderData.estimatedArrival}`,
      icon: '/icons/rider-nearby.png',
      data: {
        type: 'rider_proximity',
        orderId: riderData.orderId,
        riderPhone: riderData.riderPhone,
        url: `/orders/${riderData.orderId}/track`
      },
      actions: [
        {
          action: 'call_rider',
          title: 'Call Rider',
          icon: '/icons/phone.png'
        },
        {
          action: 'track',
          title: 'Track Live',
          icon: '/icons/track.png'
        }
      ],
      tag: `rider-${riderData.orderId}`,
      requireInteraction: true
    });
  }

  async notifyPaymentStatus(userId: string, paymentData: any) {
    const isSuccess = paymentData.status === 'paid' || paymentData.status === 'completed';
    
    this.sendToUser(userId, {
      type: 'payment_update',
      paymentId: paymentData.paymentId,
      status: paymentData.status,
      amount: paymentData.amount,
      method: paymentData.method
    });

    await this.sendPushToUser(userId, {
      title: isSuccess ? '💳 Payment Successful!' : '❌ Payment Failed',
      body: isSuccess 
        ? `₱${paymentData.amount} payment completed successfully`
        : `Payment of ₱${paymentData.amount} failed. Please try again.`,
      icon: isSuccess ? '/icons/payment-success.png' : '/icons/payment-failed.png',
      data: {
        type: 'payment_update',
        paymentId: paymentData.paymentId,
        status: paymentData.status,
        url: isSuccess ? `/orders/${paymentData.orderId}` : `/payment/retry/${paymentData.paymentId}`
      },
      tag: `payment-${paymentData.paymentId}`,
      requireInteraction: !isSuccess
    });
  }

  async notifyPromotion(userId: string, promotionData: any) {
    // Get user notification preferences
    const preferences = await storage.getUserNotificationPreferences(userId) || {
      pushNotifications: true,
      promotionalEmails: true,
      quietHoursEnabled: false
    };

    // Always send WebSocket notification for real-time UI updates
    this.sendToUser(userId, {
      type: 'promotion',
      promotionId: promotionData.id,
      title: promotionData.title,
      description: promotionData.description,
      discount: promotionData.discount,
      validUntil: promotionData.validUntil
    });

    // Check if push notifications and promotional notifications are enabled
    if (!preferences.pushNotifications || !preferences.promotionalEmails) {
      return;
    }

    // Promotions are low urgency - respect quiet hours
    const shouldSendNow = this.shouldSendNotificationNow(preferences, 'low');
    if (!shouldSendNow) return;

    await this.sendPushToUser(userId, {
      title: `${promotionData.title}`,
      body: promotionData.description,
      icon: '/icons/promotion.png',
      image: promotionData.imageUrl,
      data: {
        type: 'promotion',
        promotionId: promotionData.id,
        url: `/promotions/${promotionData.id}`
      },
      actions: [
        {
          action: 'view_promotion',
          title: 'View Offer',
          icon: '/icons/view.png'
        },
        {
          action: 'order_now',
          title: 'Order Now',
          icon: '/icons/order.png'
        }
      ],
      tag: `promotion-${promotionData.id}`
    });
  }

  // Vendor notifications
  async notifyVendorNewOrder(vendorUserId: string, orderData: any) {
    this.sendToUser(vendorUserId, {
      type: 'new_order',
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
      totalAmount: orderData.totalAmount,
      items: orderData.items
    });

    await this.sendPushToUser(vendorUserId, {
      title: '🔔 New Order Received!',
      body: `Order #${orderData.orderNumber} from ${orderData.customerName} - ₱${orderData.totalAmount}`,
      icon: '/icons/new-order.png',
      data: {
        type: 'new_order',
        orderId: orderData.orderId,
        url: `/vendor/orders/${orderData.orderId}`
      },
      actions: [
        {
          action: 'accept_order',
          title: 'Accept',
          icon: '/icons/accept.png'
        },
        {
          action: 'view_order',
          title: 'View Details',
          icon: '/icons/view.png'
        }
      ],
      tag: `order-${orderData.orderId}`,
      requireInteraction: true
    });
  }

  // Rider notifications
  async notifyRiderAssignment(riderUserId: string, assignmentData: any) {
    this.sendToUser(riderUserId, {
      type: 'order_assignment',
      orderId: assignmentData.orderId,
      pickupAddress: assignmentData.pickupAddress,
      deliveryAddress: assignmentData.deliveryAddress,
      estimatedEarnings: assignmentData.estimatedEarnings
    });

    await this.sendPushToUser(riderUserId, {
      title: '🚗 New Delivery Assignment!',
      body: `Pickup from ${assignmentData.restaurantName} - Earn ₱${assignmentData.estimatedEarnings}`,
      icon: '/icons/delivery-assignment.png',
      data: {
        type: 'order_assignment',
        orderId: assignmentData.orderId,
        url: `/rider/orders/${assignmentData.orderId}`
      },
      actions: [
        {
          action: 'accept_delivery',
          title: 'Accept',
          icon: '/icons/accept.png'
        },
        {
          action: 'view_details',
          title: 'View Route',
          icon: '/icons/map.png'
        }
      ],
      tag: `assignment-${assignmentData.orderId}`,
      requireInteraction: true
    });
  }

  // Admin notifications
  async notifyAdminAlert(alertData: any) {
    this.sendToRole('admin', {
      type: 'admin_alert',
      alertId: alertData.id,
      severity: alertData.severity,
      title: alertData.title,
      message: alertData.message,
      category: alertData.category
    });

    // Send to all admin users
    const adminUsers = await storage.getUsersByRole('admin');
    
    for (const admin of adminUsers) {
      await this.sendPushToUser(admin.id, {
        title: `🚨 ${alertData.severity.toUpperCase()}: ${alertData.title}`,
        body: alertData.message,
        icon: '/icons/admin-alert.png',
        data: {
          type: 'admin_alert',
          alertId: alertData.id,
          url: `/admin/alerts/${alertData.id}`
        },
        tag: `alert-${alertData.id}`,
        requireInteraction: alertData.severity === 'critical'
      });
    }
  }

  // Bulk notification for platform announcements
  async sendBulkNotification(userIds: string[], payload: PushNotificationPayload) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendPushToUser(userId, payload))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`Bulk notification sent: ${successful} successful, ${failed} failed`);
    return { successful, failed, total: userIds.length };
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();