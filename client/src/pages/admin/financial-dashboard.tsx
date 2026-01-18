// BTS Delivery Platform - Comprehensive Financial Analytics Dashboard
// Provides real-time financial insights, revenue analysis, and business intelligence

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { AdminPageWrapper, AdminFinancialSkeleton } from "@/components/admin";
import { useAdminToast } from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Store,
  Truck,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Target,
  Wallet,
  CreditCard,
  Banknote,
  FileText,
  Mail,
  Filter
} from "lucide-react";

// Chart configuration
const revenueChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))"
  },
  orders: {
    label: "Orders",
    color: "hsl(var(--chart-2))"
  },
  previousRevenue: {
    label: "Previous Period",
    color: "hsl(var(--chart-3))"
  }
};

const serviceColors = {
  food: "#3b82f6",
  pabili: "#10b981",
  pabayad: "#f59e0b",
  parcel: "#8b5cf6"
};

const paymentColors = {
  cash: "#22c55e",
  gcash: "#3b82f6",
  maya: "#8b5cf6",
  card: "#f97316",
  wallet: "#06b6d4"
};

interface DateRange {
  from: Date;
  to: Date;
}

export default function FinancialDashboard() {
  const adminToast = useAdminToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [period, setPeriod] = useState("30d");
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [comparePrevious, setComparePrevious] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch revenue dashboard data
  const { data: revenueData, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ["/api/admin/analytics/revenue", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/revenue?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch revenue data");
      return res.json();
    }
  });

  // Fetch chart data
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["/api/admin/analytics/revenue/chart", dateRange, granularity, comparePrevious],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        granularity,
        comparePrevious: comparePrevious.toString()
      });
      const res = await fetch(`/api/admin/analytics/revenue/chart?${params}`);
      if (!res.ok) throw new Error("Failed to fetch chart data");
      return res.json();
    }
  });

  // Fetch order analytics
  const { data: orderAnalytics, isLoading: orderLoading } = useQuery({
    queryKey: ["/api/admin/analytics/orders", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/orders?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch order analytics");
      return res.json();
    }
  });

  // Fetch vendor performance
  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ["/api/admin/analytics/vendors", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/vendors?period=${period}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch vendor data");
      return res.json();
    }
  });

  // Fetch rider performance
  const { data: riderData, isLoading: riderLoading } = useQuery({
    queryKey: ["/api/admin/analytics/riders", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/riders?period=${period}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch rider data");
      return res.json();
    }
  });

  // Fetch profit analysis
  const { data: profitData, isLoading: profitLoading } = useQuery({
    queryKey: ["/api/admin/analytics/profit", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/profit?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch profit data");
      return res.json();
    }
  });

  // Fetch revenue breakdown
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery({
    queryKey: ["/api/admin/analytics/revenue/breakdown", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/revenue/breakdown?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch breakdown data");
      return res.json();
    }
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Handle period change
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const days = parseInt(newPeriod) || 30;
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date()
    });
  };

  // Export report
  const handleExport = async (format: string) => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        format
      });
      window.open(`/api/admin/analytics/export?${params}`, "_blank");
      adminToast.reportExported(format);
    } catch (error) {
      console.error("Export failed:", error);
      adminToast.error("Failed to export report");
    }
  };

  // Prepare chart data for visualization
  const preparedChartData = useMemo(() => {
    if (!chartData?.data?.labels) return [];
    return chartData.data.labels.map((label: string, index: number) => ({
      date: label,
      revenue: chartData.data.datasets[0]?.data[index] || 0,
      orders: chartData.data.datasets[1]?.data[index] || 0,
      previousRevenue: chartData.data.datasets[2]?.data[index] || 0
    }));
  }, [chartData]);

  // Prepare service type pie chart data
  const serviceTypeData = useMemo(() => {
    if (!breakdownData?.data?.byServiceType) return [];
    return Object.entries(breakdownData.data.byServiceType).map(([key, value]: [string, any]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value.revenue,
      orders: value.orders,
      percentage: value.percentage,
      fill: serviceColors[key as keyof typeof serviceColors] || "#6b7280"
    }));
  }, [breakdownData]);

  // Prepare payment method pie chart data
  const paymentMethodData = useMemo(() => {
    if (!breakdownData?.data?.byPaymentMethod) return [];
    return Object.entries(breakdownData.data.byPaymentMethod).map(([key, value]: [string, any]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value.revenue,
      orders: value.orders,
      percentage: value.percentage,
      fill: paymentColors[key as keyof typeof paymentColors] || "#6b7280"
    }));
  }, [breakdownData]);

  // Prepare cost breakdown data for bar chart
  const costBreakdownData = useMemo(() => {
    if (!profitData?.data?.costBreakdown) return [];
    const breakdown = profitData.data.costBreakdown;
    return [
      { name: "Rider Payments", value: breakdown.riderPayments, fill: "#3b82f6" },
      { name: "Vendor Commissions", value: breakdown.vendorCommissions, fill: "#10b981" },
      { name: "Platform Costs", value: breakdown.platformCosts, fill: "#f59e0b" },
      { name: "Tax Liabilities", value: breakdown.taxLiabilities, fill: "#ef4444" },
      { name: "Processing Fees", value: breakdown.processingFees, fill: "#8b5cf6" },
      { name: "Refunds", value: breakdown.refunds, fill: "#6b7280" }
    ];
  }, [profitData]);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="analytics"
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
          title="Financial Analytics"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <AdminPageWrapper
          pageTitle="Financial Analytics"
          pageDescription="Financial analytics and revenue dashboard for BTS Delivery"
          refreshQueryKeys={[
            "/api/admin/analytics/revenue",
            "/api/admin/analytics/orders",
            "/api/admin/analytics/vendors",
            "/api/admin/analytics/riders",
            "/api/admin/analytics/profit",
          ]}
        >
          <main className="p-4 md:p-6">
          {/* Top Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="14d">Last 14 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="365d">Last year</SelectItem>
                </SelectContent>
              </Select>

              <Select value={granularity} onValueChange={(v) => setGranularity(v as any)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Granularity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={comparePrevious ? "default" : "outline"}
                size="sm"
                onClick={() => setComparePrevious(!comparePrevious)}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Compare
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchRevenue()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Revenue */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-8 w-32 bg-white/20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(revenueData?.data?.month?.totalRevenue || 0)}
                    </div>
                    <div className="flex items-center mt-2 text-sm opacity-90">
                      {(revenueData?.data?.month?.growthRate || 0) >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                      )}
                      {formatPercent(revenueData?.data?.month?.growthRate || 0)} vs last period
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Total Orders */}
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-8 w-32 bg-white/20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {(revenueData?.data?.month?.totalOrders || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center mt-2 text-sm opacity-90">
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      {((revenueData?.data?.today?.totalOrders || 0)).toLocaleString()} today
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Average Order Value */}
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Avg Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-8 w-32 bg-white/20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(revenueData?.data?.month?.averageOrderValue || 0)}
                    </div>
                    <div className="flex items-center mt-2 text-sm opacity-90">
                      <Target className="h-4 w-4 mr-1" />
                      Target: {formatCurrency(250)}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Gross Profit */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Gross Profit</CardTitle>
              </CardHeader>
              <CardContent>
                {profitLoading ? (
                  <Skeleton className="h-8 w-32 bg-white/20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(profitData?.data?.grossProfit || 0)}
                    </div>
                    <div className="flex items-center mt-2 text-sm opacity-90">
                      <Activity className="h-4 w-4 mr-1" />
                      {(profitData?.data?.profitMargin || 0).toFixed(1)}% margin
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="riders">Riders</TabsTrigger>
              <TabsTrigger value="profit">Profit</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Revenue Trend Chart */}
                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      Revenue Trend
                    </CardTitle>
                    <CardDescription>
                      Daily revenue and order volume over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : (
                      <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
                        <ComposedChart data={preparedChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => format(new Date(value), "MMM d")}
                            className="text-xs"
                          />
                          <YAxis yAxisId="left" className="text-xs" />
                          <YAxis yAxisId="right" orientation="right" className="text-xs" />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, name) => {
                                  if (name === "revenue" || name === "previousRevenue") {
                                    return [formatCurrency(value as number), name === "revenue" ? "Revenue" : "Previous"];
                                  }
                                  return [value, "Orders"];
                                }}
                              />
                            }
                          />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            stroke="var(--color-revenue)"
                            fill="var(--color-revenue)"
                            fillOpacity={0.2}
                            name="Revenue"
                          />
                          {comparePrevious && (
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="previousRevenue"
                              stroke="var(--color-previousRevenue)"
                              strokeDasharray="5 5"
                              name="Previous Period"
                            />
                          )}
                          <Bar
                            yAxisId="right"
                            dataKey="orders"
                            fill="var(--color-orders)"
                            opacity={0.5}
                            name="Orders"
                          />
                        </ComposedChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Service Type Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-emerald-500" />
                      Revenue by Service
                    </CardTitle>
                    <CardDescription>
                      Distribution across service types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {breakdownLoading ? (
                      <Skeleton className="h-[250px] w-full" />
                    ) : (
                      <div className="flex flex-col md:flex-row items-center gap-4">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={serviceTypeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {serviceTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 min-w-[150px]">
                          {serviceTypeData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.fill }}
                                />
                                <span>{item.name}</span>
                              </div>
                              <span className="font-medium">{item.percentage?.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Method Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-purple-500" />
                      Revenue by Payment
                    </CardTitle>
                    <CardDescription>
                      Distribution by payment method
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {breakdownLoading ? (
                      <Skeleton className="h-[250px] w-full" />
                    ) : (
                      <div className="flex flex-col md:flex-row items-center gap-4">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={paymentMethodData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {paymentMethodData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 min-w-[150px]">
                          {paymentMethodData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.fill }}
                                />
                                <span>{item.name}</span>
                              </div>
                              <span className="font-medium">{item.percentage?.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Completion Rate</p>
                        <p className="text-lg font-semibold">
                          {(orderAnalytics?.data?.orderCompletionRate || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cancellation Rate</p>
                        <p className="text-lg font-semibold">
                          {(orderAnalytics?.data?.cancellationRate || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Delivery Time</p>
                        <p className="text-lg font-semibold">
                          {orderAnalytics?.data?.averageDeliveryTime || 0} min
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Prep Time</p>
                        <p className="text-lg font-semibold">
                          {orderAnalytics?.data?.averagePreparationTime || 0} min
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-4">
              {/* Period Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatCurrency(revenueData?.data?.today?.totalRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(revenueData?.data?.today?.totalOrders || 0).toLocaleString()} orders
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatCurrency(revenueData?.data?.week?.totalRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(revenueData?.data?.week?.totalOrders || 0).toLocaleString()} orders
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatCurrency(revenueData?.data?.month?.totalRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(revenueData?.data?.month?.totalOrders || 0).toLocaleString()} orders
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">This Year</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatCurrency(revenueData?.data?.year?.totalRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(revenueData?.data?.year?.totalOrders || 0).toLocaleString()} orders
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Regional Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Region</CardTitle>
                  <CardDescription>Top performing areas</CardDescription>
                </CardHeader>
                <CardContent>
                  {breakdownLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(breakdownData?.data?.byRegion || {}).map(([region, data]: [string, any]) => (
                        <div key={region} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{region}</span>
                            <span>{formatCurrency(data.revenue)}</span>
                          </div>
                          <Progress value={data.percentage} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{data.orders} orders</span>
                            <span>Top: {data.topServiceType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Peak Hours Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Peak Hours</CardTitle>
                  <CardDescription>Revenue by hour of day</CardDescription>
                </CardHeader>
                <CardContent>
                  {orderLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={orderAnalytics?.data?.peakHours || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(h) => `${h}:00`}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "revenue" ? formatCurrency(value) : value,
                            name === "revenue" ? "Revenue" : "Orders"
                          ]}
                        />
                        <Bar dataKey="revenue" fill="#3b82f6" name="revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vendors Tab */}
            <TabsContent value="vendors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-emerald-500" />
                    Top Vendors by Revenue
                  </CardTitle>
                  <CardDescription>
                    Vendor rankings and commission analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {vendorLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Rank</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">AOV</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorData?.data?.topVendors?.map((vendor: any) => (
                          <TableRow key={vendor.vendorId}>
                            <TableCell>
                              <Badge variant={vendor.rank <= 3 ? "default" : "secondary"}>
                                #{vendor.rank}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vendor.revenue)}</TableCell>
                            <TableCell className="text-right">{vendor.orders.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vendor.averageOrderValue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vendor.commissionPaid)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{vendor.rating.toFixed(1)}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Commission Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Commissions Paid</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(vendorData?.data?.commissionAnalysis?.totalCommissionsPaid || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Average Commission Rate</p>
                      <p className="text-2xl font-bold mt-2">
                        {((vendorData?.data?.commissionAnalysis?.averageCommissionRate || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Active Vendors</p>
                      <p className="text-2xl font-bold mt-2">
                        {vendorData?.data?.topVendors?.length || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Riders Tab */}
            <TabsContent value="riders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-500" />
                    Top Riders by Deliveries
                  </CardTitle>
                  <CardDescription>
                    Rider earnings and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {riderLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Rank</TableHead>
                          <TableHead>Rider</TableHead>
                          <TableHead className="text-right">Earnings</TableHead>
                          <TableHead className="text-right">Deliveries</TableHead>
                          <TableHead className="text-right">Avg/Delivery</TableHead>
                          <TableHead className="text-right">On-Time</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riderData?.data?.topRiders?.map((rider: any) => (
                          <TableRow key={rider.riderId}>
                            <TableCell>
                              <Badge variant={rider.rank <= 3 ? "default" : "secondary"}>
                                #{rider.rank}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{rider.riderName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(rider.earnings)}</TableCell>
                            <TableCell className="text-right">{rider.deliveries.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(rider.averageEarningPerDelivery)}</TableCell>
                            <TableCell className="text-right">{rider.onTimeRate.toFixed(1)}%</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{rider.rating.toFixed(1)}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Efficiency Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Earnings Paid</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(riderData?.data?.earningsAnalysis?.totalEarningsPaid || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Avg Per Delivery</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(riderData?.data?.earningsAnalysis?.averageEarningPerDelivery || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">On-Time Rate</p>
                      <p className="text-2xl font-bold mt-2">
                        {(riderData?.data?.efficiencyMetrics?.onTimeDeliveryRate || 0).toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                      <p className="text-2xl font-bold mt-2">
                        {(riderData?.data?.efficiencyMetrics?.acceptanceRate || 0).toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Profit Tab */}
            <TabsContent value="profit" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">Gross Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(profitData?.data?.grossProfit || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">Operating Costs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(profitData?.data?.operatingCosts || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">Net Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(profitData?.data?.netProfit || 0)}
                    </div>
                    <p className="text-sm opacity-90 mt-1">
                      {(profitData?.data?.profitMargin || 0).toFixed(1)}% margin
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Cost Breakdown Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>Distribution of operating costs</CardDescription>
                </CardHeader>
                <CardContent>
                  {profitLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={costBreakdownData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                        <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {costBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Revenue vs Costs */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Costs</CardTitle>
                  <CardDescription>Profitability breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Revenue</span>
                        <span className="font-medium">
                          {formatCurrency((profitData?.data?.grossProfit || 0) + (profitData?.data?.costBreakdown?.vendorCommissions || 0))}
                        </span>
                      </div>
                      <Progress value={100} className="h-3 bg-blue-100" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Operating Costs</span>
                        <span className="font-medium text-orange-600">
                          -{formatCurrency(profitData?.data?.operatingCosts || 0)}
                        </span>
                      </div>
                      <Progress
                        value={((profitData?.data?.operatingCosts || 0) / ((profitData?.data?.grossProfit || 1) + (profitData?.data?.costBreakdown?.vendorCommissions || 0))) * 100}
                        className="h-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Tax Liabilities</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(profitData?.data?.costBreakdown?.taxLiabilities || 0)}
                        </span>
                      </div>
                      <Progress
                        value={((profitData?.data?.costBreakdown?.taxLiabilities || 0) / ((profitData?.data?.grossProfit || 1) + (profitData?.data?.costBreakdown?.vendorCommissions || 0))) * 100}
                        className="h-3"
                      />
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="font-semibold">Net Profit</span>
                        <span className={`font-bold ${(profitData?.data?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profitData?.data?.netProfit || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </main>
        </AdminPageWrapper>
      </div>
    </div>
  );
}
