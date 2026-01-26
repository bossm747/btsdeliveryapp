import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  Gift,
  Zap,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Star,
  Target,
  Award
} from "lucide-react";
import { useLocation } from "wouter";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { RiderPageWrapper } from "@/components/rider/rider-page-wrapper";
import { RiderEarningsSkeleton } from "@/components/rider/rider-skeletons";
import { NoEarningsEmptyState, NoEarningsForPeriodEmptyState, RiderErrorState } from "@/components/rider/rider-empty-states";
import { useRiderToast } from "@/hooks/use-rider-toast";

// Types
interface EarningsData {
  today: {
    total: number;
    basePay: number;
    tips: number;
    bonuses: number;
    incentives: number;
    deliveries: number;
    hours: number;
  };
  weekly: {
    total: number;
    basePay: number;
    tips: number;
    bonuses: number;
    incentives: number;
    deliveries: number;
    avgPerDelivery: number;
    dailyBreakdown: DailyEarning[];
  };
  monthly: {
    total: number;
    basePay: number;
    tips: number;
    bonuses: number;
    incentives: number;
    deliveries: number;
    avgPerDay: number;
    weeklyBreakdown: WeeklyEarning[];
    comparison: {
      previousMonth: number;
      change: number;
      changePercent: number;
    };
  };
  goals: {
    daily: { target: number; current: number };
    weekly: { target: number; current: number };
  };
}

interface DailyEarning {
  day: string;
  date: string;
  total: number;
  deliveries: number;
}

interface WeeklyEarning {
  week: string;
  total: number;
  deliveries: number;
}

// Chart colors
const CHART_COLORS = {
  primary: '#FF6B35',
  secondary: '#004225',
  success: '#10b981',
  warning: '#f59e0b'
};

// Earnings breakdown card component
const EarningsBreakdownCard = ({
  icon: Icon,
  label,
  amount,
  percentage,
  color
}: {
  icon: React.ElementType;
  label: string;
  amount: number;
  percentage?: number;
  color: string;
}) => (
  <Card className="bg-white">
    <CardContent className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-gray-600">{label}</span>
        </div>
        <div className="text-right">
          <div className="font-semibold text-gray-900">{amount.toFixed(2)}</div>
          {percentage !== undefined && (
            <div className="text-xs text-gray-500">{percentage.toFixed(0)}%</div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Goal progress component
const GoalProgress = ({
  label,
  current,
  target
}: {
  label: string;
  current: number;
  target: number;
}) => {
  const progress = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  const isCompleted = current >= target;

  return (
    <Card className={`${isCompleted ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : 'bg-white'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Target className={`w-4 h-4 ${isCompleted ? 'text-green-600' : 'text-gray-500'}`} />
            <span className="text-sm font-medium">{label}</span>
          </div>
          {isCompleted && (
            <Badge className="bg-green-600 text-white">
              <Award className="w-3 h-3 mr-1" />
              Completed!
            </Badge>
          )}
        </div>
        <div className="flex items-end justify-between mb-2">
          <div className="text-2xl font-bold text-gray-900">{current.toFixed(2)}</div>
          <div className="text-sm text-gray-500">/ {target.toFixed(2)}</div>
        </div>
        <Progress
          value={progress}
          className={`h-2 ${isCompleted ? '[&>div]:bg-green-500' : '[&>div]:bg-[#FF6B35]'}`}
        />
        {!isCompleted && (
          <p className="text-xs text-gray-500 mt-2">
            {remaining.toFixed(2)} more to reach your goal
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default function RiderEarnings() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("today");
  const riderToast = useRiderToast();

  // Fetch earnings data
  const { data: earnings, isLoading, error, refetch } = useQuery<EarningsData>({
    queryKey: ["/api/rider/earnings"],
  });

  // Mock data for development (will be replaced by API)
  const mockEarnings: EarningsData = {
    today: {
      total: 856.50,
      basePay: 600.00,
      tips: 156.50,
      bonuses: 50.00,
      incentives: 50.00,
      deliveries: 12,
      hours: 6.5
    },
    weekly: {
      total: 4850.00,
      basePay: 3500.00,
      tips: 850.00,
      bonuses: 300.00,
      incentives: 200.00,
      deliveries: 72,
      avgPerDelivery: 67.36,
      dailyBreakdown: [
        { day: 'Mon', date: '2024-01-13', total: 650, deliveries: 10 },
        { day: 'Tue', date: '2024-01-14', total: 720, deliveries: 11 },
        { day: 'Wed', date: '2024-01-15', total: 580, deliveries: 9 },
        { day: 'Thu', date: '2024-01-16', total: 890, deliveries: 13 },
        { day: 'Fri', date: '2024-01-17', total: 1150, deliveries: 17 },
        { day: 'Sat', date: '2024-01-18', total: 860, deliveries: 12 },
        { day: 'Sun', date: '2024-01-19', total: 0, deliveries: 0 }
      ]
    },
    monthly: {
      total: 18500.00,
      basePay: 13500.00,
      tips: 3200.00,
      bonuses: 1200.00,
      incentives: 600.00,
      deliveries: 285,
      avgPerDay: 616.67,
      weeklyBreakdown: [
        { week: 'Week 1', total: 4200, deliveries: 68 },
        { week: 'Week 2', total: 4850, deliveries: 72 },
        { week: 'Week 3', total: 5100, deliveries: 78 },
        { week: 'Week 4', total: 4350, deliveries: 67 }
      ],
      comparison: {
        previousMonth: 16800.00,
        change: 1700.00,
        changePercent: 10.12
      }
    },
    goals: {
      daily: { target: 1000, current: 856.50 },
      weekly: { target: 5000, current: 4850 }
    }
  };

  const earningsData = earnings || mockEarnings;

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  // Loading state
  if (isLoading) {
    return (
      <RiderPageWrapper
        pageTitle="My Earnings"
        pageDescription="Track your delivery income"
        refreshQueryKeys={["/api/rider/earnings"]}
      >
        <div className="min-h-screen bg-gray-50 px-4 py-4">
          <RiderEarningsSkeleton />
        </div>
      </RiderPageWrapper>
    );
  }

  // Error state
  if (error) {
    return (
      <RiderPageWrapper
        pageTitle="My Earnings"
        pageDescription="Track your delivery income"
        refreshQueryKeys={["/api/rider/earnings"]}
      >
        <div className="min-h-screen bg-gray-50 px-4 py-4">
          <RiderErrorState
            title="Hindi Na-load ang Earnings"
            description="May problema sa pag-load ng iyong earnings. Subukan ulit, pre."
            onRetry={() => refetch()}
          />
        </div>
      </RiderPageWrapper>
    );
  }

  // Check if no earnings data at all
  const hasNoEarnings = !earningsData.today.deliveries && 
                        !earningsData.weekly.deliveries && 
                        !earningsData.monthly.deliveries;

  return (
    <RiderPageWrapper
      pageTitle="My Earnings"
      pageDescription="Track your delivery income"
      refreshQueryKeys={["/api/rider/earnings"]}
    >
    <div className="min-h-screen bg-gray-50" data-testid="rider-earnings-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/rider-dashboard")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-[#004225]">My Earnings</h1>
              <p className="text-xs text-gray-600">Track your income</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-xs">
            <Calendar className="w-4 h-4 mr-1" />
            History
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-20 space-y-4">
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-gray-100">
            <TabsTrigger value="today" className="text-sm">Today</TabsTrigger>
            <TabsTrigger value="weekly" className="text-sm">This Week</TabsTrigger>
            <TabsTrigger value="monthly" className="text-sm">This Month</TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-4 mt-4">
            {/* Total Earnings Card */}
            <Card className="bg-gradient-to-br from-[#004225] to-green-700 text-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-100 text-sm">Today's Earnings</span>
                  <Badge className="bg-white/20 text-white border-0">
                    <Clock className="w-3 h-3 mr-1" />
                    {earningsData.today.hours}h worked
                  </Badge>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {earningsData.today.total.toFixed(2)}
                </div>
                <div className="flex items-center text-green-100 text-sm">
                  <Package className="w-4 h-4 mr-1" />
                  {earningsData.today.deliveries} deliveries completed
                </div>
              </CardContent>
            </Card>

            {/* Goal Progress */}
            <GoalProgress
              label="Daily Goal"
              current={earningsData.goals.daily.current}
              target={earningsData.goals.daily.target}
            />

            {/* Earnings Breakdown */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                <EarningsBreakdownCard
                  icon={DollarSign}
                  label="Base Pay"
                  amount={earningsData.today.basePay}
                  percentage={calculatePercentage(earningsData.today.basePay, earningsData.today.total)}
                  color="bg-blue-500"
                />
                <EarningsBreakdownCard
                  icon={Star}
                  label="Tips"
                  amount={earningsData.today.tips}
                  percentage={calculatePercentage(earningsData.today.tips, earningsData.today.total)}
                  color="bg-yellow-500"
                />
                <EarningsBreakdownCard
                  icon={Gift}
                  label="Bonuses"
                  amount={earningsData.today.bonuses}
                  percentage={calculatePercentage(earningsData.today.bonuses, earningsData.today.total)}
                  color="bg-purple-500"
                />
                <EarningsBreakdownCard
                  icon={Zap}
                  label="Incentives"
                  amount={earningsData.today.incentives}
                  percentage={calculatePercentage(earningsData.today.incentives, earningsData.today.total)}
                  color="bg-orange-500"
                />
              </div>
            </div>

            {/* Average per delivery */}
            <Card className="bg-gradient-to-r from-orange-50 to-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. per delivery</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {earningsData.today.deliveries > 0
                        ? (earningsData.today.total / earningsData.today.deliveries).toFixed(2)
                        : '0.00'
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Tab */}
          <TabsContent value="weekly" className="space-y-4 mt-4">
            {/* Total Earnings Card */}
            <Card className="bg-gradient-to-br from-[#FF6B35] to-orange-600 text-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-orange-100 text-sm">This Week's Earnings</span>
                  <Badge className="bg-white/20 text-white border-0">
                    <Package className="w-3 h-3 mr-1" />
                    {earningsData.weekly.deliveries} deliveries
                  </Badge>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {earningsData.weekly.total.toFixed(2)}
                </div>
                <div className="flex items-center text-orange-100 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Avg. {earningsData.weekly.avgPerDelivery.toFixed(2)} per delivery
                </div>
              </CardContent>
            </Card>

            {/* Goal Progress */}
            <GoalProgress
              label="Weekly Goal"
              current={earningsData.goals.weekly.current}
              target={earningsData.goals.weekly.target}
            />

            {/* Daily Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={earningsData.weekly.dailyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="day"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)}`, 'Earnings']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill={CHART_COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Earnings Breakdown */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                <EarningsBreakdownCard
                  icon={DollarSign}
                  label="Base Pay"
                  amount={earningsData.weekly.basePay}
                  percentage={calculatePercentage(earningsData.weekly.basePay, earningsData.weekly.total)}
                  color="bg-blue-500"
                />
                <EarningsBreakdownCard
                  icon={Star}
                  label="Tips"
                  amount={earningsData.weekly.tips}
                  percentage={calculatePercentage(earningsData.weekly.tips, earningsData.weekly.total)}
                  color="bg-yellow-500"
                />
                <EarningsBreakdownCard
                  icon={Gift}
                  label="Bonuses"
                  amount={earningsData.weekly.bonuses}
                  percentage={calculatePercentage(earningsData.weekly.bonuses, earningsData.weekly.total)}
                  color="bg-purple-500"
                />
                <EarningsBreakdownCard
                  icon={Zap}
                  label="Incentives"
                  amount={earningsData.weekly.incentives}
                  percentage={calculatePercentage(earningsData.weekly.incentives, earningsData.weekly.total)}
                  color="bg-orange-500"
                />
              </div>
            </div>

            {/* Daily breakdown list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {earningsData.weekly.dailyBreakdown.map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{day.day}</p>
                      <p className="text-xs text-gray-500">{day.deliveries} deliveries</p>
                    </div>
                    <div className="font-semibold text-gray-900">
                      {day.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-4 mt-4">
            {/* Total Earnings Card */}
            <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-100 text-sm">This Month's Earnings</span>
                  <Badge className="bg-white/20 text-white border-0">
                    <Package className="w-3 h-3 mr-1" />
                    {earningsData.monthly.deliveries} deliveries
                  </Badge>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {earningsData.monthly.total.toFixed(2)}
                </div>
                <div className="flex items-center text-purple-100 text-sm">
                  {earningsData.monthly.comparison.change >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span className="text-green-300">
                        +{earningsData.monthly.comparison.changePercent.toFixed(1)}%
                      </span>
                      <span className="ml-1">vs last month</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 mr-1" />
                      <span className="text-red-300">
                        {earningsData.monthly.comparison.changePercent.toFixed(1)}%
                      </span>
                      <span className="ml-1">vs last month</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly comparison */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-blue-600 mb-1">Avg per Day</p>
                  <p className="text-xl font-bold text-blue-800">
                    {earningsData.monthly.avgPerDay.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-green-600 mb-1">Avg per Delivery</p>
                  <p className="text-xl font-bold text-green-800">
                    {(earningsData.monthly.total / earningsData.monthly.deliveries).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={earningsData.monthly.weeklyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="week"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)}`, 'Earnings']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={CHART_COLORS.secondary}
                      fill={CHART_COLORS.secondary}
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Earnings Breakdown */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                <EarningsBreakdownCard
                  icon={DollarSign}
                  label="Base Pay"
                  amount={earningsData.monthly.basePay}
                  percentage={calculatePercentage(earningsData.monthly.basePay, earningsData.monthly.total)}
                  color="bg-blue-500"
                />
                <EarningsBreakdownCard
                  icon={Star}
                  label="Tips"
                  amount={earningsData.monthly.tips}
                  percentage={calculatePercentage(earningsData.monthly.tips, earningsData.monthly.total)}
                  color="bg-yellow-500"
                />
                <EarningsBreakdownCard
                  icon={Gift}
                  label="Bonuses"
                  amount={earningsData.monthly.bonuses}
                  percentage={calculatePercentage(earningsData.monthly.bonuses, earningsData.monthly.total)}
                  color="bg-purple-500"
                />
                <EarningsBreakdownCard
                  icon={Zap}
                  label="Incentives"
                  amount={earningsData.monthly.incentives}
                  percentage={calculatePercentage(earningsData.monthly.incentives, earningsData.monthly.total)}
                  color="bg-orange-500"
                />
              </div>
            </div>

            {/* Weekly breakdown list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {earningsData.monthly.weeklyBreakdown.map((week, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{week.week}</p>
                      <p className="text-xs text-gray-500">{week.deliveries} deliveries</p>
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-900 mr-2">
                        {week.total.toFixed(2)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
