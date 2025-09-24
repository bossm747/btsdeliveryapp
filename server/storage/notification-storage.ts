// Storage interface methods for notification system
// Handles push subscriptions, analytics, campaigns, queue, and templates

import { eq, and, desc, gte, lte, inArray, sql } from 'drizzle-orm';
import { db } from '../db.js';
import {
  userPushSubscriptions,
  notificationAnalytics,
  notificationCampaigns,
  notificationQueue,
  notificationTemplates,
  users,
  type InsertUserPushSubscription,
  type InsertNotificationAnalytics,
  type InsertNotificationCampaign,
  type InsertNotificationQueue,
  type InsertNotificationTemplate,
  type UserPushSubscription,
  type NotificationAnalytics,
  type NotificationCampaign,
  type NotificationQueue as NotificationQueueType,
  type NotificationTemplate
} from '../../shared/schema.js';

export class NotificationStorage {
  // =============================================================================
  // PUSH SUBSCRIPTION METHODS
  // =============================================================================

  async createUserPushSubscription(data: InsertUserPushSubscription): Promise<UserPushSubscription> {
    const [subscription] = await db
      .insert(userPushSubscriptions)
      .values(data)
      .returning();
    return subscription;
  }

  async getUserPushSubscriptions(userId: string): Promise<UserPushSubscription[]> {
    return await db
      .select()
      .from(userPushSubscriptions)
      .where(and(
        eq(userPushSubscriptions.userId, userId),
        eq(userPushSubscriptions.isActive, true)
      ));
  }

  async deactivateUserPushSubscription(userId: string, endpoint: string): Promise<void> {
    await db
      .update(userPushSubscriptions)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(userPushSubscriptions.userId, userId),
        eq(userPushSubscriptions.endpoint, endpoint)
      ));
  }

  async updatePushSubscriptionLastUsed(endpoint: string): Promise<void> {
    await db
      .update(userPushSubscriptions)
      .set({ 
        lastUsed: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userPushSubscriptions.endpoint, endpoint));
  }

  // =============================================================================
  // NOTIFICATION ANALYTICS METHODS
  // =============================================================================

  async createNotificationAnalytics(data: InsertNotificationAnalytics): Promise<NotificationAnalytics> {
    const [analytics] = await db
      .insert(notificationAnalytics)
      .values(data)
      .returning();
    return analytics;
  }

  async updateNotificationAnalytics(id: string, updates: Partial<InsertNotificationAnalytics>): Promise<void> {
    await db
      .update(notificationAnalytics)
      .set(updates)
      .where(eq(notificationAnalytics.id, id));
  }

  async getNotificationAnalyticsByUser(userId: string, limit = 50): Promise<NotificationAnalytics[]> {
    return await db
      .select()
      .from(notificationAnalytics)
      .where(eq(notificationAnalytics.userId, userId))
      .orderBy(desc(notificationAnalytics.createdAt))
      .limit(limit);
  }

  async getNotificationAnalyticsOverview(timeframe: string) {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const analytics = await db
      .select({
        notificationType: notificationAnalytics.notificationType,
        status: notificationAnalytics.status,
        channel: notificationAnalytics.channel,
        count: sql<number>`count(*)::int`
      })
      .from(notificationAnalytics)
      .where(gte(notificationAnalytics.createdAt, startDate))
      .groupBy(
        notificationAnalytics.notificationType,
        notificationAnalytics.status,
        notificationAnalytics.channel
      );

    // Calculate delivery rates, open rates, click rates
    const summary = {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalFailed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      channelBreakdown: {} as Record<string, any>,
      typeBreakdown: {} as Record<string, any>
    };

    for (const row of analytics) {
      const count = row.count;

      if (row.status === 'sent') summary.totalSent += count;
      if (row.status === 'delivered') summary.totalDelivered += count;
      if (row.status === 'opened') summary.totalOpened += count;
      if (row.status === 'clicked') summary.totalClicked += count;
      if (row.status === 'failed') summary.totalFailed += count;

      // Channel breakdown
      if (row.channel && row.status) {
        if (!summary.channelBreakdown[row.channel]) {
          summary.channelBreakdown[row.channel] = { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 };
        }
        summary.channelBreakdown[row.channel][row.status] = count;
      }

      // Type breakdown
      if (row.notificationType && row.status) {
        if (!summary.typeBreakdown[row.notificationType]) {
          summary.typeBreakdown[row.notificationType] = { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 };
        }
        summary.typeBreakdown[row.notificationType][row.status] = count;
      }
    }

    // Calculate rates
    if (summary.totalSent > 0) {
      summary.deliveryRate = (summary.totalDelivered / summary.totalSent) * 100;
    }
    if (summary.totalDelivered > 0) {
      summary.openRate = (summary.totalOpened / summary.totalDelivered) * 100;
      summary.clickRate = (summary.totalClicked / summary.totalDelivered) * 100;
    }

    return summary;
  }

  // =============================================================================
  // NOTIFICATION CAMPAIGN METHODS
  // =============================================================================

  async createNotificationCampaign(data: InsertNotificationCampaign): Promise<NotificationCampaign> {
    const [campaign] = await db
      .insert(notificationCampaigns)
      .values(data)
      .returning();
    return campaign;
  }

  async getNotificationCampaigns(limit = 50): Promise<NotificationCampaign[]> {
    return await db
      .select()
      .from(notificationCampaigns)
      .orderBy(desc(notificationCampaigns.createdAt))
      .limit(limit);
  }

  async getNotificationCampaign(id: string): Promise<NotificationCampaign | null> {
    const [campaign] = await db
      .select()
      .from(notificationCampaigns)
      .where(eq(notificationCampaigns.id, id));
    return campaign || null;
  }

  async updateNotificationCampaign(id: string, updates: Partial<InsertNotificationCampaign>): Promise<void> {
    await db
      .update(notificationCampaigns)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(notificationCampaigns.id, id));
  }

  async getCampaignRecipients(targetAudience: any): Promise<any[]> {
    const baseQuery = db.select().from(users);

    if (targetAudience?.roles?.length > 0) {
      return await baseQuery.where(inArray(users.role, targetAudience.roles));
    }

    // Add more filtering logic based on target audience criteria
    if (targetAudience?.locations?.length > 0) {
      // Add location-based filtering if user location data is available
      // This would require joining with user addresses or location preferences
    }

    return await baseQuery;
  }

  // =============================================================================
  // NOTIFICATION QUEUE METHODS
  // =============================================================================

  async addToNotificationQueue(data: InsertNotificationQueue): Promise<NotificationQueueType> {
    const [queueItem] = await db
      .insert(notificationQueue)
      .values(data)
      .returning();
    return queueItem;
  }

  async getPendingNotifications(limit = 100): Promise<NotificationQueueType[]> {
    return await db
      .select()
      .from(notificationQueue)
      .where(and(
        eq(notificationQueue.status, 'pending'),
        lte(notificationQueue.scheduledFor, new Date())
      ))
      .orderBy(
        notificationQueue.priority, // High priority first
        notificationQueue.scheduledFor
      )
      .limit(limit);
  }

  async updateNotificationQueueStatus(
    id: string, 
    status: string, 
    failureReason?: string
  ): Promise<void> {
    await db
      .update(notificationQueue)
      .set({
        status,
        processedAt: new Date(),
        failureReason,
        updatedAt: new Date()
      })
      .where(eq(notificationQueue.id, id));
  }

  async incrementNotificationAttempts(id: string): Promise<void> {
    await db
      .update(notificationQueue)
      .set({
        attempts: sql`${notificationQueue.attempts} + 1`,
        updatedAt: new Date()
      })
      .where(eq(notificationQueue.id, id));
  }

  async getNotificationQueueStats() {
    const stats = await db
      .select({
        status: notificationQueue.status,
        priority: notificationQueue.priority,
        notificationType: notificationQueue.notificationType,
        count: sql<number>`count(*)::int`
      })
      .from(notificationQueue)
      .groupBy(
        notificationQueue.status,
        notificationQueue.priority,
        notificationQueue.notificationType
      );

    const summary = {
      total: 0,
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      retrying: 0,
      byPriority: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    for (const row of stats) {
      const count = row.count;
      summary.total += count;

      switch (row.status) {
        case 'pending':
          summary.pending += count;
          break;
        case 'processing':
          summary.processing += count;
          break;
        case 'sent':
          summary.sent += count;
          break;
        case 'failed':
          summary.failed += count;
          break;
        case 'retrying':
          summary.retrying += count;
          break;
      }

      summary.byPriority[row.priority] = (summary.byPriority[row.priority] || 0) + count;
      summary.byType[row.notificationType] = (summary.byType[row.notificationType] || 0) + count;
    }

    return summary;
  }

  async cleanupOldQueueItems(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db
      .delete(notificationQueue)
      .where(and(
        inArray(notificationQueue.status, ['sent', 'failed']),
        lte(notificationQueue.createdAt, cutoffDate)
      ));

    return result.rowCount || 0;
  }

  // =============================================================================
  // NOTIFICATION TEMPLATE METHODS
  // =============================================================================

  async createNotificationTemplate(data: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [template] = await db
      .insert(notificationTemplates)
      .values(data)
      .returning();
    return template;
  }

  async getNotificationTemplates(filters: {
    category?: string;
    type?: string;
    language?: string;
    isActive?: boolean;
  } = {}): Promise<NotificationTemplate[]> {
    let query = db.select().from(notificationTemplates);

    const conditions = [];

    if (filters.category) {
      conditions.push(eq(notificationTemplates.category, filters.category));
    }
    if (filters.type) {
      conditions.push(eq(notificationTemplates.type, filters.type));
    }
    if (filters.language) {
      conditions.push(eq(notificationTemplates.language, filters.language));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(notificationTemplates.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(
        notificationTemplates.category,
        notificationTemplates.type,
        desc(notificationTemplates.version)
      );
    }

    return await query.orderBy(
      notificationTemplates.category,
      notificationTemplates.type,
      desc(notificationTemplates.version)
    );
  }

  async getNotificationTemplate(id: string): Promise<NotificationTemplate | null> {
    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.id, id));
    return template || null;
  }

  async updateNotificationTemplate(id: string, updates: Partial<InsertNotificationTemplate>): Promise<void> {
    await db
      .update(notificationTemplates)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(notificationTemplates.id, id));
  }

  async deactivateNotificationTemplate(id: string): Promise<void> {
    await db
      .update(notificationTemplates)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(notificationTemplates.id, id));
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  async getUsersByRole(role: string): Promise<any[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, role));
  }

  async trackNotificationDelivery(
    notificationId: string,
    userId: string,
    type: string,
    channel: string,
    status: string,
    metadata?: any
  ): Promise<void> {
    await this.createNotificationAnalytics({
      notificationId,
      userId,
      notificationType: type,
      channel,
      status,
      sentAt: status === 'sent' ? new Date() : undefined,
      deliveredAt: status === 'delivered' ? new Date() : undefined,
      openedAt: status === 'opened' ? new Date() : undefined,
      clickedAt: status === 'clicked' ? new Date() : undefined,
      failedAt: status === 'failed' ? new Date() : undefined,
      metadata
    });
  }

  async getActiveUserSubscriptions(): Promise<UserPushSubscription[]> {
    return await db
      .select()
      .from(userPushSubscriptions)
      .where(eq(userPushSubscriptions.isActive, true));
  }

  async getNotificationDeliveryReport(campaignId: string) {
    const campaign = await this.getNotificationCampaign(campaignId);
    if (!campaign) return null;

    const analytics = await db
      .select({
        status: notificationAnalytics.status,
        notificationType: notificationAnalytics.notificationType,
        count: sql<number>`count(*)::int`
      })
      .from(notificationAnalytics)
      .innerJoin(notificationQueue, eq(notificationQueue.campaignId, campaignId))
      .where(eq(notificationQueue.campaignId, campaignId))
      .groupBy(
        notificationAnalytics.status,
        notificationAnalytics.notificationType
      );

    return {
      campaign,
      analytics,
      summary: {
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        openedCount: campaign.openedCount,
        clickedCount: campaign.clickedCount,
        failedCount: campaign.failedCount
      }
    };
  }
}

// Export singleton instance
export const notificationStorage = new NotificationStorage();