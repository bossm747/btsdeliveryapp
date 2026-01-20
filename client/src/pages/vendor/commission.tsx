import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Download,
  Info,
  CheckCircle,
  Clock,
  CreditCard,
  Wallet,
  ArrowRight,
  Building,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { format } from "date-fns";
import type { Restaurant, VendorSettlement, VendorEarnings } from "@shared/schema";

// Chart colors
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Types for commission data
interface CommissionStructure {
  baseRate: number;
  tierName: string;
  nextTierRate: number;
  nextTierThreshold: number;
  currentVolume: number;
  orderTypes: {
    type: string;
    rate: number;
    description: string;
  }[];
}

interface PayoutSchedule {
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  nextPayoutDate: string;
  minimumPayout: number;
  paymentMethod: string;
  accountInfo: string;
}

interface EarningsSummary {
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  pendingPayout: number;
  lastPayoutAmount: number;
  lastPayoutDate: string;
}

// Mock data generators
const generateMockCommissionStructure = (): CommissionStructure => ({
  baseRate: 15,
  tierName: 'Silver Partner',
  nextTierRate: 12,
  nextTierThreshold: 500000,
  currentVolume: 345000,
  orderTypes: [
    { type: 'Delivery', rate: 15, description: 'Standard delivery orders' },
    { type: 'Pickup', rate: 10, description: 'Customer pickup orders' },
    { type: 'Dine-in', rate: 8, description: 'In-restaurant dining' },
    { type: 'Scheduled', rate: 12, description: 'Pre-scheduled orders' },
  ]
});

const generateMockPayoutSchedule = (): PayoutSchedule => ({
  frequency: 'weekly',
  nextPayoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  minimumPayout: 500,
  paymentMethod: 'Bank Transfer',
  accountInfo: 'BDO - ****4589'
});

const generateMockEarningsSummary = (): EarningsSummary => ({
  totalGross: 456780,
  totalCommission: 68517,
  totalNet: 388263,
  pendingPayout: 12450,
  lastPayoutAmount: 24680,
  lastPayoutDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
});

const generateMockSettlements = (): VendorSettlement[] => {
  const settlements = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    const grossAmount = Math.floor(Math.random() * 50000) + 20000;
    const commissionRate = 0.15;
    const commissionAmount = grossAmount * commissionRate;

    settlements.push({
      id: `settlement-${i}`,
      vendorId: 'vendor-1',
      restaurantId: 'restaurant-1',
      settlementNumber: `STL-${2024}-${String(i + 1).padStart(4, '0')}`,
      periodStart: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000),
      periodEnd: date,
      settlementType: 'weekly',
      totalOrders: Math.floor(Math.random() * 100) + 50,
      completedOrders: Math.floor(Math.random() * 90) + 45,
      cancelledOrders: Math.floor(Math.random() * 10),
      refundedOrders: Math.floor(Math.random() * 5),
      grossAmount: grossAmount.toString(),
      commissionAmount: commissionAmount.toString(),
      commissionRate: commissionRate.toString(),
      serviceFees: (grossAmount * 0.02).toString(),
      adjustments: '0',
      taxAmount: (commissionAmount * 0.12).toString(),
      netAmount: (grossAmount - commissionAmount).toString(),
      status: i === 0 ? 'pending' : i === 1 ? 'processing' : 'paid',
      approvedBy: null,
      approvedAt: null,
      processedAt: i > 1 ? new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
      payoutId: i > 1 ? `payout-${i}` : null,
      notes: null,
      metadata: null,
      createdAt: date,
      updatedAt: date
    } as VendorSettlement);
  }
  return settlements;
};

const generateMockMonthlyCommission = () => {
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const gross = Math.floor(Math.random() * 100000) + 50000;
    return {
      month: format(date, 'MMM'),
      gross,
      commission: gross * 0.15,
      net: gross * 0.85
    };
  });
};

export default function VendorCommission() {
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  // Fetch vendor's restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch settlements from API
  const { data: settlements = [], isLoading: settlementsLoading } = useQuery<VendorSettlement[]>({
    queryKey: ["/api/vendor/settlements"],
    enabled: !!restaurant,
  });

  // Fetch earnings summary from API
  const { data: earningsSummary, isLoading: earningsLoading } = useQuery<EarningsSummary>({
    queryKey: ["/api/vendor/earnings/full-summary"],
    enabled: !!restaurant,
  });

  // Commission structure - uses API data or falls back to defaults based on restaurant tier
  const commissionStructure: CommissionStructure = {
    baseRate: parseFloat((restaurant as any)?.commissionRate || '15'),
    tierName: (restaurant as any)?.partnerTier || 'Standard Partner',
    nextTierRate: 12,
    nextTierThreshold: 500000,
    currentVolume: settlements.reduce((sum, s) => sum + parseFloat(s.grossAmount || '0'), 0),
    orderTypes: [
      { type: 'Delivery', rate: parseFloat((restaurant as any)?.commissionRate || '15'), description: 'Standard delivery orders' },
      { type: 'Pickup', rate: 10, description: 'Customer pickup orders' },
      { type: 'Dine-in', rate: 8, description: 'In-restaurant dining' },
      { type: 'Scheduled', rate: 12, description: 'Pre-scheduled orders' },
    ]
  };

  // Payout schedule based on restaurant settings
  const payoutSchedule: PayoutSchedule = {
    frequency: (restaurant as any)?.payoutFrequency || 'weekly',
    nextPayoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    minimumPayout: 500,
    paymentMethod: (restaurant as any)?.paymentMethod || 'Bank Transfer',
    accountInfo: (restaurant as any)?.bankAccount ? `****${(restaurant as any).bankAccount.slice(-4)}` : 'Not configured'
  };

  // Calculate monthly data from settlements
  const monthlyData = settlements.length > 0
    ? settlements.reduce((acc: { month: string; gross: number; commission: number; net: number }[], settlement) => {
        const month = format(new Date(settlement.periodEnd || new Date()), 'MMM');
        const existing = acc.find(d => d.month === month);
        const gross = parseFloat(settlement.grossAmount || '0');
        const commission = parseFloat(settlement.commissionAmount || '0');
        const net = parseFloat(settlement.netAmount || '0');

        if (existing) {
          existing.gross += gross;
          existing.commission += commission;
          existing.net += net;
        } else {
          acc.push({ month, gross, commission, net });
        }
        return acc;
      }, []).slice(-6)
    : generateMockMonthlyCommission(); // Fallback to mock for empty data

  const isLoading = restaurantLoading || settlementsLoading || earningsLoading;

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
        <Skeleton className="h-96" />
      </div>
    );
  }

  const summary = earningsSummary || generateMockEarningsSummary();

  // Filter settlements based on selected period
  const filteredSettlements = settlements.filter(s => {
    if (selectedPeriod === 'all') return true;
    const days = selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return new Date(s.periodEnd!) >= cutoff;
  });

  // Calculate progress to next tier
  const progressToNextTier = (commissionStructure.currentVolume / commissionStructure.nextTierThreshold) * 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><Clock className="h-3 w-3 mr-1" /> Processing</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6" data-testid="vendor-commission-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commission & Settlements</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View your commission structure and settlement history
          </p>
        </div>
        <Button variant="outline" data-testid="button-download-statement">
          <Download className="mr-2 h-4 w-4" />
          Download Statement
        </Button>
      </div>

      {/* Commission Structure Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Your Commission Structure
              </CardTitle>
              <CardDescription>Current tier and rates applied to your sales</CardDescription>
            </div>
            <Badge className="text-lg px-4 py-1" data-testid="badge-tier">
              {commissionStructure.tierName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Rate Display */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-primary/5 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Base Commission Rate</p>
              <p className="text-5xl font-bold text-primary">{commissionStructure.baseRate}%</p>
              <p className="text-sm text-gray-500 mt-2">of gross order value</p>
            </div>

            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Progress to Gold Partner ({commissionStructure.nextTierRate}%)</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ₱{commissionStructure.currentVolume.toLocaleString()} / ₱{commissionStructure.nextTierThreshold.toLocaleString()}
                </span>
              </div>
              <Progress value={progressToNextTier} className="h-3" />
              <p className="text-sm text-gray-500">
                ₱{(commissionStructure.nextTierThreshold - commissionStructure.currentVolume).toLocaleString()} more in sales to unlock lower rates
              </p>
            </div>
          </div>

          <Separator />

          {/* Commission by Order Type */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Commission by Order Type</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {commissionStructure.orderTypes.map((type) => (
                <div
                  key={type.type}
                  className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg"
                  data-testid={`commission-type-${type.type.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{type.type}</span>
                    <Badge variant="outline" className="text-lg font-bold">
                      {type.rate}%
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Commission rates are applied to the gross order value before delivery fees and taxes.
              Reach higher sales tiers to unlock lower commission rates.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-gross-sales">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Gross Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₱{summary.totalGross.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-commission">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total Commission</p>
                <p className="text-2xl font-bold text-red-600">
                  -₱{summary.totalCommission.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-500/10 p-3 rounded-xl">
                <Percent className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-net-earnings">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Net Earnings</p>
                <p className="text-2xl font-bold text-primary">
                  ₱{summary.totalNet.toLocaleString()}
                </p>
              </div>
              <div className="bg-primary/10 p-3 rounded-xl">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-payout">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Pending Payout</p>
                <p className="text-2xl font-bold text-yellow-600">
                  ₱{summary.pendingPayout.toLocaleString()}
                </p>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-xl">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Commission Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Commission Summary
          </CardTitle>
          <CardDescription>Your gross sales and commission over the past 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `₱${value.toLocaleString()}`,
                  name === 'gross' ? 'Gross Sales' : name === 'commission' ? 'Commission' : 'Net Earnings'
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="gross" name="Gross Sales" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="commission" name="Commission" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payout Schedule & Settlement History */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Payout Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payout Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 mb-1">Next Payout</p>
              <p className="text-2xl font-bold text-green-600">
                {format(new Date(payoutSchedule.nextPayoutDate), 'PPP')}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Frequency</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {payoutSchedule.frequency}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Minimum Payout</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ₱{payoutSchedule.minimumPayout}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {payoutSchedule.paymentMethod}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Account</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {payoutSchedule.accountInfo}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Last Payout</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {format(new Date(summary.lastPayoutDate), 'PP')}
                </p>
              </div>
              <p className="text-lg font-bold text-green-600">
                ₱{summary.lastPayoutAmount.toLocaleString()}
              </p>
            </div>

            <Button variant="outline" className="w-full">
              <Building className="mr-2 h-4 w-4" />
              Update Payment Details
            </Button>
          </CardContent>
        </Card>

        {/* Settlement History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Settlement History
                </CardTitle>
                <CardDescription>View your past and pending settlements</CardDescription>
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Settlement #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettlements.slice(0, 8).map((settlement) => (
                    <TableRow key={settlement.id} data-testid={`settlement-${settlement.id}`}>
                      <TableCell className="font-medium">
                        {settlement.settlementNumber}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(settlement.periodStart!), 'MMM d')} - {format(new Date(settlement.periodEnd!), 'MMM d')}
                      </TableCell>
                      <TableCell className="text-right">
                        ₱{parseFloat(settlement.grossAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -₱{parseFloat(settlement.commissionAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₱{parseFloat(settlement.netAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(settlement.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredSettlements.length > 8 && (
              <div className="mt-4 text-center">
                <Button variant="outline">
                  View All Settlements
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Commission FAQ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">When do I get paid?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Payouts are processed based on your payout schedule (daily, weekly, bi-weekly, or monthly).
                  The minimum payout threshold must be met before a transfer is initiated.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">How is commission calculated?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Commission is calculated as a percentage of the gross order value before delivery fees and taxes.
                  Different order types may have different commission rates.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">How do I lower my commission rate?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Reach higher sales volume tiers to unlock lower commission rates. Check your progress
                  to the next tier in the commission structure section above.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">What about refunds and cancellations?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Commission on refunded or cancelled orders is credited back to your account in the next
                  settlement period. You can see adjustments in your settlement details.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
