// Notification API Routes for BTS Delivery Platform
// Handles push notifications, notification preferences, and notification management

import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { pushNotificationService } from '../integrations/push-notifications.js';
import { storage } from '../storage.js';
import { z } from 'zod';

const router = Router();

// =============================================================================
// PUSH NOTIFICATION MANAGEMENT ROUTES
// =============================================================================

// Get VAPID public key for push notification subscription
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({ error: 'Failed to get VAPID public key' });
  }
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const subscriptionSchema = z.object({
      subscription: z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string()
        })
      })
    });

    const { subscription } = subscriptionSchema.parse(req.body);
    
    // Save subscription to database
    await storage.createUserPushSubscription({
      userId: req.user!.id,
      endpoint: subscription.endpoint,
      p256dhKey: subscription.keys.p256dh,
      authKey: subscription.keys.auth,
      userAgent: req.get('User-Agent') || '',
      isActive: true
    });

    res.json({ message: 'Successfully subscribed to push notifications' });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await storage.deactivateUserPushSubscription(req.user!.id, endpoint);
    res.json({ message: 'Successfully unsubscribed from push notifications' });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

// Send test push notification
router.post('/test', authenticateToken, async (req, res) => {
  try {
    await pushNotificationService.sendPushToUser(req.user!.id, {
      title: '🧪 Test Notification',
      body: 'This is a test notification from BTS Delivery!',
      icon: '/icon-192x192.png',
      data: {
        type: 'test',
        url: '/dashboard'
      }
    });

    res.json({ message: 'Test notification sent successfully' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// =============================================================================
// NOTIFICATION PREFERENCES ROUTES
// =============================================================================

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await storage.getUserNotificationPreferences(req.user!.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

// Update user notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferencesSchema = z.object({
      emailNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      orderUpdates: z.boolean().optional(),
      promotionalEmails: z.boolean().optional(),
      restaurantUpdates: z.boolean().optional(),
      loyaltyRewards: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
      quietHoursStart: z.string().optional(),
      quietHoursEnd: z.string().optional()
    });

    const updates = preferencesSchema.parse(req.body);
    
    const existingPreferences = await storage.getUserNotificationPreferences(req.user!.id);
    
    if (existingPreferences) {
      await storage.updateUserNotificationPreferences(req.user!.id, updates);
    } else {
      await storage.createUserNotificationPreferences({
        userId: req.user!.id,
        ...updates
      });
    }

    const updatedPreferences = await storage.getUserNotificationPreferences(req.user!.id);
    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// =============================================================================
// NOTIFICATION ANALYTICS ROUTES
// =============================================================================

// Get notification analytics for user
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const analytics = await storage.getNotificationAnalyticsByUser(req.user!.id);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting notification analytics:', error);
    res.status(500).json({ error: 'Failed to get notification analytics' });
  }
});

// Track notification interaction (opened, clicked)
router.post('/track/:notificationId/:action', authenticateToken, async (req, res) => {
  try {
    const { notificationId, action } = req.params;
    
    if (!['opened', 'clicked'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "opened" or "clicked"' });
    }

    await storage.updateNotificationAnalytics(notificationId, {
      [`${action}At`]: new Date(),
      status: action
    });

    res.json({ message: `Notification ${action} tracked successfully` });
  } catch (error) {
    console.error('Error tracking notification interaction:', error);
    res.status(500).json({ error: 'Failed to track notification interaction' });
  }
});

// =============================================================================
// ADMIN NOTIFICATION MANAGEMENT ROUTES
// =============================================================================

// Get all notification campaigns (admin only)
router.get('/campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const campaigns = await storage.getNotificationCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error('Error getting notification campaigns:', error);
    res.status(500).json({ error: 'Failed to get notification campaigns' });
  }
});

// Create new notification campaign (admin only)
router.post('/campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const campaignSchema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(['promotional', 'announcement', 'alert']),
      channels: z.array(z.enum(['email', 'sms', 'push'])),
      targetAudience: z.object({
        roles: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
        preferences: z.object({}).optional()
      }).optional(),
      templateData: z.object({
        title: z.string(),
        content: z.string(),
        imageUrl: z.string().optional(),
        ctaText: z.string().optional(),
        ctaUrl: z.string().optional()
      }),
      scheduledFor: z.string().datetime().optional()
    });

    const campaignData = campaignSchema.parse(req.body);
    
    const campaign = await storage.createNotificationCampaign({
      ...campaignData,
      createdBy: req.user!.id,
      scheduledFor: campaignData.scheduledFor ? new Date(campaignData.scheduledFor) : undefined
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating notification campaign:', error);
    res.status(500).json({ error: 'Failed to create notification campaign' });
  }
});

// Get specific campaign details (admin only)
router.get('/campaigns/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const campaign = await storage.getNotificationCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Error getting campaign details:', error);
    res.status(500).json({ error: 'Failed to get campaign details' });
  }
});

// Send/execute notification campaign (admin only)
router.post('/campaigns/:id/send', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const campaign = await storage.getNotificationCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return res.status(400).json({ error: 'Campaign cannot be sent in current status' });
    }

    // Update campaign status to sending
    await storage.updateNotificationCampaign(req.params.id, {
      status: 'sending'
    });

    // Get target recipients based on audience criteria
    const recipients = await storage.getCampaignRecipients(campaign.targetAudience);

    // Add notifications to queue for processing
    for (const recipient of recipients) {
      for (const channel of campaign.channels) {
        await storage.addToNotificationQueue({
          userId: recipient.id,
          campaignId: campaign.id,
          notificationType: channel,
          recipient: channel === 'sms' ? recipient.phone : recipient.email,
          subject: campaign.templateData.title,
          content: campaign.templateData.content,
          templateData: campaign.templateData,
          priority: campaign.type === 'alert' ? 'high' : 'normal'
        });
      }
    }

    // Update campaign with recipient count
    await storage.updateNotificationCampaign(req.params.id, {
      totalRecipients: recipients.length * campaign.channels.length,
      status: 'sent'
    });

    res.json({ 
      message: 'Campaign queued for delivery',
      totalRecipients: recipients.length,
      channels: campaign.channels
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// Get notification queue status (admin only)
router.get('/queue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const queueStats = await storage.getNotificationQueueStats();
    const pendingNotifications = await storage.getPendingNotifications();
    
    res.json({
      stats: queueStats,
      pending: pendingNotifications
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// Get comprehensive notification analytics (admin only)
router.get('/analytics/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    const analytics = await storage.getNotificationAnalyticsOverview(timeframe as string);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting notification analytics overview:', error);
    res.status(500).json({ error: 'Failed to get analytics overview' });
  }
});

// Get notification templates (admin only)
router.get('/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, type, language } = req.query;
    
    const filters = {
      category: category as string,
      type: type as string,
      language: language as string
    };
    
    const templates = await storage.getNotificationTemplates(filters);
    res.json(templates);
  } catch (error) {
    console.error('Error getting notification templates:', error);
    res.status(500).json({ error: 'Failed to get notification templates' });
  }
});

// Create notification template (admin only)
router.post('/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templateSchema = z.object({
      name: z.string().min(1),
      category: z.enum(['order', 'payment', 'promotional', 'admin']),
      type: z.enum(['email', 'sms', 'push']),
      language: z.enum(['en', 'tl']).default('en'),
      subject: z.string().optional(),
      content: z.string().min(1),
      variables: z.array(z.string()).optional()
    });

    const templateData = templateSchema.parse(req.body);
    
    const template = await storage.createNotificationTemplate({
      ...templateData,
      variables: templateData.variables || [],
      createdBy: req.user!.id
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating notification template:', error);
    res.status(500).json({ error: 'Failed to create notification template' });
  }
});

// Send admin alert to all admins
router.post('/admin-alert', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const alertSchema = z.object({
      title: z.string().min(1),
      message: z.string().min(1),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      category: z.string().optional(),
      systemComponent: z.string().optional(),
      errorCode: z.string().optional(),
      additionalInfo: z.string().optional()
    });

    const alertData = alertSchema.parse(req.body);
    
    // Send alert to all admins
    await pushNotificationService.notifyAdminAlert({
      id: `alert-${Date.now()}`,
      alertId: `alert-${Date.now()}`,
      ...alertData,
      timestamp: new Date()
    });

    res.json({ message: 'Admin alert sent successfully' });
  } catch (error) {
    console.error('Error sending admin alert:', error);
    res.status(500).json({ error: 'Failed to send admin alert' });
  }
});

export default router;