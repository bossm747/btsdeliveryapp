import { NodemailerProvider } from '../integrations/email.js';
import { TwilioProvider, SemaphoreProvider } from '../integrations/sms.js';
import { WebSocket } from 'ws';
import { storage } from '../storage.js';
import type { Order, Restaurant, User, Rider } from '../../shared/schema.js';

export interface NotificationChannel {
  email: boolean;
  sms: boolean;
  push: boolean;
  realTime: boolean;
}

export interface OrderNotificationData {
  orderId: string;
  orderNumber: string;
  status: string;
  previousStatus?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  restaurantName: string;
  totalAmount: number;
  estimatedDeliveryTime?: Date;
  riderName?: string;
  riderPhone?: string;
  deliveryAddress: any;
  items: any[];
  message?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationPreferences {
  orderUpdates: NotificationChannel;
  promotions: NotificationChannel;
  orderReminders: NotificationChannel;
  emergencyAlerts: NotificationChannel;
}

export class OrderNotificationService {
  private emailProvider: NodemailerProvider;
  private smsProvider: TwilioProvider | SemaphoreProvider;
  private webSocketServer?: any;
  
  constructor(webSocketServer?: any) {
    this.emailProvider = new NodemailerProvider();
    // Use TwilioProvider as primary, fallback to SemaphoreProvider
    try {
      this.smsProvider = new TwilioProvider();
    } catch {
      this.smsProvider = new SemaphoreProvider();
    }
    this.webSocketServer = webSocketServer;
  }

  // ============= CUSTOMER NOTIFICATIONS =============
  
  async notifyOrderPlaced(notificationData: OrderNotificationData) {
    const { orderId, orderNumber, customerName, customerEmail, customerPhone, restaurantName, totalAmount, estimatedDeliveryTime } = notificationData;

    // Get user and check preferences
    const user = await storage.getUserByEmail(customerEmail);
    if (!user) return;

    const preferences = await storage.getUserNotificationPreferences(user.id) || {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      orderUpdates: true,
      orderPlaced: true,
      orderConfirmed: true,
      orderPreparing: true,
      orderReady: true,
      orderDelivered: true,
      riderUpdates: true,
      riderAssigned: true,
      riderArriving: true,
      quietHoursEnabled: false
    };

    // Check if this specific order status notification should be sent
    const shouldSendOrderNotification = this.shouldSendOrderStatusNotification(preferences, 'placed');
    if (!shouldSendOrderNotification) return;

    // Check if we should send notifications (quiet hours, preferences)
    const shouldSendNow = this.shouldSendNotification(preferences, 'medium');

    // Email notification
    if (preferences.emailNotifications && shouldSendNow.email) {
      const emailHtml = this.generateOrderPlacedEmail(notificationData);
      const emailSent = await this.emailProvider.sendEmail(
        customerEmail,
        `Order Confirmed - BTS Delivery #${orderNumber}`,
        emailHtml
      );
      
      // Log email notification
      await storage.createOrderNotification({
        orderId,
        recipientId: user.id,
        recipientRole: 'customer',
        notificationType: 'email',
        trigger: 'order_placed',
        subject: `Order Confirmed - BTS Delivery #${orderNumber}`,
        message: 'Order confirmation email with details',
        status: emailSent ? 'sent' : 'failed',
        sentAt: emailSent ? new Date() : undefined,
        failureReason: emailSent ? undefined : 'Email send failed'
      });
    }

    // SMS notification for high-value orders or customer preference
    if (preferences.smsNotifications && (totalAmount > 500 || shouldSendNow.sms)) {
      const smsMessage = `Hi ${customerName}! Your order #${orderNumber} from ${restaurantName} has been confirmed. Track it at btdelivery.com/track/${orderId}`;
      const smsSent = await this.smsProvider.sendSMS(customerPhone, smsMessage);

      // Log SMS notification
      await storage.createOrderNotification({
        orderId,
        recipientId: user.id,
        recipientRole: 'customer',
        notificationType: 'sms',
        trigger: 'order_placed',
        subject: 'Order Confirmed',
        message: smsMessage,
        status: smsSent ? 'sent' : 'failed',
        sentAt: smsSent ? new Date() : undefined,
        failureReason: smsSent ? undefined : 'SMS send failed'
      });
    }

    // Real-time notification (always send if user is online)
    this.broadcastOrderUpdate(orderId, 'order_placed', `Your order has been confirmed and sent to ${restaurantName}`);

    // Push notification
    if (preferences.pushNotifications && shouldSendNow.push) {
      await this.sendPushNotification({
        title: 'Order Confirmed!',
        body: `Your order from ${restaurantName} has been confirmed`,
        data: { orderId, type: 'order_update' }
      }, [customerEmail]);
    }
  }

  async notifyOrderStatusChange(notificationData: OrderNotificationData) {
    const { orderId, orderNumber, status, previousStatus, customerName, customerEmail, customerPhone, restaurantName } = notificationData;

    // Get user and check preferences
    const user = await storage.getUserByEmail(customerEmail);
    if (!user) return;

    const preferences = await storage.getUserNotificationPreferences(user.id) || {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      orderUpdates: true,
      orderPlaced: true,
      orderConfirmed: true,
      orderPreparing: true,
      orderReady: true,
      orderDelivered: true,
      riderUpdates: true,
      riderAssigned: true,
      riderArriving: true,
      quietHoursEnabled: false
    };

    // Check if this specific order status notification should be sent
    const shouldSendOrderNotification = this.shouldSendOrderStatusNotification(preferences, status);

    // Cancelled orders always get notified (override preference for cancelled status)
    const isCriticalStatus = status === 'cancelled';

    if (!shouldSendOrderNotification && !isCriticalStatus) return;

    // Check if we should send notifications (quiet hours, preferences)
    const urgency = isCriticalStatus ? 'high' : 'medium';
    const shouldSendNow = this.shouldSendNotification(preferences, urgency);

    const statusMessages = {
      confirmed: `Great news! ${restaurantName} has confirmed your order and is now preparing it.`,
      preparing: `Your delicious food is being prepared by ${restaurantName}. Estimated completion in 15-20 minutes.`,
      ready: `Your order is ready for pickup! A rider will collect it soon.`,
      picked_up: `Your order has been picked up and is on the way to you!`,
      in_transit: `Your rider is on the way! Track their location in real-time.`,
      delivered: `Enjoy your meal! Your order has been delivered successfully.`,
      cancelled: `Your order has been cancelled. We apologize for any inconvenience.`
    };

    const message = statusMessages[status as keyof typeof statusMessages] || `Your order status has been updated to ${status}`;

    // Email for important status changes
    if (['confirmed', 'in_transit', 'delivered', 'cancelled'].includes(status)) {
      if (preferences.emailNotifications && shouldSendNow.email) {
        const emailHtml = this.generateStatusUpdateEmail(notificationData, message);
        await this.emailProvider.sendEmail(
          customerEmail,
          `Order Update - ${restaurantName} #${orderNumber}`,
          emailHtml
        );
      }
    }

    // SMS for critical updates
    if (['in_transit', 'delivered', 'cancelled'].includes(status)) {
      if (preferences.smsNotifications && shouldSendNow.sms) {
        const smsMessage = `Order #${orderNumber}: ${message}`;
        await this.smsProvider.sendSMS(customerPhone, smsMessage);
      }
    }

    // Real-time update (always send - WebSocket doesn't disturb users)
    this.broadcastOrderUpdate(orderId, status, message);

    // Push notification for mobile users
    if (preferences.pushNotifications && shouldSendNow.push) {
      await this.sendPushNotification({
        title: `Order ${status.replace('_', ' ').toUpperCase()}`,
        body: message,
        data: { orderId, status, type: 'status_update' }
      }, [customerEmail]);
    }
  }

  async notifyDeliveryUpdate(notificationData: OrderNotificationData & { estimatedArrival?: Date; riderLocation?: any }) {
    const { orderId, customerEmail, customerPhone, riderName, estimatedArrival, riderLocation } = notificationData;

    // Get user and check preferences
    const user = await storage.getUserByEmail(customerEmail);
    if (!user) return;

    const preferences = await storage.getUserNotificationPreferences(user.id) || {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      riderUpdates: true,
      riderAssigned: true,
      riderArriving: true,
      quietHoursEnabled: false
    };

    // Check if rider arriving notifications are enabled
    const shouldSendRiderNotification = this.shouldSendRiderNotification(preferences, 'arriving');
    if (!shouldSendRiderNotification) return;

    // Check if we should send notifications (quiet hours) - rider arriving is high urgency
    const shouldSendNow = this.shouldSendNotification(preferences, 'high');

    if (estimatedArrival) {
      const eta = new Date(estimatedArrival).toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const message = `Your rider ${riderName} is nearby! ETA: ${eta}`;

      // SMS for final delivery update
      if (preferences.smsNotifications && shouldSendNow.sms) {
        await this.smsProvider.sendSMS(customerPhone, `Order #${notificationData.orderNumber}: ${message}`);
      }

      // Real-time location update (always send - WebSocket doesn't disturb users)
      this.broadcastRiderLocation(orderId, riderLocation);

      // Push notification
      if (preferences.pushNotifications && shouldSendNow.push) {
        await this.sendPushNotification({
          title: 'Rider Nearby!',
          body: message,
          data: { orderId, type: 'delivery_update' }
        }, [customerEmail]);
      }
    }
  }

  // ============= VENDOR NOTIFICATIONS =============

  async notifyNewOrder(vendorEmail: string, vendorPhone: string, notificationData: OrderNotificationData) {
    const { orderId, orderNumber, customerName, totalAmount, items } = notificationData;
    
    // Email notification with order details
    const emailHtml = this.generateVendorNewOrderEmail(notificationData);
    await this.emailProvider.sendEmail(
      vendorEmail,
      `New Order Received - #${orderNumber}`,
      emailHtml
    );

    // SMS for immediate attention
    const smsMessage = `New order #${orderNumber} from ${customerName}. Total: ₱${totalAmount.toFixed(2)}. ${items.length} items. Check your dashboard to accept.`;
    await this.smsProvider.sendSMS(vendorPhone, smsMessage);

    // Real-time notification to vendor dashboard
    this.broadcastToRole('vendor', {
      type: 'new_order',
      orderId,
      orderNumber,
      customerName,
      totalAmount,
      timestamp: new Date().toISOString()
    });

    // Push notification
    await this.sendPushNotification({
      title: 'New Order Received!',
      body: `Order #${orderNumber} from ${customerName} - ₱${totalAmount.toFixed(2)}`,
      data: { orderId, type: 'new_order' }
    }, [vendorEmail]);
  }

  async notifyOrderTimeout(vendorEmail: string, vendorPhone: string, notificationData: OrderNotificationData) {
    const { orderNumber } = notificationData;
    
    // SMS urgent notification
    const smsMessage = `URGENT: Order #${orderNumber} requires immediate attention. Please accept or decline within 5 minutes.`;
    await this.smsProvider.sendSMS(vendorPhone, smsMessage);

    // Push notification
    await this.sendPushNotification({
      title: 'Order Timeout Warning!',
      body: `Order #${orderNumber} needs immediate response`,
      data: { orderId: notificationData.orderId, type: 'order_timeout', urgency: 'high' }
    }, [vendorEmail]);
  }

  // ============= RIDER NOTIFICATIONS =============

  async notifyRiderAssignment(riderEmail: string, riderPhone: string, notificationData: OrderNotificationData) {
    const { orderId, orderNumber, restaurantName, deliveryAddress, totalAmount } = notificationData;
    
    // SMS with pickup details
    const smsMessage = `New delivery assigned! Order #${orderNumber} from ${restaurantName}. Pickup address and customer details in app.`;
    await this.smsProvider.sendSMS(riderPhone, smsMessage);

    // Real-time notification to rider app
    this.broadcastToRole('rider', {
      type: 'order_assigned',
      orderId,
      orderNumber,
      restaurantName,
      deliveryAddress,
      totalAmount,
      timestamp: new Date().toISOString()
    });

    // Push notification
    await this.sendPushNotification({
      title: 'New Delivery Assignment!',
      body: `Pickup from ${restaurantName} - ₱${totalAmount.toFixed(2)}`,
      data: { orderId, type: 'assignment' }
    }, [riderEmail]);
  }

  async notifyUrgentDelivery(riderEmail: string, riderPhone: string, notificationData: OrderNotificationData) {
    const { orderNumber, restaurantName } = notificationData;
    
    // SMS urgent notification
    const smsMessage = `URGENT DELIVERY: Order #${orderNumber} from ${restaurantName} is priority. Please respond immediately.`;
    await this.smsProvider.sendSMS(riderPhone, smsMessage);
  }

  // ============= ADMIN NOTIFICATIONS =============

  async notifyOrderIssue(adminEmails: string[], notificationData: OrderNotificationData & { issueType: string; issueDescription: string }) {
    const { orderNumber, issueType, issueDescription, urgency } = notificationData;
    
    const subject = `${urgency.toUpperCase()} Order Issue - #${orderNumber}`;
    const emailHtml = `
      <h2>Order Issue Report</h2>
      <p><strong>Order:</strong> #${orderNumber}</p>
      <p><strong>Issue Type:</strong> ${issueType}</p>
      <p><strong>Description:</strong> ${issueDescription}</p>
      <p><strong>Urgency:</strong> ${urgency}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p><a href="${process.env.FRONTEND_URL}/admin/orders/${notificationData.orderId}">View Order Details</a></p>
    `;

    // Email all admins
    for (const email of adminEmails) {
      await this.emailProvider.sendEmail(email, subject, emailHtml);
    }

    // Real-time notification to admin dashboard
    this.broadcastToRole('admin', {
      type: 'order_issue',
      orderId: notificationData.orderId,
      orderNumber,
      issueType,
      issueDescription,
      urgency,
      timestamp: new Date().toISOString()
    });
  }

  async notifySLAViolation(adminEmails: string[], notificationData: OrderNotificationData & { violationType: string; expectedTime: Date; actualTime: Date }) {
    const { orderNumber, violationType, expectedTime, actualTime } = notificationData;
    
    const delay = Math.round((actualTime.getTime() - expectedTime.getTime()) / (1000 * 60));
    
    const emailHtml = `
      <h2>SLA Violation Alert</h2>
      <p><strong>Order:</strong> #${orderNumber}</p>
      <p><strong>Violation:</strong> ${violationType}</p>
      <p><strong>Expected:</strong> ${expectedTime.toLocaleString()}</p>
      <p><strong>Actual:</strong> ${actualTime.toLocaleString()}</p>
      <p><strong>Delay:</strong> ${delay} minutes</p>
      <p><a href="${process.env.FRONTEND_URL}/admin/orders/${notificationData.orderId}">Investigate Order</a></p>
    `;

    for (const email of adminEmails) {
      await this.emailProvider.sendEmail(email, `SLA Violation - Order #${orderNumber}`, emailHtml);
    }
  }

  // ============= HELPER METHODS =============

  private generateOrderPlacedEmail(data: OrderNotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF6B35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .order-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .item { padding: 8px 0; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 18px; color: #FF6B35; }
          .button { display: inline-block; background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Order #${data.orderNumber}</p>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Thank you for your order! Your delicious meal from ${data.restaurantName} is confirmed and being prepared.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              ${data.items.map(item => 
                `<div class="item">
                  <span>${item.quantity}x ${item.name}</span>
                  <span style="float: right;">₱${(item.price * item.quantity).toFixed(2)}</span>
                </div>`
              ).join('')}
              <div class="total" style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #FF6B35;">
                Total: ₱${data.totalAmount.toFixed(2)}
              </div>
            </div>

            ${data.estimatedDeliveryTime ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDeliveryTime.toLocaleString()}</p>` : ''}
            
            <p><strong>Delivery Address:</strong><br>
            ${data.deliveryAddress.street}, ${data.deliveryAddress.barangay}<br>
            ${data.deliveryAddress.city}, ${data.deliveryAddress.province}</p>
            
            <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}/track" class="button">Track Your Order</a>
            
            <p>We'll keep you updated on your order status. Thank you for choosing BTS Delivery!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateStatusUpdateEmail(data: OrderNotificationData, message: string): string {
    const statusColors = {
      confirmed: '#0066CC',
      preparing: '#FF8C00', 
      ready: '#9933CC',
      picked_up: '#00AA88',
      in_transit: '#00CC66',
      delivered: '#00AA00',
      cancelled: '#CC3300'
    };

    const statusColor = statusColors[data.status as keyof typeof statusColors] || '#666666';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .status-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid ${statusColor}; }
          .button { display: inline-block; background-color: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Update</h1>
            <p>Order #${data.orderNumber}</p>
            <p>Status: ${data.status.replace('_', ' ').toUpperCase()}</p>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <div class="status-box">
              <h3>Status Update</h3>
              <p style="font-size: 16px; margin: 15px 0;">${message}</p>
              ${data.message ? `<p><em>${data.message}</em></p>` : ''}
            </div>

            <p><strong>Restaurant:</strong> ${data.restaurantName}</p>
            ${data.estimatedDeliveryTime ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDeliveryTime.toLocaleString()}</p>` : ''}
            ${data.riderName ? `<p><strong>Your Rider:</strong> ${data.riderName}</p>` : ''}
            
            <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}/track" class="button">Track Your Order</a>
            
            <p>Thank you for choosing BTS Delivery!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateVendorNewOrderEmail(data: OrderNotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #00AA88; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .order-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .item { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
          .total { font-weight: bold; font-size: 18px; color: #00AA88; }
          .button { display: inline-block; background-color: #00AA88; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .urgent { background-color: #CC3300; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Order Received!</h1>
            <p>Order #${data.orderNumber}</p>
          </div>
          <div class="content">
            <p><strong>Customer:</strong> ${data.customerName}</p>
            <p><strong>Phone:</strong> ${data.customerPhone}</p>
            <p><strong>Order Time:</strong> ${new Date().toLocaleString()}</p>
            
            <div class="order-details">
              <h3>Order Items</h3>
              ${data.items.map(item => 
                `<div class="item">
                  <span>${item.quantity}x ${item.name}</span>
                  <span>₱${(item.price * item.quantity).toFixed(2)}</span>
                  ${item.notes ? `<br><small style="color: #666;">Note: ${item.notes}</small>` : ''}
                </div>`
              ).join('')}
              <div class="total" style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #00AA88;">
                Total: ₱${data.totalAmount.toFixed(2)}
              </div>
            </div>

            <p><strong>Delivery Address:</strong><br>
            ${data.deliveryAddress.street}, ${data.deliveryAddress.barangay}<br>
            ${data.deliveryAddress.city}, ${data.deliveryAddress.province}</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/vendor/orders/${data.orderId}/accept" class="button">Accept Order</a>
              <a href="${process.env.FRONTEND_URL}/vendor/orders/${data.orderId}/decline" class="button urgent">Decline</a>
            </div>
            
            <p><em>Please respond within 10 minutes to maintain your restaurant rating.</em></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private broadcastOrderUpdate(orderId: string, status: string, message: string) {
    if (!this.webSocketServer) return;
    
    const notification = {
      type: "order_update",
      orderId,
      status,
      message,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all clients subscribed to this order
    this.webSocketServer.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN && 
          client.subscriptions?.has(`order:${orderId}`)) {
        client.send(JSON.stringify(notification));
      }
    });
  }

  private broadcastRiderLocation(orderId: string, location: any) {
    if (!this.webSocketServer) return;
    
    const notification = {
      type: "rider_location_update",
      orderId,
      location,
      timestamp: new Date().toISOString()
    };
    
    this.webSocketServer.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN && 
          client.subscriptions?.has(`rider_location:${orderId}`)) {
        client.send(JSON.stringify(notification));
      }
    });
  }

  private broadcastToRole(role: string, notification: any) {
    if (!this.webSocketServer) return;
    
    this.webSocketServer.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN && client.userRole === role) {
        client.send(JSON.stringify(notification));
      }
    });
  }

  private async sendPushNotification(payload: any, userEmails: string[]) {
    // Implementation would integrate with service worker push notifications
    // This is a placeholder for the push notification service
    console.log(`Push notification sent to ${userEmails.length} users:`, payload.title);
    
    // Store push notification for tracking
    for (const email of userEmails) {
      try {
        const user = await storage.getUserByEmail(email);
        if (user) {
          await storage.createOrderNotification({
            orderId: payload.data?.orderId || '',
            recipientId: user.id,
            recipientRole: user.role,
            notificationType: 'push',
            trigger: payload.data?.type || 'push_notification',
            subject: payload.title,
            message: payload.body,
            status: 'sent',
            sentAt: new Date(),
            channelData: { payload }
          });
        }
      } catch (error) {
        console.error('Failed to log push notification:', error);
      }
    }
  }

  // Smart timing logic for notifications
  private shouldSendNotification(preferences: any, urgency: 'low' | 'medium' | 'high' | 'critical') {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Check if quiet hours are enabled
    const quietHoursEnabled = preferences.quietHoursEnabled ?? false;

    // Parse quiet hours (default 22:00 to 08:00)
    const quietStart = preferences.quietHoursStart ? preferences.quietHoursStart : '22:00';
    const quietEnd = preferences.quietHoursEnd ? preferences.quietHoursEnd : '08:00';

    const [startHour, startMinute] = quietStart.split(':').map(Number);
    const [endHour, endMinute] = quietEnd.split(':').map(Number);

    // Check if we're in quiet hours (only if enabled)
    let isQuietHours = false;
    if (quietHoursEnabled) {
      const currentTime = currentHour * 60 + currentMinute;
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTime > endTime) {
        isQuietHours = currentTime >= startTime || currentTime < endTime;
      } else {
        isQuietHours = currentTime >= startTime && currentTime < endTime;
      }
    }

    // Emergency/critical notifications (security alerts) override quiet hours
    if (urgency === 'critical') {
      return { email: true, sms: true, push: true };
    }

    // High urgency notifications are limited during quiet hours
    if (urgency === 'high') {
      return {
        email: !isQuietHours,
        sms: true, // SMS allowed for high urgency
        push: true
      };
    }

    // Medium and low urgency respect quiet hours
    return {
      email: !isQuietHours,
      sms: !isQuietHours,
      push: !isQuietHours
    };
  }

  // Check if a specific order status notification should be sent based on granular preferences
  private shouldSendOrderStatusNotification(preferences: any, status: string): boolean {
    // If orderUpdates master switch is off, don't send any order notifications
    if (!preferences.orderUpdates) {
      return false;
    }

    // Map order statuses to preference keys
    const statusPreferenceMap: Record<string, string> = {
      'placed': 'orderPlaced',
      'confirmed': 'orderConfirmed',
      'preparing': 'orderPreparing',
      'ready': 'orderReady',
      'ready_for_pickup': 'orderReady',
      'delivered': 'orderDelivered',
      'completed': 'orderDelivered'
    };

    const preferenceKey = statusPreferenceMap[status.toLowerCase()];

    // If no specific preference exists for this status, default to true
    if (!preferenceKey) {
      return true;
    }

    // Check the specific preference (default to true if not set)
    return preferences[preferenceKey] ?? true;
  }

  // Check if rider update notifications should be sent
  private shouldSendRiderNotification(preferences: any, updateType: 'assigned' | 'arriving'): boolean {
    // If riderUpdates master switch is off, don't send any rider notifications
    if (!preferences.riderUpdates) {
      return false;
    }

    // Map rider update types to preference keys
    const preferenceMap: Record<string, string> = {
      'assigned': 'riderAssigned',
      'arriving': 'riderArriving'
    };

    const preferenceKey = preferenceMap[updateType];

    // Check the specific preference (default to true if not set)
    return preferences[preferenceKey] ?? true;
  }
  
  // Bulk notification method for platform announcements
  async sendBulkNotification(userIds: string[], notification: {
    title: string;
    message: string;
    type: 'email' | 'sms' | 'push' | 'all';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    templateData?: any;
  }) {
    const results = {
      successful: 0,
      failed: 0,
      skipped: 0
    };
    
    for (const userId of userIds) {
      try {
        const user = await storage.getUserById(userId);
        if (!user) {
          results.skipped++;
          continue;
        }
        
        const preferences = await storage.getUserNotificationPreferences(userId);
        if (!preferences) {
          results.skipped++;
          continue;
        }
        
        const shouldSend = this.shouldSendNotification(preferences, notification.urgency);
        
        if (notification.type === 'email' || notification.type === 'all') {
          if (preferences.emailNotifications && shouldSend.email) {
            const sent = await this.emailProvider.sendEmail(
              user.email,
              notification.title,
              this.generateBulkNotificationEmail(notification, user)
            );
            
            await storage.createOrderNotification({
              orderId: '', // No specific order for bulk notifications
              recipientId: userId,
              recipientRole: user.role,
              notificationType: 'email',
              trigger: 'bulk_notification',
              subject: notification.title,
              message: notification.message,
              status: sent ? 'sent' : 'failed',
              sentAt: sent ? new Date() : undefined
            });
            
            if (sent) results.successful++;
            else results.failed++;
          }
        }
        
        if (notification.type === 'sms' || notification.type === 'all') {
          if (preferences.smsNotifications && shouldSend.sms && user.phone) {
            const sent = await this.smsProvider.sendSMS(user.phone, notification.message);
            
            await storage.createOrderNotification({
              orderId: '',
              recipientId: userId,
              recipientRole: user.role,
              notificationType: 'sms',
              trigger: 'bulk_notification',
              subject: notification.title,
              message: notification.message,
              status: sent ? 'sent' : 'failed',
              sentAt: sent ? new Date() : undefined
            });
            
            if (sent) results.successful++;
            else results.failed++;
          }
        }
        
        if (notification.type === 'push' || notification.type === 'all') {
          if (preferences.pushNotifications && shouldSend.push) {
            await this.sendPushNotification({
              title: notification.title,
              body: notification.message,
              data: { type: 'bulk_notification' }
            }, [user.email]);
            
            results.successful++;
          }
        }
        
      } catch (error) {
        console.error(`Failed to send bulk notification to user ${userId}:`, error);
        results.failed++;
      }
    }
    
    return results;
  }
  
  private generateBulkNotificationEmail(notification: any, user: any): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF6B35; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #004225; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>BTS Delivery</h1>
            <h2>${notification.title}</h2>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <div style="margin: 20px 0; padding: 20px; background-color: white; border-radius: 6px;">
              ${notification.message}
            </div>
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
              Open BTS Delivery
            </a>
          </div>
          <div class="footer">
            <p>© 2024 BTS Delivery - Your trusted delivery partner in Batangas</p>
            <p>You received this because you're subscribed to BTS Delivery notifications.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const orderNotificationService = new OrderNotificationService();