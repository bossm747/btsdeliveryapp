import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  MapPin, Plus, Trash2, Edit, Save, AlertCircle, Eye, EyeOff,
  Maximize2, Layers, Navigation, MousePointer, Pencil, X, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types
interface ZoneCoordinate {
  lat: number;
  lng: number;
}

interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  color: string;
  coordinates: ZoneCoordinate[];
  deliveryFee: number;
  minOrderAmount: number;
  estimatedDeliveryTime: number; // in minutes
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface ZoneStats {
  totalZones: number;
  activeZones: number;
  totalArea: number;
  avgDeliveryFee: number;
}

// Batangas City center coordinates
const DEFAULT_CENTER: [number, number] = [13.7565, 121.0583];
const DEFAULT_ZOOM = 12;

// Color palette for zones
const ZONE_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
];

export default function DeliveryZones() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showZoneList, setShowZoneList] = useState(true);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [drawnCoordinates, setDrawnCoordinates] = useState<ZoneCoordinate[]>([]);

  // Form states
  const [zoneForm, setZoneForm] = useState({
    name: "",
    description: "",
    color: ZONE_COLORS[0],
    deliveryFee: 50,
    minOrderAmount: 200,
    estimatedDeliveryTime: 30,
    isActive: true,
    priority: 1,
  });

  // Fetch zones
  const { data: zones = [], isLoading, isError, refetch } = useQuery<DeliveryZone[]>({
    queryKey: ["/api/admin/delivery-zones"],
  });

  // Fetch stats
  const { data: stats = {} as ZoneStats } = useQuery<ZoneStats>({
    queryKey: ["/api/admin/delivery-zones/stats"],
  });

  // Create zone mutation
  const createZoneMutation = useMutation({
    mutationFn: async (data: typeof zoneForm & { coordinates: ZoneCoordinate[] }) => {
      const response = await apiRequest("POST", "/api/admin/delivery-zones", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-zones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-zones/stats"] });
      toast({
        title: "Zone Created",
        description: "Delivery zone has been created successfully.",
      });
      setCreateDialogOpen(false);
      resetForm();
      clearDrawnItems();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create zone",
        variant: "destructive",
      });
    },
  });

  // Update zone mutation
  const updateZoneMutation = useMutation({
    mutationFn: async ({ zoneId, data }: { zoneId: string; data: Partial<typeof zoneForm> & { coordinates?: ZoneCoordinate[] } }) => {
      const response = await apiRequest("PATCH", `/api/admin/delivery-zones/${zoneId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-zones"] });
      toast({
        title: "Zone Updated",
        description: "Delivery zone has been updated successfully.",
      });
      setEditDialogOpen(false);
      setSelectedZone(null);
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update zone",
        variant: "destructive",
      });
    },
  });

  // Delete zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: async (zoneId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/delivery-zones/${zoneId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-zones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-zones/stats"] });
      toast({
        title: "Zone Deleted",
        description: "Delivery zone has been deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedZone(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete zone",
        variant: "destructive",
      });
    },
  });

  // Toggle zone active status mutation
  const toggleZoneMutation = useMutation({
    mutationFn: async ({ zoneId, isActive }: { zoneId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/delivery-zones/${zoneId}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-zones"] });
      toast({
        title: "Zone Updated",
        description: "Zone status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update zone",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setZoneForm({
      name: "",
      description: "",
      color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
      deliveryFee: 50,
      minOrderAmount: 200,
      estimatedDeliveryTime: 30,
      isActive: true,
      priority: 1,
    });
    setDrawnCoordinates([]);
  };

  const clearDrawnItems = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
    setIsDrawing(false);
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapLoaded) return;

    // Dynamically import Leaflet
    const initMap = async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        // Import Leaflet Draw plugin
        await import("leaflet-draw");
        await import("leaflet-draw/dist/leaflet.draw.css");

        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        // Create map
        const map = L.map(mapContainerRef.current!, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          zoomControl: true,
        });

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Create layers for zones and drawn items
        const zonesLayer = L.featureGroup().addTo(map);
        const drawnItems = new L.FeatureGroup().addTo(map);

        // Initialize draw control
        const drawControl = new (L as any).Control.Draw({
          draw: {
            polygon: {
              allowIntersection: false,
              showArea: true,
              shapeOptions: {
                color: ZONE_COLORS[0],
                fillOpacity: 0.3,
              },
            },
            rectangle: {
              shapeOptions: {
                color: ZONE_COLORS[0],
                fillOpacity: 0.3,
              },
            },
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
          },
          edit: {
            featureGroup: drawnItems,
            remove: true,
          },
        });

        map.addControl(drawControl);

        // Handle draw events
        map.on((L as any).Draw.Event.CREATED, (e: any) => {
          const layer = e.layer;
          drawnItems.addLayer(layer);

          // Extract coordinates
          const latLngs = layer.getLatLngs()[0];
          const coordinates = latLngs.map((ll: any) => ({
            lat: ll.lat,
            lng: ll.lng,
          }));

          setDrawnCoordinates(coordinates);
          setIsDrawing(false);
          setCreateDialogOpen(true);
        });

        map.on((L as any).Draw.Event.DRAWSTART, () => {
          setIsDrawing(true);
        });

        map.on((L as any).Draw.Event.DRAWSTOP, () => {
          setIsDrawing(false);
        });

        mapRef.current = map;
        drawnItemsRef.current = drawnItems;
        zonesLayerRef.current = zonesLayer;
        setMapLoaded(true);
      } catch (error) {
        console.error("Error initializing map:", error);
        toast({
          title: "Map Error",
          description: "Failed to initialize the map. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapLoaded(false);
      }
    };
  }, []);

  // Update zones on map when data changes
  useEffect(() => {
    if (!mapLoaded || !zonesLayerRef.current) return;

    const updateZonesOnMap = async () => {
      const L = (await import("leaflet")).default;

      zonesLayerRef.current.clearLayers();

      zones.forEach((zone) => {
        if (zone.coordinates && zone.coordinates.length > 0) {
          const latLngs = zone.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
          const polygon = L.polygon(latLngs, {
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: zone.isActive ? 0.3 : 0.1,
            weight: selectedZone?.id === zone.id ? 4 : 2,
            dashArray: zone.isActive ? undefined : "5, 5",
          });

          polygon.bindPopup(`
            <div style="min-width: 150px;">
              <h3 style="font-weight: bold; margin-bottom: 8px;">${zone.name}</h3>
              <p style="margin: 4px 0;"><strong>Delivery Fee:</strong> ₱${zone.deliveryFee}</p>
              <p style="margin: 4px 0;"><strong>Min Order:</strong> ₱${zone.minOrderAmount}</p>
              <p style="margin: 4px 0;"><strong>Est. Time:</strong> ${zone.estimatedDeliveryTime} mins</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> ${zone.isActive ? "Active" : "Inactive"}</p>
            </div>
          `);

          polygon.on("click", () => {
            setSelectedZone(zone);
          });

          zonesLayerRef.current.addLayer(polygon);
        }
      });
    };

    updateZonesOnMap();
  }, [mapLoaded, zones, selectedZone]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('[data-testid="admin-sidebar"]');
      const target = event.target as Node;

      if (sidebarOpen && sidebar && !sidebar.contains(target)) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sidebarOpen]);

  const handleEditZone = (zone: DeliveryZone) => {
    setSelectedZone(zone);
    setZoneForm({
      name: zone.name,
      description: zone.description,
      color: zone.color,
      deliveryFee: zone.deliveryFee,
      minOrderAmount: zone.minOrderAmount,
      estimatedDeliveryTime: zone.estimatedDeliveryTime,
      isActive: zone.isActive,
      priority: zone.priority,
    });
    setEditDialogOpen(true);
  };

  const handleFocusZone = async (zone: DeliveryZone) => {
    if (!mapRef.current || !zone.coordinates.length) return;

    const L = (await import("leaflet")).default;
    const bounds = L.latLngBounds(zone.coordinates.map((c) => [c.lat, c.lng] as [number, number]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    setSelectedZone(zone);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-delivery-zones">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="zones"
        onTabChange={() => {}}
        isOpen={sidebarOpen}
      />

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <AdminHeader
          title="Delivery Zones"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Zones</p>
                      <p className="text-3xl font-bold">{stats.totalZones || zones.length}</p>
                      <p className="text-blue-100 text-sm">Configured areas</p>
                    </div>
                    <MapPin className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Active Zones</p>
                      <p className="text-3xl font-bold">{stats.activeZones || zones.filter(z => z.isActive).length}</p>
                      <p className="text-green-100 text-sm">Currently serving</p>
                    </div>
                    <Check className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Avg Delivery Fee</p>
                      <p className="text-3xl font-bold">₱{stats.avgDeliveryFee || Math.round(zones.reduce((acc, z) => acc + z.deliveryFee, 0) / (zones.length || 1))}</p>
                      <p className="text-purple-100 text-sm">Per order</p>
                    </div>
                    <Navigation className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Coverage Area</p>
                      <p className="text-3xl font-bold">{stats.totalArea || "~150"}</p>
                      <p className="text-orange-100 text-sm">km² covered</p>
                    </div>
                    <Layers className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Map and Zone List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Zone Map</CardTitle>
                      <CardDescription>Draw and manage delivery zone boundaries</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {isDrawing && (
                        <Badge variant="secondary" className="animate-pulse">
                          <Pencil className="h-3 w-3 mr-1" />
                          Drawing...
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowZoneList(!showZoneList)}
                        className="lg:hidden"
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div
                      ref={mapContainerRef}
                      className="w-full h-[500px] rounded-lg border"
                      style={{ zIndex: 0 }}
                    />
                    {!mapLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-gray-500">Loading map...</p>
                        </div>
                      </div>
                    )}
                    {/* Map Instructions */}
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
                      <p className="text-sm font-medium mb-1">How to create a zone:</p>
                      <ol className="text-xs text-gray-600 space-y-1">
                        <li>1. Click the polygon/rectangle tool in the map toolbar</li>
                        <li>2. Click on the map to draw zone boundaries</li>
                        <li>3. Double-click to finish drawing</li>
                        <li>4. Fill in zone details in the dialog</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Zone List */}
              <Card className={`${showZoneList ? '' : 'hidden lg:block'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Zones</CardTitle>
                      <CardDescription>{zones.length} zones configured</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  ) : isError ? (
                    <div className="text-center py-8 text-red-600">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Error loading zones</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                        Try Again
                      </Button>
                    </div>
                  ) : zones.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No delivery zones configured</p>
                      <p className="text-sm mt-1">Use the map tools to draw your first zone</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {zones.map((zone) => (
                        <div
                          key={zone.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedZone?.id === zone.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => handleFocusZone(zone)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: zone.color }}
                              />
                              <div>
                                <p className="font-medium text-sm">{zone.name}</p>
                                <p className="text-xs text-gray-500">
                                  ₱{zone.deliveryFee} fee • {zone.estimatedDeliveryTime}min
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={zone.isActive}
                                onCheckedChange={(checked) => {
                                  toggleZoneMutation.mutate({ zoneId: zone.id, isActive: checked });
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleFocusZone(zone)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleEditZone(zone)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedZone(zone);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Create Zone Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Delivery Zone</DialogTitle>
            <DialogDescription>
              Configure the new delivery zone you just drew on the map
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Zone Name</Label>
              <Input
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                placeholder="e.g., Batangas City Center"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                placeholder="Brief description of this delivery zone..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delivery Fee (₱)</Label>
                <Input
                  type="number"
                  value={zoneForm.deliveryFee}
                  onChange={(e) => setZoneForm({ ...zoneForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Min Order (₱)</Label>
                <Input
                  type="number"
                  value={zoneForm.minOrderAmount}
                  onChange={(e) => setZoneForm({ ...zoneForm, minOrderAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Est. Delivery Time (mins)</Label>
                <Input
                  type="number"
                  value={zoneForm.estimatedDeliveryTime}
                  onChange={(e) => setZoneForm({ ...zoneForm, estimatedDeliveryTime: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={zoneForm.priority.toString()}
                  onValueChange={(value) => setZoneForm({ ...zoneForm, priority: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <SelectItem key={p} value={p.toString()}>
                        {p} {p === 1 ? "(Highest)" : p === 5 ? "(Lowest)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Zone Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ZONE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      zoneForm.color === color ? "border-gray-900 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setZoneForm({ ...zoneForm, color })}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-gray-500">Enable deliveries to this zone</p>
              </div>
              <Switch
                checked={zoneForm.isActive}
                onCheckedChange={(checked) => setZoneForm({ ...zoneForm, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                clearDrawnItems();
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createZoneMutation.mutate({ ...zoneForm, coordinates: drawnCoordinates })}
              disabled={!zoneForm.name.trim() || drawnCoordinates.length < 3 || createZoneMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createZoneMutation.isPending ? "Creating..." : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Zone Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Delivery Zone</DialogTitle>
            <DialogDescription>
              Update zone settings for {selectedZone?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Zone Name</Label>
              <Input
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delivery Fee (₱)</Label>
                <Input
                  type="number"
                  value={zoneForm.deliveryFee}
                  onChange={(e) => setZoneForm({ ...zoneForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Min Order (₱)</Label>
                <Input
                  type="number"
                  value={zoneForm.minOrderAmount}
                  onChange={(e) => setZoneForm({ ...zoneForm, minOrderAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Est. Delivery Time (mins)</Label>
                <Input
                  type="number"
                  value={zoneForm.estimatedDeliveryTime}
                  onChange={(e) => setZoneForm({ ...zoneForm, estimatedDeliveryTime: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={zoneForm.priority.toString()}
                  onValueChange={(value) => setZoneForm({ ...zoneForm, priority: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <SelectItem key={p} value={p.toString()}>
                        {p} {p === 1 ? "(Highest)" : p === 5 ? "(Lowest)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Zone Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ZONE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      zoneForm.color === color ? "border-gray-900 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setZoneForm({ ...zoneForm, color })}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-gray-500">Enable deliveries to this zone</p>
              </div>
              <Switch
                checked={zoneForm.isActive}
                onCheckedChange={(checked) => setZoneForm({ ...zoneForm, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedZone) {
                  updateZoneMutation.mutate({ zoneId: selectedZone.id, data: zoneForm });
                }
              }}
              disabled={!zoneForm.name.trim() || updateZoneMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateZoneMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Delivery Zone</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedZone?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedZone) {
                  deleteZoneMutation.mutate(selectedZone.id);
                }
              }}
              disabled={deleteZoneMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteZoneMutation.isPending ? "Deleting..." : "Delete Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
