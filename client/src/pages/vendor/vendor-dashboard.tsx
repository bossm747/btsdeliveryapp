import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ShoppingBag, 
  DollarSign, 
  Star, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  Eye,
  Plus,
  Edit,
  Package,
  Store,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Activity,
  BarChart3,
  Calendar,
  Filter,
  Search,
  Sparkles
} from "lucide-react";
import btsLogo from "@assets/bts-logo-transparent.png";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import FileUpload from "@/components/FileUpload";
import type { Order, Restaurant, MenuItem, MenuCategory } from "@shared/schema";

export default function VendorDashboard() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddMenuItemOpen, setIsAddMenuItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: ''
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  // Fetch vendor's restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch vendor's orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/vendor/orders"],
    enabled: !!restaurant, // Only fetch when restaurant is loaded
  });

  // Fetch vendor's menu items
  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "menu"],
    enabled: !!restaurant?.id, // Only fetch when restaurant ID is available
  });

  // Fetch vendor's categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: ["/api/vendor/categories"],
    enabled: !!restaurant, // Only fetch when restaurant is loaded
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order status updated",
        description: "The order status has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update menu item availability mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<MenuItem> }) => {
      return await apiRequest("PATCH", `/api/menu-items/${itemId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "menu"] });
      toast({
        title: "Menu item updated",
        description: "The menu item has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update menu item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatusMutation.mutate({
      orderId,
      status: "confirmed",
      notes: "Order accepted by restaurant"
    });
  };

  const handleRejectOrder = (orderId: string) => {
    updateOrderStatusMutation.mutate({
      orderId,
      status: "cancelled",
      notes: "Order rejected by restaurant"
    });
  };

  const handleOrderReady = (orderId: string) => {
    updateOrderStatusMutation.mutate({
      orderId,
      status: "ready",
      notes: "Order is ready for pickup"
    });
  };

  const toggleMenuItemAvailability = (itemId: string, isAvailable: boolean) => {
    updateMenuItemMutation.mutate({
      itemId,
      updates: { isAvailable }
    });
  };

  // Create menu item mutation
  const createMenuItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const response = await apiRequest('POST', '/api/vendor/menu-items', item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "menu"] });
      setNewMenuItem({ name: '', description: '', price: '', category_id: '', image_url: '' });
      setIsAddMenuItemOpen(false);
      toast({ title: 'Success', description: 'Menu item created successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create menu item', variant: 'destructive' });
    }
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/vendor/categories', category);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/categories'] });
      setNewCategory({ name: '', description: '' });
      setIsAddCategoryOpen(false);
      toast({ title: 'Success', description: 'Category created successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' });
    }
  });

  const handleCreateMenuItem = () => {
    if (newMenuItem.name.trim() && newMenuItem.price && newMenuItem.category_id) {
      createMenuItemMutation.mutate({
        ...newMenuItem,
        price: parseFloat(newMenuItem.price),
        restaurant_id: restaurant?.id || ''
      });
    }
  };

  const handleCreateCategory = () => {
    if (newCategory.name.trim()) {
      createCategoryMutation.mutate({
        ...newCategory,
        restaurant_id: restaurant?.id || ''
      });
    }
  };

  if (restaurantLoading || ordersLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-16 w-full mb-6 rounded-xl" />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats
  const todayOrders = orders?.filter(order => {
    const today = new Date().toDateString();
    return new Date(order.createdAt!).toDateString() === today;
  }) || [];

  const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
  const pendingOrders = orders?.filter(order => order.status === "pending") || [];
  const preparingOrders = orders?.filter(order => order.status === "preparing") || [];
  const completedOrders = orders?.filter(order => order.status === "completed") || [];

  // Filter orders based on search and status
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = searchFilter === "" || 
      order.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" data-testid="vendor-dashboard-page">
      {/* Modern Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <img 
                src={btsLogo} 
                alt="BTS Delivery Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="dashboard-title">
                  {restaurant?.name || "Vendor Dashboard"}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Partner Dashboard
                </p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-slate-800">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden md:block">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Restaurant Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/ai-assistant"}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Assistant
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl p-6 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}! 👋
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Here's what's happening with {restaurant?.name || "your restaurant"} today.
                </p>
              </div>
              <div className="hidden md:block">
                <Button className="bg-primary hover:bg-primary/90">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Stats Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="today-orders-stat">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Today's Orders</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{todayOrders.length}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 dark:text-green-400">+12% vs yesterday</span>
                  </div>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl">
                  <ShoppingBag className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="today-revenue-stat">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Today's Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">₱{todayRevenue.toFixed(2)}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 dark:text-green-400">+8% vs yesterday</span>
                  </div>
                </div>
                <div className="bg-green-500/10 p-3 rounded-xl">
                  <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="restaurant-rating-stat">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-yellow-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Restaurant Rating</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {restaurant?.rating || "4.8"}
                  </p>
                  <div className="flex items-center mt-2">
                    <Star className="h-4 w-4 text-yellow-500 mr-1 fill-current" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Based on {restaurant?.totalOrders || 156} reviews</span>
                  </div>
                </div>
                <div className="bg-yellow-500/10 p-3 rounded-xl">
                  <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400 fill-current" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="pending-orders-stat">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Pending Orders</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingOrders.length}</p>
                  <div className="flex items-center mt-2">
                    <Clock className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-sm text-orange-600 dark:text-orange-400">Needs attention</span>
                  </div>
                </div>
                <div className="bg-orange-500/10 p-3 rounded-xl">
                  <Activity className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modern Tabs Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="orders" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="menu" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Package className="h-4 w-4 mr-2" />
                  Menu
                </TabsTrigger>
                <TabsTrigger value="profile" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Store className="h-4 w-4 mr-2" />
                  Restaurant
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="p-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analytics Overview</h3>
                <p className="text-gray-500 dark:text-gray-400">Detailed analytics coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="p-6">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search orders by ID or customer..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Orders Found</h3>
                    <p className="text-gray-500 dark:text-gray-400">When you receive orders, they'll appear here.</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-primary/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">Order #{order.id.slice(-8)}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {order.customerName || 'Customer'} • ₱{parseFloat(order.totalAmount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant={
                              order.status === 'pending' ? 'destructive' :
                              order.status === 'preparing' ? 'default' :
                              order.status === 'ready' ? 'secondary' : 'outline'
                            }>
                              {order.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newStatus = 
                                  order.status === 'pending' ? 'preparing' :
                                  order.status === 'preparing' ? 'ready' :
                                  order.status === 'ready' ? 'completed' : order.status;
                                
                                if (newStatus !== order.status) {
                                  updateOrderStatusMutation.mutate({
                                    orderId: order.id,
                                    status: newStatus
                                  });
                                }
                              }}
                              disabled={order.status === 'completed' || updateOrderStatusMutation.isPending}
                            >
                              {order.status === 'pending' ? 'Accept' :
                               order.status === 'preparing' ? 'Mark Ready' :
                               order.status === 'ready' ? 'Complete' : 'Done'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="menu" className="p-6">
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Menu Management</h3>
                <p className="text-gray-500 dark:text-gray-400">Menu management features will be available here</p>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="p-6">
              <div className="text-center py-12">
                <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Restaurant Profile</h3>
                <p className="text-gray-500 dark:text-gray-400">Restaurant management features coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
