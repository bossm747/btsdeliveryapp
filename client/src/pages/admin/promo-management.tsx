import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tag,
  Plus,
  Search,
  Edit,
  Trash2,
  Percent,
  DollarSign,
  Truck,
  Gift,
  Calendar,
  Users,
  Store,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Copy,
  Eye,
  Power,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

// Types
interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: string | null;
  tieredDiscounts: any;
  minOrderAmount: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  timesUsed: number;
  startDate: string;
  endDate: string;
  validDaysOfWeek: number[] | null;
  validTimeStart: string | null;
  validTimeEnd: string | null;
  applicableTo: string;
  restaurantIds: string[] | null;
  excludedRestaurantIds: string[] | null;
  applicableServiceTypes: string[] | null;
  fundingType: string;
  vendorContribution: string | null;
  isActive: boolean;
  isStackable: boolean;
  firstOrderOnly: boolean;
  createdAt: string;
  stats?: {
    totalUses: number;
    totalDiscount: number;
    uniqueUsers: number;
  };
}

interface PromoFormData {
  code: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  startDate: string;
  endDate: string;
  validDaysOfWeek: number[];
  validTimeStart: string;
  validTimeEnd: string;
  applicableTo: string;
  applicableServiceTypes: string[];
  fundingType: string;
  vendorContribution: string;
  isStackable: boolean;
  firstOrderOnly: boolean;
}

const defaultFormData: PromoFormData = {
  code: "",
  name: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "1",
  startDate: "",
  endDate: "",
  validDaysOfWeek: [],
  validTimeStart: "",
  validTimeEnd: "",
  applicableTo: "all",
  applicableServiceTypes: [],
  fundingType: "platform",
  vendorContribution: "",
  isStackable: false,
  firstOrderOnly: false
};

const discountTypes = [
  { value: "percentage", label: "Percentage Off", icon: Percent },
  { value: "fixed", label: "Fixed Amount", icon: DollarSign },
  { value: "free_delivery", label: "Free Delivery", icon: Truck },
  { value: "first_order", label: "First Order", icon: Gift },
  { value: "tiered", label: "Tiered Discount", icon: TrendingUp }
];

const daysOfWeek = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" }
];

const serviceTypes = [
  { value: "food", label: "Food Delivery" },
  { value: "pabili", label: "Pabili (Shopping)" },
  { value: "parcel", label: "Parcel Delivery" },
  { value: "pabayad", label: "Pabayad (Bills)" }
];

export default function PromoManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState<PromoFormData>(defaultFormData);

  // Fetch all promo codes
  const { data: promos = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/promos", { status: activeFilter !== "all" ? activeFilter : undefined }],
  });

  // Create promo mutation
  const createPromoMutation = useMutation({
    mutationFn: async (data: PromoFormData) => {
      const response = await apiRequest("POST", "/api/admin/promos", {
        ...data,
        discountValue: data.discountValue ? parseFloat(data.discountValue) : null,
        minOrderAmount: data.minOrderAmount ? parseFloat(data.minOrderAmount) : null,
        maxDiscount: data.maxDiscount ? parseFloat(data.maxDiscount) : null,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
        perUserLimit: data.perUserLimit ? parseInt(data.perUserLimit) : 1,
        vendorContribution: data.vendorContribution ? parseFloat(data.vendorContribution) : null,
        validDaysOfWeek: data.validDaysOfWeek.length > 0 ? data.validDaysOfWeek : null,
        applicableServiceTypes: data.applicableServiceTypes.length > 0 ? data.applicableServiceTypes : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      setIsCreateDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Success", description: "Promo code created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create promo code",
        variant: "destructive"
      });
    }
  });

  // Update promo mutation
  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromoFormData> }) => {
      const payload: any = { ...data };
      if (data.discountValue !== undefined) payload.discountValue = data.discountValue ? parseFloat(data.discountValue) : null;
      if (data.minOrderAmount !== undefined) payload.minOrderAmount = data.minOrderAmount ? parseFloat(data.minOrderAmount) : null;
      if (data.maxDiscount !== undefined) payload.maxDiscount = data.maxDiscount ? parseFloat(data.maxDiscount) : null;
      if (data.usageLimit !== undefined) payload.usageLimit = data.usageLimit ? parseInt(data.usageLimit) : null;
      if (data.perUserLimit !== undefined) payload.perUserLimit = data.perUserLimit ? parseInt(data.perUserLimit) : 1;
      if (data.vendorContribution !== undefined) payload.vendorContribution = data.vendorContribution ? parseFloat(data.vendorContribution) : null;
      if (data.validDaysOfWeek !== undefined) payload.validDaysOfWeek = data.validDaysOfWeek.length > 0 ? data.validDaysOfWeek : null;
      if (data.applicableServiceTypes !== undefined) payload.applicableServiceTypes = data.applicableServiceTypes.length > 0 ? data.applicableServiceTypes : null;

      const response = await apiRequest("PATCH", `/api/admin/promos/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      setIsEditDialogOpen(false);
      setSelectedPromo(null);
      setFormData(defaultFormData);
      toast({ title: "Success", description: "Promo code updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update promo code",
        variant: "destructive"
      });
    }
  });

  // Delete promo mutation
  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/promos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      setIsDeleteDialogOpen(false);
      setSelectedPromo(null);
      toast({ title: "Success", description: "Promo code deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete promo code",
        variant: "destructive"
      });
    }
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/promos/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      toast({ title: "Success", description: "Promo status updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update promo status",
        variant: "destructive"
      });
    }
  });

  // Filter promos by search term
  const filteredPromos = promos.filter(promo => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      promo.code.toLowerCase().includes(search) ||
      promo.name.toLowerCase().includes(search) ||
      (promo.description && promo.description.toLowerCase().includes(search))
    );
  });

  // Calculate stats
  const stats = {
    total: promos.length,
    active: promos.filter(p => {
      const now = new Date();
      return p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now;
    }).length,
    expired: promos.filter(p => new Date(p.endDate) < new Date()).length,
    upcoming: promos.filter(p => p.isActive && new Date(p.startDate) > new Date()).length,
    totalRedemptions: promos.reduce((sum, p) => sum + (p.stats?.totalUses || 0), 0),
    totalDiscountGiven: promos.reduce((sum, p) => sum + (p.stats?.totalDiscount || 0), 0)
  };

  // Edit handler
  const handleEdit = (promo: PromoCode) => {
    setSelectedPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description || "",
      discountType: promo.discountType,
      discountValue: promo.discountValue || "",
      minOrderAmount: promo.minOrderAmount || "",
      maxDiscount: promo.maxDiscount || "",
      usageLimit: promo.usageLimit?.toString() || "",
      perUserLimit: promo.perUserLimit?.toString() || "1",
      startDate: promo.startDate ? format(new Date(promo.startDate), "yyyy-MM-dd'T'HH:mm") : "",
      endDate: promo.endDate ? format(new Date(promo.endDate), "yyyy-MM-dd'T'HH:mm") : "",
      validDaysOfWeek: promo.validDaysOfWeek || [],
      validTimeStart: promo.validTimeStart || "",
      validTimeEnd: promo.validTimeEnd || "",
      applicableTo: promo.applicableTo,
      applicableServiceTypes: promo.applicableServiceTypes || [],
      fundingType: promo.fundingType,
      vendorContribution: promo.vendorContribution || "",
      isStackable: promo.isStackable,
      firstOrderOnly: promo.firstOrderOnly
    });
    setIsEditDialogOpen(true);
  };

  // Get promo status
  const getPromoStatus = (promo: PromoCode) => {
    const now = new Date();
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);

    if (!promo.isActive) return { label: "Deactivated", variant: "secondary" as const, icon: XCircle };
    if (now < startDate) return { label: "Upcoming", variant: "outline" as const, icon: Clock };
    if (now > endDate) return { label: "Expired", variant: "destructive" as const, icon: XCircle };
    return { label: "Active", variant: "default" as const, icon: CheckCircle };
  };

  // Get discount type icon
  const getDiscountIcon = (type: string) => {
    const found = discountTypes.find(t => t.value === type);
    return found?.icon || Tag;
  };

  // Format discount display
  const formatDiscount = (promo: PromoCode) => {
    switch (promo.discountType) {
      case "percentage":
        return `${promo.discountValue}%`;
      case "fixed":
        return `₱${promo.discountValue}`;
      case "free_delivery":
        return "Free Delivery";
      case "first_order":
        return `₱${promo.discountValue} (First Order)`;
      case "tiered":
        return "Tiered";
      default:
        return promo.discountValue || "-";
    }
  };

  // Copy code to clipboard
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: `${code} copied to clipboard` });
  };

  // Close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('[data-testid="admin-sidebar"]');
      const target = event.target as Node;
      if (sidebarOpen && sidebar && !sidebar.contains(target)) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-admin-promo-management">
      {/* Sidebar */}
      <AdminSidebar activeTab="promos" onTabChange={() => {}} isOpen={sidebarOpen} />

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
          title="Promo Code Management"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Promos</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <Tag className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Promos</p>
                      <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Redemptions</p>
                      <p className="text-2xl font-bold">{stats.totalRedemptions}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Discounts Given</p>
                      <p className="text-2xl font-bold">₱{stats.totalDiscountGiven.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Promo List */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Promo Codes</CardTitle>
                    <CardDescription>Manage platform and vendor promotional codes</CardDescription>
                  </div>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Promo Code
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search promo codes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full md:w-auto">
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="active">Active</TabsTrigger>
                      <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                      <TabsTrigger value="expired">Expired</TabsTrigger>
                      <TabsTrigger value="deactivated">Deactivated</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Table */}
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredPromos.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Promo Codes Found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {searchTerm ? "Try adjusting your search" : "Create your first promo code to get started"}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Promo Code
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Valid Period</TableHead>
                          <TableHead>Funding</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPromos.map((promo) => {
                          const status = getPromoStatus(promo);
                          const DiscountIcon = getDiscountIcon(promo.discountType);

                          return (
                            <TableRow key={promo.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-sm">
                                    {promo.code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyCode(promo.code)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{promo.name}</p>
                                  {promo.description && (
                                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                      {promo.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <DiscountIcon className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">{formatDiscount(promo)}</span>
                                </div>
                                {promo.maxDiscount && (
                                  <p className="text-xs text-gray-500">Max: ₱{promo.maxDiscount}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={status.variant}>
                                  <status.icon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {promo.stats?.totalUses || 0}
                                    {promo.usageLimit && ` / ${promo.usageLimit}`}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {promo.stats?.uniqueUsers || 0} users
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{format(new Date(promo.startDate), "MMM d, yyyy")}</p>
                                  <p className="text-gray-500">
                                    to {format(new Date(promo.endDate), "MMM d, yyyy")}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {promo.fundingType === "platform" && "Platform"}
                                  {promo.fundingType === "vendor" && "Vendor"}
                                  {promo.fundingType === "split" && `Split (${promo.vendorContribution}%)`}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedPromo(promo);
                                      setIsViewDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(promo)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleActiveMutation.mutate({
                                      id: promo.id,
                                      isActive: !promo.isActive
                                    })}
                                  >
                                    <Power className={`h-4 w-4 ${promo.isActive ? "text-green-600" : "text-gray-400"}`} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedPromo(promo);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedPromo(null);
            setFormData(defaultFormData);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? "Update the promotional code details" : "Create a new promotional code for customers"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Promo Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  className="uppercase"
                />
              </div>
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale 20% Off"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Get 20% off on all orders this summer..."
              />
            </div>

            {/* Discount Configuration */}
            <div className="space-y-4">
              <Label>Discount Type *</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {discountTypes.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.discountType === type.value ? "default" : "outline"}
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => setFormData({ ...formData, discountType: type.value })}
                  >
                    <type.icon className="h-4 w-4" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {formData.discountType !== "free_delivery" && formData.discountType !== "tiered" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discountValue">
                    Discount Value * {formData.discountType === "percentage" ? "(%)" : "(₱)"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === "percentage" ? "20" : "50"}
                  />
                </div>
                <div>
                  <Label htmlFor="minOrderAmount">Min Order (₱)</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                {formData.discountType === "percentage" && (
                  <div>
                    <Label htmlFor="maxDiscount">Max Discount (₱)</Label>
                    <Input
                      id="maxDiscount"
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="usageLimit">Total Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label htmlFor="perUserLimit">Per User Limit</Label>
                <Input
                  id="perUserLimit"
                  type="number"
                  value={formData.perUserLimit}
                  onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Day of Week Restriction */}
            <div>
              <Label>Valid Days (leave empty for all days)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {daysOfWeek.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={formData.validDaysOfWeek.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const days = formData.validDaysOfWeek.includes(day.value)
                        ? formData.validDaysOfWeek.filter((d) => d !== day.value)
                        : [...formData.validDaysOfWeek, day.value];
                      setFormData({ ...formData, validDaysOfWeek: days });
                    }}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time Restriction */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validTimeStart">Valid From Time</Label>
                <Input
                  id="validTimeStart"
                  type="time"
                  value={formData.validTimeStart}
                  onChange={(e) => setFormData({ ...formData, validTimeStart: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="validTimeEnd">Valid Until Time</Label>
                <Input
                  id="validTimeEnd"
                  type="time"
                  value={formData.validTimeEnd}
                  onChange={(e) => setFormData({ ...formData, validTimeEnd: e.target.value })}
                />
              </div>
            </div>

            {/* Applicability */}
            <div>
              <Label>Applicable To *</Label>
              <Select
                value={formData.applicableTo}
                onValueChange={(value) => setFormData({ ...formData, applicableTo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="new_users">New Users Only</SelectItem>
                  <SelectItem value="specific_restaurants">Specific Restaurants</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service Types */}
            <div>
              <Label>Applicable Services (leave empty for all)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {serviceTypes.map((service) => (
                  <Button
                    key={service.value}
                    type="button"
                    variant={formData.applicableServiceTypes.includes(service.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const services = formData.applicableServiceTypes.includes(service.value)
                        ? formData.applicableServiceTypes.filter((s) => s !== service.value)
                        : [...formData.applicableServiceTypes, service.value];
                      setFormData({ ...formData, applicableServiceTypes: services });
                    }}
                  >
                    {service.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Funding Type */}
            <div>
              <Label>Funding Type *</Label>
              <Select
                value={formData.fundingType}
                onValueChange={(value) => setFormData({ ...formData, fundingType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform Funded</SelectItem>
                  <SelectItem value="vendor">Vendor Funded</SelectItem>
                  <SelectItem value="split">Split (Platform + Vendor)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.fundingType === "split" && (
              <div>
                <Label htmlFor="vendorContribution">Vendor Contribution (%)</Label>
                <Input
                  id="vendorContribution"
                  type="number"
                  value={formData.vendorContribution}
                  onChange={(e) => setFormData({ ...formData, vendorContribution: e.target.value })}
                  placeholder="50"
                />
              </div>
            )}

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>First Order Only</Label>
                  <p className="text-sm text-gray-500">Only available for users without completed orders</p>
                </div>
                <Switch
                  checked={formData.firstOrderOnly}
                  onCheckedChange={(checked) => setFormData({ ...formData, firstOrderOnly: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Stackable</Label>
                  <p className="text-sm text-gray-500">Can be combined with other promos</p>
                </div>
                <Switch
                  checked={formData.isStackable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isStackable: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedPromo(null);
                setFormData(defaultFormData);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (isEditDialogOpen && selectedPromo) {
                  updatePromoMutation.mutate({ id: selectedPromo.id, data: formData });
                } else {
                  createPromoMutation.mutate(formData);
                }
              }}
              disabled={createPromoMutation.isPending || updatePromoMutation.isPending}
            >
              {(createPromoMutation.isPending || updatePromoMutation.isPending) ? "Saving..." : isEditDialogOpen ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Promo Code Details</DialogTitle>
          </DialogHeader>
          {selectedPromo && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <code className="text-2xl font-bold bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded">
                  {selectedPromo.code}
                </code>
                <Badge variant={getPromoStatus(selectedPromo).variant}>
                  {getPromoStatus(selectedPromo).label}
                </Badge>
              </div>

              <div>
                <h4 className="font-semibold">{selectedPromo.name}</h4>
                {selectedPromo.description && (
                  <p className="text-gray-500 text-sm mt-1">{selectedPromo.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Discount Type</p>
                  <p className="font-medium capitalize">{selectedPromo.discountType.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-gray-500">Discount Value</p>
                  <p className="font-medium">{formatDiscount(selectedPromo)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Min Order</p>
                  <p className="font-medium">₱{selectedPromo.minOrderAmount || "0"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Max Discount</p>
                  <p className="font-medium">{selectedPromo.maxDiscount ? `₱${selectedPromo.maxDiscount}` : "None"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Usage</p>
                  <p className="font-medium">
                    {selectedPromo.stats?.totalUses || 0}
                    {selectedPromo.usageLimit ? ` / ${selectedPromo.usageLimit}` : " (Unlimited)"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Unique Users</p>
                  <p className="font-medium">{selectedPromo.stats?.uniqueUsers || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Discount Given</p>
                  <p className="font-medium">₱{selectedPromo.stats?.totalDiscount?.toLocaleString() || "0"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Funding</p>
                  <p className="font-medium capitalize">{selectedPromo.fundingType}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-gray-500 text-sm">Valid Period</p>
                <p className="font-medium">
                  {format(new Date(selectedPromo.startDate), "PPP")} - {format(new Date(selectedPromo.endDate), "PPP")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promo Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the promo code "{selectedPromo?.code}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPromo(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedPromo && deletePromoMutation.mutate(selectedPromo.id)}
            >
              {deletePromoMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
