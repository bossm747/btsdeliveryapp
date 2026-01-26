/**
 * useNotifications Hook
 * 
 * Manages user notifications with:
 * - Fetching notifications with pagination
 * - Real-time updates via WebSocket
 * - Mark as read functionality
 * - Unread count badge
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './use-websocket';
import { apiRequest } from '@/lib/queryClient';

// ============= TYPES =============

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  referenceType?: string;
  referenceId?: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  readAt?: string;
  isArchived: boolean;
  priority: string;
  category: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  category?: string;
  unreadOnly?: boolean;
  includeArchived?: boolean;
}

export interface UseNotificationsOptions {
  /** Auto-fetch on mount */
  enabled?: boolean;
  /** Page size for pagination */
  pageSize?: number;
  /** Initial filters */
  filters?: NotificationFilters;
  /** Enable WebSocket real-time updates */
  realTime?: boolean;
}

export interface UseNotificationsReturn {
  /** List of notifications */
  notifications: Notification[];
  /** Unread notification count */
  unreadCount: number;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Has more pages */
  hasMore: boolean;
  /** Fetch more notifications */
  fetchMore: () => void;
  /** Refresh notifications */
  refresh: () => void;
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Archive a notification */
  archiveNotification: (notificationId: string) => Promise<void>;
  /** Delete a notification */
  deleteNotification: (notificationId: string) => Promise<void>;
  /** Update filters */
  setFilters: (filters: NotificationFilters) => void;
  /** Current filters */
  filters: NotificationFilters;
}

// ============= HOOK =============

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    enabled = true,
    pageSize = 20,
    filters: initialFilters = {},
    realTime = true
  } = options;

  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [page, setPage] = useState(0);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Build query params
  const buildQueryParams = useCallback((offset: number) => {
    const params = new URLSearchParams();
    params.set('limit', pageSize.toString());
    params.set('offset', offset.toString());
    if (filters.category) params.set('category', filters.category);
    if (filters.unreadOnly) params.set('unreadOnly', 'true');
    if (filters.includeArchived) params.set('includeArchived', 'true');
    return params.toString();
  }, [pageSize, filters]);

  // Fetch notifications
  const { 
    data, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['notifications', filters, page],
    queryFn: async () => {
      const response = await apiRequest(`/api/notifications?${buildQueryParams(page * pageSize)}`);
      return response as {
        notifications: Notification[];
        unreadCount: number;
        hasMore: boolean;
      };
    },
    enabled,
    staleTime: 30000, // 30 seconds
  });

  // Fetch unread count separately for badge
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await apiRequest('/api/notifications/unread-count');
      return response as { count: number };
    },
    enabled,
    staleTime: 10000, // 10 seconds
    refetchInterval: 60000, // Refresh every minute
  });

  // Update notifications list when data changes
  useEffect(() => {
    if (data?.notifications) {
      if (page === 0) {
        setAllNotifications(data.notifications);
      } else {
        setAllNotifications(prev => [...prev, ...data.notifications]);
      }
      setHasMore(data.hasMore);
    }
  }, [data, page]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    setAllNotifications([]);
  }, [filters]);

  // WebSocket for real-time updates
  const { status: wsStatus } = useWebSocket({
    autoConnect: realTime,
    channels: ['notifications'],
    onMessage: (message) => {
      if (message.type === 'notification') {
        // Add new notification to the top
        const newNotification = message.notification as Notification;
        setAllNotifications(prev => [newNotification, ...prev]);
        
        // Invalidate unread count
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      }
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
    },
    onSuccess: (_, notificationId) => {
      // Update local state
      setAllNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
      );
      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/notifications/mark-all-read', {
        method: 'PATCH'
      });
    },
    onSuccess: () => {
      // Update local state
      setAllNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    }
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest(`/api/notifications/${notificationId}/archive`, {
        method: 'PATCH'
      });
    },
    onSuccess: (_, notificationId) => {
      // Remove from local state if not showing archived
      if (!filters.includeArchived) {
        setAllNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, notificationId) => {
      // Remove from local state
      setAllNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    }
  });

  // Fetch more for infinite scroll
  const fetchMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isLoading]);

  // Refresh
  const refresh = useCallback(() => {
    setPage(0);
    setAllNotifications([]);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  }, [refetch, queryClient]);

  return {
    notifications: allNotifications,
    unreadCount: unreadData?.count ?? data?.unreadCount ?? 0,
    isLoading,
    error: error as Error | null,
    hasMore,
    fetchMore,
    refresh,
    markAsRead: async (id) => { await markAsReadMutation.mutateAsync(id); },
    markAllAsRead: async () => { await markAllAsReadMutation.mutateAsync(); },
    archiveNotification: async (id) => { await archiveMutation.mutateAsync(id); },
    deleteNotification: async (id) => { await deleteMutation.mutateAsync(id); },
    setFilters,
    filters
  };
}

// Export a simpler hook for just the unread count (badge use)
export function useUnreadNotificationCount(): number {
  const { data } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await apiRequest('/api/notifications/unread-count');
      return response as { count: number };
    },
    staleTime: 10000,
    refetchInterval: 60000,
  });

  return data?.count ?? 0;
}
