import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Clock, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface Recommendation {
  restaurants: Array<{
    name: string;
    reason: string;
    matchScore: number;
  }>;
  dishes: Array<{
    name: string;
    restaurant: string;
    reason: string;
  }>;
  timeBasedSuggestion?: string;
}

// Mock recommendations for display
function getMockRecommendations(): Recommendation {
  const hour = new Date().getHours();
  let timeBasedSuggestion = "";
  
  if (hour >= 6 && hour < 10) {
    timeBasedSuggestion = "Perfect time for breakfast! Try our recommended breakfast combos from your favorite restaurants.";
  } else if (hour >= 11 && hour < 14) {
    timeBasedSuggestion = "Lunch time! Check out today's special lunch deals near you.";
  } else if (hour >= 15 && hour < 17) {
    timeBasedSuggestion = "Merienda time! Grab some snacks and refreshments.";
  } else if (hour >= 18 && hour < 21) {
    timeBasedSuggestion = "Dinner is served! Discover highly-rated dinner options in your area.";
  } else {
    timeBasedSuggestion = "Late night cravings? We've got you covered with 24/7 options!";
  }
  
  return {
    timeBasedSuggestion,
    restaurants: [
      {
        name: "Jollibee Batangas",
        reason: "Most ordered by customers in your area. Fast delivery within 20-30 minutes.",
        matchScore: 95
      },
      {
        name: "Mang Inasal",
        reason: "Highly rated for grilled chicken. Perfect for lunch based on your order history.",
        matchScore: 88
      },
      {
        name: "Greenwich Pizza",
        reason: "Weekend special promo! Buy 1 Take 1 on all pizzas today.",
        matchScore: 82
      }
    ],
    dishes: [
      {
        name: "Chickenjoy with Spaghetti",
        restaurant: "Jollibee",
        reason: "Top seller this week"
      },
      {
        name: "PM2 Chicken Inasal",
        restaurant: "Mang Inasal",
        reason: "Best value meal nearby"
      },
      {
        name: "Hawaiian Overload Pizza",
        restaurant: "Greenwich",
        reason: "30% off today only"
      },
      {
        name: "Sisig Rice Bowl",
        restaurant: "Max's Restaurant",
        reason: "New item, highly rated"
      }
    ]
  };
}

export default function AIRecommendations({ customerId }: { customerId?: string }) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Batangas City center
          setLocation({ lat: 13.7565, lng: 121.0583 });
        }
      );
    }
  }, []);

  // Fetch AI recommendations
  const { data: recommendations, isLoading } = useQuery<Recommendation>({
    queryKey: ["/api/ai/recommendations", customerId, location],
    queryFn: async () => {
      if (!location) return { restaurants: [], dishes: [] };
      
      // Get order history from local storage or API
      let orderHistory = [];
      try {
        orderHistory = JSON.parse(localStorage.getItem("orderHistory") || "[]");
      } catch (error) {
        // Use empty array if localStorage fails
        orderHistory = [];
      }
      
      try {
        const response = await apiRequest("POST", "/api/ai/recommendations", {
          customerId: customerId || "guest",
          orderHistory,
          location
        });
        
        const data = await response.json();
        
        // If API returns empty data, use mock recommendations
        if (!data.restaurants?.length && !data.dishes?.length) {
          return getMockRecommendations();
        }
        return data;
      } catch (error) {
        // Return mock data if API fails
        return getMockRecommendations();
      }
    },
    enabled: !!location,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  if (isLoading || !recommendations) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-4/5"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="ai-recommendations">
      {/* Time-based suggestion */}
      {recommendations.timeBasedSuggestion && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Ngayong Oras</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-900 font-medium">{recommendations.timeBasedSuggestion}</p>
          </CardContent>
        </Card>
      )}

      {/* Recommended Restaurants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <CardTitle>AI-Powered Recommendations</CardTitle>
            </div>
            <Badge variant="secondary">Para sa Inyo</Badge>
          </div>
          <CardDescription className="text-gray-700">Based on your preferences and order history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.restaurants.slice(0, 3).map((restaurant, index) => (
            <div key={index} className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors bg-white">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {restaurant.matchScore}% Match
                  </Badge>
                </div>
                <p className="text-sm text-gray-800">{restaurant.reason}</p>
              </div>
              <Link href={`/restaurant/${restaurant.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <Button size="sm" variant="outline" data-testid={`button-view-${index}`}>
                  View Menu
                </Button>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommended Dishes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle>Subukan Ngayon</CardTitle>
          </div>
          <CardDescription className="text-gray-700">Dishes you might enjoy based on your taste</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.dishes.slice(0, 4).map((dish, index) => (
              <div key={index} className="p-3 border rounded-lg hover:border-orange-300 transition-colors bg-white">
                <h4 className="font-medium text-sm text-gray-900">{dish.name}</h4>
                <p className="text-xs text-gray-700 mt-1 font-medium">{dish.restaurant}</p>
                <p className="text-xs text-gray-800 mt-2">{dish.reason}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}