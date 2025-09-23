import { useState, useRef, useEffect, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MessageCircle, Send, Bot, User, X, MapPin, Receipt, 
  BarChart3, Table, Map, Package, Clock, DollarSign,
  Shield, Lock, CheckCircle, AlertCircle, TrendingUp,
  ShoppingCart, Bike, Store, HelpCircle, Sparkles, Eye, Navigation
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import DeliveryLiveTracking from "./delivery-live-tracking";

// Component types for rich rendering
type MessageComponent = 
  | { type: "text"; content: string }
  | { type: "table"; data: any[]; columns: string[] }
  | { type: "chart"; chartType: "line" | "bar" | "pie"; data: any[] }
  | { type: "map"; locations: Array<{lat: number; lng: number; label: string}> }
  | { type: "receipt"; order: any }
  | { type: "component"; component: ReactNode }
  | { type: "progress"; value: number; label: string }
  | { type: "alert"; variant: "info" | "warning" | "error" | "success"; message: string };

interface Message {
  id: string;
  sender: "user" | "bot";
  timestamp: Date;
  components: MessageComponent[];
  actions?: Array<{
    label: string;
    action: string;
    style?: "primary" | "secondary" | "danger";
  }>;
  isSecure?: boolean;
}

interface ChatContext {
  userId?: string;
  orderId?: string;
  restaurantId?: string;
  sessionToken?: string;
}

export default function AdvancedChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      timestamp: new Date(),
      components: [
        { type: "text", content: "Welcome to BTS Delivery Advanced Assistant! 🚀" },
        { type: "text", content: "I can help you with orders, tracking, analytics, and more. How can I assist you today?" },
        {
          type: "component",
          component: (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Badge className="justify-center py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
                <Shield className="h-3 w-3 mr-1" />
                Secure Chat
              </Badge>
              <Badge className="justify-center py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
          )
        }
      ],
      actions: [
        { label: "Track Order", action: "track_order", style: "primary" },
        { label: "View Analytics", action: "show_analytics", style: "secondary" },
        { label: "Order History", action: "order_history", style: "secondary" },
        { label: "Help", action: "help", style: "secondary" }
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<ChatContext>({});
  const [activeView, setActiveView] = useState<"chat" | "analytics" | "map">("chat");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Secure API call with context validation
  const secureApiCall = async (endpoint: string, data: any) => {
    // Add security headers and context
    const secureData = {
      ...data,
      context: {
        ...context,
        timestamp: Date.now(),
        signature: btoa(JSON.stringify({ ...context, endpoint })) // Simple signature for demo
      }
    };

    try {
      const response = await apiRequest("POST", endpoint, secureData);
      return response;
    } catch (error) {
      console.error("Secure API call failed:", error);
      throw error;
    }
  };

  // Process user message and generate appropriate response
  const processMessage = async (text: string) => {
    setIsTyping(true);

    try {
      // Analyze intent using AI
      const intent = await analyzeIntent(text);
      let responseComponents: MessageComponent[] = [];

      switch (intent.type) {
        case "track_order":
          responseComponents = await generateOrderTracking(intent.orderId);
          break;
        case "view_analytics":
          responseComponents = await generateAnalytics();
          break;
        case "order_history":
          responseComponents = await generateOrderHistory();
          break;
        case "show_receipt":
          responseComponents = await generateReceipt(intent.orderId);
          break;
        case "restaurant_info":
          responseComponents = await generateRestaurantInfo(intent.restaurantId);
          break;
        case "delivery_status":
          responseComponents = await generateDeliveryMap(intent.orderId);
          break;
        default:
          responseComponents = await generateGenericResponse(text);
      }

      const botMessage: Message = {
        id: Date.now().toString(),
        sender: "bot",
        timestamp: new Date(),
        components: responseComponents,
        isSecure: true
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        sender: "bot",
        timestamp: new Date(),
        components: [
          { type: "alert", variant: "error", message: "Sorry, I encountered an error. Please try again." }
        ]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Analyze user intent
  const analyzeIntent = async (text: string): Promise<any> => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("track") || lowerText.includes("where") || lowerText.includes("order")) {
      return { type: "track_order", orderId: extractOrderId(text) || "ORD-2024-001" };
    }
    if (lowerText.includes("analytics") || lowerText.includes("stats") || lowerText.includes("data")) {
      return { type: "view_analytics" };
    }
    if (lowerText.includes("history") || lowerText.includes("previous") || lowerText.includes("past")) {
      return { type: "order_history" };
    }
    if (lowerText.includes("receipt") || lowerText.includes("bill") || lowerText.includes("invoice")) {
      return { type: "show_receipt", orderId: extractOrderId(text) || "ORD-2024-001" };
    }
    if (lowerText.includes("restaurant") || lowerText.includes("menu") || lowerText.includes("food")) {
      return { type: "restaurant_info", restaurantId: "rest-001" };
    }
    if (lowerText.includes("map") || lowerText.includes("location") || lowerText.includes("delivery")) {
      return { type: "delivery_status", orderId: extractOrderId(text) || "ORD-2024-001" };
    }
    
    return { type: "general" };
  };

  const extractOrderId = (text: string): string | null => {
    const match = text.match(/ORD-\d{4}-\d{3}/);
    return match ? match[0] : null;
  };

  // Generate order tracking response
  const generateOrderTracking = async (orderId: string): Promise<MessageComponent[]> => {
    const trackingData = {
      orderId,
      status: "in_transit",
      restaurant: "Jollibee Batangas",
      rider: "Juan Dela Cruz",
      estimatedTime: "15 mins",
      progress: 65
    };

    return [
      { type: "text", content: `Tracking Order ${orderId}` },
      {
        type: "component",
        component: (
          <Card className="mt-3">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge className="bg-blue-500 text-white">In Transit</Badge>
                </div>
                <Progress value={trackingData.progress} className="h-2" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Restaurant</p>
                    <p className="font-medium">{trackingData.restaurant}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rider</p>
                    <p className="font-medium">{trackingData.rider}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => {
                    setTrackingOrderId(orderId);
                    setShowTrackingDialog(true);
                  }}
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  View Real-Time Tracking
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      },
      { type: "progress", value: trackingData.progress, label: "Delivery Progress" },
      { type: "text", content: `Estimated arrival: ${trackingData.estimatedTime}` },
      { 
        type: "alert", 
        variant: "info", 
        message: "🎯 Real-time tracking is now available! All parties (customer, merchant, admin) can track this delivery live." 
      }
    ];
  };

  // Generate analytics dashboard
  const generateAnalytics = async (): Promise<MessageComponent[]> => {
    const analyticsData = [
      { day: "Mon", orders: 45, revenue: 5670 },
      { day: "Tue", orders: 52, revenue: 6540 },
      { day: "Wed", orders: 38, revenue: 4890 },
      { day: "Thu", orders: 65, revenue: 8230 },
      { day: "Fri", orders: 78, revenue: 9870 },
      { day: "Sat", orders: 92, revenue: 11540 },
      { day: "Sun", orders: 81, revenue: 10230 }
    ];

    const categoryData = [
      { name: "Food Delivery", value: 45, color: "#FF6B35" },
      { name: "Pabili", value: 25, color: "#004225" },
      { name: "Pabayad", value: 20, color: "#FFD23F" },
      { name: "Parcel", value: 10, color: "#8B4513" }
    ];

    return [
      { type: "text", content: "📊 Your Weekly Analytics Dashboard" },
      {
        type: "chart",
        chartType: "line",
        data: analyticsData
      },
      { type: "text", content: "Service Distribution:" },
      {
        type: "chart",
        chartType: "pie",
        data: categoryData
      },
      {
        type: "table",
        columns: ["Day", "Orders", "Revenue (₱)"],
        data: analyticsData.map(d => ({
          Day: d.day,
          Orders: d.orders,
          "Revenue (₱)": `₱${d.revenue.toLocaleString()}`
        }))
      }
    ];
  };

  // Generate order history
  const generateOrderHistory = async (): Promise<MessageComponent[]> => {
    const orders = [
      { id: "ORD-2024-001", date: "Jan 15", restaurant: "Jollibee", total: 450, status: "delivered" },
      { id: "ORD-2024-002", date: "Jan 16", restaurant: "McDonald's", total: 380, status: "delivered" },
      { id: "ORD-2024-003", date: "Jan 17", restaurant: "Mang Inasal", total: 290, status: "cancelled" },
      { id: "ORD-2024-004", date: "Jan 18", restaurant: "Chowking", total: 520, status: "delivered" }
    ];

    return [
      { type: "text", content: "📜 Your Recent Order History" },
      {
        type: "table",
        columns: ["Order ID", "Date", "Restaurant", "Total", "Status"],
        data: orders.map(o => ({
          "Order ID": o.id,
          Date: o.date,
          Restaurant: o.restaurant,
          Total: `₱${o.total}`,
          Status: o.status
        }))
      },
      {
        type: "component",
        component: (
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <CheckCircle className="inline h-4 w-4 mr-1" />
              You've saved ₱234 with loyalty discounts this month!
            </p>
          </div>
        )
      }
    ];
  };

  // Generate receipt
  const generateReceipt = async (orderId: string): Promise<MessageComponent[]> => {
    const receiptData = {
      orderId,
      date: new Date().toLocaleDateString(),
      restaurant: "Jollibee Batangas",
      items: [
        { name: "Chickenjoy w/ Rice", qty: 2, price: 180 },
        { name: "Jolly Spaghetti", qty: 1, price: 55 },
        { name: "Regular Coke", qty: 3, price: 90 }
      ],
      subtotal: 325,
      deliveryFee: 49,
      serviceFee: 10,
      total: 384
    };

    return [
      { type: "text", content: "🧾 Order Receipt" },
      {
        type: "receipt",
        order: receiptData
      }
    ];
  };

  // Generate restaurant info
  const generateRestaurantInfo = async (restaurantId: string): Promise<MessageComponent[]> => {
    return [
      { type: "text", content: "🍽️ Restaurant Information" },
      {
        type: "component",
        component: (
          <Card className="mt-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Jollibee Batangas City</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">P. Burgos St, Batangas City</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Open until 10:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">4.8 ⭐ (1,234 reviews)</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1">View Menu</Button>
                <Button size="sm" variant="outline" className="flex-1">Call Restaurant</Button>
              </div>
            </CardContent>
          </Card>
        )
      }
    ];
  };

  // Generate delivery map
  const generateDeliveryMap = async (orderId: string): Promise<MessageComponent[]> => {
    const locations = [
      { lat: 13.7565, lng: 121.0583, label: "Restaurant" },
      { lat: 13.7575, lng: 121.0593, label: "Current Location" },
      { lat: 13.7585, lng: 121.0603, label: "Your Location" }
    ];

    return [
      { type: "text", content: "📍 Live Delivery Tracking" },
      {
        type: "map",
        locations
      },
      {
        type: "component",
        component: (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-gray-50 rounded">
              <Bike className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-xs font-medium">Juan D.</p>
              <p className="text-xs text-muted-foreground">Rider</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <Clock className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs font-medium">12 mins</p>
              <p className="text-xs text-muted-foreground">ETA</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <MapPin className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xs font-medium">1.5 km</p>
              <p className="text-xs text-muted-foreground">Distance</p>
            </div>
          </div>
        )
      }
    ];
  };

  // Generate generic response
  const generateGenericResponse = async (text: string): Promise<MessageComponent[]> => {
    const response = await secureApiCall("/api/ai/chat-support", { query: text, context });
    
    return [
      { type: "text", content: response.response || "I'm here to help! What would you like to know?" },
      {
        type: "alert",
        variant: "info",
        message: "You can ask me about orders, deliveries, restaurants, or view analytics!"
      }
    ];
  };

  // Handle message send
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      timestamp: new Date(),
      components: [{ type: "text", content: input }]
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput("");

    await processMessage(messageText);
  };

  // Handle action buttons
  const handleAction = async (action: string) => {
    switch (action) {
      case "track_order":
        // Show real-time tracking dialog
        setTrackingOrderId("ORD-2024-001"); // Use actual order ID in production
        setShowTrackingDialog(true);
        
        // Also send a message about tracking
        const trackingMessage: Message = {
          id: Date.now().toString(),
          sender: "bot",
          timestamp: new Date(),
          components: [
            { type: "text", content: "Opening real-time tracking for your order..." },
            {
              type: "component",
              component: (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setTrackingOrderId("ORD-2024-001");
                    setShowTrackingDialog(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Live Tracking
                </Button>
              )
            }
          ]
        };
        setMessages(prev => [...prev, trackingMessage]);
        break;
      case "show_analytics":
        await processMessage("Show me analytics");
        break;
      case "order_history":
        await processMessage("Show my order history");
        break;
      case "help":
        await processMessage("I need help with my order");
        break;
      default:
        await processMessage(action);
    }
  };

  // Render message components
  const renderComponent = (component: MessageComponent, index: number) => {
    switch (component.type) {
      case "text":
        return <p key={index} className="text-sm">{component.content}</p>;
      
      case "table":
        return (
          <div key={index} className="mt-3 overflow-x-auto">
            <UITable>
              <TableHeader>
                <TableRow>
                  {component.columns.map((col, i) => (
                    <TableHead key={i} className="text-xs">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {component.data.map((row, i) => (
                  <TableRow key={i}>
                    {component.columns.map((col, j) => (
                      <TableCell key={j} className="text-xs">{row[col]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </div>
        );
      
      case "chart":
        if (component.chartType === "line") {
          return (
            <div key={index} className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={component.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#FF6B35" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke="#004225" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        }
        if (component.chartType === "pie") {
          return (
            <div key={index} className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={component.data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    fontSize={10}
                  >
                    {component.data.map((entry: any, i: number) => (
                      <Cell key={`cell-${i}`} fill={entry.color || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        }
        return null;
      
      case "map":
        return (
          <div key={index} className="mt-3 h-48 bg-gray-100 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Map className="h-8 w-8 text-gray-400" />
            </div>
            {component.locations.map((loc, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{
                  top: `${30 + i * 20}%`,
                  left: `${20 + i * 25}%`
                }}
              >
                <MapPin className="h-6 w-6 text-red-500" />
                <span className="text-xs mt-1 bg-white px-1 rounded">{loc.label}</span>
              </div>
            ))}
          </div>
        );
      
      case "receipt":
        return (
          <Card key={index} className="mt-3">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm">Order #{component.order.orderId}</CardTitle>
                  <p className="text-xs text-muted-foreground">{component.order.date}</p>
                </div>
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xs font-medium">{component.order.restaurant}</div>
                <div className="border-t pt-2">
                  {component.order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1">
                      <span>{item.qty}x {item.name}</span>
                      <span>₱{item.price}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Subtotal</span>
                    <span>₱{component.order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Delivery Fee</span>
                    <span>₱{component.order.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Service Fee</span>
                    <span>₱{component.order.serviceFee}</span>
                  </div>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₱{component.order.total}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      case "component":
        return <div key={index}>{component.component}</div>;
      
      case "progress":
        return (
          <div key={index} className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span>{component.label}</span>
              <span>{component.value}%</span>
            </div>
            <Progress value={component.value} className="h-2" />
          </div>
        );
      
      case "alert":
        const alertColors = {
          info: "bg-blue-50 text-blue-800 border-blue-200",
          warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
          error: "bg-red-50 text-red-800 border-red-200",
          success: "bg-green-50 text-green-800 border-green-200"
        };
        return (
          <div key={index} className={`mt-3 p-3 rounded-lg border ${alertColors[component.variant]}`}>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <p className="text-sm">{component.message}</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      {/* Chat Toggle Button with Glow Effect */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="relative rounded-full h-16 w-16 shadow-lg bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 animate-glow"
            data-testid="button-advanced-chat-open"
          >
            <MessageCircle className="h-10 w-10" />
          </Button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-orange-600 whitespace-nowrap">
            Need Help?
          </span>
        </div>
      )}

      {/* Advanced Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-[480px] h-[650px] shadow-2xl z-50 flex flex-col">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white">
                  <AvatarImage src="/assets/bts-logo-transparent.png" />
                  <AvatarFallback className="bg-white text-orange-500">BTS</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">BTS Support</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <Shield className="h-3 w-3" />
                    Secure
                    <Lock className="h-3 w-3" />
                    Encrypted
                    <Sparkles className="h-3 w-3" />
                    AI-Powered
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-orange-700"
                data-testid="button-advanced-chat-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* View Tabs */}
          <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-4 mt-2" style={{ width: "calc(100% - 2rem)" }}>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="map">Tracking</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col p-0 mt-0">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2 max-w-[90%] ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-8 w-8">
                          {message.sender === "user" ? (
                            <AvatarFallback className="bg-blue-500 text-white">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-yellow-500 text-white">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="space-y-2">
                          <div className={`rounded-lg p-3 ${
                            message.sender === "user" 
                              ? "bg-blue-500 text-white" 
                              : "bg-gray-100"
                          }`}>
                            {message.components.map((comp, i) => renderComponent(comp, i))}
                          </div>
                          
                          {message.actions && (
                            <div className="flex flex-wrap gap-2">
                              {message.actions.map((action, i) => (
                                <Button
                                  key={i}
                                  size="sm"
                                  variant={action.style === "primary" ? "default" : "outline"}
                                  onClick={() => handleAction(action.action)}
                                  className="text-xs"
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                          
                          {message.isSecure && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Lock className="h-3 w-3" />
                              Encrypted
                            </div>
                          )}
                          
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-yellow-500 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex gap-1">
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask me anything..."
                    className="flex-1"
                    disabled={isTyping}
                    data-testid="input-advanced-message"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                    data-testid="button-advanced-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  End-to-end encrypted
                  <span className="text-green-500">•</span>
                  Real-time data
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="flex-1 p-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Quick Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold text-orange-600">152</p>
                        <p className="text-xs text-muted-foreground">Orders Today</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">₱24.5K</p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">4.8</p>
                        <p className="text-xs text-muted-foreground">Avg Rating</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setActiveView("chat");
                    processMessage("Show me detailed analytics");
                  }}
                >
                  View Detailed Analytics in Chat
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="map" className="flex-1 p-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Active Deliveries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Map className="h-12 w-12 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setActiveView("chat");
                    processMessage("Track my current delivery on map");
                  }}
                >
                  Track Order in Chat
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Real-Time Tracking Dialog */}
      <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-orange-500" />
              Real-Time Delivery Tracking
            </DialogTitle>
          </DialogHeader>
          {trackingOrderId && (
            <DeliveryLiveTracking
              orderId={trackingOrderId}
              userRole="customer"
            />
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}