import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin, Clock, User, Truck, AlertTriangle, CheckCircle, XCircle,
  RotateCcw, Phone, Navigation, Package, ArrowRight, Layers,
  AlertOctagon, Timer, Users, Zap, Settings, Filter,
  MoreVertical, Eye, Edit, Ban, Send
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom marker icons
const orderIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const riderIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const urgentOrderIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Types
interface LiveOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  restaurantName: string;
  status: string;
  estimatedDeliveryTime: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  deliveryAddress: any;
  totalAmount: string;
  priority: number;
  createdAt: string;
  slaBreach: boolean;
  lastUpdate: string;
  pickupLocation?: { lat: number; lng: number };
  deliveryLocation?: { lat: number; lng: number };
}

interface LiveRider {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicleType: string;
  isOnline: boolean;
  currentLocation: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  } | null;
  activeOrdersCount: number;
  maxActiveOrders: number;
  capacityInfo?: {
    currentOrders: number;
    maxConcurrentOrders: number;
    isAvailableForDispatch: boolean;
    totalDispatchesToday: number;
    successfulDeliveriesToday: number;
  };
  status: "available" | "busy" | "offline";
  lastActivity: string;
  rating: number;
  todayDeliveries: number;
}

interface SlaMonitorOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  restaurantName: string;
  minutesSinceCreation: number;
  minutesToBreach: number;
  slaStatus: "green" | "yellow" | "red";
  hasRider: boolean;
  priority: number;
}

interface Escalation {
  id: string;
  orderId: string;
  escalationLevel: number;
  reason: string;
  description?: string;
  status: string;
  escalatedAt: string;
  responseDeadline?: string;
}

interface DispatchBatch {
  id: string;
  batchNumber: string;
  orderCount: number;
  status: string;
  assignedRiderId?: string;
  estimatedTotalDistance?: string;
  estimatedTotalDuration?: number;
  createdAt: string;
}

// Map center component to handle dynamic centering
function MapCenterHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function DispatchConsoleEnhanced() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"map" | "queue" | "sla" | "escalations">("map");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showEscalationDialog, setShowEscalationDialog] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [orderForAction, setOrderForAction] = useState<LiveOrder | null>(null);
  const [batchNotes, setBatchNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideDescription, setOverrideDescription] = useState("");
  const [escalationLevel, setEscalationLevel] = useState("1");
  const [escalationReason, setEscalationReason] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("");
  const [emergencyPriority, setEmergencyPriority] = useState("2");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const wsRef = useRef<WebSocket | null>(null);

  // Batangas center coordinates
  const mapCenter: [number, number] = [13.7565, 121.0583];

  // Fetch live orders
  const { data: liveOrders = [], refetch: refetchOrders } = useQuery<LiveOrder[]>({
    queryKey: ["/api/admin/dispatch/orders"],
    refetchInterval: 5000,
  });

  // Fetch live riders with capacity
  const { data: liveRiders = [], refetch: refetchRiders } = useQuery<LiveRider[]>({
    queryKey: ["/api/admin/dispatch/riders/capacity"],
    refetchInterval: 10000,
  });

  // Fetch SLA monitor data
  const { data: slaData } = useQuery<{
    orders: SlaMonitorOrder[];
    summary: { total: number; green: number; yellow: number; red: number };
    lastUpdated: string;
  }>({
    queryKey: ["/api/admin/dispatch/sla-monitor"],
    refetchInterval: 10000,
  });

  // Fetch escalations
  const { data: escalations = [] } = useQuery<Escalation[]>({
    queryKey: ["/api/admin/dispatch/escalations"],
    refetchInterval: 15000,
  });

  // Fetch batches
  const { data: batches = [] } = useQuery<DispatchBatch[]>({
    queryKey: ["/api/admin/dispatch/batches"],
    refetchInterval: 30000,
  });

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: { orderIds: string[]; riderId: string; notes?: string }) => {
      return apiRequest("POST", "/api/admin/dispatch/batch", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Batch created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/riders/capacity"] });
      setShowBatchDialog(false);
      setSelectedOrders([]);
      setSelectedRider(null);
      setBatchNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create batch", variant: "destructive" });
    },
  });

  // Manual override mutation
  const overrideMutation = useMutation({
    mutationFn: async (data: { orderId: string; riderId: string; reason: string; description?: string }) => {
      return apiRequest("POST", "/api/admin/dispatch/override", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Rider assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/riders/capacity"] });
      setShowOverrideDialog(false);
      setOrderForAction(null);
      setOverrideReason("");
      setOverrideDescription("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign rider", variant: "destructive" });
    },
  });

  // Create escalation mutation
  const escalationMutation = useMutation({
    mutationFn: async (data: { orderId: string; level: number; reason: string; description?: string }) => {
      return apiRequest("POST", "/api/admin/dispatch/escalations", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Escalation created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/escalations"] });
      setShowEscalationDialog(false);
      setOrderForAction(null);
      setEscalationReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create escalation", variant: "destructive" });
    },
  });

  // Resolve escalation mutation
  const resolveEscalationMutation = useMutation({
    mutationFn: async (data: { escalationId: string; resolutionAction: string; resolutionNotes?: string }) => {
      return apiRequest("POST", `/api/admin/dispatch/escalations/${data.escalationId}/resolve`, {
        resolutionAction: data.resolutionAction,
        resolutionNotes: data.resolutionNotes,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Escalation resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/escalations"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to resolve escalation", variant: "destructive" });
    },
  });

  // Create emergency dispatch mutation
  const emergencyMutation = useMutation({
    mutationFn: async (data: { orderId: string; reason: string; description?: string; priority: number }) => {
      return apiRequest("POST", "/api/admin/dispatch/emergency-dispatch", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Emergency dispatch created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/emergency-dispatches"] });
      setShowEmergencyDialog(false);
      setOrderForAction(null);
      setEmergencyReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create emergency dispatch", variant: "destructive" });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[DispatchConsole] WebSocket connected");
        // Subscribe to dispatch channel
        ws.send(JSON.stringify({ type: "subscribe", channel: "admin:dispatch" }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type?.startsWith("dispatch_")) {
            // Refresh relevant queries on dispatch events
            queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/orders"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/riders/capacity"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/sla-monitor"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/dispatch/escalations"] });
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        console.log("[DispatchConsole] WebSocket disconnected, reconnecting...");
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error("[DispatchConsole] WebSocket error:", error);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Filter orders based on status
  const filteredOrders = filterStatus === "all"
    ? liveOrders
    : liveOrders.filter((o) => o.status === filterStatus);

  // Unassigned orders
  const unassignedOrders = liveOrders.filter(
    (o) => !o.riderId && ["pending", "confirmed"].includes(o.status)
  );

  // Available riders (online and have capacity)
  const availableRiders = liveRiders.filter((r) => {
    const capacity = r.capacityInfo;
    const currentOrders = capacity?.currentOrders ?? r.activeOrdersCount ?? 0;
    const maxOrders = capacity?.maxConcurrentOrders ?? r.maxActiveOrders ?? 3;
    return r.isOnline && currentOrders < maxOrders;
  });

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "confirmed": return "bg-blue-500";
      case "preparing": return "bg-orange-500";
      case "ready": return "bg-purple-500";
      case "picked_up": return "bg-indigo-500";
      case "in_transit": return "bg-cyan-500";
      case "delivered": return "bg-green-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  // Get SLA status color
  const getSlaColor = (status: "green" | "yellow" | "red") => {
    switch (status) {
      case "green": return "bg-green-100 text-green-800 border-green-300";
      case "yellow": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "red": return "bg-red-100 text-red-800 border-red-300";
    }
  };

  // Handle batch creation
  const handleCreateBatch = () => {
    if (selectedOrders.length === 0) {
      toast({ title: "Error", description: "Select at least one order", variant: "destructive" });
      return;
    }
    if (!selectedRider) {
      toast({ title: "Error", description: "Select a rider", variant: "destructive" });
      return;
    }
    createBatchMutation.mutate({
      orderIds: selectedOrders,
      riderId: selectedRider,
      notes: batchNotes || undefined,
    });
  };

  // Handle manual override
  const handleOverride = () => {
    if (!orderForAction || !selectedRider || !overrideReason) {
      toast({ title: "Error", description: "Missing required fields", variant: "destructive" });
      return;
    }
    overrideMutation.mutate({
      orderId: orderForAction.id,
      riderId: selectedRider,
      reason: overrideReason,
      description: overrideDescription || undefined,
    });
  };

  // Handle escalation
  const handleEscalation = () => {
    if (!orderForAction || !escalationReason) {
      toast({ title: "Error", description: "Missing required fields", variant: "destructive" });
      return;
    }
    escalationMutation.mutate({
      orderId: orderForAction.id,
      level: parseInt(escalationLevel),
      reason: escalationReason,
    });
  };

  // Handle emergency dispatch
  const handleEmergency = () => {
    if (!orderForAction || !emergencyReason) {
      toast({ title: "Error", description: "Missing required fields", variant: "destructive" });
      return;
    }
    emergencyMutation.mutate({
      orderId: orderForAction.id,
      reason: emergencyReason,
      priority: parseInt(emergencyPriority),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar activeTab="dispatch" onTabChange={() => {}} isOpen={sidebarOpen} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:ml-64">
        <AdminHeader
          title="Enhanced Dispatch Console"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        <main className="p-4 space-y-4">
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Active Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {liveOrders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Online Riders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {liveRiders.filter((r) => r.isOnline).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">SLA Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-yellow-600">
                    {slaData?.summary.yellow || 0}
                  </span>
                  <span className="text-lg font-bold text-red-600">
                    / {slaData?.summary.red || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Unassigned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {unassignedOrders.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Escalations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {escalations.filter((e) => e.status === "open").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Panel - Map & Orders */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="map" className="flex-1">
                    <MapPin className="w-4 h-4 mr-2" />
                    Map View
                  </TabsTrigger>
                  <TabsTrigger value="queue" className="flex-1">
                    <Package className="w-4 h-4 mr-2" />
                    Order Queue
                  </TabsTrigger>
                  <TabsTrigger value="sla" className="flex-1">
                    <Timer className="w-4 h-4 mr-2" />
                    SLA Monitor
                  </TabsTrigger>
                  <TabsTrigger value="escalations" className="flex-1">
                    <AlertOctagon className="w-4 h-4 mr-2" />
                    Escalations
                  </TabsTrigger>
                </TabsList>

                {/* Map View */}
                <TabsContent value="map" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span>Live Map</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-orange-100">
                            <span className="w-2 h-2 rounded-full bg-orange-500 mr-1"></span>
                            Orders
                          </Badge>
                          <Badge variant="outline" className="bg-green-100">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                            Riders
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-[500px] rounded-lg overflow-hidden">
                        <MapContainer
                          center={mapCenter}
                          zoom={12}
                          style={{ height: "100%", width: "100%" }}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <MapCenterHandler center={mapCenter} />

                          {/* Order Markers */}
                          {liveOrders.map((order) => {
                            const location = order.deliveryLocation || order.deliveryAddress?.coordinates;
                            if (!location) return null;

                            return (
                              <Marker
                                key={`order-${order.id}`}
                                position={[location.lat, location.lng]}
                                icon={order.slaBreach ? urgentOrderIcon : orderIcon}
                              >
                                <Popup>
                                  <div className="p-2">
                                    <p className="font-bold">{order.orderNumber}</p>
                                    <p className="text-sm">{order.restaurantName}</p>
                                    <Badge className={`${getStatusColor(order.status)} text-white mt-1`}>
                                      {order.status}
                                    </Badge>
                                    {order.slaBreach && (
                                      <Badge variant="destructive" className="ml-1 mt-1">
                                        SLA Breach
                                      </Badge>
                                    )}
                                    <div className="mt-2 flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setOrderForAction(order);
                                          setShowOverrideDialog(true);
                                        }}
                                      >
                                        Assign
                                      </Button>
                                    </div>
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          })}

                          {/* Rider Markers */}
                          {liveRiders
                            .filter((r) => r.currentLocation && r.isOnline)
                            .map((rider) => (
                              <Marker
                                key={`rider-${rider.id}`}
                                position={[
                                  rider.currentLocation!.lat,
                                  rider.currentLocation!.lng,
                                ]}
                                icon={riderIcon}
                              >
                                <Popup>
                                  <div className="p-2">
                                    <p className="font-bold">{rider.name || `Rider ${rider.id.slice(0, 8)}`}</p>
                                    <p className="text-sm">{rider.vehicleType}</p>
                                    <p className="text-sm">
                                      Orders: {rider.capacityInfo?.currentOrders ?? rider.activeOrdersCount} /{" "}
                                      {rider.capacityInfo?.maxConcurrentOrders ?? rider.maxActiveOrders}
                                    </p>
                                    <p className="text-sm">Rating: {rider.rating}</p>
                                  </div>
                                </Popup>
                              </Marker>
                            ))}
                        </MapContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Order Queue */}
                <TabsContent value="queue" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span>Order Queue</span>
                        <div className="flex gap-2">
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Orders</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="picked_up">Picked Up</SelectItem>
                              <SelectItem value="in_transit">In Transit</SelectItem>
                            </SelectContent>
                          </Select>
                          {selectedOrders.length > 0 && (
                            <Button
                              onClick={() => setShowBatchDialog(true)}
                              className="bg-primary"
                            >
                              <Layers className="w-4 h-4 mr-2" />
                              Batch ({selectedOrders.length})
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetchOrders()}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[500px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">
                                <Checkbox
                                  checked={
                                    unassignedOrders.length > 0 &&
                                    unassignedOrders.every((o) =>
                                      selectedOrders.includes(o.id)
                                    )
                                  }
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedOrders(unassignedOrders.map((o) => o.id));
                                    } else {
                                      setSelectedOrders([]);
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead>Order</TableHead>
                              <TableHead>Restaurant</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Rider</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOrders.map((order) => (
                              <TableRow
                                key={order.id}
                                className={
                                  order.slaBreach
                                    ? "bg-red-50"
                                    : selectedOrders.includes(order.id)
                                    ? "bg-blue-50"
                                    : ""
                                }
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedOrders.includes(order.id)}
                                    disabled={!!order.riderId}
                                    onCheckedChange={() => toggleOrderSelection(order.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <span className="font-medium">{order.orderNumber}</span>
                                    {order.slaBreach && (
                                      <AlertTriangle className="w-4 h-4 text-red-500 inline ml-1" />
                                    )}
                                    <div className="text-sm text-gray-500">{order.customerName}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{order.restaurantName}</TableCell>
                                <TableCell>
                                  <Badge className={`${getStatusColor(order.status)} text-white`}>
                                    {order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {order.riderName ? (
                                    <span>{order.riderName}</span>
                                  ) : (
                                    <Badge variant="outline" className="text-orange-600">
                                      Unassigned
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center text-sm">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {order.estimatedDeliveryTime}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setOrderForAction(order);
                                          setShowOverrideDialog(true);
                                        }}
                                      >
                                        <User className="w-4 h-4 mr-2" />
                                        Assign Rider
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setOrderForAction(order);
                                          setShowEscalationDialog(true);
                                        }}
                                      >
                                        <AlertOctagon className="w-4 h-4 mr-2" />
                                        Escalate
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => {
                                          setOrderForAction(order);
                                          setShowEmergencyDialog(true);
                                        }}
                                      >
                                        <Zap className="w-4 h-4 mr-2" />
                                        Emergency
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SLA Monitor */}
                <TabsContent value="sla" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>SLA Monitor</span>
                        <div className="flex gap-2 text-sm">
                          <Badge className="bg-green-100 text-green-800 border border-green-300">
                            {slaData?.summary.green || 0} On Track
                          </Badge>
                          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                            {slaData?.summary.yellow || 0} At Risk
                          </Badge>
                          <Badge className="bg-red-100 text-red-800 border border-red-300">
                            {slaData?.summary.red || 0} Breached
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[500px] overflow-auto space-y-2">
                        {slaData?.orders
                          .sort((a, b) => a.minutesToBreach - b.minutesToBreach)
                          .map((order) => (
                            <div
                              key={order.orderId}
                              className={`p-3 rounded-lg border ${getSlaColor(order.slaStatus)}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold">{order.orderNumber}</span>
                                  <span className="text-sm ml-2">{order.restaurantName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={`${getStatusColor(order.status)} text-white`}>
                                    {order.status}
                                  </Badge>
                                  {!order.hasRider && (
                                    <Badge variant="outline" className="text-orange-600">
                                      No Rider
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 text-sm">
                                <span>
                                  Age: {order.minutesSinceCreation} min
                                </span>
                                <span className="font-medium">
                                  {order.minutesToBreach > 0
                                    ? `${order.minutesToBreach} min to breach`
                                    : `${Math.abs(order.minutesToBreach)} min overdue`}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Escalations */}
                <TabsContent value="escalations" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Active Escalations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[500px] overflow-auto space-y-3">
                        {escalations
                          .filter((e) => e.status === "open" || e.status === "acknowledged")
                          .map((escalation) => (
                            <div
                              key={escalation.id}
                              className="p-4 rounded-lg border bg-white"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={
                                        escalation.escalationLevel === 3
                                          ? "destructive"
                                          : escalation.escalationLevel === 2
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      Level {escalation.escalationLevel}
                                    </Badge>
                                    <span className="font-medium">{escalation.reason}</span>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {escalation.description}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Escalated: {new Date(escalation.escalatedAt).toLocaleString()}
                                    {escalation.responseDeadline && (
                                      <span className="ml-2 text-red-500">
                                        Deadline: {new Date(escalation.responseDeadline).toLocaleTimeString()}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    resolveEscalationMutation.mutate({
                                      escalationId: escalation.id,
                                      resolutionAction: "acknowledged",
                                    });
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Resolve
                                </Button>
                              </div>
                            </div>
                          ))}
                        {escalations.filter((e) => e.status === "open" || e.status === "acknowledged")
                          .length === 0 && (
                          <p className="text-center text-gray-500 py-8">
                            No active escalations
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Panel - Riders */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      <Users className="w-4 h-4 inline mr-2" />
                      Available Riders
                    </span>
                    <Button variant="outline" size="icon" onClick={() => refetchRiders()}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[600px] overflow-auto">
                    {liveRiders.map((rider) => {
                      const capacity = rider.capacityInfo;
                      const currentOrders = capacity?.currentOrders ?? rider.activeOrdersCount ?? 0;
                      const maxOrders = capacity?.maxConcurrentOrders ?? rider.maxActiveOrders ?? 3;
                      const loadPercent = (currentOrders / maxOrders) * 100;

                      return (
                        <div
                          key={rider.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedRider === rider.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-gray-50"
                          } ${!rider.isOnline ? "opacity-50" : ""}`}
                          onClick={() => {
                            if (rider.isOnline && currentOrders < maxOrders) {
                              setSelectedRider(rider.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  rider.isOnline ? "bg-green-500" : "bg-gray-400"
                                }`}
                              />
                              <span className="font-medium">
                                {rider.name || `Rider ${rider.id.slice(0, 8)}`}
                              </span>
                            </div>
                            <Badge variant="outline">{rider.vehicleType}</Badge>
                          </div>

                          <div className="mt-2">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>
                                Load: {currentOrders}/{maxOrders}
                              </span>
                              <span>Rating: {rider.rating}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  loadPercent >= 100
                                    ? "bg-red-500"
                                    : loadPercent >= 66
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(loadPercent, 100)}%` }}
                              />
                            </div>
                          </div>

                          {rider.currentLocation && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {rider.currentLocation.lat.toFixed(4)},{" "}
                              {rider.currentLocation.lng.toFixed(4)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rider Capacity Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Online</span>
                      <span className="font-medium">
                        {liveRiders.filter((r) => r.isOnline).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available</span>
                      <span className="font-medium text-green-600">
                        {availableRiders.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">At Capacity</span>
                      <span className="font-medium text-orange-600">
                        {liveRiders.filter((r) => {
                          const cap = r.capacityInfo;
                          return (
                            r.isOnline &&
                            (cap?.currentOrders ?? r.activeOrdersCount ?? 0) >=
                              (cap?.maxConcurrentOrders ?? r.maxActiveOrders ?? 3)
                          );
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Orders Today</span>
                      <span className="font-medium">
                        {liveRiders.reduce(
                          (sum, r) => sum + (r.capacityInfo?.totalDispatchesToday ?? r.todayDeliveries ?? 0),
                          0
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Batch Assignment Dialog */}
          <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Dispatch Batch</DialogTitle>
                <DialogDescription>
                  Assign {selectedOrders.length} orders to a rider as a batch delivery.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Selected Orders</Label>
                  <div className="mt-1 p-2 bg-gray-100 rounded-md text-sm max-h-24 overflow-auto">
                    {selectedOrders.map((id) => {
                      const order = liveOrders.find((o) => o.id === id);
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <Package className="w-3 h-3" />
                          {order?.orderNumber || id.slice(0, 8)}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Assign to Rider</Label>
                  <Select value={selectedRider || ""} onValueChange={setSelectedRider}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a rider" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRiders.map((rider) => (
                        <SelectItem key={rider.id} value={rider.id}>
                          {rider.name || `Rider ${rider.id.slice(0, 8)}`} -{" "}
                          {(rider.capacityInfo?.currentOrders ?? rider.activeOrdersCount ?? 0)}/
                          {(rider.capacityInfo?.maxConcurrentOrders ?? rider.maxActiveOrders ?? 3)} orders
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    placeholder="Add any special instructions..."
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBatch}
                  disabled={createBatchMutation.isPending}
                >
                  {createBatchMutation.isPending ? "Creating..." : "Create Batch"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Manual Override Dialog */}
          <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Assign Rider</DialogTitle>
                <DialogDescription>
                  Manually assign a rider to order {orderForAction?.orderNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Select Rider</Label>
                  <Select value={selectedRider || ""} onValueChange={setSelectedRider}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a rider" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRiders.map((rider) => (
                        <SelectItem key={rider.id} value={rider.id}>
                          {rider.name || `Rider ${rider.id.slice(0, 8)}`} -{" "}
                          {(rider.capacityInfo?.currentOrders ?? rider.activeOrdersCount ?? 0)}/
                          {(rider.capacityInfo?.maxConcurrentOrders ?? rider.maxActiveOrders ?? 3)} orders
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Reason *</Label>
                  <Input
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g., Closest rider available"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={overrideDescription}
                    onChange={(e) => setOverrideDescription(e.target.value)}
                    placeholder="Additional details..."
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleOverride} disabled={overrideMutation.isPending}>
                  {overrideMutation.isPending ? "Assigning..." : "Assign Rider"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Escalation Dialog */}
          <Dialog open={showEscalationDialog} onOpenChange={setShowEscalationDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Escalation</DialogTitle>
                <DialogDescription>
                  Escalate order {orderForAction?.orderNumber} for immediate attention
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Escalation Level</Label>
                  <Select value={escalationLevel} onValueChange={setEscalationLevel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 - Notify Supervisor</SelectItem>
                      <SelectItem value="2">Level 2 - Alert Manager</SelectItem>
                      <SelectItem value="3">Level 3 - Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Reason *</Label>
                  <Select value={escalationReason} onValueChange={setEscalationReason}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sla_breach">SLA Breach</SelectItem>
                      <SelectItem value="rider_unresponsive">Rider Unresponsive</SelectItem>
                      <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                      <SelectItem value="vendor_issue">Vendor Issue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEscalationDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleEscalation}
                  disabled={escalationMutation.isPending}
                  variant="destructive"
                >
                  {escalationMutation.isPending ? "Creating..." : "Create Escalation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Emergency Dispatch Dialog */}
          <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-red-600">
                  <Zap className="w-5 h-5 inline mr-2" />
                  Emergency Dispatch
                </DialogTitle>
                <DialogDescription>
                  Create emergency dispatch for order {orderForAction?.orderNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={emergencyPriority} onValueChange={setEmergencyPriority}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Medium</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                      <SelectItem value="4">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Reason *</Label>
                  <Select value={emergencyReason} onValueChange={setEmergencyReason}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rider_accident">Rider Accident</SelectItem>
                      <SelectItem value="vehicle_breakdown">Vehicle Breakdown</SelectItem>
                      <SelectItem value="rider_unresponsive">Rider Unresponsive</SelectItem>
                      <SelectItem value="weather_emergency">Weather Emergency</SelectItem>
                      <SelectItem value="customer_emergency">Customer Emergency</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEmergencyDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleEmergency}
                  disabled={emergencyMutation.isPending}
                  variant="destructive"
                >
                  {emergencyMutation.isPending ? "Creating..." : "Create Emergency"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
