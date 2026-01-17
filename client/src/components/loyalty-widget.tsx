import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Star,
  Crown,
  Award,
  Gift,
  ChevronRight,
  Coins,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Types for loyalty data
interface LoyaltyAccount {
  points: number;
  lifetimePoints: number;
  tier: string;
  tierDisplayName: string;
  tierMultiplier: number;
  nextTier: string | null;
  nextTierProgress: number;
  pointsToNextTier: number;
  canRedeem: boolean;
  maxRedemptionValue: number;
}

interface LoyaltyWidgetProps {
  variant?: "compact" | "card" | "inline";
  showProgress?: boolean;
  showRedeemValue?: boolean;
  className?: string;
}

export function LoyaltyWidget({
  variant = "compact",
  showProgress = false,
  showRedeemValue = false,
  className = "",
}: LoyaltyWidgetProps) {
  const { user } = useAuth();

  const { data: account, isLoading, error } = useQuery<LoyaltyAccount>({
    queryKey: ["/api/loyalty/account"],
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  const getTierIcon = (tierName: string, size: string = "h-4 w-4") => {
    switch (tierName?.toLowerCase()) {
      case "bronze":
        return <Award className={`${size} text-orange-600`} />;
      case "silver":
        return <Star className={`${size} text-gray-400`} />;
      case "gold":
        return <Trophy className={`${size} text-yellow-500`} />;
      case "platinum":
        return <Crown className={`${size} text-purple-600`} />;
      default:
        return <Award className={`${size}`} />;
    }
  };

  const getTierColor = (tierName: string): string => {
    switch (tierName?.toLowerCase()) {
      case "bronze":
        return "bg-orange-100 text-orange-800";
      case "silver":
        return "bg-gray-100 text-gray-800";
      case "gold":
        return "bg-yellow-100 text-yellow-800";
      case "platinum":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    if (variant === "compact") {
      return <Skeleton className={`h-8 w-24 rounded-full ${className}`} />;
    }
    return <Skeleton className={`h-20 w-full rounded-lg ${className}`} />;
  }

  if (error || !account) {
    return null;
  }

  // Compact variant - for navbar/header
  if (variant === "compact") {
    return (
      <Link href="/loyalty">
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 hover:bg-orange-50 ${className}`}
        >
          {getTierIcon(account.tier)}
          <span className="font-semibold text-[#004225]">{account.points.toLocaleString()}</span>
          <span className="text-xs text-gray-500">pts</span>
        </Button>
      </Link>
    );
  }

  // Inline variant - for profile or sidebar
  if (variant === "inline") {
    return (
      <Link href="/loyalty">
        <div
          className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 cursor-pointer transition-colors ${className}`}
        >
          <div className="flex items-center gap-3">
            {getTierIcon(account.tier, "h-6 w-6")}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#004225]">
                  {account.points.toLocaleString()}
                </span>
                <span className="text-sm text-gray-600">points</span>
              </div>
              <Badge className={`${getTierColor(account.tier)} text-xs`}>
                {account.tierDisplayName}
              </Badge>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </Link>
    );
  }

  // Card variant - for dashboard
  return (
    <Link href="/loyalty">
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-orange-50 to-yellow-50 ${className}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getTierIcon(account.tier, "h-6 w-6")}
              <Badge className={getTierColor(account.tier)}>{account.tierDisplayName}</Badge>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#004225]">{account.points.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Available Points</p>
            </div>
          </div>

          {showProgress && account.nextTier && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Progress to {account.nextTier}</span>
                <span className="text-gray-600">{account.nextTierProgress}%</span>
              </div>
              <Progress value={account.nextTierProgress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {account.pointsToNextTier.toLocaleString()} points to go
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>{account.tierMultiplier}x</span>
              </div>
              {showRedeemValue && account.canRedeem && (
                <div className="flex items-center gap-1">
                  <Gift className="h-4 w-4 text-orange-600" />
                  <span>P{account.maxRedemptionValue}</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" className="text-[#004225]">
              View <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Mini widget for quick points display
export function LoyaltyPointsBadge({ className = "" }: { className?: string }) {
  const { user } = useAuth();

  const { data: account, isLoading } = useQuery<LoyaltyAccount>({
    queryKey: ["/api/loyalty/account"],
    enabled: !!user,
    staleTime: 30000,
  });

  if (!user || isLoading || !account) {
    return null;
  }

  return (
    <Link href="/loyalty">
      <Badge
        variant="outline"
        className={`cursor-pointer hover:bg-orange-50 border-orange-200 ${className}`}
      >
        <Coins className="h-3 w-3 mr-1 text-orange-600" />
        <span className="font-semibold">{account.points.toLocaleString()}</span>
      </Badge>
    </Link>
  );
}

// Points summary for checkout
export function LoyaltyCheckoutSummary({
  orderTotal,
  onRedeemChange,
  className = "",
}: {
  orderTotal: number;
  onRedeemChange?: (points: number, discount: number) => void;
  className?: string;
}) {
  const { user } = useAuth();

  const { data: account, isLoading } = useQuery<LoyaltyAccount>({
    queryKey: ["/api/loyalty/account"],
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: redemptionCalc } = useQuery<{
    availablePoints: number;
    pointsToRedeem: number;
    discountValue: number;
    canRedeem: boolean;
    minRedemption: number;
    redemptionRate: number;
    redemptionValue: number;
  }>({
    queryKey: ["/api/loyalty/calculate-redemption", { orderTotal }],
    enabled: !!user && orderTotal > 0,
    staleTime: 10000,
  });

  if (!user || isLoading || !account) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-orange-600" />
          <span className="font-semibold">Loyalty Points</span>
        </div>
        <Badge variant="outline" className="bg-white">
          {account.points.toLocaleString()} pts
        </Badge>
      </div>

      {redemptionCalc && redemptionCalc.canRedeem ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            You can redeem up to <span className="font-semibold">P{redemptionCalc.discountValue}</span> on this order
          </p>
          <div className="text-xs text-gray-500">
            ({redemptionCalc.redemptionRate} points = P{redemptionCalc.redemptionValue})
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          {redemptionCalc?.minRedemption
            ? `Need ${(redemptionCalc.minRedemption - account.points).toLocaleString()} more points to redeem`
            : "Earn more points to unlock rewards!"}
        </p>
      )}

      <Link href="/loyalty">
        <Button variant="ghost" size="sm" className="mt-2 text-[#004225] p-0">
          View Rewards <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </div>
  );
}

// Points earned preview for checkout
export function LoyaltyEarnPreview({
  orderAmount,
  className = "",
}: {
  orderAmount: number;
  className?: string;
}) {
  const { user } = useAuth();

  const { data: earnCalc, isLoading } = useQuery<{
    orderAmount: number;
    basePoints: number;
    multiplier: number;
    pointsToEarn: number;
    tier: string;
    tierDisplayName: string;
  }>({
    queryKey: ["/api/loyalty/calculate-earn", { orderAmount }],
    enabled: !!user && orderAmount > 0,
    staleTime: 10000,
  });

  if (!user || isLoading || !earnCalc || earnCalc.pointsToEarn === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-green-50 ${className}`}>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-sm font-medium text-green-800">
            Earn <span className="font-bold">{earnCalc.pointsToEarn}</span> points
          </p>
          {earnCalc.multiplier > 1 && (
            <p className="text-xs text-green-600">
              {earnCalc.multiplier}x bonus with {earnCalc.tierDisplayName} tier!
            </p>
          )}
        </div>
      </div>
      <Coins className="h-5 w-5 text-green-600" />
    </div>
  );
}

export default LoyaltyWidget;
