import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Bell, Package, CheckCircle, XCircle, Truck, Clock } from "lucide-react";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  status?: string;
}

interface UseNotificationsOptions {
  userId?: string;
  userRole?: string;
  onNotification?: (notification: Notification) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { userId, userRole, onNotification } = options;
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'order_cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'order_preparing':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'order_on_the_way':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'order_delivered':
        return <Package className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log("Connecting to WebSocket:", wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      reconnectAttemptsRef.current = 0;

      // Authenticate if userId is provided
      if (userId) {
        ws.send(JSON.stringify({
          type: "auth",
          userId,
          role: userRole || "customer"
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);

        switch (data.type) {
          case "connection":
            console.log("Connection established:", data);
            break;
            
          case "auth":
            console.log("Authentication successful:", data);
            break;
            
          case "order_update":
            const notification: Notification = {
              id: `${data.orderId}-${Date.now()}`,
              type: `order_${data.status}`,
              title: "Order Update",
              message: data.message,
              timestamp: data.timestamp,
              read: false,
              orderId: data.orderId,
              status: data.status
            };
            
            // Add to notifications list
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast notification
            toast({
              title: notification.title,
              description: notification.message,
              action: getNotificationIcon(notification.type)
            });
            
            // Call custom handler if provided
            if (onNotification) {
              onNotification(notification);
            }
            break;
            
          case "announcement":
            const announcementNotif: Notification = {
              id: `announcement-${Date.now()}`,
              type: "announcement",
              title: data.title || "Announcement",
              message: data.message,
              timestamp: data.timestamp || new Date().toISOString(),
              read: false
            };
            
            setNotifications(prev => [announcementNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            toast({
              title: announcementNotif.title,
              description: announcementNotif.message
            });
            break;
            
          case "error":
            console.error("WebSocket error:", data.message);
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
      wsRef.current = null;

      // Implement reconnection logic
      if (reconnectAttemptsRef.current < 5) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };
  }, [userId, userRole, toast, onNotification]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnected(false);
  }, []);

  const subscribeToOrder = useCallback((orderId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        orderId
      }));
    }
  }, []);

  const unsubscribeFromOrder = useCallback((orderId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "unsubscribe",
        orderId
      }));
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Keep connection alive with ping
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);

  return {
    notifications,
    unreadCount,
    connected,
    subscribeToOrder,
    unsubscribeFromOrder,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}