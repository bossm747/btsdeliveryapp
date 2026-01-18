/**
 * Order Chat Component
 *
 * Real-time chat between customers and riders during active deliveries.
 * Features:
 * - Message list with auto-scroll
 * - Different styling for sent vs received messages
 * - Real-time updates via WebSocket
 * - Loading and error states
 * - Unread message indicator
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Send,
  MessageCircle,
  User,
  Bike,
  CheckCheck,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Types
interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: "customer" | "rider";
  senderName: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface OrderChatProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riderName?: string;
  customerName?: string;
}

// Format time for message display
function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Format date for message grouping
function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }
}

// Group messages by date
function groupMessagesByDate(
  messages: ChatMessage[]
): Map<string, ChatMessage[]> {
  const groups = new Map<string, ChatMessage[]>();

  messages.forEach((message) => {
    const dateKey = new Date(message.createdAt).toDateString();
    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, message]);
  });

  return groups;
}

// Message bubble component
function MessageBubble({
  message,
  isOwnMessage,
}: {
  message: ChatMessage;
  isOwnMessage: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col max-w-[80%] mb-3",
        isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      {/* Sender name for received messages */}
      {!isOwnMessage && (
        <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          {message.senderRole === "rider" ? (
            <Bike className="w-3 h-3" />
          ) : (
            <User className="w-3 h-3" />
          )}
          {message.senderName}
        </span>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          "px-4 py-2 rounded-2xl break-words",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
      </div>

      {/* Time and read status */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[10px] text-muted-foreground">
          {formatMessageTime(message.createdAt)}
        </span>
        {isOwnMessage && message.isRead && (
          <CheckCheck className="w-3 h-3 text-primary" />
        )}
      </div>
    </div>
  );
}

// Date divider component
function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted px-3 py-1 rounded-full">
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
    </div>
  );
}

// Loading skeleton for messages
function MessagesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col",
            i % 2 === 0 ? "items-end" : "items-start"
          )}
        >
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton
            className={cn(
              "h-12 rounded-2xl",
              i % 2 === 0 ? "w-48" : "w-56"
            )}
          />
        </div>
      ))}
    </div>
  );
}

// Empty state component
function EmptyChat({ isRider }: { isRider: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
      <h3 className="font-medium text-foreground mb-2">No messages yet</h3>
      <p className="text-sm text-muted-foreground">
        {isRider
          ? "Send a message to the customer about the delivery."
          : "Send a message to your rider about the delivery."}
      </p>
    </div>
  );
}

// Helper to get auth token
function getAuthToken(): string {
  return localStorage.getItem("authToken") || "";
}

// Main OrderChat component
export default function OrderChat({
  orderId,
  open,
  onOpenChange,
  riderName,
  customerName,
}: OrderChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const isRider = user?.role === "rider";
  const token = getAuthToken();

  // Fetch messages
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery<ChatMessage[]>({
    queryKey: ["/api/orders", orderId, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      return response.json();
    },
    enabled: open && !!orderId && !!token,
    refetchInterval: 10000, // Fallback polling every 10 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: (newMsg) => {
      // Add optimistic update
      queryClient.setQueryData<ChatMessage[]>(
        ["/api/orders", orderId, "messages"],
        (old) => (old ? [...old, newMsg] : [newMsg])
      );
      setNewMessage("");
      scrollToBottom();
    },
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/orders/${orderId}/messages/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to mark messages as read");
      }
      return response.json();
    },
  });

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!open || !orderId || !token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Authenticate
      ws.send(JSON.stringify({ type: "auth", token }));

      // Subscribe to order channel
      ws.send(
        JSON.stringify({
          type: "subscribe",
          orderId,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "chat_message" && data.orderId === orderId) {
          // Add new message to cache
          queryClient.setQueryData<ChatMessage[]>(
            ["/api/orders", orderId, "messages"],
            (old) => {
              if (!old) return [data.message];
              // Avoid duplicates
              if (old.some((m) => m.id === data.message.id)) {
                return old;
              }
              return [...old, data.message];
            }
          );
          scrollToBottom();

          // Mark as read if from other party
          if (data.message.senderId !== user?.id) {
            markAsReadMutation.mutate();
          }
        }

        if (data.type === "messages_read" && data.orderId === orderId) {
          // Update read status in cache
          queryClient.setQueryData<ChatMessage[]>(
            ["/api/orders", orderId, "messages"],
            (old) =>
              old?.map((m) =>
                m.senderId === user?.id
                  ? { ...m, isRead: true, readAt: data.timestamp }
                  : m
              ) || []
          );
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe", orderId }));
      }
      ws.close();
    };
  }, [open, orderId, token, user?.id, queryClient, scrollToBottom, markAsReadMutation]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (open && messages.length > 0) {
      const hasUnread = messages.some(
        (m) => !m.isRead && m.senderId !== user?.id
      );
      if (hasUnread) {
        markAsReadMutation.mutate();
      }
    }
  }, [open, messages, user?.id, markAsReadMutation]);

  // Focus input when sheet opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Handle send message
  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate(trimmedMessage);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by date
  const messageGroups = groupMessagesByDate(messages);
  const recipientName = isRider ? customerName : riderName;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {isRider ? (
                  <User className="w-5 h-5 text-primary" />
                ) : (
                  <Bike className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <SheetTitle className="text-left">
                  {recipientName || (isRider ? "Customer" : "Rider")}
                </SheetTitle>
                <SheetDescription className="text-left text-xs">
                  {isRider
                    ? "Chat with customer"
                    : "Chat with your delivery rider"}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <MessagesSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mb-3" />
              <p className="text-sm text-muted-foreground">
                Failed to load messages
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["/api/orders", orderId, "messages"],
                  })
                }
              >
                Try again
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <EmptyChat isRider={isRider} />
          ) : (
            <ScrollArea className="h-full">
              <div ref={scrollRef} className="p-4">
                {Array.from(messageGroups.entries()).map(([dateKey, msgs]) => (
                  <div key={dateKey}>
                    <DateDivider date={formatMessageDate(msgs[0].createdAt)} />
                    {msgs.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwnMessage={message.senderId === user?.id}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-4 bg-background">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sendMessageMutation.isPending}
              maxLength={1000}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={
                !newMessage.trim() || sendMessageMutation.isPending
              }
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          {sendMessageMutation.isError && (
            <p className="text-xs text-destructive mt-2">
              Failed to send message. Please try again.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Chat button with unread badge
export function ChatButton({
  orderId,
  onClick,
  className,
}: {
  orderId: string;
  onClick: () => void;
  className?: string;
}) {
  const token = getAuthToken();

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/orders", orderId, "messages", "unread-count"],
    queryFn: async () => {
      const response = await fetch(
        `/api/orders/${orderId}/messages/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );
      if (!response.ok) {
        return { count: 0 };
      }
      return response.json();
    },
    enabled: !!orderId && !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("relative", className)}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Chat
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
