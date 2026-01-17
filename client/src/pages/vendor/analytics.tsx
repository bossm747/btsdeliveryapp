import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Star,
  Flame,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart
} from "recharts";
import type { Restaurant, Order } from "@shared/schema";

// Chart colors
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Types for analytics data
interface AnalyticsData {
  revenue: {
    daily: { date: string; amount: number; orders: number }[];
    weekly: { week: string; amount: number; orders: number }[];
    monthly: { month: string; amount: number; orders: number }[];
  };
  orderVolume: {
    total: number;
    completed: number;
    cancelled: number;
    avgOrderValue: number;
    growth: number;
  };
  popularItems: {
    name: string;
    quantity: number;
    revenue: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  peakHours: {
    hour: number;
    orders: number;
    revenue: number;
  }[];
  customerDemographics: {
    newCustomers: number;
    returningCustomers: number;
    topCustomers: { name: string; orders: number; spent: number }[];
    ordersByType: { type: string; count: number; percentage: number }[];
  };
}

// Generate mock data for analytics
const generateMockAnalytics = (): AnalyticsData => {
  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: Math.floor(Math.random() * 15000) + 5000,
      orders: Math.floor(Math.random() * 50) + 20
    };
  });

  const weeklyData = Array.from({ length: 12 }, (_, i) => ({
    week: `Week ${i + 1}`,
    amount: Math.floor(Math.random() * 80000) + 30000,
    orders: Math.floor(Math.random() * 300) + 150
  }));

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      amount: Math.floor(Math.random() * 350000) + 150000,
      orders: Math.floor(Math.random() * 1200) + 600
    };
  });

  return {
    revenue: {
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData
    },
    orderVolume: {
      total: 1456,
      completed: 1389,
      cancelled: 67,
      avgOrderValue: 485.50,
      growth: 12.5
    },
    popularItems: [
      { name: 'Chicken Adobo', quantity: 456, revenue: 68400, trend: 'up' as const },
      { name: 'Sinigang na Baboy', quantity: 389, revenue: 58350, trend: 'up' as const },
      { name: 'Crispy Pata', quantity: 234, revenue: 70200, trend: 'stable' as const },
      { name: 'Kare-Kare', quantity: 198, revenue: 59400, trend: 'down' as const },
      { name: 'Lechon Kawali', quantity: 167, revenue: 41750, trend: 'up' as const },
      { name: 'Sisig', quantity: 145, revenue: 29000, trend: 'stable' as const },
      { name: 'Pancit Canton', quantity: 134, revenue: 20100, trend: 'up' as const },
      { name: 'Halo-Halo', quantity: 123, revenue: 12300, trend: 'down' as const },
    ],
    peakHours: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      orders: hour >= 11 && hour <= 13 ? Math.floor(Math.random() * 30) + 25 :
              hour >= 18 && hour <= 20 ? Math.floor(Math.random() * 35) + 30 :
              hour >= 6 && hour <= 22 ? Math.floor(Math.random() * 15) + 5 :
              Math.floor(Math.random() * 3),
      revenue: 0 // Will be calculated
    })).map(h => ({ ...h, revenue: h.orders * Math.floor(Math.random() * 200) + 300 })),
    customerDemographics: {
      newCustomers: 234,
      returningCustomers: 456,
      topCustomers: [
        { name: 'Juan Dela Cruz', orders: 45, spent: 22500 },
        { name: 'Maria Santos', orders: 38, spent: 19000 },
        { name: 'Pedro Reyes', orders: 32, spent: 16000 },
        { name: 'Ana Garcia', orders: 28, spent: 14000 },
        { name: 'Jose Rizal', orders: 25, spent: 12500 },
      ],
      ordersByType: [
        { type: 'Delivery', count: 876, percentage: 60 },
        { type: 'Pickup', count: 438, percentage: 30 },
        { type: 'Dine-in', count: 142, percentage: 10 },
      ]
    }
  };
};

// Heatmap component for peak hours
const PeakHoursHeatmap = ({ data }: { data: { hour: number; orders: number }[] }) => {
  const maxOrders = Math.max(...data.map(d => d.orders));

  const getIntensity = (orders: number) => {
    const ratio = orders / maxOrders;
    if (ratio >= 0.8) return 'bg-red-500';
    if (ratio >= 0.6) return 'bg-orange-500';
    if (ratio >= 0.4) return 'bg-yellow-500';
    if (ratio >= 0.2) return 'bg-green-400';
    if (ratio > 0) return 'bg-green-200';
    return 'bg-gray-100 dark:bg-gray-800';
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM';
    if (hour === 12) return '12PM';
    return hour > 12 ? `${hour - 12}PM` : `${hour}AM`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-white">Orders by Hour</h4>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Low</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-green-200 rounded"></div>
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <div className="w-4 h-4 bg-red-500 rounded"></div>
          </div>
          <span>High</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-1">
        {data.slice(6, 22).map((hourData) => (
          <div key={hourData.hour} className="text-center">
            <div
              className={`w-full aspect-square rounded-md ${getIntensity(hourData.orders)} transition-colors cursor-pointer hover:ring-2 hover:ring-primary`}
              title={`${formatHour(hourData.hour)}: ${hourData.orders} orders`}
            />
            <span className="text-xs text-gray-500 mt-1 block">
              {hourData.hour % 3 === 0 ? formatHour(hourData.hour) : ''}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-300 font-medium">Peak Lunch</p>
          <p className="text-lg font-bold text-green-600">11AM - 1PM</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
          <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">Peak Dinner</p>
          <p className="text-lg font-bold text-orange-600">6PM - 8PM</p>
        </div>
      </div>
    </div>
  );
};

export default function VendorAnalytics() {
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState('30d');

  // Fetch vendor's restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/vendor/analytics", dateRange],
    enabled: !!restaurant,
    // Use mock data for now
    queryFn: async () => {
      // In production, this would fetch from the API
      // const response = await fetch(`/api/vendor/analytics?range=${dateRange}`);
      // return response.json();
      return generateMockAnalytics();
    },
  });

  // Fetch vendor's orders for additional metrics
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/vendor/orders"],
    enabled: !!restaurant,
  });

  const isLoading = restaurantLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const analytics = analyticsData || generateMockAnalytics();
  const revenueData = analytics.revenue[timePeriod];

  // Calculate total revenue for the period
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.amount, 0);
  const totalOrders = revenueData.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="space-y-6" data-testid="vendor-analytics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your restaurant performance and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden" data-testid="card-total-revenue">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ₱{totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+15.3% vs last period</span>
                </div>
              </div>
              <div className="bg-green-500/10 p-3 rounded-xl">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-total-orders">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalOrders.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+{analytics.orderVolume.growth}%</span>
                </div>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <ShoppingBag className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-avg-order">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Avg. Order Value</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ₱{analytics.orderVolume.avgOrderValue.toFixed(2)}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+8.2%</span>
                </div>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-xl">
                <Activity className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-completion-rate">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-yellow-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {((analytics.orderVolume.completed / analytics.orderVolume.total) * 100).toFixed(1)}%
                </p>
                <div className="flex items-center mt-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {analytics.orderVolume.completed} completed
                  </span>
                </div>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-xl">
                <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400 fill-current" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue Trends
              </CardTitle>
              <CardDescription>Track your revenue and order volume over time</CardDescription>
            </div>
            <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as typeof timePeriod)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey={timePeriod === 'daily' ? 'date' : timePeriod === 'weekly' ? 'week' : 'month'}
                fontSize={12}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                fontSize={12}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'amount' ? `₱${value.toLocaleString()}` : value,
                  name === 'amount' ? 'Revenue' : 'Orders'
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="amount"
                name="Revenue"
                fill={CHART_COLORS[0]}
                fillOpacity={0.2}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke={CHART_COLORS[1]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Popular Items and Peak Hours */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Popular Items
            </CardTitle>
            <CardDescription>Your best-selling menu items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.popularItems.slice(0, 6).map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
                  data-testid={`popular-item-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.quantity} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ₱{item.revenue.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end">
                      {item.trend === 'up' && (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <TrendingUp className="h-3 w-3 mr-1" /> Up
                        </Badge>
                      )}
                      {item.trend === 'down' && (
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          <TrendingDown className="h-3 w-3 mr-1" /> Down
                        </Badge>
                      )}
                      {item.trend === 'stable' && (
                        <Badge variant="outline" className="text-gray-600">
                          Stable
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Peak Hours
            </CardTitle>
            <CardDescription>When your restaurant is busiest</CardDescription>
          </CardHeader>
          <CardContent>
            <PeakHoursHeatmap data={analytics.peakHours} />
          </CardContent>
        </Card>
      </div>

      {/* Customer Demographics */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Order Distribution
            </CardTitle>
            <CardDescription>Orders by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.customerDemographics.ordersByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {analytics.customerDemographics.ordersByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Orders']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {analytics.customerDemographics.ordersByType.map((type, index) => (
                  <div key={type.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index] }}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{type.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-900 dark:text-white">{type.count}</span>
                      <span className="text-gray-500 ml-2">({type.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Insights
            </CardTitle>
            <CardDescription>Understanding your customer base</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New vs Returning */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg text-center">
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">New Customers</p>
                <p className="text-3xl font-bold text-green-600">{analytics.customerDemographics.newCustomers}</p>
                <p className="text-xs text-green-600 mt-1">+12% this month</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Returning</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.customerDemographics.returningCustomers}</p>
                <p className="text-xs text-blue-600 mt-1">66% retention</p>
              </div>
            </div>

            {/* Top Customers */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Top Customers</h4>
              <div className="space-y-2">
                {analytics.customerDemographics.topCustomers.slice(0, 3).map((customer, index) => (
                  <div
                    key={customer.name}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="text-gray-900 dark:text-white">{customer.name}</span>
                    </div>
                    <div className="text-right text-sm">
                      <span className="text-gray-900 dark:text-white font-medium">
                        ₱{customer.spent.toLocaleString()}
                      </span>
                      <span className="text-gray-500 ml-2">({customer.orders} orders)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Trend Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Order Volume Breakdown
          </CardTitle>
          <CardDescription>Daily order distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.revenue.daily.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                fontSize={12}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                fontSize={12}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [value, 'Orders']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar
                dataKey="orders"
                fill={CHART_COLORS[0]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
