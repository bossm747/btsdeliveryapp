import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RestaurantCardSkeleton } from "@/components/skeletons";
import { Separator } from "@/components/ui/separator";
import { MapPin, Star, Clock, Sparkles, TrendingUp, Heart, Utensils, Pizza, Coffee, Beef, Fish, Salad, IceCream, ChevronLeft, ChevronRight } from "lucide-react";
import RestaurantCard from "@/components/restaurant-card";
import RestaurantFilters from "@/components/restaurant-filters";
import FeaturedCarousel from "@/components/customer/featured-carousel";
import type { Restaurant } from "@shared/schema";

// Quick category pills for filtering
const quickCategories = [
  { id: "all", label: "All", icon: <Utensils className="w-4 h-4" /> },
  { id: "Filipino", label: "Filipino", icon: <Beef className="w-4 h-4" /> },
  { id: "Pizza", label: "Pizza", icon: <Pizza className="w-4 h-4" /> },
  { id: "Coffee", label: "Coffee", icon: <Coffee className="w-4 h-4" /> },
  { id: "Seafood", label: "Seafood", icon: <Fish className="w-4 h-4" /> },
  { id: "Healthy", label: "Healthy", icon: <Salad className="w-4 h-4" /> },
  { id: "Desserts", label: "Desserts", icon: <IceCream className="w-4 h-4" /> },
];

export default function Restaurants() {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [deliveryTime, setDeliveryTime] = useState("all");
  const [rating, setRating] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [dietaryFilters, setDietaryFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("default");
  const [distance, setDistance] = useState(10);
  const [isOpen, setIsOpen] = useState(false);
  const [userLocation, setUserLocation] = useState("");

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

  // Enhanced filtering logic
  const filteredRestaurants = restaurants?.filter((restaurant) => {
    // Search filter - enhanced to search in menu items too
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = restaurant.name.toLowerCase().includes(searchLower);
      const matchesDescription = restaurant.description?.toLowerCase().includes(searchLower);
      const matchesCategory = restaurant.category?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesDescription && !matchesCategory) return false;
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

    // Price range filter (based on delivery fee + average item price estimation)
    const avgPrice = parseFloat(restaurant.deliveryFee || "0") + 200; // Rough estimation
    if (avgPrice < priceRange[0] || avgPrice > priceRange[1]) return false;

    // Dietary filters - would need to be implemented with menu item data
    // For now, skip this filter until we have dietary info in restaurant data

    // Open now filter
    if (isOpen && restaurant.operatingHours) {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.toTimeString().slice(0, 5);
      
      const dayHours = (restaurant.operatingHours as any)?.[currentDay];
      if (!dayHours || dayHours.isClosed) return false;
      
      if (dayHours.open && dayHours.close) {
        if (currentTime < dayHours.open || currentTime > dayHours.close) return false;
      }
    }

    return true;
  }) || [];

  // Enhanced sorting logic
  const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
      case "delivery-time":
        return (a.estimatedDeliveryTime || 30) - (b.estimatedDeliveryTime || 30);
      case "price-low":
        return parseFloat(a.deliveryFee || "0") - parseFloat(b.deliveryFee || "0");
      case "price-high":
        return parseFloat(b.deliveryFee || "0") - parseFloat(a.deliveryFee || "0");
      case "popularity":
        return (b.totalOrders || 0) - (a.totalOrders || 0);
      case "newest":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case "default":
      default:
        // Default sorting: featured first, then by rating and popularity
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        const ratingDiff = parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
        if (ratingDiff !== 0) return ratingDiff;
        return (b.totalOrders || 0) - (a.totalOrders || 0);
    }
  });

  // Clear all filters function
  const handleClearFilters = () => {
    setSearchTerm("");
    setCategory("all");
    setDeliveryTime("all");
    setRating("all");
    setPriceRange([0, 1000]);
    setDietaryFilters([]);
    setSortBy("default");
    setDistance(10);
    setIsOpen(false);
    setUserLocation("");
  };

  // Separate featured and regular restaurants
  const featuredRestaurants = sortedRestaurants.filter(r => r.isFeatured);
  const regularRestaurants = sortedRestaurants.filter(r => !r.isFeatured);

  // Quick category handler
  const handleQuickCategory = (categoryId: string) => {
    if (categoryId === "all") {
      setCategory("all");
    } else {
      setCategory(categoryId);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8 md:pb-8" data-testid="restaurants-page">
      {/* Sticky Category Pills */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {quickCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleQuickCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 font-medium text-sm ${
                  category === cat.id || (cat.id === "all" && category === "all")
                    ? "bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2" data-testid="restaurants-title">
            {locationParam ? `Restaurants in ${locationParam}` : category !== "all" ? `${category} Restaurants` : "All Restaurants"}
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover amazing food from local establishments in Batangas
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
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          dietaryFilters={dietaryFilters}
          onDietaryFiltersChange={setDietaryFilters}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          distance={distance}
          onDistanceChange={setDistance}
          isOpen={isOpen}
          onIsOpenChange={setIsOpen}
          location={userLocation}
          onLocationChange={setUserLocation}
          onClearFilters={handleClearFilters}
        />

        {/* Featured Carousel - Only show when no filters are applied */}
        {!searchTerm && category === "all" && deliveryTime === "all" && rating === "all" && !isLoading && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 mb-6">
            <FeaturedCarousel
              title="Featured This Week"
              subtitle="Top-rated restaurants in Batangas"
            />
          </div>
        )}

        {error && (
          <div className="text-center py-12" data-testid="error-message">
            <p className="text-destructive text-lg">Failed to load restaurants. Please try again later.</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="restaurants-loading">
            <RestaurantCardSkeleton count={9} />
          </div>
        ) : sortedRestaurants.length === 0 ? (
          <Card className="text-center py-16" data-testid="no-restaurants">
            <CardContent>
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No restaurants found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchTerm || category !== "all" || deliveryTime !== "all" || rating !== "all"
                  ? "No restaurants match your current filters. Try adjusting your search criteria or expanding your location radius."
                  : "No restaurants available in your area at the moment. Check back later!"}
              </p>
              <Button onClick={handleClearFilters} variant="outline">
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Featured Restaurants Section */}
            {featuredRestaurants.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-[#FF6B35] to-[#FFD23F] rounded-full"></div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#004225] flex items-center">
                        <Sparkles className="w-6 h-6 mr-2 text-[#FF6B35]" />
                        Featured Restaurants
                      </h2>
                      <p className="text-gray-600">Hand-picked favorites in your area</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white">
                    {featuredRestaurants.length} restaurants
                  </Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {featuredRestaurants.map((restaurant) => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                  ))}
                </div>
                
                {regularRestaurants.length > 0 && <Separator className="my-8" />}
              </section>
            )}

            {/* Regular Restaurants Section */}
            {regularRestaurants.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-[#004225] to-green-600 rounded-full"></div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#004225] flex items-center">
                        <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
                        {featuredRestaurants.length > 0 ? "More Restaurants" : "All Restaurants"}
                      </h2>
                      <p className="text-gray-600">Discover great food near you</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {regularRestaurants.length} restaurants
                  </Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularRestaurants.map((restaurant) => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {!isLoading && sortedRestaurants.length > 0 && (
          <div className="text-center mt-12 mb-8" data-testid="results-count">
            <Card className="bg-gradient-to-r from-gray-50 to-white border-gray-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>Showing {sortedRestaurants.length} of {restaurants?.length || 0} restaurants</span>
                  </div>
                  {featuredRestaurants.length > 0 && (
                    <>
                      <div className="w-1 h-4 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-[#FF6B35]" />
                        <span>{featuredRestaurants.length} featured</span>
                      </div>
                    </>
                  )}
                  {userLocation && (
                    <>
                      <div className="w-1 h-4 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span>Within {distance}km</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
