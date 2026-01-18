/**
 * Chat Service for Order Messaging
 *
 * Handles real-time in-app messaging between customers and riders
 * during active deliveries.
 */

import { db } from '../db';
import { orderMessages, orders, users } from '@shared/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { wsManager } from './websocket-manager';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'customer' | 'rider';
  senderName: string;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface SendMessageParams {
  orderId: string;
  senderId: string;
  senderRole: 'customer' | 'rider';
  message: string;
}

class ChatService {
  /**
   * Send a message in an order chat
   */
  async sendMessage(params: SendMessageParams): Promise<ChatMessage> {
    const { orderId, senderId, senderRole, message } = params;

    // Validate order exists and user has access
    const order = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order.length) {
      throw new Error('Order not found');
    }

    const orderData = order[0];

    // Verify sender has access to this order
    if (senderRole === 'customer' && orderData.customerId !== senderId) {
      throw new Error('Unauthorized to send message in this order');
    }

    if (senderRole === 'rider' && orderData.riderId !== senderId) {
      throw new Error('Unauthorized to send message in this order');
    }

    // Get sender name
    const sender = await db.select({
      firstName: users.firstName,
      lastName: users.lastName,
    })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);

    const senderName = sender.length
      ? `${sender[0].firstName || ''} ${sender[0].lastName || ''}`.trim() || 'User'
      : 'User';

    // Insert message
    const [newMessage] = await db.insert(orderMessages)
      .values({
        orderId,
        senderId,
        senderRole,
        message: message.trim(),
      })
      .returning();

    const chatMessage: ChatMessage = {
      id: newMessage.id,
      orderId: newMessage.orderId,
      senderId: newMessage.senderId,
      senderRole: newMessage.senderRole as 'customer' | 'rider',
      senderName,
      message: newMessage.message,
      isRead: newMessage.isRead || false,
      readAt: newMessage.readAt,
      createdAt: newMessage.createdAt!,
    };

    // Broadcast message to order channel via WebSocket
    this.broadcastNewMessage(orderId, chatMessage, orderData);

    return chatMessage;
  }

  /**
   * Get all messages for an order
   */
  async getMessages(orderId: string, userId: string): Promise<ChatMessage[]> {
    // Validate order exists and user has access
    const order = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order.length) {
      throw new Error('Order not found');
    }

    const orderData = order[0];

    // Verify user has access to this order
    if (orderData.customerId !== userId && orderData.riderId !== userId) {
      throw new Error('Unauthorized to view messages for this order');
    }

    // Get messages with sender info
    const messages = await db
      .select({
        id: orderMessages.id,
        orderId: orderMessages.orderId,
        senderId: orderMessages.senderId,
        senderRole: orderMessages.senderRole,
        message: orderMessages.message,
        isRead: orderMessages.isRead,
        readAt: orderMessages.readAt,
        createdAt: orderMessages.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(orderMessages)
      .leftJoin(users, eq(orderMessages.senderId, users.id))
      .where(eq(orderMessages.orderId, orderId))
      .orderBy(orderMessages.createdAt);

    return messages.map((msg) => ({
      id: msg.id,
      orderId: msg.orderId,
      senderId: msg.senderId,
      senderRole: msg.senderRole as 'customer' | 'rider',
      senderName: `${msg.firstName || ''} ${msg.lastName || ''}`.trim() || 'User',
      message: msg.message,
      isRead: msg.isRead || false,
      readAt: msg.readAt,
      createdAt: msg.createdAt!,
    }));
  }

  /**
   * Mark messages as read for a recipient
   */
  async markAsRead(orderId: string, recipientId: string): Promise<number> {
    // Validate order exists and user has access
    const order = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order.length) {
      throw new Error('Order not found');
    }

    const orderData = order[0];

    // Verify user has access to this order
    if (orderData.customerId !== recipientId && orderData.riderId !== recipientId) {
      throw new Error('Unauthorized to mark messages as read for this order');
    }

    // Determine the sender role to exclude (we only mark messages from the other party as read)
    const recipientRole = orderData.customerId === recipientId ? 'customer' : 'rider';
    const senderRoleToMark = recipientRole === 'customer' ? 'rider' : 'customer';

    // Update unread messages from the other party
    const result = await db.update(orderMessages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(orderMessages.orderId, orderId),
          eq(orderMessages.senderRole, senderRoleToMark),
          eq(orderMessages.isRead, false)
        )
      )
      .returning();

    // Broadcast read status update
    if (result.length > 0) {
      this.broadcastReadStatus(orderId, recipientId, recipientRole);
    }

    return result.length;
  }

  /**
   * Get unread message count for a user in an order
   */
  async getUnreadCount(orderId: string, userId: string): Promise<number> {
    // Validate order exists and user has access
    const order = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order.length) {
      return 0;
    }

    const orderData = order[0];

    // Verify user has access to this order
    if (orderData.customerId !== userId && orderData.riderId !== userId) {
      return 0;
    }

    // Determine the sender role to count (messages from the other party)
    const userRole = orderData.customerId === userId ? 'customer' : 'rider';
    const senderRoleToCount = userRole === 'customer' ? 'rider' : 'customer';

    const unreadMessages = await db
      .select({ id: orderMessages.id })
      .from(orderMessages)
      .where(
        and(
          eq(orderMessages.orderId, orderId),
          eq(orderMessages.senderRole, senderRoleToCount),
          eq(orderMessages.isRead, false)
        )
      );

    return unreadMessages.length;
  }

  /**
   * Broadcast new message to order channel via WebSocket
   */
  private broadcastNewMessage(orderId: string, message: ChatMessage, orderData: any): void {
    // Broadcast to order channel
    wsManager.broadcastToChannel(`order:${orderId}`, {
      type: 'chat_message',
      message,
    });

    // Also broadcast to specific users
    if (orderData.customerId) {
      wsManager.broadcastToUser(orderData.customerId, {
        type: 'chat_message',
        orderId,
        message,
      });
    }

    if (orderData.riderId) {
      wsManager.broadcastToUser(orderData.riderId, {
        type: 'chat_message',
        orderId,
        message,
      });
    }
  }

  /**
   * Broadcast read status update via WebSocket
   */
  private broadcastReadStatus(orderId: string, readByUserId: string, readByRole: string): void {
    wsManager.broadcastToChannel(`order:${orderId}`, {
      type: 'messages_read',
      orderId,
      readByUserId,
      readByRole,
      timestamp: new Date().toISOString(),
    });
  }
}

export const chatService = new ChatService();
