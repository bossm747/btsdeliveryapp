import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Truck,
  DollarSign,
  Users,
  Store,
  TrendingUp,
  MapPin,
  Clock,
  RefreshCw,
  Save,
  AlertCircle,
  Info,
  Calculator,
  Bike,
  Cloud,
  Moon
} from "lucide-react";

interface DeliveryFeeSettings {
  baseFee: number;
  perKmRate: number;
  minimumFee: number;
  maximumFee: number;
  freeDeliveryThreshold: number;
  smallOrderFee: number;
  smallOrderThreshold: number;
}

interface ServiceFeeSettings {
  serviceFeePercent: number;
  minimumServiceFee: number;
  maximumServiceFee: number;
  paymentProcessingFee: number;
}

interface RiderCommissionSettings {
  basePayPerDelivery: number;
  perKmRate: number;
  minimumEarnings: number;
  waitingTimeFee: number;
  nightDifferentialMultiplier: number;
  badWeatherBonus: number;
}

interface VendorCommissionSettings {
  defaultCommissionPercent: number;
  minimumCommissionPercent: number;
  maximumCommissionPercent: number;
  selfDeliveryCommissionPercent: number;
}

interface SurgePricingSettings {
  enabled: boolean;
  peakHours: {
    lunch: { start: number; end: number };
    dinner: { start: number; end: number };
  };
  peakHourMultiplier: number;
  maxSurgeMultiplier: number;
  highDemandThreshold: number;
}

interface DistanceZone {
  name: string;
  maxDistanceKm: number;
  deliveryFee: number;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
  riderBonus: number;
}

interface DeliverySettingsConfig {
  deliveryFees: DeliveryFeeSettings;
  serviceFees: ServiceFeeSettings;
  riderCommission: RiderCommissionSettings;
  vendorCommission: VendorCommissionSettings;
  surgePricing: SurgePricingSettings;
  distanceZones: { zones: DistanceZone[] };
  updatedAt: string;
  updatedBy?: string;
}

export default function DeliverySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("delivery");
  const [previewDistance, setPreviewDistance] = useState(5);
  const [previewOrderAmount, setPreviewOrderAmount] = useState(500);

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery<{
    success: boolean;
    settings: DeliverySettingsConfig;
    defaults: DeliverySettingsConfig;
  }>({
    queryKey: ["/api/admin/delivery-settings"],
  });

  const settings = settingsData?.settings;
  const defaults = settingsData?.defaults;

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<DeliverySettingsConfig>) => {
      const response = await apiRequest("PATCH", "/api/admin/delivery-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-settings"] });
      toast({
        title: "Settings Updated",
        description: "Delivery settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Reset to defaults mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/delivery-settings/reset");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-settings"] });
      toast({
        title: "Settings Reset",
        description: "Delivery settings have been reset to defaults.",
      });
    },
  });

  // Preview calculations
  const { data: deliveryPreview } = useQuery({
    queryKey: ["/api/admin/delivery-settings/preview/delivery-fee", previewDistance, previewOrderAmount],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/admin/delivery-settings/preview/delivery-fee", {
        distanceKm: previewDistance,
        orderAmount: previewOrderAmount,
      });
      return response.json();
    },
    enabled: !!settings,
  });

  const { data: riderPreview } = useQuery({
    queryKey: ["/api/admin/delivery-settings/preview/rider-earnings", previewDistance],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/admin/delivery-settings/preview/rider-earnings", {
        distanceKm: previewDistance,
        waitingTimeMinutes: 10,
        isNightTime: false,
        isBadWeather: false,
      });
      return response.json();
    },
    enabled: !!settings,
  });

  const handleUpdateSection = (section: string, data: any) => {
    updateSettingsMutation.mutate({ [section]: data });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Settings Not Found</h2>
            <p className="text-muted-foreground mb-4">
              No delivery settings configured. Click below to initialize with default values.
            </p>
            <Button onClick={() => resetMutation.mutate()}>
              Initialize Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Delivery Settings</h1>
          <p className="text-muted-foreground">
            Configure delivery fees, rider commissions, and platform rates
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Last updated info */}
      {settings.updatedAt && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          Last updated: {new Date(settings.updatedAt).toLocaleString()}
        </div>
      )}

      {/* Live Preview Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Live Fee Calculator
          </CardTitle>
          <CardDescription>
            Test how your settings affect pricing in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Distance (km)</Label>
              <Input
                type="number"
                value={previewDistance}
                onChange={(e) => setPreviewDistance(Number(e.target.value))}
                min={0}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Order Amount</Label>
              <Input
                type="number"
                value={previewOrderAmount}
                onChange={(e) => setPreviewOrderAmount(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Delivery Fee</Label>
              <div className="p-2 bg-background rounded border text-lg font-semibold">
                {deliveryPreview?.isFreeDelivery ? (
                  <Badge variant="secondary">FREE</Badge>
                ) : (
                  `₱${deliveryPreview?.deliveryFee || 0}`
                )}
                {deliveryPreview?.smallOrderFee > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    +₱{deliveryPreview.smallOrderFee} small order
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rider Earnings</Label>
              <div className="p-2 bg-background rounded border text-lg font-semibold text-green-600">
                ₱{riderPreview?.totalEarnings || 0}
              </div>
            </div>
          </div>
          {deliveryPreview?.zone && (
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">{deliveryPreview.zone}</Badge>
              <span>
                Est. {deliveryPreview.estimatedMinutes?.min}-{deliveryPreview.estimatedMinutes?.max} mins
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Delivery Fees
          </TabsTrigger>
          <TabsTrigger value="service" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Service Fees
          </TabsTrigger>
          <TabsTrigger value="rider" className="flex items-center gap-2">
            <Bike className="h-4 w-4" />
            Rider Pay
          </TabsTrigger>
          <TabsTrigger value="vendor" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Vendor Commission
          </TabsTrigger>
          <TabsTrigger value="surge" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Surge Pricing
          </TabsTrigger>
        </TabsList>

        {/* Delivery Fees Tab */}
        <TabsContent value="delivery">
          <DeliveryFeesSection
            settings={settings.deliveryFees}
            zones={settings.distanceZones.zones}
            onSave={(data) => handleUpdateSection("deliveryFees", data)}
            onSaveZones={(zones) => handleUpdateSection("distanceZones", { zones })}
            isSaving={updateSettingsMutation.isPending}
          />
        </TabsContent>

        {/* Service Fees Tab */}
        <TabsContent value="service">
          <ServiceFeesSection
            settings={settings.serviceFees}
            onSave={(data) => handleUpdateSection("serviceFees", data)}
            isSaving={updateSettingsMutation.isPending}
          />
        </TabsContent>

        {/* Rider Commission Tab */}
        <TabsContent value="rider">
          <RiderCommissionSection
            settings={settings.riderCommission}
            onSave={(data) => handleUpdateSection("riderCommission", data)}
            isSaving={updateSettingsMutation.isPending}
          />
        </TabsContent>

        {/* Vendor Commission Tab */}
        <TabsContent value="vendor">
          <VendorCommissionSection
            settings={settings.vendorCommission}
            onSave={(data) => handleUpdateSection("vendorCommission", data)}
            isSaving={updateSettingsMutation.isPending}
          />
        </TabsContent>

        {/* Surge Pricing Tab */}
        <TabsContent value="surge">
          <SurgePricingSection
            settings={settings.surgePricing}
            onSave={(data) => handleUpdateSection("surgePricing", data)}
            isSaving={updateSettingsMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Delivery Fees Section Component
function DeliveryFeesSection({
  settings,
  zones,
  onSave,
  onSaveZones,
  isSaving,
}: {
  settings: DeliveryFeeSettings;
  zones: DistanceZone[];
  onSave: (data: DeliveryFeeSettings) => void;
  onSaveZones: (zones: DistanceZone[]) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);
  const [zonesData, setZonesData] = useState(zones);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Base Delivery Fees</CardTitle>
          <CardDescription>
            Configure the base rates charged to customers for delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Delivery Fee</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₱</span>
                <Input
                  type="number"
                  value={formData.baseFee}
                  onChange={(e) => setFormData({ ...formData, baseFee: Number(e.target.value) })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Starting fee for all deliveries</p>
            </div>
            <div className="space-y-2">
              <Label>Per Kilometer Rate</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₱</span>
                <Input
                  type="number"
                  value={formData.perKmRate}
                  onChange={(e) => setFormData({ ...formData, perKmRate: Number(e.target.value) })}
                />
                <span className="text-muted-foreground">/km</span>
              </div>
              <p className="text-xs text-muted-foreground">Additional fee per kilometer</p>
            </div>
            <div className="space-y-2">
              <Label>Minimum Delivery Fee</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₱</span>
                <Input
                  type="number"
                  value={formData.minimumFee}
                  onChange={(e) => setFormData({ ...formData, minimumFee: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Maximum Delivery Fee</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₱</span>
                <Input
                  type="number"
                  value={formData.maximumFee}
                  onChange={(e) => setFormData({ ...formData, maximumFee: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Free Delivery Threshold</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₱</span>
                <Input
                  type="number"
                  value={formData.freeDeliveryThreshold}
                  onChange={(e) => setFormData({ ...formData, freeDeliveryThreshold: Number(e.target.value) })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Orders above this get free delivery</p>
            </div>
            <div className="space-y-2">
              <Label>Small Order Fee</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₱</span>
                <Input
                  type="number"
                  value={formData.smallOrderFee}
                  onChange={(e) => setFormData({ ...formData, smallOrderFee: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Small Order Threshold</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₱</span>
                <Input
                  type="number"
                  value={formData.smallOrderThreshold}
                  onChange={(e) => setFormData({ ...formData, smallOrderThreshold: Number(e.target.value) })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Orders below this incur small order fee</p>
            </div>
          </div>

          <Button onClick={() => onSave(formData)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Save Delivery Fees
          </Button>
        </CardContent>
      </Card>

      {/* Distance Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Distance Zones
          </CardTitle>
          <CardDescription>
            Configure delivery fees and rider bonuses based on distance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {zonesData.map((zone, index) => (
              <div key={index} className="grid grid-cols-6 gap-2 items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs">Zone Name</Label>
                  <Input
                    value={zone.name}
                    onChange={(e) => {
                      const newZones = [...zonesData];
                      newZones[index].name = e.target.value;
                      setZonesData(newZones);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Distance (km)</Label>
                  <Input
                    type="number"
                    value={zone.maxDistanceKm}
                    onChange={(e) => {
                      const newZones = [...zonesData];
                      newZones[index].maxDistanceKm = Number(e.target.value);
                      setZonesData(newZones);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Delivery Fee</Label>
                  <Input
                    type="number"
                    value={zone.deliveryFee}
                    onChange={(e) => {
                      const newZones = [...zonesData];
                      newZones[index].deliveryFee = Number(e.target.value);
                      setZonesData(newZones);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Est. Min (mins)</Label>
                  <Input
                    type="number"
                    value={zone.estimatedMinutesMin}
                    onChange={(e) => {
                      const newZones = [...zonesData];
                      newZones[index].estimatedMinutesMin = Number(e.target.value);
                      setZonesData(newZones);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Est. Max (mins)</Label>
                  <Input
                    type="number"
                    value={zone.estimatedMinutesMax}
                    onChange={(e) => {
                      const newZones = [...zonesData];
                      newZones[index].estimatedMinutesMax = Number(e.target.value);
                      setZonesData(newZones);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rider Bonus</Label>
                  <Input
                    type="number"
                    value={zone.riderBonus}
                    onChange={(e) => {
                      const newZones = [...zonesData];
                      newZones[index].riderBonus = Number(e.target.value);
                      setZonesData(newZones);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button onClick={() => onSaveZones(zonesData)} disabled={isSaving} className="mt-4">
            <Save className="h-4 w-4 mr-2" />
            Save Distance Zones
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Service Fees Section Component
function ServiceFeesSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: ServiceFeeSettings;
  onSave: (data: ServiceFeeSettings) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service & Platform Fees</CardTitle>
        <CardDescription>
          Configure service fees charged on each order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Service Fee Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={(formData.serviceFeePercent * 100).toFixed(0)}
                onChange={(e) => setFormData({ ...formData, serviceFeePercent: Number(e.target.value) / 100 })}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Percentage of order subtotal</p>
          </div>
          <div className="space-y-2">
            <Label>Payment Processing Fee</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₱</span>
              <Input
                type="number"
                value={formData.paymentProcessingFee}
                onChange={(e) => setFormData({ ...formData, paymentProcessingFee: Number(e.target.value) })}
              />
            </div>
            <p className="text-xs text-muted-foreground">For online payments only</p>
          </div>
          <div className="space-y-2">
            <Label>Minimum Service Fee</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₱</span>
              <Input
                type="number"
                value={formData.minimumServiceFee}
                onChange={(e) => setFormData({ ...formData, minimumServiceFee: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Maximum Service Fee</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₱</span>
              <Input
                type="number"
                value={formData.maximumServiceFee}
                onChange={(e) => setFormData({ ...formData, maximumServiceFee: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
        <Button onClick={() => onSave(formData)} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Save Service Fees
        </Button>
      </CardContent>
    </Card>
  );
}

// Rider Commission Section Component
function RiderCommissionSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: RiderCommissionSettings;
  onSave: (data: RiderCommissionSettings) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bike className="h-5 w-5" />
          Rider Earnings Configuration
        </CardTitle>
        <CardDescription>
          Configure how much riders earn per delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Base Pay Per Delivery</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₱</span>
              <Input
                type="number"
                value={formData.basePayPerDelivery}
                onChange={(e) => setFormData({ ...formData, basePayPerDelivery: Number(e.target.value) })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Base amount per completed delivery</p>
          </div>
          <div className="space-y-2">
            <Label>Per Kilometer Rate</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₱</span>
              <Input
                type="number"
                value={formData.perKmRate}
                onChange={(e) => setFormData({ ...formData, perKmRate: Number(e.target.value) })}
              />
              <span className="text-muted-foreground">/km</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Minimum Earnings Per Delivery</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₱</span>
              <Input
                type="number"
                value={formData.minimumEarnings}
                onChange={(e) => setFormData({ ...formData, minimumEarnings: Number(e.target.value) })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Guaranteed minimum per delivery</p>
          </div>
          <div className="space-y-2">
            <Label>Waiting Time Fee</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₱</span>
              <Input
                type="number"
                value={formData.waitingTimeFee}
                onChange={(e) => setFormData({ ...formData, waitingTimeFee: Number(e.target.value) })}
              />
              <span className="text-muted-foreground">/10 min</span>
            </div>
            <p className="text-xs text-muted-foreground">After 15 min wait</p>
          </div>
        </div>

        <Separator />

        <h4 className="font-medium flex items-center gap-2">
          <Moon className="h-4 w-4" />
          Bonuses & Differentials
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Night Differential (10pm-6am)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={((formData.nightDifferentialMultiplier - 1) * 100).toFixed(0)}
                onChange={(e) => setFormData({ ...formData, nightDifferentialMultiplier: 1 + Number(e.target.value) / 100 })}
              />
              <span className="text-muted-foreground">% extra</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Bad Weather Bonus
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₱</span>
              <Input
                type="number"
                value={formData.badWeatherBonus}
                onChange={(e) => setFormData({ ...formData, badWeatherBonus: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <Button onClick={() => onSave(formData)} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Save Rider Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// Vendor Commission Section Component
function VendorCommissionSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: VendorCommissionSettings;
  onSave: (data: VendorCommissionSettings) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Commission Rates</CardTitle>
        <CardDescription>
          Configure platform commission rates for restaurants/vendors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Industry Standard:</strong> GrabFood charges 10-25% (avg 24%), Foodpanda charges 25-30%.
            Lower rates attract more vendors but reduce platform revenue.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Commission Rate</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="1"
                value={(formData.defaultCommissionPercent * 100).toFixed(0)}
                onChange={(e) => setFormData({ ...formData, defaultCommissionPercent: Number(e.target.value) / 100 })}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Applied to new vendors</p>
          </div>
          <div className="space-y-2">
            <Label>Self-Delivery Commission</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="1"
                value={(formData.selfDeliveryCommissionPercent * 100).toFixed(0)}
                onChange={(e) => setFormData({ ...formData, selfDeliveryCommissionPercent: Number(e.target.value) / 100 })}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">When vendor handles own delivery</p>
          </div>
          <div className="space-y-2">
            <Label>Minimum Commission</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="1"
                value={(formData.minimumCommissionPercent * 100).toFixed(0)}
                onChange={(e) => setFormData({ ...formData, minimumCommissionPercent: Number(e.target.value) / 100 })}
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Maximum Commission</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="1"
                value={(formData.maximumCommissionPercent * 100).toFixed(0)}
                onChange={(e) => setFormData({ ...formData, maximumCommissionPercent: Number(e.target.value) / 100 })}
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <Button onClick={() => onSave(formData)} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Save Vendor Commission
        </Button>
      </CardContent>
    </Card>
  );
}

// Surge Pricing Section Component
function SurgePricingSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: SurgePricingSettings;
  onSave: (data: SurgePricingSettings) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Surge Pricing Configuration
        </CardTitle>
        <CardDescription>
          Configure dynamic pricing during peak hours and high demand
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <Label className="text-base font-medium">Enable Surge Pricing</Label>
            <p className="text-sm text-muted-foreground">Automatically increase prices during peak hours</p>
          </div>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
          />
        </div>

        {formData.enabled && (
          <>
            <Separator />

            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Peak Hours
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-2">
                <Label>Lunch Peak</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={formData.peakHours.lunch.start}
                    onChange={(e) => setFormData({
                      ...formData,
                      peakHours: {
                        ...formData.peakHours,
                        lunch: { ...formData.peakHours.lunch, start: Number(e.target.value) }
                      }
                    })}
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={formData.peakHours.lunch.end}
                    onChange={(e) => setFormData({
                      ...formData,
                      peakHours: {
                        ...formData.peakHours,
                        lunch: { ...formData.peakHours.lunch, end: Number(e.target.value) }
                      }
                    })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.peakHours.lunch.start}:00 - {formData.peakHours.lunch.end}:00
                </p>
              </div>
              <div className="p-4 border rounded-lg space-y-2">
                <Label>Dinner Peak</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={formData.peakHours.dinner.start}
                    onChange={(e) => setFormData({
                      ...formData,
                      peakHours: {
                        ...formData.peakHours,
                        dinner: { ...formData.peakHours.dinner, start: Number(e.target.value) }
                      }
                    })}
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={formData.peakHours.dinner.end}
                    onChange={(e) => setFormData({
                      ...formData,
                      peakHours: {
                        ...formData.peakHours,
                        dinner: { ...formData.peakHours.dinner, end: Number(e.target.value) }
                      }
                    })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.peakHours.dinner.start}:00 - {formData.peakHours.dinner.end}:00
                </p>
              </div>
            </div>

            <Separator />

            <h4 className="font-medium">Surge Multipliers</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Peak Hour Multiplier</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min={1}
                    max={3}
                    value={formData.peakHourMultiplier}
                    onChange={(e) => setFormData({ ...formData, peakHourMultiplier: Number(e.target.value) })}
                  />
                  <span className="text-muted-foreground">x</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((formData.peakHourMultiplier - 1) * 100).toFixed(0)}% increase
                </p>
              </div>
              <div className="space-y-2">
                <Label>Maximum Surge</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    value={formData.maxSurgeMultiplier}
                    onChange={(e) => setFormData({ ...formData, maxSurgeMultiplier: Number(e.target.value) })}
                  />
                  <span className="text-muted-foreground">x</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>High Demand Threshold</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.highDemandThreshold}
                    onChange={(e) => setFormData({ ...formData, highDemandThreshold: Number(e.target.value) })}
                  />
                  <span className="text-muted-foreground">orders/hr</span>
                </div>
              </div>
            </div>
          </>
        )}

        <Button onClick={() => onSave(formData)} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Save Surge Settings
        </Button>
      </CardContent>
    </Card>
  );
}
