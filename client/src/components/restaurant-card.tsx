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
      <Card className="restaurant-card cursor-pointer bts-hover-lift bts-border-gradient bg-white" data-testid={`restaurant-card-${restaurant.id}`}>
        <div className="relative">
          <img 
            src={restaurant.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"} 
            alt={`${restaurant.name} restaurant interior`}
            className="w-full h-48 object-cover"
            data-testid={`restaurant-image-${restaurant.id}`}
          />
          {restaurant.isFeatured && (
            <Badge className="absolute top-2 left-2 bts-gradient-primary text-white bts-glow-primary">
              Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold bts-text-gradient" data-testid={`restaurant-name-${restaurant.id}`}>
              {restaurant.name}
            </h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-accent fill-current" />
              <span className="font-semibold" data-testid={`restaurant-rating-${restaurant.id}`}>
                {restaurant.rating || "4.5"}
              </span>
            </div>
          </div>
          
          <p className="text-muted-foreground mb-3" data-testid={`restaurant-category-${restaurant.id}`}>
            {restaurant.category || "Filipino Food"} • {address?.city || "Batangas"} • ₱₱
          </p>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm text-success font-semibold">
              <Clock className="w-4 h-4 mr-1" />
              <span data-testid={`restaurant-delivery-time-${restaurant.id}`}>
                {restaurant.estimatedDeliveryTime || 30} mins
              </span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Truck className="w-4 h-4 mr-1" />
              <span data-testid={`restaurant-delivery-fee-${restaurant.id}`}>
                {deliveryText}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
