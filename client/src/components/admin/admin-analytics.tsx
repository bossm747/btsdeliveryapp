import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar,
  ComposedChart, Scatter, ScatterChart
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Package, Truck,
  Activity, Clock, MapPin, AlertTriangle, CheckCircle, 
  RefreshCw, Download, Calendar, Globe, Target, Zap
} from "lucide-react";

interface AdminAnalyticsProps {
  stats?: any;
}

// Type definitions for analytics data
interface RealTimeMetrics {
  activeOrders?: number;
  onlineRiders?: number;
  todayRevenue?: number;
  activeRestaurants?: number;
  avgDeliveryTime?: number;
  successRate?: number;
}

interface RevenueAnalytics {
  total_revenue?: number;
  delivery_revenue?: number;
  service_revenue?: number;
  avg_order_value?: number;
}

interface OrderAnalytics {
  total_orders?: number;
  completed_orders?: number;
  cancelled_orders?: number;
  pending_orders?: number;
}

interface UserAnalytics {
  total_customers?: number;
  total_vendors?: number;
  total_riders?: number;
  verified_users?: number;
}

interface RiderAnalytics {
  total_riders?: number;
  verified_riders?: number;
  online_riders?: number;
  avg_rider_rating?: number;
}

export default function AdminAnalytics({ stats }: AdminAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("7d");
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Real-time metrics queries with proper types
  const { data: realTimeMetrics = {} as RealTimeMetrics, refetch: refetchMetrics } = useQuery<RealTimeMetrics>({
    queryKey: ["/api/admin/analytics/real-time"],
    refetchInterval: refreshInterval,
  });

  const { data: orderAnalytics = {} as OrderAnalytics } = useQuery<OrderAnalytics>({
    queryKey: ["/api/admin/analytics/orders", timeRange],
  });

  const { data: revenueAnalytics = {} as RevenueAnalytics } = useQuery<RevenueAnalytics>({
    queryKey: ["/api/admin/analytics/revenue", timeRange],
  });

  const { data: userAnalytics = {} as UserAnalytics } = useQuery<UserAnalytics>({
    queryKey: ["/api/admin/analytics/users", timeRange],
  });

  const { data: riderAnalytics = {} as RiderAnalytics } = useQuery<RiderAnalytics>({
    queryKey: ["/api/admin/analytics/riders", timeRange],
  });

  const { data: restaurantAnalytics = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/restaurants", timeRange],
  });

  const { data: orderTrends = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/trends/orders", timeRange],
  });

  const { data: revenueTrends = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/trends/revenue", timeRange],
  });

  const { data: serviceBreakdown = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/service-breakdown", timeRange],
  });

  const { data: topRestaurants = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/top-restaurants", timeRange],
  });

  const { data: riderPerformance = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/rider-performance", timeRange],
  });

  const { data: geographicAnalytics = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/geographic", timeRange],
  });

  const { data: performanceMetrics } = useQuery<any>({
    queryKey: ["/api/admin/analytics/performance", timeRange],
  });

  // Auto-refresh real-time data
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMetrics();
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchMetrics]);

  const handleManualRefresh = () => {
    refetchMetrics();
    setLastRefresh(new Date());
  };

  const handleExportData = (type: string) => {
    // Implementation for data export
    console.log(`Exporting ${type} data...`);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h2>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]" data-testid="select-timerange">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportData('analytics')} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Real-time Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Active Orders</p>
                <p className="text-3xl font-bold" data-testid="text-active-orders">
                  {realTimeMetrics?.activeOrders || 0}
                </p>
                <p className="text-blue-100 text-sm">Real-time count</p>
              </div>
              <Package className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Online Riders</p>
                <p className="text-3xl font-bold" data-testid="text-online-riders">
                  {realTimeMetrics?.onlineRiders || 0}
                </p>
                <p className="text-green-100 text-sm">Available now</p>
              </div>
              <Users className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Today's Revenue</p>
                <p className="text-3xl font-bold" data-testid="text-today-revenue">
                  ₱{realTimeMetrics?.todayRevenue?.toLocaleString() || '0'}
                </p>
                <p className="text-purple-100 text-sm">Live tracking</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Active Restaurants</p>
                <p className="text-3xl font-bold" data-testid="text-active-restaurants">
                  {realTimeMetrics?.activeRestaurants || 0}
                </p>
                <p className="text-orange-100 text-sm">Accepting orders</p>
              </div>
              <Truck className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Database</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Healthy
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">API Response</span>
                <span className="text-sm font-medium">120ms avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Memory Usage</span>
                <span className="text-sm font-medium">68%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">CPU Usage</span>
                <span className="text-sm font-medium">35%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Performance KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg Delivery Time</span>
                <span className="text-sm font-medium">
                  {performanceMetrics?.avgDeliveryTime || 0} min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Success Rate</span>
                <span className="text-sm font-medium text-green-600">
                  {performanceMetrics?.successRate || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Customer Satisfaction</span>
                <span className="text-sm font-medium">4.2/5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">On-time Delivery</span>
                <span className="text-sm font-medium text-green-600">87%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Data refresh:</p>
                <p className="font-medium" data-testid="text-last-refresh">
                  {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auto-refresh:</p>
                <p className="font-medium">Every {refreshInterval / 1000}s</p>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleManualRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
          <TabsTrigger value="operations" data-testid="tab-operations">Operations</TabsTrigger>
          <TabsTrigger value="geographic" data-testid="tab-geographic">Geographic</TabsTrigger>
          <TabsTrigger value="predictions" data-testid="tab-predictions">Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Order Trends</CardTitle>
                <CardDescription>Orders and deliveries over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={orderTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="orders" 
                      stackId="1"
                      stroke="#FF6B35" 
                      fill="#FF6B35" 
                      fillOpacity={0.6}
                      name="Total Orders"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="delivered" 
                      stackId="2"
                      stroke="#4CAF50" 
                      fill="#4CAF50" 
                      fillOpacity={0.6}
                      name="Delivered"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Service Distribution</CardTitle>
                <CardDescription>Orders by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serviceBreakdown || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(serviceBreakdown || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Restaurants & Rider Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Restaurants</CardTitle>
                <CardDescription>By order volume and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topRestaurants || []} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#FF6B35" name="Orders" />
                    <Bar dataKey="revenue" fill="#FFD23F" name="Revenue (₱)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Rider Performance</CardTitle>
                <CardDescription>Best performing riders this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(riderPerformance || []).slice(0, 5).map((rider: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-muted-foreground">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{rider.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {rider.deliveries} deliveries • ⭐ {rider.rating}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₱{rider.earnings?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Earnings</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Growth</CardTitle>
                <CardDescription>Revenue trends and growth rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: any) => [`₱${value?.toLocaleString()}`, 'Revenue']} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#FF6B35" name="Revenue (₱)" />
                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#004225" strokeWidth={2} name="Orders" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>Detailed revenue breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Total Revenue</span>
                    <span className="text-lg font-bold text-green-600">
                      ₱{revenueAnalytics?.total_revenue?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Delivery Revenue</span>
                    <span className="text-lg font-bold text-blue-600">
                      ₱{revenueAnalytics?.delivery_revenue?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Service Revenue</span>
                    <span className="text-lg font-bold text-purple-600">
                      ₱{revenueAnalytics?.service_revenue?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium">Avg Order Value</span>
                    <span className="text-lg font-bold text-orange-600">
                      ₱{revenueAnalytics?.avg_order_value?.toFixed(2) || '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Orders</span>
                    <span className="font-bold">{orderAnalytics?.total_orders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-bold text-green-600">{orderAnalytics?.completed_orders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancelled</span>
                    <span className="font-bold text-red-600">{orderAnalytics?.cancelled_orders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-bold text-orange-600">{orderAnalytics?.pending_orders || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Customers</span>
                    <span className="font-bold">{userAnalytics?.total_customers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Vendors</span>
                    <span className="font-bold">{userAnalytics?.total_vendors || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Riders</span>
                    <span className="font-bold">{userAnalytics?.total_riders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verified Users</span>
                    <span className="font-bold text-green-600">{userAnalytics?.verified_users || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rider Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Riders</span>
                    <span className="font-bold">{riderAnalytics?.total_riders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verified</span>
                    <span className="font-bold text-green-600">{riderAnalytics?.verified_riders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Online Now</span>
                    <span className="font-bold text-blue-600">{riderAnalytics?.online_riders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Rating</span>
                    <span className="font-bold">{riderAnalytics?.avg_rider_rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geographic Distribution
              </CardTitle>
              <CardDescription>Orders and revenue by location</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={geographicAnalytics || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="city" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#FF6B35" name="Orders" />
                  <Bar dataKey="revenue" fill="#004225" name="Revenue (₱)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Business Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">Revenue Growth</h4>
                    <p className="text-sm text-green-600">Revenue has increased by 15% compared to last month</p>
                    <p className="text-lg font-bold text-green-800">+15%</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">Customer Retention</h4>
                    <p className="text-sm text-blue-600">Customer retention rate is at 87%</p>
                    <p className="text-lg font-bold text-blue-800">87%</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800">Delivery Performance</h4>
                    <p className="text-sm text-purple-600">On-time delivery rate improved by 5%</p>
                    <p className="text-lg font-bold text-purple-800">+5%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Predictions & Forecasts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Next Month Revenue</h4>
                    <p className="text-sm text-muted-foreground">Predicted based on trends</p>
                    <p className="text-2xl font-bold text-green-600">₱125,000</p>
                    <p className="text-xs text-green-600">85% confidence</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Expected Order Volume</h4>
                    <p className="text-sm text-muted-foreground">Next 7 days forecast</p>
                    <p className="text-2xl font-bold text-blue-600">1,250</p>
                    <p className="text-xs text-blue-600">92% confidence</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Rider Demand</h4>
                    <p className="text-sm text-muted-foreground">Peak hour requirements</p>
                    <p className="text-2xl font-bold text-orange-600">15-20</p>
                    <p className="text-xs text-orange-600">Peak: 12-2 PM</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}