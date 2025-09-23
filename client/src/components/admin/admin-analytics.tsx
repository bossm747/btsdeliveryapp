import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Package, Truck } from "lucide-react";

interface AdminAnalyticsProps {
  stats?: any;
  orderTrends?: any[];
  revenueTrends?: any[];
  serviceBreakdown?: any[];
  topRestaurants?: any[];
  riderPerformance?: any[];
}

export default function AdminAnalytics({
  stats,
  orderTrends = [],
  revenueTrends = [],
  serviceBreakdown = [],
  topRestaurants = [],
  riderPerformance = []
}: AdminAnalyticsProps) {
  
  // Default data if not provided
  const defaultOrderTrends = [
    { day: "Lunes", orders: 145, delivered: 132, cancelled: 13 },
    { day: "Martes", orders: 189, delivered: 175, cancelled: 14 },
    { day: "Miyerkules", orders: 210, delivered: 198, cancelled: 12 },
    { day: "Huwebes", orders: 245, delivered: 230, cancelled: 15 },
    { day: "Biyernes", orders: 380, delivered: 362, cancelled: 18 },
    { day: "Sabado", orders: 425, delivered: 410, cancelled: 15 },
    { day: "Linggo", orders: 398, delivered: 385, cancelled: 13 }
  ];

  const defaultRevenueTrends = [
    { month: "Enero", revenue: 850000, growth: 12 },
    { month: "Pebrero", revenue: 920000, growth: 8 },
    { month: "Marso", revenue: 1080000, growth: 17 },
    { month: "Abril", revenue: 1250000, growth: 16 },
    { month: "Mayo", revenue: 1420000, growth: 14 },
    { month: "Hunyo", revenue: 1680000, growth: 18 }
  ];

  const defaultServiceBreakdown = [
    { name: "Food Delivery", value: 65, color: "#FF6B35" },
    { name: "Pabili", value: 20, color: "#FFD23F" },
    { name: "Pabayad", value: 10, color: "#004225" },
    { name: "Parcel", value: 5, color: "#4CAF50" }
  ];

  const defaultTopRestaurants = [
    { name: "Lomi King", orders: 456, revenue: 125000, rating: 4.8 },
    { name: "Sisig Palace", orders: 389, revenue: 98000, rating: 4.7 },
    { name: "Bulalo Express", orders: 345, revenue: 102000, rating: 4.9 },
    { name: "Tapa Queen", orders: 312, revenue: 78000, rating: 4.6 },
    { name: "Adobo Hub", orders: 289, revenue: 72000, rating: 4.7 }
  ];

  const defaultRiderPerformance = [
    { name: "Juan Cruz", deliveries: 156, rating: 4.9, earnings: 15600 },
    { name: "Maria Santos", deliveries: 145, rating: 4.8, earnings: 14500 },
    { name: "Pedro Garcia", deliveries: 134, rating: 4.7, earnings: 13400 },
    { name: "Ana Reyes", deliveries: 128, rating: 4.9, earnings: 12800 },
    { name: "Jose Mendoza", deliveries: 115, rating: 4.6, earnings: 11500 }
  ];

  const orderData = orderTrends.length > 0 ? orderTrends : defaultOrderTrends;
  const revenueData = revenueTrends.length > 0 ? revenueTrends : defaultRevenueTrends;
  const serviceData = serviceBreakdown.length > 0 ? serviceBreakdown : defaultServiceBreakdown;
  const restaurantData = topRestaurants.length > 0 ? topRestaurants : defaultTopRestaurants;
  const riderData = riderPerformance.length > 0 ? riderPerformance : defaultRiderPerformance;

  // Calculate metrics
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const avgGrowth = revenueData.reduce((sum, item) => sum + item.growth, 0) / revenueData.length;
  const totalOrders = orderData.reduce((sum, item) => sum + item.orders, 0);
  const deliveryRate = orderData.reduce((sum, item) => sum + item.delivered, 0) / totalOrders * 100;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{(totalRevenue / 1000).toFixed(0)}K</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{avgGrowth.toFixed(1)}% avg growth
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {deliveryRate.toFixed(1)}% delivered
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeUsers || "15.2K"}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +23% this month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Avg Delivery</CardTitle>
              <Truck className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28 min</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              -2 min from last week
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Order Trends</CardTitle>
            <CardDescription>Orders overview for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={orderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
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

        {/* Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue and growth rate</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value: any) => `₱${(value / 1000).toFixed(0)}K`} />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#FF6B35" 
                  strokeWidth={2}
                  name="Revenue (₱)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="growth" 
                  stroke="#004225" 
                  strokeWidth={2}
                  name="Growth (%)"
                />
              </LineChart>
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
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Restaurants</CardTitle>
            <CardDescription>By order volume and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={restaurantData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#FF6B35" name="Orders" />
                <Bar dataKey="revenue" fill="#FFD23F" name="Revenue (₱100)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rider Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Rider Performance</CardTitle>
          <CardDescription>Best performing riders this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riderData.map((rider, index) => (
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
                  <p className="font-bold text-green-600">₱{rider.earnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Earnings</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}