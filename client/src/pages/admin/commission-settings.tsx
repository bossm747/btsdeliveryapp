import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, Percent, Save, Plus, Trash2, Edit, AlertCircle,
  Store, Truck, ShoppingBag, Package, CreditCard, TrendingUp,
  ChevronUp, ChevronDown, Search, Info, RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types
interface CommissionRate {
  id: string;
  serviceType: "food_delivery" | "pabili" | "pabayad" | "parcel";
  name: string;
  description: string;
  baseRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommissionTier {
  id: string;
  serviceType: string;
  tierName: string;
  minOrderValue: number;
  maxOrderValue: number | null;
  commissionRate: number;
  isActive: boolean;
}

interface VendorOverride {
  id: string;
  vendorId: string;
  vendorName: string;
  serviceType: string;
  customRate: number;
  reason: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Vendor {
  id: string;
  name: string;
  businessType: string;
}

const SERVICE_TYPES = [
  { value: "food_delivery", label: "Food Delivery", icon: Store, color: "text-orange-500" },
  { value: "pabili", label: "Pabili (Shopping)", icon: ShoppingBag, color: "text-blue-500" },
  { value: "pabayad", label: "Pabayad (Bills)", icon: CreditCard, color: "text-green-500" },
  { value: "parcel", label: "Parcel Delivery", icon: Package, color: "text-purple-500" },
];

export default function CommissionSettings() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeServiceTab, setActiveServiceTab] = useState("food_delivery");
  const [searchVendor, setSearchVendor] = useState("");

  // Dialog states
  const [editRateDialogOpen, setEditRateDialogOpen] = useState(false);
  const [editTierDialogOpen, setEditTierDialogOpen] = useState(false);
  const [addOverrideDialogOpen, setAddOverrideDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<CommissionRate | null>(null);
  const [editingTier, setEditingTier] = useState<CommissionTier | null>(null);

  // Form states
  const [rateForm, setRateForm] = useState({ baseRate: 0, isActive: true });
  const [tierForm, setTierForm] = useState({
    tierName: "",
    minOrderValue: 0,
    maxOrderValue: null as number | null,
    commissionRate: 0,
    isActive: true,
  });
  const [overrideForm, setOverrideForm] = useState({
    vendorId: "",
    serviceType: "food_delivery",
    customRate: 0,
    reason: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
  });

  // Fetch commission rates
  const { data: rates = [], isLoading: ratesLoading } = useQuery<CommissionRate[]>({
    queryKey: ["/api/admin/commission/rates"],
  });

  // Fetch commission tiers
  const { data: tiers = [], isLoading: tiersLoading } = useQuery<CommissionTier[]>({
    queryKey: ["/api/admin/commission/tiers"],
  });

  // Fetch vendor overrides
  const { data: overrides = [], isLoading: overridesLoading } = useQuery<VendorOverride[]>({
    queryKey: ["/api/admin/commission/vendor-overrides"],
  });

  // Fetch vendors for override selection
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/admin/vendors/list"],
  });

  // Fetch stats
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/commission/stats"],
  });

  // Update rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async ({ rateId, data }: { rateId: string; data: { baseRate: number; isActive: boolean } }) => {
      const response = await apiRequest("PATCH", `/api/admin/commission/rates/${rateId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission/rates"] });
      toast({
        title: "Rate Updated",
        description: "Commission rate has been updated successfully.",
      });
      setEditRateDialogOpen(false);
      setEditingRate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rate",
        variant: "destructive",
      });
    },
  });

  // Create/Update tier mutation
  const saveTierMutation = useMutation({
    mutationFn: async ({ tierId, data }: { tierId?: string; data: typeof tierForm & { serviceType: string } }) => {
      if (tierId) {
        const response = await apiRequest("PATCH", `/api/admin/commission/tiers/${tierId}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/admin/commission/tiers", data);
        return response.json();
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission/tiers"] });
      toast({
        title: variables.tierId ? "Tier Updated" : "Tier Created",
        description: `Commission tier has been ${variables.tierId ? "updated" : "created"} successfully.`,
      });
      setEditTierDialogOpen(false);
      setEditingTier(null);
      setTierForm({
        tierName: "",
        minOrderValue: 0,
        maxOrderValue: null,
        commissionRate: 0,
        isActive: true,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save tier",
        variant: "destructive",
      });
    },
  });

  // Delete tier mutation
  const deleteTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/commission/tiers/${tierId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission/tiers"] });
      toast({
        title: "Tier Deleted",
        description: "Commission tier has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tier",
        variant: "destructive",
      });
    },
  });

  // Create vendor override mutation
  const createOverrideMutation = useMutation({
    mutationFn: async (data: typeof overrideForm) => {
      const response = await apiRequest("POST", "/api/admin/commission/vendor-overrides", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission/vendor-overrides"] });
      toast({
        title: "Override Created",
        description: "Vendor commission override has been created.",
      });
      setAddOverrideDialogOpen(false);
      setOverrideForm({
        vendorId: "",
        serviceType: "food_delivery",
        customRate: 0,
        reason: "",
        effectiveFrom: new Date().toISOString().split("T")[0],
        effectiveTo: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create override",
        variant: "destructive",
      });
    },
  });

  // Delete override mutation
  const deleteOverrideMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/commission/vendor-overrides/${overrideId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission/vendor-overrides"] });
      toast({
        title: "Override Removed",
        description: "Vendor commission override has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove override",
        variant: "destructive",
      });
    },
  });

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

  const getCurrentRate = () => {
    return rates.find((r) => r.serviceType === activeServiceTab);
  };

  const getCurrentTiers = () => {
    return tiers
      .filter((t) => t.serviceType === activeServiceTab)
      .sort((a, b) => a.minOrderValue - b.minOrderValue);
  };

  const getFilteredOverrides = () => {
    let result = overrides.filter((o) => o.serviceType === activeServiceTab);
    if (searchVendor) {
      const term = searchVendor.toLowerCase();
      result = result.filter((o) => o.vendorName.toLowerCase().includes(term));
    }
    return result;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getServiceIcon = (serviceType: string) => {
    const service = SERVICE_TYPES.find((s) => s.value === serviceType);
    if (service) {
      const Icon = service.icon;
      return <Icon className={`h-5 w-5 ${service.color}`} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-commission-settings">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="financial"
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
          title="Commission Settings"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Total Commission</p>
                      <p className="text-3xl font-bold">₱{((stats as any)?.totalCommission || 0).toLocaleString()}</p>
                      <p className="text-green-100 text-sm">This month</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Avg Rate</p>
                      <p className="text-3xl font-bold">{(stats as any)?.avgRate || 15}%</p>
                      <p className="text-blue-100 text-sm">Across all services</p>
                    </div>
                    <Percent className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Active Overrides</p>
                      <p className="text-3xl font-bold">{overrides.filter(o => o.isActive).length}</p>
                      <p className="text-purple-100 text-sm">Vendor-specific rates</p>
                    </div>
                    <Store className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Growth</p>
                      <p className="text-3xl font-bold">+{(stats as any)?.growth || 12}%</p>
                      <p className="text-orange-100 text-sm">vs last month</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Type Tabs */}
            <Tabs value={activeServiceTab} onValueChange={setActiveServiceTab}>
              <TabsList className="grid w-full grid-cols-4">
                {SERVICE_TYPES.map((service) => (
                  <TabsTrigger key={service.value} value={service.value} className="flex items-center gap-2">
                    <service.icon className={`h-4 w-4 ${service.color}`} />
                    <span className="hidden sm:inline">{service.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {SERVICE_TYPES.map((service) => (
                <TabsContent key={service.value} value={service.value} className="space-y-6">
                  {/* Base Rate Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getServiceIcon(service.value)}
                          <div>
                            <CardTitle>Base Commission Rate</CardTitle>
                            <CardDescription>Default commission rate for {service.label.toLowerCase()}</CardDescription>
                          </div>
                        </div>
                        {getCurrentRate() && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              const rate = getCurrentRate()!;
                              setEditingRate(rate);
                              setRateForm({ baseRate: rate.baseRate, isActive: rate.isActive });
                              setEditRateDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Rate
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {ratesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                      ) : getCurrentRate() ? (
                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-4xl font-bold text-gray-900">{getCurrentRate()!.baseRate}%</p>
                            <p className="text-sm text-gray-500 mt-1">Platform commission on each order</p>
                          </div>
                          <Badge variant={getCurrentRate()!.isActive ? "default" : "secondary"} className="text-lg px-4 py-2">
                            {getCurrentRate()!.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                          <p>No base rate configured for this service</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tiered Commission Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Tiered Commission</CardTitle>
                          <CardDescription>Different rates based on order value ranges</CardDescription>
                        </div>
                        <Button
                          onClick={() => {
                            setEditingTier(null);
                            setTierForm({
                              tierName: "",
                              minOrderValue: 0,
                              maxOrderValue: null,
                              commissionRate: 0,
                              isActive: true,
                            });
                            setEditTierDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Tier
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {tiersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                      ) : getCurrentTiers().length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                          <Percent className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No tiered commission configured</p>
                          <p className="text-sm mt-1">Add tiers to apply different rates based on order value</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tier Name</TableHead>
                              <TableHead>Order Value Range</TableHead>
                              <TableHead>Commission Rate</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getCurrentTiers().map((tier) => (
                              <TableRow key={tier.id}>
                                <TableCell className="font-medium">{tier.tierName}</TableCell>
                                <TableCell>
                                  ₱{tier.minOrderValue.toLocaleString()} - {tier.maxOrderValue ? `₱${tier.maxOrderValue.toLocaleString()}` : "Above"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-lg">
                                    {tier.commissionRate}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={tier.isActive ? "default" : "secondary"}>
                                    {tier.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingTier(tier);
                                        setTierForm({
                                          tierName: tier.tierName,
                                          minOrderValue: tier.minOrderValue,
                                          maxOrderValue: tier.maxOrderValue,
                                          commissionRate: tier.commissionRate,
                                          isActive: tier.isActive,
                                        });
                                        setEditTierDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this tier?")) {
                                          deleteTierMutation.mutate(tier.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vendor Overrides Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Vendor-Specific Overrides</CardTitle>
                          <CardDescription>Custom commission rates for specific vendors</CardDescription>
                        </div>
                        <Button onClick={() => setAddOverrideDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Override
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search vendors..."
                            value={searchVendor}
                            onChange={(e) => setSearchVendor(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>

                      {overridesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                      ) : getFilteredOverrides().length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                          <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No vendor overrides for this service</p>
                          <p className="text-sm mt-1">Add overrides to give specific vendors custom rates</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Vendor</TableHead>
                              <TableHead>Custom Rate</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Effective Period</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredOverrides().map((override) => (
                              <TableRow key={override.id}>
                                <TableCell className="font-medium">{override.vendorName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-lg">
                                    {override.customRate}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{override.reason}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p>{formatDate(override.effectiveFrom)}</p>
                                    <p className="text-gray-500">
                                      {override.effectiveTo ? `to ${formatDate(override.effectiveTo)}` : "No end date"}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={override.isActive ? "default" : "secondary"}>
                                    {override.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to remove this override?")) {
                                        deleteOverrideMutation.mutate(override.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
      </div>

      {/* Edit Rate Dialog */}
      <Dialog open={editRateDialogOpen} onOpenChange={setEditRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Base Commission Rate</DialogTitle>
            <DialogDescription>
              Update the default commission rate for {editingRate?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label>Commission Rate (%)</Label>
              <div className="mt-2 space-y-4">
                <Slider
                  value={[rateForm.baseRate]}
                  onValueChange={(value) => setRateForm({ ...rateForm, baseRate: value[0] })}
                  max={50}
                  step={0.5}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">0%</span>
                  <span className="text-2xl font-bold">{rateForm.baseRate}%</span>
                  <span className="text-sm text-gray-500">50%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-gray-500">Enable or disable this commission rate</p>
              </div>
              <Switch
                checked={rateForm.isActive}
                onCheckedChange={(checked) => setRateForm({ ...rateForm, isActive: checked })}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">How commission is calculated</p>
                  <p className="mt-1">For a ₱1,000 order with {rateForm.baseRate}% commission:</p>
                  <p className="font-medium mt-1">Platform earns: ₱{(1000 * rateForm.baseRate / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingRate) {
                  updateRateMutation.mutate({ rateId: editingRate.id, data: rateForm });
                }
              }}
              disabled={updateRateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateRateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Tier Dialog */}
      <Dialog open={editTierDialogOpen} onOpenChange={setEditTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? "Edit Commission Tier" : "Add Commission Tier"}</DialogTitle>
            <DialogDescription>
              Configure commission rate based on order value range
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tier Name</Label>
              <Input
                value={tierForm.tierName}
                onChange={(e) => setTierForm({ ...tierForm, tierName: e.target.value })}
                placeholder="e.g., Small Orders, Premium Tier"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum Order Value (₱)</Label>
                <Input
                  type="number"
                  value={tierForm.minOrderValue}
                  onChange={(e) => setTierForm({ ...tierForm, minOrderValue: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Maximum Order Value (₱)</Label>
                <Input
                  type="number"
                  value={tierForm.maxOrderValue || ""}
                  onChange={(e) => setTierForm({ ...tierForm, maxOrderValue: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Leave empty for no limit"
                />
              </div>
            </div>

            <div>
              <Label>Commission Rate (%)</Label>
              <div className="mt-2 space-y-4">
                <Slider
                  value={[tierForm.commissionRate]}
                  onValueChange={(value) => setTierForm({ ...tierForm, commissionRate: value[0] })}
                  max={50}
                  step={0.5}
                />
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold">{tierForm.commissionRate}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-gray-500">Enable or disable this tier</p>
              </div>
              <Switch
                checked={tierForm.isActive}
                onCheckedChange={(checked) => setTierForm({ ...tierForm, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveTierMutation.mutate({
                  tierId: editingTier?.id,
                  data: { ...tierForm, serviceType: activeServiceTab },
                });
              }}
              disabled={!tierForm.tierName.trim() || saveTierMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveTierMutation.isPending ? "Saving..." : editingTier ? "Update Tier" : "Create Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Override Dialog */}
      <Dialog open={addOverrideDialogOpen} onOpenChange={setAddOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vendor Override</DialogTitle>
            <DialogDescription>
              Set a custom commission rate for a specific vendor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Vendor</Label>
              <Select
                value={overrideForm.vendorId}
                onValueChange={(value) => setOverrideForm({ ...overrideForm, vendorId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service Type</Label>
              <Select
                value={overrideForm.serviceType}
                onValueChange={(value) => setOverrideForm({ ...overrideForm, serviceType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Custom Commission Rate (%)</Label>
              <div className="mt-2 space-y-4">
                <Slider
                  value={[overrideForm.customRate]}
                  onValueChange={(value) => setOverrideForm({ ...overrideForm, customRate: value[0] })}
                  max={50}
                  step={0.5}
                />
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold">{overrideForm.customRate}%</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Reason</Label>
              <Input
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                placeholder="e.g., New partner discount, High volume vendor"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={overrideForm.effectiveFrom}
                  onChange={(e) => setOverrideForm({ ...overrideForm, effectiveFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>Effective To (Optional)</Label>
                <Input
                  type="date"
                  value={overrideForm.effectiveTo}
                  onChange={(e) => setOverrideForm({ ...overrideForm, effectiveTo: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createOverrideMutation.mutate(overrideForm)}
              disabled={
                !overrideForm.vendorId ||
                !overrideForm.reason.trim() ||
                createOverrideMutation.isPending
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              {createOverrideMutation.isPending ? "Creating..." : "Create Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
