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
      const orderHistory = JSON.parse(localStorage.getItem("orderHistory") || "[]");
      
      const response = await apiRequest("POST", "/api/ai/recommendations", {
        customerId: customerId || "guest",
        orderHistory,
        location
      });
      return response;
    },
    enabled: !!location,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  if (isLoading || !recommendations) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
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
            <p className="text-sm text-gray-700">{recommendations.timeBasedSuggestion}</p>
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
          <CardDescription>Based on your preferences and order history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.restaurants.slice(0, 3).map((restaurant, index) => (
            <div key={index} className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{restaurant.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {restaurant.matchScore}% Match
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{restaurant.reason}</p>
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
          <CardDescription>Dishes you might enjoy based on your taste</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.dishes.slice(0, 4).map((dish, index) => (
              <div key={index} className="p-3 border rounded-lg hover:border-orange-300 transition-colors">
                <h4 className="font-medium text-sm">{dish.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{dish.restaurant}</p>
                <p className="text-xs text-gray-600 mt-2">{dish.reason}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}