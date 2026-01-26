import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trophy,
  Gift,
  Star,
  TrendingUp,
  Clock,
  Crown,
  Award,
  Sparkles,
  Target,
  ArrowLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle2,
  Coins,
  History,
  HelpCircle,
  ShoppingBag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerPageWrapper, CustomerHeader, LoyaltyPageSkeleton } from "@/components/customer";

// Types for loyalty data
interface LoyaltyAccount {
  id: string;
  userId: string;
  points: number;
  lifetimePoints: number;
  pendingPoints: number;
  expiredPoints: number;
  redeemedPoints: number;
  tier: string;
  tierDisplayName: string;
  tierMultiplier: number;
  nextTier: string | null;
  nextTierProgress: number;
  pointsToNextTier: number;
  lastEarnedAt: string | null;
  lastRedeemedAt: string | null;
  createdAt: string;
  redemptionRate: string;
  minRedemption: number;
  canRedeem: boolean;
  maxRedemptionValue: number;
}

interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  orderId: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  createdAt: string;
  metadata: any;
}

interface LoyaltyTier {
  name: string;
  displayName: string;
  minPoints: number;
  maxPoints: number | null;
  multiplier: number;
  benefits: string[];
  icon: string;
  color: string;
}

interface TiersInfo {
  tiers: LoyaltyTier[];
  earnRate: string;
  redemptionRate: string;
  minRedemption: number;
  pointsExpiryDays: number;
}

interface ExpiringPoints {
  totalPointsExpiring: number;
  daysAhead: number;
  transactions: {
    id: string;
    points: number;
    expiresAt: string;
    description: string;
  }[];
}

export default function LoyaltyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [showHowItWorksDialog, setShowHowItWorksDialog] = useState(false);

  // Fetch loyalty account
  const { data: account, isLoading: accountLoading, error: accountError } = useQuery<LoyaltyAccount>({
    queryKey: ["/api/loyalty/account"],
    enabled: !!user,
  });

  // Fetch loyalty tiers info
  const { data: tiersInfo } = useQuery<TiersInfo>({
    queryKey: ["/api/loyalty/tiers"],
  });

  // Fetch transaction history
  const { data: historyData, isLoading: historyLoading } = useQuery<{
    transactions: LoyaltyTransaction[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["/api/loyalty/history", { type: historyFilter }],
    enabled: !!user && activeTab === "history",
  });

  // Fetch expiring points
  const { data: expiringPoints } = useQuery<ExpiringPoints>({
    queryKey: ["/api/loyalty/expiring-soon", { daysAhead: 30 }],
    enabled: !!user,
  });

  const getTierIcon = (tierName: string, className: string = "h-6 w-6") => {
    switch (tierName?.toLowerCase()) {
      case "bronze":
        return <Award className={`${className} text-orange-600`} />;
      case "silver":
        return <Star className={`${className} text-gray-400`} />;
      case "gold":
        return <Trophy className={`${className} text-yellow-500`} />;
      case "platinum":
        return <Crown className={`${className} text-purple-600`} />;
      default:
        return <Award className={`${className}`} />;
    }
  };

  const getTierColor = (tierName: string): string => {
    switch (tierName?.toLowerCase()) {
      case "bronze":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "silver":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "gold":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "platinum":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTierGradient = (tierName: string): string => {
    switch (tierName?.toLowerCase()) {
      case "bronze":
        return "from-orange-50 to-orange-100";
      case "silver":
        return "from-gray-50 to-gray-100";
      case "gold":
        return "from-yellow-50 to-amber-100";
      case "platinum":
        return "from-purple-50 to-indigo-100";
      default:
        return "from-gray-50 to-gray-100";
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earn":
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case "redeem":
        return <Gift className="h-5 w-5 text-orange-600" />;
      case "expire":
        return <Clock className="h-5 w-5 text-red-600" />;
      case "signup":
        return <Sparkles className="h-5 w-5 text-blue-600" />;
      case "birthday":
        return <Gift className="h-5 w-5 text-pink-600" />;
      case "bonus":
      case "promo":
        return <Sparkles className="h-5 w-5 text-purple-600" />;
      default:
        return <Coins className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (accountLoading) {
    return (
      <CustomerPageWrapper
        pageTitle="Loyalty Rewards"
        pageDescription="Loading your loyalty account information"
      >
        <div className="min-h-screen bg-background pb-20">
          <CustomerHeader
            title="Loyalty Rewards"
            showBack
            backPath="/customer-dashboard"
            variant="green"
          />
          <LoyaltyPageSkeleton />
        </div>
      </CustomerPageWrapper>
    );
  }

  if (accountError || !account) {
    return (
      <CustomerPageWrapper
        pageTitle="Loyalty Rewards"
        pageDescription="Error loading loyalty information"
      >
        <div className="min-h-screen bg-background py-8" data-testid="loyalty-error">
          <CustomerHeader
            title="Loyalty Rewards"
            showBack
            backPath="/customer-dashboard"
            variant="green"
          />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-12 text-center">
                <Gift className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold mb-2">Unable to load loyalty account</h2>
                <p className="text-gray-600 mb-4">
                  There was an error loading your loyalty information. Please try again.
                </p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </CustomerPageWrapper>
    );
  }

  return (
    <CustomerPageWrapper
      refreshQueryKeys={["/api/loyalty/account", "/api/loyalty/tiers", "/api/loyalty/history", "/api/loyalty/expiring-soon"]}
      pageTitle="Loyalty Rewards"
      pageDescription="Earn points, unlock rewards, and enjoy exclusive benefits"
    >
    <div className="min-h-screen bg-background pb-20" data-testid="loyalty-page">
      <CustomerHeader
        title="Loyalty Rewards"
        showBack
        backPath="/customer-dashboard"
        variant="green"
        rightContent={
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            onClick={() => setShowHowItWorksDialog(true)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        }
      />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#004225] to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-green-100">Earn points, unlock rewards</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Points Overview Card */}
        <Card className={`mb-6 bg-gradient-to-br ${getTierGradient(account.tier)} border-2`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getTierIcon(account.tier, "h-10 w-10")}
                <div>
                  <Badge className={`${getTierColor(account.tier)} mb-1`}>
                    {account.tierDisplayName} Member
                  </Badge>
                  <p className="text-sm text-gray-600">{account.tierMultiplier}x points multiplier</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-[#004225]">{account.points.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Available Points</p>
              </div>
            </div>

            {/* Progress to Next Tier */}
            {account.nextTier && (
              <div className="mt-4 p-4 bg-white/50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Progress to {account.nextTier.charAt(0).toUpperCase() + account.nextTier.slice(1)}</span>
                  <span>{account.lifetimePoints.toLocaleString()} / {(tiersInfo?.tiers.find(t => t.name === account.nextTier)?.minPoints || 0).toLocaleString()} points</span>
                </div>
                <Progress value={account.nextTierProgress} className="h-3" />
                <p className="text-xs text-gray-600 mt-2">
                  Earn {account.pointsToNextTier.toLocaleString()} more points to reach {account.nextTier.charAt(0).toUpperCase() + account.nextTier.slice(1)} tier!
                </p>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-lg font-bold text-[#004225]">{account.lifetimePoints.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Lifetime Points</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-lg font-bold text-orange-600">{account.redeemedPoints.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Redeemed</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-lg font-bold text-green-600">₱{account.maxRedemptionValue.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Redeemable Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Points Alert */}
        {expiringPoints && expiringPoints.totalPointsExpiring > 0 && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Points Expiring Soon</AlertTitle>
            <AlertDescription className="text-amber-700">
              You have {expiringPoints.totalPointsExpiring.toLocaleString()} points expiring in the next {expiringPoints.daysAhead} days.
              Use them before they expire!
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/restaurants">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <ShoppingBag className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Order & Earn</h3>
                  <p className="text-xs text-gray-600">Earn {account.tierMultiplier}x points</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/cart">
            <Card className={`cursor-pointer hover:shadow-md transition-shadow h-full ${!account.canRedeem ? 'opacity-60' : ''}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Gift className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Redeem Points</h3>
                  <p className="text-xs text-gray-600">
                    {account.canRedeem ? `Up to ₱${account.maxRedemptionValue}` : `Need ${account.minRedemption} pts`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="tiers">Tiers & Benefits</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* How Points Work */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  How Points Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">Earning Points</h4>
                    </div>
                    <p className="text-sm text-green-700">
                      {tiersInfo?.earnRate || "1 point per P10 spent"}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Your {account.tierDisplayName} tier earns {account.tierMultiplier}x points!
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-5 w-5 text-orange-600" />
                      <h4 className="font-semibold text-orange-800">Redeeming Points</h4>
                    </div>
                    <p className="text-sm text-orange-700">
                      {tiersInfo?.redemptionRate || "100 points = P10"}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Minimum {tiersInfo?.minRedemption || 100} points to redeem
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Points Expiry</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Points expire {tiersInfo?.pointsExpiryDays || 365} days after earning. Use them before they expire!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest points transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : historyData?.transactions && historyData.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {historyData.transactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-xs text-gray-600">
                              {formatDateTime(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-bold ${
                            transaction.points > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.points > 0 ? "+" : ""}
                          {transaction.points.toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setActiveTab("history")}
                    >
                      View All History
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Coins className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Start ordering to earn points!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All your points earning and redemption history</CardDescription>
                <div className="flex gap-2 mt-4">
                  {["all", "earn", "redeem", "bonus"].map((filter) => (
                    <Button
                      key={filter}
                      variant={historyFilter === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHistoryFilter(filter)}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : historyData?.transactions && historyData.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {historyData.transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>{formatDateTime(transaction.createdAt)}</span>
                              {transaction.expiresAt && !transaction.isExpired && (
                                <Badge variant="outline" className="text-xs">
                                  Expires {formatDate(transaction.expiresAt)}
                                </Badge>
                              )}
                              {transaction.isExpired && (
                                <Badge variant="destructive" className="text-xs">
                                  Expired
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`font-bold text-lg ${
                            transaction.points > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.points > 0 ? "+" : ""}
                          {transaction.points.toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                    {historyData.pagination.totalPages > 1 && (
                      <div className="flex justify-center gap-2 mt-4">
                        <p className="text-sm text-gray-600">
                          Page {historyData.pagination.page} of {historyData.pagination.totalPages}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No transactions found</p>
                    <p className="text-sm">
                      {historyFilter !== "all"
                        ? `No ${historyFilter} transactions yet`
                        : "Start ordering to earn points!"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers" className="space-y-4">
            {tiersInfo?.tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`${
                  account.tier === tier.name ? "ring-2 ring-[#004225] ring-offset-2" : ""
                }`}
              >
                <CardHeader className={`bg-gradient-to-r ${getTierGradient(tier.name)} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTierIcon(tier.name, "h-8 w-8")}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {tier.displayName} Tier
                          {account.tier === tier.name && (
                            <Badge className="bg-[#004225]">Your Tier</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {tier.minPoints.toLocaleString()} - {tier.maxPoints ? tier.maxPoints.toLocaleString() : "∞"} lifetime points
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{tier.multiplier}x</p>
                      <p className="text-xs text-gray-600">Points Multiplier</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Benefits
                  </h4>
                  <ul className="space-y-2">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Target className="h-4 w-4 text-[#004225] mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* How It Works Dialog */}
      <Dialog open={showHowItWorksDialog} onOpenChange={setShowHowItWorksDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#004225]" />
              How Loyalty Rewards Work
            </DialogTitle>
            <DialogDescription>
              Earn points on every order and redeem them for discounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold">1. Earn Points</h4>
                <p className="text-sm text-gray-600">
                  Earn 1 point for every P10 spent. Higher tiers earn more with multipliers up to 2x!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold">2. Level Up</h4>
                <p className="text-sm text-gray-600">
                  Accumulate lifetime points to unlock higher tiers with better multipliers and exclusive benefits.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <Gift className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold">3. Redeem Rewards</h4>
                <p className="text-sm text-gray-600">
                  Use your points at checkout! 100 points = P10 discount. Minimum 100 points to redeem.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold">4. Use Before Expiry</h4>
                <p className="text-sm text-gray-600">
                  Points expire 365 days after earning. We'll notify you before they expire!
                </p>
              </div>
            </div>
          </div>
          <Button className="w-full bg-[#004225]" onClick={() => setShowHowItWorksDialog(false)}>
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </div>
    </CustomerPageWrapper>
  );
}
