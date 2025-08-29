import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CloudRain, Car, MapPin, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DeliveryPredictionProps {
  restaurantLocation: { lat: number; lng: number };
  deliveryLocation: { lat: number; lng: number };
  itemCount: number;
  restaurantPrepTime?: number;
}

interface Prediction {
  estimatedMinutes: number;
  confidence: number;
  factors: string[];
}

export default function DeliveryPrediction({
  restaurantLocation,
  deliveryLocation,
  itemCount,
  restaurantPrepTime = 20
}: DeliveryPredictionProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weather, setWeather] = useState<"clear" | "rain" | "heavy_rain">("clear");
  const [traffic, setTraffic] = useState<"low" | "medium" | "high">("medium");

  // Calculate distance (simplified)
  const calculateDistance = () => {
    const lat1 = restaurantLocation.lat;
    const lon1 = restaurantLocation.lng;
    const lat2 = deliveryLocation.lat;
    const lon2 = deliveryLocation.lng;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get current traffic conditions based on time
  const getCurrentTraffic = () => {
    const hour = new Date().getHours();
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return "high"; // Rush hours
    } else if (hour >= 11 && hour <= 14) {
      return "medium"; // Lunch time
    }
    return "low";
  };

  useEffect(() => {
    const fetchPrediction = async () => {
      setIsLoading(true);
      const currentTraffic = getCurrentTraffic();
      setTraffic(currentTraffic);

      try {
        const response = await apiRequest("POST", "/api/ai/predict-delivery", {
          distance: calculateDistance(),
          orderItems: itemCount,
          restaurantPrepTime,
          currentTraffic,
          weatherCondition: weather,
          timeOfDay: new Date().toLocaleTimeString()
        });
        setPrediction(response);
      } catch (error) {
        console.error("Error getting prediction:", error);
        // Fallback prediction
        setPrediction({
          estimatedMinutes: 30 + Math.round(calculateDistance() * 5),
          confidence: 60,
          factors: ["Standard estimate based on distance"]
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrediction();
  }, [restaurantLocation, deliveryLocation, itemCount, restaurantPrepTime]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) return null;

  const getTrafficColor = () => {
    switch (traffic) {
      case "low": return "text-green-600";
      case "medium": return "text-yellow-600";
      case "high": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getConfidenceLabel = () => {
    if (prediction.confidence >= 80) return { label: "High Accuracy", color: "bg-green-500" };
    if (prediction.confidence >= 60) return { label: "Good Estimate", color: "bg-yellow-500" };
    return { label: "Rough Estimate", color: "bg-orange-500" };
  };

  const confidenceInfo = getConfidenceLabel();

  return (
    <Card className="border-green-200" data-testid="delivery-prediction">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            AI-Powered Delivery Estimate
          </CardTitle>
          <Badge className={confidenceInfo.color + " text-white"}>
            {confidenceInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Prediction */}
        <div className="text-center py-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Estimated Delivery Time</p>
          <p className="text-3xl font-bold text-green-600">
            {prediction.estimatedMinutes}-{prediction.estimatedMinutes + 10} min
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(Date.now() + prediction.estimatedMinutes * 60000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })} - {new Date(Date.now() + (prediction.estimatedMinutes + 10) * 60000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Confidence Score */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Prediction Confidence</span>
            <span className="font-medium">{prediction.confidence}%</span>
          </div>
          <Progress value={prediction.confidence} className="h-2" />
        </div>

        {/* Current Conditions */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-gray-50 rounded">
            <Car className={`h-4 w-4 mx-auto mb-1 ${getTrafficColor()}`} />
            <p className="text-xs text-gray-600">Traffic</p>
            <p className="text-xs font-medium capitalize">{traffic}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <CloudRain className="h-4 w-4 mx-auto mb-1 text-blue-600" />
            <p className="text-xs text-gray-600">Weather</p>
            <p className="text-xs font-medium capitalize">{weather.replace("_", " ")}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <MapPin className="h-4 w-4 mx-auto mb-1 text-orange-600" />
            <p className="text-xs text-gray-600">Distance</p>
            <p className="text-xs font-medium">{calculateDistance().toFixed(1)} km</p>
          </div>
        </div>

        {/* Factors Affecting Delivery */}
        {prediction.factors && prediction.factors.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Factors Considered
            </p>
            <div className="space-y-1">
              {prediction.factors.map((factor, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <p className="text-xs text-gray-600">{factor}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 italic">
          *Actual delivery time may vary based on real-time conditions
        </p>
      </CardContent>
    </Card>
  );
}