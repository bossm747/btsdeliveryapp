import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  TrendingUp, 
  Activity,
  BarChart3,
  CheckCircle,
  Calendar
} from "lucide-react";
import type { Restaurant } from "@shared/schema";

export default function VendorEarnings() {
  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch earnings summary
  const { data: earningsSummary, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/vendor/earnings/summary"],
    enabled: !!restaurant,
  });

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline" data-testid="button-export-earnings">
            <Calendar className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button variant="outline" data-testid="button-view-detailed-earnings">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
      </div>

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
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 dark:text-green-400">+20.1% from last month</span>
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
                    <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-sm text-red-600 dark:text-red-400">-4% from last month</span>
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
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 dark:text-green-400">+12% from last month</span>
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
                    <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">+8% from last month</span>
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
                  <p className="font-medium text-gray-900 dark:text-white">Weekly Payout</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Every Friday</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">₱2,450.00</p>
                  <p className="text-xs text-gray-500">Next: Dec 29</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Monthly Bonus</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">End of month</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">₱1,200.00</p>
                  <p className="text-xs text-gray-500">Next: Dec 31</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Payouts</h3>
            <div className="space-y-3">
              {[
                { date: 'Dec 22, 2024', amount: 2450.00, status: 'Completed' },
                { date: 'Dec 15, 2024', amount: 2180.50, status: 'Completed' },
                { date: 'Dec 8, 2024', amount: 2650.00, status: 'Completed' },
                { date: 'Dec 1, 2024', amount: 1200.00, status: 'Completed' }
              ].map((payout, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{payout.date}</p>
                    <p className="text-sm text-green-600">{payout.status}</p>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">₱{payout.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Placeholder */}
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Detailed Analytics Coming Soon</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Advanced earnings analytics, charts, and insights will be available here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}