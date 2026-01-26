/**
 * Notification Center Component
 * 
 * A unified notification center with:
 * - Bell icon with unread count badge
 * - Dropdown/popover with notification list
 * - Mark as read functionality
 * - Notification types: order updates, promotions, system alerts
 * - Link to related content when clicked
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Package,
  Tag,
  AlertCircle,
  Gift,
  CreditCard,
  Truck,
  CheckCircle,
  X,
  Check,
  CheckCheck,
  Trash2,
  Archive,
  Filter,
  RefreshCw,
  ChevronRight,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotifications, type Notification } from '@/hooks/use-notifications';

// ============= TYPES =============

interface NotificationCenterProps {
  /** Button variant for the trigger */
  variant?: 'default' | 'ghost' | 'outline';
  /** Button size */
  size?: 'default' | 'sm' | 'icon';
  /** Additional class names */
  className?: string;
  /** Icon color class */
  iconClassName?: string;
}

type NotificationCategory = 'all' | 'orders' | 'promotions' | 'system' | 'loyalty';

// ============= ICON MAPPING =============

const iconMap: Record<string, React.ElementType> = {
  package: Package,
  tag: Tag,
  alert: AlertCircle,
  gift: Gift,
  credit_card: CreditCard,
  truck: Truck,
  check: CheckCircle,
  default: Bell
};

const typeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  order_update: { icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  promotion: { icon: Tag, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  system_alert: { icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  loyalty: { icon: Gift, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  payment: { icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100' },
  delivery: { icon: Truck, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  default: { icon: Bell, color: 'text-gray-600', bgColor: 'bg-gray-100' }
};

// ============= HELPER FUNCTIONS =============

function getNotificationIcon(notification: Notification) {
  if (notification.icon && iconMap[notification.icon]) {
    return iconMap[notification.icon];
  }
  return typeConfig[notification.type]?.icon || typeConfig.default.icon;
}

function getNotificationStyle(notification: Notification) {
  return typeConfig[notification.type] || typeConfig.default;
}

function formatTimeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'Recently';
  }
}

// ============= NOTIFICATION ITEM COMPONENT =============

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onArchive,
  onDelete,
  onClick
}: NotificationItemProps) {
  const Icon = getNotificationIcon(notification);
  const style = getNotificationStyle(notification);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
        !notification.isRead && "bg-blue-50/50 hover:bg-blue-50"
      )}
      onClick={() => onClick(notification)}
    >
      {/* Icon */}
      <div className={cn("p-2 rounded-full shrink-0", style.bgColor)}>
        <Icon className={cn("w-4 h-4", style.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            "text-sm line-clamp-1",
            !notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"
          )}>
            {notification.title}
          </h4>
          {!notification.isRead && (
            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">
            {formatTimeAgo(notification.createdAt)}
          </span>
          
          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                onClick={() => onMarkAsRead(notification.id)}
                title="Mark as read"
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-orange-600"
              onClick={() => onArchive(notification.id)}
              title="Archive"
            >
              <Archive className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
              onClick={() => onDelete(notification.id)}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= EMPTY STATE =============

function EmptyNotifications({ category }: { category: NotificationCategory }) {
  const messages: Record<NotificationCategory, { title: string; description: string }> = {
    all: {
      title: "No notifications yet",
      description: "When you have updates, they'll appear here"
    },
    orders: {
      title: "No order updates",
      description: "Your order notifications will appear here"
    },
    promotions: {
      title: "No promotions",
      description: "Stay tuned for exclusive deals and offers"
    },
    system: {
      title: "No system alerts",
      description: "Important announcements will appear here"
    },
    loyalty: {
      title: "No loyalty updates",
      description: "Your rewards and points updates will appear here"
    }
  };

  const { title, description } = messages[category];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-3 rounded-full bg-gray-100 mb-3">
        <Bell className="w-6 h-6 text-gray-400" />
      </div>
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <p className="text-xs text-gray-500 mt-1 max-w-[200px]">{description}</p>
    </div>
  );
}

// ============= LOADING SKELETON =============

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="w-8 h-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

// ============= MAIN COMPONENT =============

export function NotificationCenter({
  variant = 'ghost',
  size = 'sm',
  className,
  iconClassName
}: NotificationCenterProps) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');

  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchMore,
    refresh,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    setFilters
  } = useNotifications({
    enabled: true,
    realTime: true
  });

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter(n => n.category === activeTab);
  }, [notifications, activeTab]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if present
    if (notification.actionUrl) {
      setIsOpen(false);
      setLocation(notification.actionUrl);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as NotificationCategory);
    if (tab === 'all') {
      setFilters({});
    } else {
      setFilters({ category: tab });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("relative p-2", className)}
        >
          <Bell className={cn("w-5 h-5", iconClassName)} />
          {unreadCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-5 p-0 text-xs bg-red-500 hover:bg-red-500",
                "flex items-center justify-center"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0 shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-500"
              onClick={refresh}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="promotions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              Promos
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-transparent px-4 py-2 text-xs"
            >
              System
            </TabsTrigger>
          </TabsList>

          {/* Notification List */}
          <ScrollArea className="h-[400px]">
            {isLoading && notifications.length === 0 ? (
              <div className="space-y-1 p-2">
                {[...Array(5)].map((_, i) => (
                  <NotificationSkeleton key={i} />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyNotifications category={activeTab} />
            ) : (
              <div className="space-y-1 p-2">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onArchive={archiveNotification}
                    onDelete={deleteNotification}
                    onClick={handleNotificationClick}
                  />
                ))}
                
                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-500"
                      onClick={fetchMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

// Export a simple badge component for use in other places
export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  
  return (
    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 p-0 text-[10px] bg-red-500">
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

export default NotificationCenter;
