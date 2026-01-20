import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Award,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Package,
  ThumbsUp,
  Zap,
  Shield,
  Target,
  ArrowLeft,
  ChevronRight,
  Medal,
  Trophy,
  Flame,
  Heart,
  Bike,
  Timer,
  Users
} from "lucide-react";
import { useLocation } from "wouter";

// Types
interface PerformanceData {
  rating: {
    overall: number;
    totalReviews: number;
    breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  metrics: {
    acceptanceRate: number;
    completionRate: number;
    onTimeRate: number;
    totalDeliveries: number;
    thisWeekDeliveries: number;
    thisMonthDeliveries: number;
    cancelledDeliveries: number;
    averageDeliveryTime: number;
  };
  recentReviews: Review[];
  badges: Badge[];
  achievements: Achievement[];
  streak: {
    currentDays: number;
    longestDays: number;
    lastActive: string;
  };
}

interface Review {
  id: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  orderId: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  completed: boolean;
  reward?: string;
}

// Helper to render stars
const StarRating = ({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <div className="flex items-center space-x-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= Math.floor(rating)
              ? "text-yellow-400 fill-yellow-400"
              : star <= rating
              ? "text-yellow-400 fill-yellow-400/50"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
};

// Metric card component
const MetricCard = ({
  icon: Icon,
  label,
  value,
  suffix,
  trend,
  trendLabel,
  color,
  isGood
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  color: string;
  isGood?: boolean;
}) => (
  <Card className="bg-white overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className={`text-2xl font-bold ${isGood === false ? 'text-red-600' : isGood === true ? 'text-green-600' : 'text-gray-900'}`}>
          {value}{suffix}
        </div>
        <p className="text-sm text-gray-500">{label}</p>
        {trendLabel && (
          <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

// Rating breakdown bar
const RatingBar = ({ stars, count, total }: { stars: number; count: number; total: number }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 w-4">{stars}</span>
      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
    </div>
  );
};

// Badge component
const BadgeCard = ({ badge }: { badge: Badge }) => {
  const tierColors = {
    bronze: 'from-orange-200 to-orange-300 border-orange-400',
    silver: 'from-gray-200 to-gray-300 border-gray-400',
    gold: 'from-yellow-200 to-yellow-300 border-yellow-400',
    platinum: 'from-purple-200 to-purple-300 border-purple-400'
  };

  const tierIcons = {
    bronze: Medal,
    silver: Medal,
    gold: Trophy,
    platinum: Trophy
  };

  const TierIcon = tierIcons[badge.tier];

  return (
    <div className={`relative p-3 rounded-xl bg-gradient-to-br ${tierColors[badge.tier]} border-2`}>
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-white/80 rounded-full">
          <TierIcon className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{badge.name}</p>
          <p className="text-xs text-gray-600">{badge.description}</p>
        </div>
      </div>
    </div>
  );
};

// Achievement progress component
const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
  const progress = (achievement.progress / achievement.target) * 100;

  return (
    <Card className={`${achievement.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {achievement.completed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Target className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium text-gray-900 text-sm">{achievement.name}</p>
              <p className="text-xs text-gray-500">{achievement.description}</p>
            </div>
          </div>
          {achievement.reward && !achievement.completed && (
            <Badge variant="outline" className="text-xs">
              {achievement.reward}
            </Badge>
          )}
        </div>
        {!achievement.completed && (
          <>
            <Progress value={progress} className="h-1.5 mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {achievement.progress}/{achievement.target}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Review card component
const ReviewCard = ({ review }: { review: Review }) => (
  <Card className="bg-white">
    <CardContent className="p-4">
      <div className="flex items-start space-x-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={review.customerAvatar} />
          <AvatarFallback className="bg-gray-100 text-gray-600">
            {review.customerName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-gray-900">{review.customerName}</p>
            <span className="text-xs text-gray-400">{review.date}</span>
          </div>
          <StarRating rating={review.rating} size="sm" />
          {review.comment && (
            <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Order #{review.orderId}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Loading skeleton
const PerformanceSkeleton = () => (
  <div className="space-y-4 px-4 py-4">
    <Skeleton className="h-40 w-full" />
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
    <Skeleton className="h-48 w-full" />
  </div>
);

export default function RiderPerformance() {
  const [, navigate] = useLocation();

  // Fetch performance data
  const { data: performance, isLoading, error } = useQuery<PerformanceData>({
    queryKey: ["/api/rider/performance"],
  });

  // Default data for when API returns empty or errors
  const defaultPerformance: PerformanceData = {
    rating: {
      overall: 5.0,
      totalReviews: 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    },
    metrics: {
      acceptanceRate: 100,
      completionRate: 100,
      onTimeRate: 100,
      totalDeliveries: 0,
      thisWeekDeliveries: 0,
      thisMonthDeliveries: 0,
      cancelledDeliveries: 0,
      averageDeliveryTime: 0
    },
    recentReviews: [],
    badges: [],
    achievements: [],
    streak: {
      currentDays: 0,
      longestDays: 0,
      lastActive: new Date().toISOString()
    }
  };

  const performanceData = performance || defaultPerformance;

  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return true;
    if (value >= thresholds.warning) return undefined;
    return false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PerformanceSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="rider-performance-page">
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
              <h1 className="text-lg font-bold text-[#004225]">Performance</h1>
              <p className="text-xs text-gray-600">Your rider stats</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-20 space-y-4">
        {/* Overall Rating Card */}
        <Card className="bg-gradient-to-br from-[#004225] to-green-700 text-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Overall Rating</p>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-4xl font-bold">{performanceData.rating.overall}</span>
                  <StarRating rating={performanceData.rating.overall} size="lg" />
                </div>
                <p className="text-green-100 text-sm">
                  Based on {performanceData.rating.totalReviews} reviews
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end space-x-1 mb-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-2xl font-bold">{performanceData.streak.currentDays}</span>
                </div>
                <p className="text-green-100 text-xs">Day streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rating Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <RatingBar
                key={stars}
                stars={stars}
                count={performanceData.rating.breakdown[stars as keyof typeof performanceData.rating.breakdown]}
                total={performanceData.rating.totalReviews}
              />
            ))}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Performance Metrics</h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={ThumbsUp}
              label="Acceptance Rate"
              value={performanceData.metrics.acceptanceRate}
              suffix="%"
              color="bg-blue-500"
              isGood={getMetricColor(performanceData.metrics.acceptanceRate, { good: 85, warning: 70 })}
            />
            <MetricCard
              icon={CheckCircle}
              label="Completion Rate"
              value={performanceData.metrics.completionRate}
              suffix="%"
              color="bg-green-500"
              isGood={getMetricColor(performanceData.metrics.completionRate, { good: 95, warning: 85 })}
            />
            <MetricCard
              icon={Clock}
              label="On-Time Rate"
              value={performanceData.metrics.onTimeRate}
              suffix="%"
              color="bg-purple-500"
              isGood={getMetricColor(performanceData.metrics.onTimeRate, { good: 90, warning: 80 })}
            />
            <MetricCard
              icon={Timer}
              label="Avg. Delivery Time"
              value={performanceData.metrics.averageDeliveryTime}
              suffix=" min"
              color="bg-orange-500"
            />
          </div>
        </div>

        {/* Delivery Stats */}
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-gray-900">Delivery Stats</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{performanceData.metrics.totalDeliveries}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{performanceData.metrics.thisMonthDeliveries}</p>
                <p className="text-xs text-gray-500">This Month</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{performanceData.metrics.thisWeekDeliveries}</p>
                <p className="text-xs text-gray-500">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Badges Earned</h3>
            <Button variant="ghost" size="sm" className="text-xs text-[#FF6B35]">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {performanceData.badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Achievements</h3>
            <Badge variant="outline" className="text-xs">
              {performanceData.achievements.filter(a => a.completed).length}/{performanceData.achievements.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {performanceData.achievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Recent Reviews</h3>
            <Button variant="ghost" size="sm" className="text-xs text-[#FF6B35]">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {performanceData.recentReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>

        {/* Tips for improvement */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-800 mb-1">Pro Tip</p>
                <p className="text-sm text-blue-700">
                  Maintain a high acceptance rate (above 85%) to receive more high-value orders
                  and unlock premium delivery zones.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
