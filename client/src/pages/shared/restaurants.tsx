import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import RestaurantCard from "@/components/restaurant-card";
import RestaurantFilters from "@/components/restaurant-filters";
import { Skeleton } from "@/components/ui/skeleton";
import type { Restaurant } from "@shared/schema";

export default function Restaurants() {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [deliveryTime, setDeliveryTime] = useState("all");
  const [rating, setRating] = useState("all");

  // Get location from URL if present
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const locationParam = urlParams.get('location');

  const { data: restaurants, isLoading, error } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants", { city: locationParam }],
    queryFn: async () => {
      const url = locationParam 
        ? `/api/restaurants?city=${encodeURIComponent(locationParam)}`
        : "/api/restaurants";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch restaurants');
      }
      return response.json();
    }
  });

  const filteredRestaurants = restaurants?.filter((restaurant) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = restaurant.name.toLowerCase().includes(searchLower);
      const matchesDescription = restaurant.description?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesDescription) return false;
    }

    // Category filter
    if (category !== "all" && restaurant.category !== category) {
      return false;
    }

    // Delivery time filter
    if (deliveryTime !== "all") {
      const estimatedTime = restaurant.estimatedDeliveryTime || 30;
      switch (deliveryTime) {
        case "15-30":
          if (estimatedTime > 30) return false;
          break;
        case "30-45":
          if (estimatedTime <= 30 || estimatedTime > 45) return false;
          break;
        case "45+":
          if (estimatedTime <= 45) return false;
          break;
      }
    }

    // Rating filter
    if (rating !== "all") {
      const restaurantRating = parseFloat(restaurant.rating || "0");
      const minRating = parseFloat(rating.replace("+", ""));
      if (restaurantRating < minRating) return false;
    }

    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-background py-8 pb-8 md:pb-8" data-testid="restaurants-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="restaurants-title">
            {locationParam ? `Restaurants in ${locationParam}` : "All Restaurants"}
          </h1>
          <p className="text-xl text-muted-foreground">
            Discover amazing food from local establishments
          </p>
        </div>

        <RestaurantFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          category={category}
          onCategoryChange={setCategory}
          deliveryTime={deliveryTime}
          onDeliveryTimeChange={setDeliveryTime}
          rating={rating}
          onRatingChange={setRating}
        />

        {error && (
          <div className="text-center py-12" data-testid="error-message">
            <p className="text-destructive text-lg">Failed to load restaurants. Please try again later.</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="restaurants-loading">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-12" data-testid="no-restaurants">
            <p className="text-muted-foreground text-lg">
              {searchTerm || category !== "all" || deliveryTime !== "all" || rating !== "all"
                ? "No restaurants match your current filters. Try adjusting your search criteria."
                : "No restaurants available at the moment."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="restaurants-grid">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}

        {!isLoading && filteredRestaurants.length > 0 && (
          <div className="text-center mt-8 mb-8" data-testid="results-count">
            <p className="text-muted-foreground">
              Showing {filteredRestaurants.length} of {restaurants?.length || 0} restaurants
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
