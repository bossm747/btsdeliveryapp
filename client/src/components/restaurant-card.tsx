import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Truck, Sparkles, Zap, TrendingUp, Timer } from "lucide-react";
import { Link } from "wouter";
import type { Restaurant } from "@shared/schema";

interface RestaurantCardProps {
  restaurant: Restaurant;
  compact?: boolean;
}

// Helper to determine if restaurant is new (created within 7 days)
function isNewRestaurant(createdAt: Date | string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return created > sevenDaysAgo;
}

// Badge component for various restaurant statuses
function RestaurantBadges({ restaurant }: { restaurant: Restaurant }) {
  const isNew = isNewRestaurant(restaurant.createdAt);
  const isFastDelivery = (restaurant.estimatedDeliveryTime || 30) < 30;
  const isFreeDelivery = restaurant.deliveryFee === "0" || restaurant.deliveryFee === "0.00";
  const isPopular = (restaurant.totalOrders || 0) > 100;
  // Check for promotions - use optional chaining since promotions may not be on the type
  const hasPromo = (restaurant as any).promotions && ((restaurant as any).promotions as any[]).length > 0;

  // Only show the most relevant badge (priority order)
  if (restaurant.isFeatured) {
    return (
      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white font-bold px-3 py-1 shadow-lg border border-white/20 featured-badge-shine">
        <Sparkles className="w-3 h-3 mr-1" />
        Featured
      </Badge>
    );
  }

  if (hasPromo) {
    return (
      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-3 py-1 shadow-lg deal-badge-shine">
        <Zap className="w-3 h-3 mr-1" />
        Promo
      </Badge>
    );
  }

  if (isNew) {
    return (
      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-3 py-1 shadow-lg new-badge-shine">
        NEW
      </Badge>
    );
  }

  if (isPopular) {
    return (
      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold px-3 py-1 shadow-lg">
        <TrendingUp className="w-3 h-3 mr-1" />
        Popular
      </Badge>
    );
  }

  if (isFastDelivery) {
    return (
      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold px-3 py-1 shadow-lg">
        <Timer className="w-3 h-3 mr-1" />
        Fast
      </Badge>
    );
  }

  if (isFreeDelivery) {
    return (
      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold px-3 py-1 shadow-lg">
        <Truck className="w-3 h-3 mr-1" />
        Free Delivery
      </Badge>
    );
  }

  return null;
}

export default function RestaurantCard({ restaurant, compact = false }: RestaurantCardProps) {
  const address = restaurant.address as any;
  const deliveryText = restaurant.deliveryFee === "0" || restaurant.deliveryFee === "0.00"
    ? "Free delivery"
    : `PHP ${restaurant.deliveryFee} delivery fee`;

  if (compact) {
    // Compact version for horizontal carousels
    return (
      <Link href={`/restaurant/${restaurant.id}`}>
        <Card className="min-w-[200px] max-w-[200px] cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border-0 shadow-md group">
          <div className="relative h-28 overflow-hidden">
            <img
              src={restaurant.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop"}
              alt={restaurant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <RestaurantBadges restaurant={restaurant} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <h4 className="font-bold text-white text-sm truncate">{restaurant.name}</h4>
            </div>
          </div>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="text-xs font-semibold">{restaurant.rating || "4.5"}</span>
              </div>
              <span className="text-xs text-gray-500">{restaurant.estimatedDeliveryTime || 30} min</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Full restaurant card
  return (
    <Link href={`/restaurant/${restaurant.id}`}>
      <Card
        className="restaurant-card cursor-pointer bts-hover-lift bg-white border-2 border-gray-100 hover:border-[#FFD23F]/40 shadow-lg hover:shadow-2xl transition-all duration-300"
        data-testid={`restaurant-card-${restaurant.id}`}
      >
        <div className="relative">
          <img
            src={restaurant.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"}
            alt={`${restaurant.name} restaurant interior`}
            className="w-full h-48 object-cover border-b-2 border-gray-100"
            data-testid={`restaurant-image-${restaurant.id}`}
          />
          <RestaurantBadges restaurant={restaurant} />
          <div className="absolute top-3 right-3 w-3 h-3 bg-gradient-to-br from-[#FFD23F] to-[#FF6B35] rounded-full shadow-lg"></div>
        </div>
        <CardContent className="p-5 bg-gradient-to-b from-white to-gray-50/30">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold bts-text-gradient" data-testid={`restaurant-name-${restaurant.id}`}>
              {restaurant.name}
            </h3>
            <div className="flex items-center space-x-1 bg-gradient-to-r from-[#FFD23F]/20 to-[#FF6B35]/20 px-2 py-1 rounded-full border border-[#FFD23F]/30">
              <Star className="w-4 h-4 text-[#FF6B35] fill-current" />
              <span className="font-bold text-[#004225]" data-testid={`restaurant-rating-${restaurant.id}`}>
                {restaurant.rating || "4.5"}
              </span>
            </div>
          </div>

          <p className="text-gray-600 mb-4 text-sm" data-testid={`restaurant-category-${restaurant.id}`}>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-[#FF6B35] rounded-full"></span>
              {restaurant.category || "Filipino Food"}
            </span>
            <span className="mx-2">-</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-[#FFD23F] rounded-full"></span>
              {address?.city || "Batangas"}
            </span>
            <span className="mx-2">-</span>
            <span className="font-semibold text-[#004225]">PHP</span>
          </p>

          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <div className="flex items-center text-sm font-semibold bg-gradient-to-r from-green-50 to-green-100 px-3 py-1 rounded-full border border-green-200">
              <Clock className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-green-700" data-testid={`restaurant-delivery-time-${restaurant.id}`}>
                {restaurant.estimatedDeliveryTime || 30} mins
              </span>
            </div>
            <div className={`flex items-center text-sm font-semibold px-3 py-1 rounded-full border ${
              restaurant.deliveryFee === "0" || restaurant.deliveryFee === "0.00"
                ? "bg-gradient-to-r from-green-50 to-emerald-100 border-green-200"
                : "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
            }`}>
              <Truck className={`w-4 h-4 mr-2 ${
                restaurant.deliveryFee === "0" || restaurant.deliveryFee === "0.00"
                  ? "text-green-600"
                  : "text-blue-600"
              }`} />
              <span className={
                restaurant.deliveryFee === "0" || restaurant.deliveryFee === "0.00"
                  ? "text-green-700"
                  : "text-blue-700"
              } data-testid={`restaurant-delivery-fee-${restaurant.id}`}>
                {deliveryText}
              </span>
            </div>
          </div>

          {/* Order count indicator for popular restaurants */}
          {(restaurant.totalOrders || 0) > 50 && (
            <div className="mt-3 flex items-center justify-center text-xs text-gray-500">
              <TrendingUp className="w-3 h-3 mr-1 text-orange-500" />
              {(restaurant.totalOrders || 0) > 1000
                ? `${((restaurant.totalOrders || 0) / 1000).toFixed(1)}k+ orders`
                : `${restaurant.totalOrders}+ orders`
              }
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
