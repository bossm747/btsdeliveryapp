import { useState } from "react";
import { Bell, Package, CheckCircle, XCircle, Truck, Clock, X, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface NotificationCenterProps {
  userId?: string;
  userRole?: string;
}

export default function NotificationCenter({ userId, userRole }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    clearNotifications
  } = useNotifications({ userId, userRole });

  const getNotificationIcon = (type: string) => {
    if (type.includes('confirmed')) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (type.includes('cancelled')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (type.includes('preparing')) return <Clock className="h-4 w-4 text-orange-500" />;
    if (type.includes('on_the_way')) return <Truck className="h-4 w-4 text-blue-500" />;
    if (type.includes('delivered')) return <Package className="h-4 w-4 text-green-500" />;
    return <Bell className="h-4 w-4 text-gray-500" />;
  };

  const getNotificationTitle = (type: string) => {
    if (type.includes('confirmed')) return 'Order Confirmed';
    if (type.includes('cancelled')) return 'Order Cancelled';
    if (type.includes('preparing')) return 'Preparing Order';
    if (type.includes('ready')) return 'Order Ready';
    if (type.includes('picked_up')) return 'Order Picked Up';
    if (type.includes('on_the_way')) return 'Order On The Way';
    if (type.includes('delivered')) return 'Order Delivered';
    return 'Notification';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-500 text-white"
              variant="default"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          {connected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Mga Notification</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} bago</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  data-testid="mark-all-read"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearNotifications}
                  title="Clear all"
                  data-testid="clear-all-notifications"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Walang notification
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Makakakuha ka ng notification kapag may update
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-orange-50/50' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.orderId) {
                      setOpen(false);
                    }
                  }}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium">
                          {getNotificationTitle(notification.type)}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 bg-orange-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(notification.timestamp), { 
                            addSuffix: true 
                          })}
                        </span>
                        {notification.orderId && (
                          <>
                            <span>•</span>
                            <Link href={`/orders/${notification.orderId}`}>
                              <a className="text-orange-600 hover:underline">
                                View Order
                              </a>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Link href="/notifications">
              <Button 
                variant="ghost" 
                className="w-full justify-center text-sm"
                onClick={() => setOpen(false)}
                data-testid="view-all-notifications"
              >
                Tingnan lahat ng notification
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}