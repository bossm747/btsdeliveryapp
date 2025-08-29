import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Truck } from "lucide-react";
import { Link } from "wouter";
import type { Restaurant } from "@shared/schema";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const address = restaurant.address as any;
  const deliveryText = restaurant.deliveryFee === "0" ? "Free delivery" : `₱${restaurant.deliveryFee} delivery fee`;

  return (
    <Link href={`/restaurant/${restaurant.id}`}>
      <Card className="restaurant-card cursor-pointer bts-hover-lift bg-white border-2 border-gray-100 hover:border-[#FFD23F]/40 shadow-lg hover:shadow-2xl transition-all duration-300" data-testid={`restaurant-card-${restaurant.id}`}>
        <div className="relative">
          <img 
            src={restaurant.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"} 
            alt={`${restaurant.name} restaurant interior`}
            className="w-full h-48 object-cover border-b-2 border-gray-100"
            data-testid={`restaurant-image-${restaurant.id}`}
          />
          {restaurant.isFeatured && (
            <Badge className="absolute top-3 left-3 bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white font-bold px-3 py-1 shadow-lg border border-white/20">
              ⭐ Featured
            </Badge>
          )}
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
            <span className="mx-2">•</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-[#FFD23F] rounded-full"></span>
              {address?.city || "Batangas"}
            </span>
            <span className="mx-2">•</span>
            <span className="font-semibold text-[#004225]">₱₱</span>
          </p>
          
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <div className="flex items-center text-sm font-semibold bg-gradient-to-r from-green-50 to-green-100 px-3 py-1 rounded-full border border-green-200">
              <Clock className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-green-700" data-testid={`restaurant-delivery-time-${restaurant.id}`}>
                {restaurant.estimatedDeliveryTime || 30} mins
              </span>
            </div>
            <div className="flex items-center text-sm font-semibold bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-1 rounded-full border border-blue-200">
              <Truck className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-blue-700" data-testid={`restaurant-delivery-fee-${restaurant.id}`}>
                {deliveryText}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
