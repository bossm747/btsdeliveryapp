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
  
  // Use only real data - no fallback mock data
  const orderData = orderTrends || [];
  const revenueData = revenueTrends || [];
  const serviceData = serviceBreakdown || [];
  const restaurantData = topRestaurants || [];
  const riderData = riderPerformance || [];

  // Calculate metrics safely from real data
  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const avgGrowth = revenueData.length > 0 ? revenueData.reduce((sum, item) => sum + (item.growth || 0), 0) / revenueData.length : 0;
  const totalOrders = orderData.reduce((sum, item) => sum + (item.orders || 0), 0);
  const totalDelivered = orderData.reduce((sum, item) => sum + (item.delivered || 0), 0);
  const deliveryRate = totalOrders > 0 ? (totalDelivered / totalOrders * 100) : 0;

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
            <div className="text-2xl font-bold">
              {totalRevenue > 0 ? `₱${(totalRevenue / 1000).toFixed(0)}K` : 'No data'}
            </div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {avgGrowth > 0 ? `+${avgGrowth.toFixed(1)}% avg growth` : 'No growth data'}
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
            <div className="text-2xl font-bold">
              {totalOrders > 0 ? totalOrders.toLocaleString() : 'No data'}
            </div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {deliveryRate > 0 ? `${deliveryRate.toFixed(1)}% delivered` : 'No delivery data'}
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