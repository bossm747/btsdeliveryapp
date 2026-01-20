import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Activity,
  BarChart3,
  CheckCircle,
  Calendar,
  Download,
  CalendarRange,
  TrendingDown,
  FileText,
  Sparkles,
  Loader2,
  Brain
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
  Cell
} from "recharts";
import type { Restaurant, VendorEarnings } from "@shared/schema";

// Chart colors for consistent theming
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function VendorEarnings() {
  const { toast } = useToast();
  
  // State for date filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [viewPeriod, setViewPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch earnings summary
  const { data: earningsSummary, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/vendor/earnings/summary"],
    enabled: !!restaurant,
  });

  // Fetch detailed earnings data for charts
  const { data: earningsData = [], isLoading: detailsLoading } = useQuery<VendorEarnings[]>({
    queryKey: ["/api/vendor/earnings", dateRange.startDate, dateRange.endDate],
    enabled: !!restaurant,
  });

  // Process data for charts
  const processChartData = () => {
    if (!earningsData.length) return [];
    
    // Group earnings by date for trend analysis
    const groupedData = earningsData.reduce((acc: any, item: any) => {
      const date = new Date(item.recordDate || item.createdAt).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = {
          date,
          grossAmount: 0,
          commissionAmount: 0,
          netAmount: 0,
          transactions: 0
        };
      }
      acc[date].grossAmount += parseFloat(item.grossAmount);
      acc[date].commissionAmount += parseFloat(item.commissionAmount || '0');
      acc[date].netAmount += parseFloat(item.netAmount);
      acc[date].transactions += 1;
      return acc;
    }, {});

    return Object.values(groupedData).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const chartData = processChartData();

  // Fetch settlements/payouts data
  const { data: settlements = [] } = useQuery<any[]>({
    queryKey: ["/api/vendor/settlements"],
    enabled: !!restaurant,
  });

  // Calculate growth metrics from earnings data
  const calculateGrowth = () => {
    if (earningsData.length === 0) {
      return { grossGrowth: 0, commissionGrowth: 0, netGrowth: 0, transactionGrowth: 0 };
    }

    const now = new Date();
    const halfwayPoint = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const totalDays = Math.ceil((endDate.getTime() - halfwayPoint.getTime()) / (1000 * 60 * 60 * 24));
    halfwayPoint.setDate(halfwayPoint.getDate() + Math.floor(totalDays / 2));

    const firstHalf = earningsData.filter((item: any) => {
      const date = new Date(item.recordDate || item.createdAt);
      return date < halfwayPoint;
    });
    const secondHalf = earningsData.filter((item: any) => {
      const date = new Date(item.recordDate || item.createdAt);
      return date >= halfwayPoint;
    });

    const firstHalfGross = firstHalf.reduce((sum: number, item: any) => sum + parseFloat(item.grossAmount || '0'), 0);
    const secondHalfGross = secondHalf.reduce((sum: number, item: any) => sum + parseFloat(item.grossAmount || '0'), 0);
    const firstHalfCommission = firstHalf.reduce((sum: number, item: any) => sum + parseFloat(item.commissionAmount || '0'), 0);
    const secondHalfCommission = secondHalf.reduce((sum: number, item: any) => sum + parseFloat(item.commissionAmount || '0'), 0);
    const firstHalfNet = firstHalf.reduce((sum: number, item: any) => sum + parseFloat(item.netAmount || '0'), 0);
    const secondHalfNet = secondHalf.reduce((sum: number, item: any) => sum + parseFloat(item.netAmount || '0'), 0);

    const calcGrowth = (first: number, second: number) => {
      if (first === 0) return second > 0 ? 100 : 0;
      return Math.round(((second - first) / first) * 100 * 10) / 10;
    };

    return {
      grossGrowth: calcGrowth(firstHalfGross, secondHalfGross),
      commissionGrowth: calcGrowth(firstHalfCommission, secondHalfCommission),
      netGrowth: calcGrowth(firstHalfNet, secondHalfNet),
      transactionGrowth: calcGrowth(firstHalf.length, secondHalf.length)
    };
  };

  const growth = calculateGrowth();

  // AI Sales Analysis Mutation
  const analyzeSalesMutation = useMutation({
    mutationFn: async (period: string) => {
      const response = await apiRequest('POST', '/api/ai/analyze-sales', { period });
      return response;
    },
    onSuccess: (data: any) => {
      setAiInsights(data);
      toast({ title: 'AI Analysis Complete', description: 'Sales insights have been generated!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to generate AI insights', variant: 'destructive' });
    }
  });

  // Export earnings data as CSV
  const exportEarningsData = () => {
    if (!earningsData.length) return;
    
    const csvData = [
      ['Date', 'Gross Amount', 'Commission', 'Net Amount', 'Commission Rate'],
      ...earningsData.map((item: any) => [
        new Date(item.recordDate || item.createdAt).toLocaleDateString(),
        parseFloat(item.grossAmount).toFixed(2),
        parseFloat(item.commissionAmount || '0').toFixed(2),
        parseFloat(item.netAmount).toFixed(2),
        parseFloat(item.commissionRate || '0').toFixed(2) + '%'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `earnings-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (earningsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-earnings-page">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range Filters */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="start-date" className="text-sm whitespace-nowrap">From:</Label>
            <Input
              id="start-date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-40"
              data-testid="input-start-date"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="end-date" className="text-sm whitespace-nowrap">To:</Label>
            <Input
              id="end-date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-40"
              data-testid="input-end-date"
            />
          </div>

          {/* Quick Date Buttons */}
          <div className="flex space-x-1">
            {[
              { label: '7D', days: 7 },
              { label: '30D', days: 30 },
              { label: '90D', days: 90 }
            ].map(({ label, days }) => (
              <Button
                key={label}
                size="sm"
                variant={viewPeriod === (days === 7 ? 'week' : days === 30 ? 'month' : 'quarter') ? 'default' : 'outline'}
                onClick={() => {
                  const endDate = new Date().toISOString().split('T')[0];
                  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  setDateRange({ startDate, endDate });
                  setViewPeriod(days === 7 ? 'week' : days === 30 ? 'month' : 'quarter');
                }}
                data-testid={`button-period-${label.toLowerCase()}`}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Export and Actions */}
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => analyzeSalesMutation.mutate(viewPeriod)}
              disabled={!earningsData.length || analyzeSalesMutation.isPending}
              data-testid="button-ai-insights"
            >
              {analyzeSalesMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              {analyzeSalesMutation.isPending ? 'Analyzing...' : 'AI Insights'}
            </Button>
            <Button 
              variant="outline" 
              onClick={exportEarningsData}
              disabled={!earningsData.length}
              data-testid="button-export-earnings"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" data-testid="button-detailed-report">
              <FileText className="mr-2 h-4 w-4" />
              Full Report
            </Button>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      {aiInsights && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950" data-testid="card-ai-insights">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Sales Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Key Insights</h4>
                <p className="text-gray-700 dark:text-gray-300">{aiInsights.insights}</p>
              </div>
              
              {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {aiInsights.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Trends</h4>
                <p className="text-gray-700 dark:text-gray-300">{aiInsights.trends}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Overview */}
      {earningsSummary && typeof earningsSummary === 'object' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden" data-testid="card-gross-earnings">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Gross Earnings</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ₱{(earningsSummary as any).total_gross?.toFixed(2) || '0.00'}
                  </p>
                  <div className="flex items-center mt-2">
                    {growth.grossGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${growth.grossGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {growth.grossGrowth >= 0 ? '+' : ''}{growth.grossGrowth}% this period
                    </span>
                  </div>
                </div>
                <div className="bg-green-500/10 p-3 rounded-xl">
                  <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden" data-testid="card-platform-commission">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Platform Commission</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ₱{(earningsSummary as any).total_commission?.toFixed(2) || '0.00'}
                  </p>
                  <div className="flex items-center mt-2">
                    {growth.commissionGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                    )}
                    <span className={`text-sm ${growth.commissionGrowth >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {growth.commissionGrowth >= 0 ? '+' : ''}{growth.commissionGrowth}% this period
                    </span>
                  </div>
                </div>
                <div className="bg-red-500/10 p-3 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden" data-testid="card-net-earnings">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Net Earnings</p>
                  <p className="text-3xl font-bold text-primary">
                    ₱{(earningsSummary as any).total_net?.toFixed(2) || '0.00'}
                  </p>
                  <div className="flex items-center mt-2">
                    {growth.netGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${growth.netGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {growth.netGrowth >= 0 ? '+' : ''}{growth.netGrowth}% this period
                    </span>
                  </div>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden" data-testid="card-total-transactions">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Transactions</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {(earningsSummary as any).total_transactions || 0}
                  </p>
                  <div className="flex items-center mt-2">
                    {growth.transactionGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${growth.transactionGrowth >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                      {growth.transactionGrowth >= 0 ? '+' : ''}{growth.transactionGrowth}% this period
                    </span>
                  </div>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl">
                  <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payout Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payout Schedule</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Pending Payout</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current balance</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    ₱{((earningsSummary as any)?.total_net || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(() => {
                      const nextFriday = new Date();
                      nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));
                      return `Next: ${nextFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Total Transactions</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This period</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {(earningsSummary as any)?.total_transactions || 0}
                  </p>
                  <p className="text-xs text-gray-500">orders</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Settlements</h3>
            <div className="space-y-3">
              {settlements.length > 0 ? (
                settlements.slice(0, 4).map((settlement: any, index: number) => (
                  <div key={settlement.id || index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(settlement.settledAt || settlement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className={`text-sm ${settlement.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {settlement.status === 'completed' ? 'Completed' : 'Pending'}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ₱{parseFloat(settlement.netAmount || settlement.amount || '0').toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No settlements yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Analytics Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
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
                    tickFormatter={(value) => `₱${value}`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `₱${parseFloat(value).toFixed(2)}`, 
                      name === 'grossAmount' ? 'Gross' : 
                      name === 'commissionAmount' ? 'Commission' : 'Net'
                    ]}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="netAmount" 
                    stackId="1"
                    stroke={CHART_COLORS[0]} 
                    fill={CHART_COLORS[0]}
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="commissionAmount" 
                    stackId="1"
                    stroke={CHART_COLORS[3]} 
                    fill={CHART_COLORS[3]}
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No earnings data for selected period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Transaction Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Daily Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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
                    formatter={(value: any) => [value, 'Transactions']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="transactions" 
                    fill={CHART_COLORS[1]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transaction data for selected period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
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
                      tickFormatter={(value) => `₱${value}`}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `₱${parseFloat(value).toFixed(2)}`, 
                        name === 'grossAmount' ? 'Gross Revenue' : 
                        name === 'commissionAmount' ? 'Platform Fee' : 'Net Earnings'
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="grossAmount" 
                      stroke={CHART_COLORS[1]} 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="commissionAmount" 
                      stroke={CHART_COLORS[3]} 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netAmount" 
                      stroke={CHART_COLORS[0]} 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Average Daily Revenue</span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    ₱{chartData.length > 0 ? 
                      (chartData.reduce((sum: number, item: any) => sum + item.grossAmount, 0) / chartData.length).toFixed(2) : 
                      '0.00'
                    }
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Average Commission</span>
                    <TrendingDown className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    ₱{chartData.length > 0 ? 
                      (chartData.reduce((sum: number, item: any) => sum + item.commissionAmount, 0) / chartData.length).toFixed(2) : 
                      '0.00'
                    }
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Transactions</span>
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {chartData.reduce((sum: number, item: any) => sum + item.transactions, 0)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No revenue data for selected period</p>
                <p className="text-sm text-gray-400 mt-1">Start receiving orders to see detailed analytics</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}