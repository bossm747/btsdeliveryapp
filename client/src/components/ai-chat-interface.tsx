import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  Send,
  User,
  Loader2,
  MapPin,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Paperclip,
  X,
  FileText,
  Camera,
  Search,
  Database,
  Wand2,
  Brain
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import btsLogo from "@assets/btslogo.png";

// Types
interface UploadedFile {
  url: string;
  type: string;
  originalName?: string;
  analysis?: {
    type: "menu" | "image";
    description?: string;
    items?: any[];
    categories?: string[];
    success?: boolean;
  };
  menuCreated?: {
    success: boolean;
    created: number;
    items: any[];
  };
}

// Export Message type for external use
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: string;
  model?: string;
  files?: UploadedFile[];
  functionsExecuted?: Array<{
    name: string;
    success: boolean;
    result?: any;
  }>;
  suggestedActions?: string[];
  metadata?: {
    confidence?: number;
    processingTime?: number;
    functionsAvailable?: number;
  };
}

interface AIChatInterfaceProps {
  userRole?: "customer" | "rider" | "vendor" | "admin";
  restaurantId?: string;
  riderId?: string;
  orderId?: string;
  className?: string;
  title?: string;
  placeholder?: string;
  showHeader?: boolean;
  // External state management
  messages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

// AI Action Status Animation Component
function AIActionStatus({ isUploading }: { isUploading?: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = isUploading
    ? [
        { icon: Loader2, text: "Tinatanggap ang files...", color: "text-blue-500" },
        { icon: Search, text: "Ina-analyze ang larawan...", color: "text-purple-500" },
        { icon: Brain, text: "Pinoproseso ng AI...", color: "text-pink-500" },
        { icon: Wand2, text: "Ginagawa ang resulta...", color: "text-orange-500" },
      ]
    : [
        { icon: Brain, text: "Nag-iisip...", color: "text-blue-500" },
        { icon: Search, text: "Hinahanap ang impormasyon...", color: "text-purple-500" },
        { icon: Database, text: "Kinukuha ang data...", color: "text-green-500" },
        { icon: Wand2, text: "Ginagawa ang sagot...", color: "text-orange-500" },
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="bg-muted rounded-lg p-3 min-w-[200px]">
      <div className="space-y-2">
        {/* Current action with animation */}
        <div className="flex items-center gap-2">
          <div className={`${steps[currentStep].color} animate-pulse`}>
            <CurrentIcon className="h-4 w-4 animate-spin" />
          </div>
          <span className="text-sm font-medium animate-pulse">
            {steps[currentStep].text}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 justify-center">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? "w-4 bg-primary"
                  : idx < currentStep
                  ? "w-1.5 bg-primary/50"
                  : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="text-[10px] text-center text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}

// BTS Logo Avatar Component
function BTSAvatar({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <Avatar className={`${className} flex-shrink-0`}>
      <AvatarImage src={btsLogo} alt="BTS AI" className="object-cover" />
      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">
        BTS
      </AvatarFallback>
    </Avatar>
  );
}

// Rich content renderers
function RichContent({ content, functionsExecuted }: { content: string; functionsExecuted?: Message["functionsExecuted"] }) {
  // Check if content contains special markers for rich content
  const hasMap = content.includes("[MAP:") || content.includes("{{map}}");
  const hasImage = content.includes("![") || content.includes("[IMAGE:");

  // Parse and render markdown with custom components
  return (
    <div className="space-y-3">
      {/* Function execution results with rich data */}
      {functionsExecuted && functionsExecuted.length > 0 && (
        <FunctionResultsDisplay results={functionsExecuted} />
      )}

      {/* Main content with markdown */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          components={{
            // Custom link rendering
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {children}
                <ExternalLink className="h-3 w-3" />
              </a>
            ),
            // Custom image rendering
            img: ({ src, alt }) => (
              <div className="my-2">
                <img
                  src={src}
                  alt={alt || "AI generated image"}
                  className="rounded-lg border max-w-full h-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/400x300?text=${encodeURIComponent(alt || "Image")}`;
                  }}
                />
                {alt && <p className="text-xs text-muted-foreground mt-1">{alt}</p>}
              </div>
            ),
            // Custom code block for data display
            code: ({ className, children }) => {
              const isJson = className?.includes("json");
              if (isJson) {
                try {
                  const data = JSON.parse(String(children));
                  return <DataDisplay data={data} />;
                } catch {
                  return <code className={className}>{children}</code>;
                }
              }
              return <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>;
            },
            // Lists
            ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
            // Bold text
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// Display function execution results
function FunctionResultsDisplay({ results }: { results: Message["functionsExecuted"] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (!results || results.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {results.map((result, idx) => (
        <div
          key={idx}
          className={`rounded-lg border p-2 ${
            result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}
        >
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpanded({ ...expanded, [idx]: !expanded[idx] })}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs font-medium">{formatFunctionName(result.name)}</span>
            </div>
            {expanded[idx] ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>

          {expanded[idx] && result.result && (
            <div className="mt-2 pt-2 border-t">
              <DataDisplay data={result.result} compact />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Format function name for display
function formatFunctionName(name: string): string {
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Display structured data (restaurants, menus, orders, etc.)
function DataDisplay({ data, compact = false }: { data: any; compact?: boolean }) {
  if (!data) return null;

  // Handle arrays (restaurants, menu items, orders)
  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="text-sm text-muted-foreground">No results found</p>;

    // Detect type based on properties
    const firstItem = data[0];

    // Restaurants
    if (firstItem.cuisine || firstItem.deliveryFee !== undefined) {
      return <RestaurantList restaurants={data} compact={compact} />;
    }

    // Menu items
    if (firstItem.price !== undefined && firstItem.description) {
      return <MenuItemList items={data} compact={compact} />;
    }

    // Orders
    if (firstItem.orderNumber || firstItem.status) {
      return <OrderList orders={data} compact={compact} />;
    }

    // Generic list
    return (
      <ul className="text-sm space-y-1">
        {data.slice(0, compact ? 3 : 10).map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <span className="text-muted-foreground">{idx + 1}.</span>
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </li>
        ))}
        {data.length > (compact ? 3 : 10) && (
          <li className="text-muted-foreground">...and {data.length - (compact ? 3 : 10)} more</li>
        )}
      </ul>
    );
  }

  // Handle order details
  if (data.orderId && data.orderNumber) {
    return <OrderDetails order={data} />;
  }

  // Handle menu with categories
  if (data.categories && data.restaurant) {
    return <MenuDisplay menu={data} compact={compact} />;
  }

  // Handle message with result
  if (data.message) {
    return (
      <p className="text-sm text-green-700 font-medium flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        {data.message}
      </p>
    );
  }

  // Generic object display
  return (
    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// Restaurant list component
function RestaurantList({ restaurants, compact }: { restaurants: any[]; compact?: boolean }) {
  const displayCount = compact ? 3 : restaurants.length;

  return (
    <div className="space-y-2">
      {restaurants.slice(0, displayCount).map((restaurant, idx) => (
        <div
          key={restaurant.id || idx}
          className="flex items-center gap-3 p-2 bg-background rounded-lg border"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-lg">
              {restaurant.cuisine?.includes("Filipino") ? "🍲" :
               restaurant.cuisine?.includes("Japanese") ? "🍣" :
               restaurant.cuisine?.includes("Chinese") ? "🥡" :
               restaurant.cuisine?.includes("Pizza") || restaurant.cuisine?.includes("Italian") ? "🍕" :
               restaurant.cuisine?.includes("Fast Food") ? "🍔" : "🍽️"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{restaurant.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {restaurant.rating && <span>⭐ {restaurant.rating}</span>}
              {restaurant.estimatedDeliveryTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {restaurant.estimatedDeliveryTime} min
                </span>
              )}
              {restaurant.deliveryFee && <span>₱{restaurant.deliveryFee} delivery</span>}
            </div>
          </div>
        </div>
      ))}
      {restaurants.length > displayCount && (
        <p className="text-xs text-muted-foreground text-center">
          +{restaurants.length - displayCount} more restaurants
        </p>
      )}
    </div>
  );
}

// Menu item list component
function MenuItemList({ items, compact }: { items: any[]; compact?: boolean }) {
  const displayCount = compact ? 3 : items.length;

  return (
    <div className="space-y-2">
      {items.slice(0, displayCount).map((item, idx) => (
        <div
          key={item.id || idx}
          className="flex items-center gap-3 p-2 bg-background rounded-lg border"
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.name}</p>
            {item.restaurantName && (
              <p className="text-xs text-muted-foreground">{item.restaurantName}</p>
            )}
          </div>
          <span className="font-semibold text-sm text-primary">₱{item.price}</span>
        </div>
      ))}
      {items.length > displayCount && (
        <p className="text-xs text-muted-foreground text-center">
          +{items.length - displayCount} more items
        </p>
      )}
    </div>
  );
}

// Order list component
function OrderList({ orders, compact }: { orders: any[]; compact?: boolean }) {
  const displayCount = compact ? 3 : orders.length;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-purple-100 text-purple-800",
    ready: "bg-green-100 text-green-800",
    picked_up: "bg-indigo-100 text-indigo-800",
    on_the_way: "bg-cyan-100 text-cyan-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-2">
      {orders.slice(0, displayCount).map((order, idx) => (
        <div
          key={order.orderId || idx}
          className="p-2 bg-background rounded-lg border"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs">{order.orderNumber || order.orderId}</span>
            <Badge className={`text-xs ${statusColors[order.status] || "bg-gray-100"}`}>
              {order.status}
            </Badge>
          </div>
          {order.total && (
            <p className="text-sm font-semibold mt-1">₱{order.total}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Order details component
function OrderDetails({ order }: { order: any }) {
  return (
    <div className="bg-background rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
        <Badge variant="outline">{order.status}</Badge>
      </div>
      {order.restaurant && (
        <p className="text-sm">
          <span className="text-muted-foreground">Restaurant:</span> {order.restaurant}
        </p>
      )}
      {order.deliveryAddress && (
        <p className="text-sm flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          {order.deliveryAddress}
        </p>
      )}
      {order.total && (
        <p className="text-sm font-semibold">Total: ₱{order.total}</p>
      )}
    </div>
  );
}

// Menu display component
function MenuDisplay({ menu, compact }: { menu: any; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <p className="font-medium">{menu.restaurant?.name} Menu</p>
      {menu.categories?.map((category: any, idx: number) => (
        <div key={category.id || idx}>
          <p className="text-sm font-medium text-muted-foreground mb-1">{category.name}</p>
          {category.items && category.items.length > 0 ? (
            <MenuItemList items={category.items} compact={compact} />
          ) : (
            <p className="text-xs text-muted-foreground">No items in this category</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Suggested actions component
function SuggestedActions({
  actions,
  onAction,
}: {
  actions: string[];
  onAction: (action: string) => void;
}) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map((action, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={() => onAction(action)}
        >
          {action}
        </Button>
      ))}
    </div>
  );
}

// Default welcome message
const defaultMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Magandang araw po! Ako po ang BTS AI Assistant. Ano po ang maitutulong ko sa inyo?",
    timestamp: new Date(),
    agent: "general",
  },
];

// Main chat interface component
export default function AIChatInterface({
  userRole = "customer",
  restaurantId,
  riderId,
  orderId,
  className = "",
  title = "BTS AI Assistant",
  placeholder = "Anong maitutulong ko sa inyo po?",
  showHeader = true,
  messages: externalMessages,
  onMessagesChange,
}: AIChatInterfaceProps) {
  const { user } = useAuth();

  // Use external state if provided, otherwise use internal state
  const [internalMessages, setInternalMessages] = useState<Message[]>(defaultMessages);
  const messages = externalMessages ?? internalMessages;

  // Update messages - either external or internal
  const updateMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    if (typeof newMessages === "function") {
      const updated = newMessages(messages);
      if (onMessagesChange) {
        onMessagesChange(updated);
      } else {
        setInternalMessages(updated);
      }
    } else {
      if (onMessagesChange) {
        onMessagesChange(newMessages);
      } else {
        setInternalMessages(newMessages);
      }
    }
  };

  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadAction, setUploadAction] = useState<"analyze" | "create-menu" | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom with smooth behavior
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Chat mutation (text only)
  const chatMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/ai/chat-support", {
        query,
        userRole,
        userId: user?.id,
        restaurantId,
        riderId,
        orderId,
        enableFunctions: true,
        conversationHistory: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        agent: data.agent,
        model: data.model,
        functionsExecuted: data.functionsExecuted,
        suggestedActions: data.suggestedActions,
        metadata: data.metadata,
      };
      updateMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    },
    onError: () => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Pasensya na po, may problema kami ngayon. Subukan po ulit mamaya.",
        timestamp: new Date(),
        agent: "error",
      };
      updateMessages((prev) => [...prev, errorMessage]);
    },
  });

  // Chat with file upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ query, files, action }: { query: string; files: File[]; action?: string }) => {
      const formData = new FormData();
      formData.append("query", query);
      formData.append("userRole", userRole);
      if (user?.id) formData.append("userId", user.id);
      if (restaurantId) formData.append("restaurantId", restaurantId);
      if (action) formData.append("action", action);

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/ai/chat-with-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");
      return await response.json();
    },
    onSuccess: (data) => {
      // Build response content
      let content = data.response || "";

      // Add file analysis info
      if (data.files && data.files.length > 0) {
        const fileInfos = data.files.map((f: UploadedFile) => {
          if (f.analysis?.type === "menu" && f.analysis.items) {
            return `Nakita ko po ${f.analysis.items.length} menu items sa larawan.`;
          }
          if (f.analysis?.type === "image") {
            return f.analysis.description;
          }
          return null;
        }).filter(Boolean);

        if (fileInfos.length > 0 && !content) {
          content = fileInfos.join("\n\n");
        }

        // Add menu creation info
        const menuCreated = data.files.find((f: UploadedFile) => f.menuCreated?.success);
        if (menuCreated) {
          content += `\n\nAla eh po! Na-create ko na po ${menuCreated.menuCreated.created} menu items sa database!`;
        }
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: content || "Na-receive ko na po ang files niyo.",
        timestamp: new Date(),
        agent: data.agent || "vision",
        model: data.model,
        files: data.files,
        functionsExecuted: data.functionsExecuted,
        suggestedActions: data.suggestedActions,
        metadata: data.metadata,
      };
      updateMessages((prev) => [...prev, assistantMessage]);
      setSelectedFiles([]);
      setUploadAction(null);
      scrollToBottom();
    },
    onError: () => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Pasensya na po, may problema sa pag-upload. Subukan po ulit.",
        timestamp: new Date(),
        agent: "error",
      };
      updateMessages((prev) => [...prev, errorMessage]);
      setSelectedFiles([]);
      setUploadAction(null);
    },
  });

  // Scroll when loading state changes (to show typing indicator)
  useEffect(() => {
    if (chatMutation.isPending || uploadMutation.isPending) {
      scrollToBottom();
    }
  }, [chatMutation.isPending, uploadMutation.isPending]);

  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Send message (with or without files)
  const sendMessage = (text: string, action?: string) => {
    const query = text.trim();
    const isPending = chatMutation.isPending || uploadMutation.isPending;

    if ((!query && selectedFiles.length === 0) || isPending) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: query || (selectedFiles.length > 0 ? `[Nag-upload ng ${selectedFiles.length} file(s)]` : ""),
      timestamp: new Date(),
    };
    updateMessages((prev) => [...prev, userMessage]);
    setInput("");
    scrollToBottom();

    // Determine which mutation to use
    if (selectedFiles.length > 0) {
      uploadMutation.mutate({ query, files: selectedFiles, action: action || uploadAction || undefined });
    } else {
      chatMutation.mutate(query);
    }
  };

  // Handle suggested action click
  const handleAction = (action: string) => {
    sendMessage(action);
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {showHeader && (
        <CardHeader className="flex-shrink-0 pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            {title}
            {chatMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <BTSAvatar />
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <RichContent
                    content={message.content}
                    functionsExecuted={message.functionsExecuted}
                  />

                  {/* Show uploaded files in assistant response */}
                  {message.role === "assistant" && message.files && (
                    <FilePreview files={message.files} />
                  )}

                  {message.role === "assistant" && message.suggestedActions && (
                    <SuggestedActions
                      actions={message.suggestedActions}
                      onAction={handleAction}
                    />
                  )}

                  {message.metadata && message.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {message.agent && (
                        <Badge variant="outline" className="text-xs">
                          {message.agent}
                        </Badge>
                      )}
                      {message.metadata.processingTime && (
                        <span>{(message.metadata.processingTime / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={user?.profileImageUrl} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {(chatMutation.isPending || uploadMutation.isPending) && (
              <div className="flex gap-3">
                <BTSAvatar />
                <AIActionStatus isUploading={uploadMutation.isPending} />
              </div>
            )}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2 border-t bg-muted/30">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 bg-background rounded-lg px-2 py-1 text-xs border"
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <FileText className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Menu action buttons for vendors */}
              {userRole === "vendor" && selectedFiles.some((f) => f.type.startsWith("image/")) && (
                <div className="flex gap-1 ml-auto">
                  <Button
                    type="button"
                    variant={uploadAction === "analyze" ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setUploadAction("analyze")}
                  >
                    Analyze Only
                  </Button>
                  <Button
                    type="button"
                    variant={uploadAction === "create-menu" ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setUploadAction("create-menu")}
                  >
                    Create Menu Items
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2"
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File upload button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={chatMutation.isPending || uploadMutation.isPending}
              title="Mag-upload ng file o larawan"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Camera button for mobile */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*";
                  fileInputRef.current.capture = "environment";
                  fileInputRef.current.click();
                }
              }}
              disabled={chatMutation.isPending || uploadMutation.isPending}
              className="sm:hidden"
              title="Kumuha ng litrato"
            >
              <Camera className="h-4 w-4" />
            </Button>

            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedFiles.length > 0 ? "Describe what you want to do with the file(s)..." : placeholder}
              disabled={chatMutation.isPending || uploadMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={(!input.trim() && selectedFiles.length === 0) || chatMutation.isPending || uploadMutation.isPending}
              size="icon"
            >
              {(chatMutation.isPending || uploadMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

// File preview in messages
function FilePreview({ files }: { files: UploadedFile[] }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {files.map((file, idx) => (
        <div key={idx} className="rounded-lg overflow-hidden border">
          {file.type.startsWith("image/") && file.url && (
            <img
              src={file.url}
              alt={file.originalName || "Uploaded image"}
              className="max-w-full h-auto max-h-48 object-cover"
            />
          )}
          {file.analysis && (
            <div className="p-2 bg-muted/50 text-xs">
              {file.analysis.type === "menu" && file.analysis.items && (
                <p>Nakita: {file.analysis.items.length} menu items</p>
              )}
              {file.analysis.type === "image" && file.analysis.description && (
                <p className="line-clamp-2">{file.analysis.description}</p>
              )}
            </div>
          )}
          {file.menuCreated?.success && (
            <div className="p-2 bg-green-50 text-xs text-green-700">
              Na-create: {file.menuCreated.created} items sa menu
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
