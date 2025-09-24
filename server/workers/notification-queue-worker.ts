// Notification Queue Worker for BTS Delivery Platform
// Processes notification queue items and handles delivery failures with retry logic

import { notificationStorage } from '../storage/notification-storage.js';
import { pushNotificationService } from '../integrations/push-notifications.js';
import { emailTemplateEngine } from '../templates/email-templates.js';
import { SendGridProvider } from '../integrations/email.js';
import { TwilioProvider, SemaphoreProvider } from '../integrations/sms.js';
import type { NotificationQueue } from '../../shared/schema.js';

export class NotificationQueueWorker {
  private isProcessing: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly processingInterval = 5000; // Process every 5 seconds
  private readonly maxConcurrentProcessing = 10;
  
  private emailProvider: any;
  private smsProvider: TwilioProvider | SemaphoreProvider;

  constructor() {
    this.emailProvider = new SendGridProvider();
    
    // Initialize SMS provider with fallback
    try {
      this.smsProvider = new TwilioProvider();
    } catch {
      this.smsProvider = new SemaphoreProvider();
    }
  }

  // Start the queue worker
  start(): void {
    if (this.intervalId) {
      console.log('Notification queue worker is already running');
      return;
    }

    console.log('🚀 Starting notification queue worker...');
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, this.processingInterval);

    // Process immediately on start
    this.processQueue();
  }

  // Stop the queue worker
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('📴 Notification queue worker stopped');
    }
  }

  // Main queue processing method
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;

    try {
      // Get pending notifications
      const pendingNotifications = await notificationStorage.getPendingNotifications(
        this.maxConcurrentProcessing
      );

      if (pendingNotifications.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`📬 Processing ${pendingNotifications.length} pending notifications`);

      // Process notifications concurrently
      const processingPromises = pendingNotifications.map(notification => 
        this.processNotification(notification)
      );

      await Promise.allSettled(processingPromises);
    } catch (error) {
      console.error('❌ Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual notification
  private async processNotification(notification: NotificationQueue): Promise<void> {
    try {
      // Mark as processing
      await notificationStorage.updateNotificationQueueStatus(
        notification.id,
        'processing'
      );

      console.log(`📨 Processing ${notification.notificationType} notification to ${notification.recipient}`);

      let success = false;
      let failureReason: string | undefined;

      // Route to appropriate delivery method
      switch (notification.notificationType) {
        case 'email':
          success = await this.sendEmailNotification(notification);
          break;
        case 'sms':
          success = await this.sendSMSNotification(notification);
          break;
        case 'push':
          success = await this.sendPushNotification(notification);
          break;
        default:
          failureReason = `Unknown notification type: ${notification.notificationType}`;
          console.error(failureReason);
          break;
      }

      if (success) {
        // Mark as sent
        await notificationStorage.updateNotificationQueueStatus(
          notification.id,
          'sent'
        );

        // Track analytics
        if (notification.userId) {
          await notificationStorage.trackNotificationDelivery(
            notification.id,
            notification.userId,
            notification.notificationType,
            this.getChannelName(notification.notificationType),
            'sent',
            {
              campaignId: notification.campaignId,
              priority: notification.priority,
              attempts: (notification.attempts || 0) + 1
            }
          );
        }

        console.log(`✅ Successfully sent ${notification.notificationType} notification`);
      } else {
        await this.handleFailedNotification(notification, failureReason);
      }
    } catch (error) {
      console.error(`❌ Error processing notification ${notification.id}:`, error);
      await this.handleFailedNotification(
        notification, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // Send email notification
  private async sendEmailNotification(notification: NotificationQueue): Promise<boolean> {
    try {
      if (!notification.subject || !notification.content) {
        console.error('Missing subject or content for email notification');
        return false;
      }

      // Use template engine for rich HTML emails if template data is available
      let htmlContent = notification.content;
      let textContent = notification.content;

      if (notification.templateData) {
        const templateData = notification.templateData as any;
        
        // Determine template type based on campaign or content
        if (templateData.type === 'order_confirmation') {
          const template = emailTemplateEngine.generateOrderConfirmationEmail(templateData);
          htmlContent = template.html;
          textContent = template.text;
        } else if (templateData.type === 'order_status_update') {
          const template = emailTemplateEngine.generateOrderStatusUpdateEmail(templateData);
          htmlContent = template.html;
          textContent = template.text;
        } else if (templateData.type === 'promotional') {
          const template = emailTemplateEngine.generatePromotionalEmail(templateData);
          htmlContent = template.html;
          textContent = template.text;
        }
        // Add more template types as needed
      }

      const success = await this.emailProvider.sendEmail(
        notification.recipient,
        notification.subject,
        htmlContent,
        textContent
      );

      return success;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  // Send SMS notification
  private async sendSMSNotification(notification: NotificationQueue): Promise<boolean> {
    try {
      if (!notification.content) {
        console.error('Missing content for SMS notification');
        return false;
      }

      // SMS content should be concise (limit to 160 characters for single SMS)
      let smsContent = notification.content;
      if (smsContent.length > 160) {
        smsContent = smsContent.substring(0, 157) + '...';
      }

      const success = await this.smsProvider.sendSMS(
        notification.recipient,
        smsContent
      );

      return success;
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      return false;
    }
  }

  // Send push notification
  private async sendPushNotification(notification: NotificationQueue): Promise<boolean> {
    try {
      if (!notification.userId) {
        console.error('Missing userId for push notification');
        return false;
      }

      const pushPayload = {
        title: notification.subject || 'BTS Delivery Notification',
        body: notification.content,
        icon: '/icon-192x192.png',
        data: notification.templateData || {}
      };

      const success = await pushNotificationService.sendPushToUser(
        notification.userId,
        pushPayload
      );

      return success;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Handle failed notification with retry logic
  private async handleFailedNotification(
    notification: NotificationQueue, 
    failureReason?: string
  ): Promise<void> {
    const newAttempts = (notification.attempts || 0) + 1;
    
    // Increment attempt count
    await notificationStorage.incrementNotificationAttempts(notification.id);

    if (newAttempts >= (notification.maxAttempts || 3)) {
      // Max attempts reached, mark as failed
      await notificationStorage.updateNotificationQueueStatus(
        notification.id,
        'failed',
        failureReason || `Max attempts (${notification.maxAttempts || 3}) reached`
      );

      // Track analytics for failure
      if (notification.userId) {
        await notificationStorage.trackNotificationDelivery(
          notification.id,
          notification.userId,
          notification.notificationType,
          this.getChannelName(notification.notificationType),
          'failed',
          {
            failureReason,
            attempts: newAttempts,
            campaignId: notification.campaignId
          }
        );
      }

      console.error(`💥 Failed notification ${notification.id} after ${newAttempts} attempts: ${failureReason}`);
    } else {
      // Schedule for retry with exponential backoff
      const retryDelay = this.calculateRetryDelay(newAttempts);
      const retryTime = new Date(Date.now() + retryDelay);

      await notificationStorage.updateNotificationQueueStatus(
        notification.id,
        'retrying',
        failureReason
      );

      // Update scheduled time for retry
      const retryNotification: any = {
        notificationType: notification.notificationType,
        recipient: notification.recipient,
        content: notification.content,
        subject: notification.subject,
        userId: notification.userId,
        campaignId: notification.campaignId,
        priority: notification.priority,
        attempts: newAttempts,
        maxAttempts: notification.maxAttempts || 3,
        scheduledFor: retryTime,
        status: 'pending' as const,
        templateData: notification.templateData as any
      };
      
      await notificationStorage.addToNotificationQueue(retryNotification);

      console.warn(`⏰ Scheduling retry ${newAttempts}/${notification.maxAttempts || 3} for notification ${notification.id} in ${retryDelay}ms`);
    }
  }

  // Calculate retry delay with exponential backoff
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1min, 5min, 15min, 30min, 1hr
    const baseDelay = 60 * 1000; // 1 minute
    const backoffMultiplier = Math.min(Math.pow(2, attempt - 1), 60); // Cap at 60 minutes
    return baseDelay * backoffMultiplier;
  }

  // Get channel name for analytics
  private getChannelName(notificationType: string): string {
    switch (notificationType) {
      case 'email':
        return 'SendGrid';
      case 'sms':
        return this.smsProvider instanceof TwilioProvider ? 'Twilio' : 'Semaphore';
      case 'push':
        return 'WebPush';
      default:
        return 'Unknown';
    }
  }

  // Cleanup old processed notifications
  async cleanupOldNotifications(): Promise<void> {
    try {
      const deletedCount = await notificationStorage.cleanupOldQueueItems(30);
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old notification queue items`);
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  // Get queue statistics
  async getQueueStats() {
    return await notificationStorage.getNotificationQueueStats();
  }

  // Process high priority notifications immediately
  async processHighPriorityNotifications(): Promise<void> {
    const highPriorityNotifications = await notificationStorage.getPendingNotifications(50);
    const highPriorityOnly = highPriorityNotifications.filter(
      n => n.priority === 'high' || n.priority === 'critical'
    );

    if (highPriorityOnly.length > 0) {
      console.log(`⚡ Processing ${highPriorityOnly.length} high priority notifications`);
      
      const processingPromises = highPriorityOnly.map(notification => 
        this.processNotification(notification)
      );

      await Promise.allSettled(processingPromises);
    }
  }
}

// Export singleton instance
export const notificationQueueWorker = new NotificationQueueWorker();