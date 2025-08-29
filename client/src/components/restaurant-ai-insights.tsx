import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  TrendingUp, Calendar, DollarSign, Sparkles, 
  AlertCircle, Copy, Share2, Users, Package
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";

interface RestaurantAIInsightsProps {
  restaurantId: string;
  restaurantName: string;
  cuisine: string;
}

export default function RestaurantAIInsights({ 
  restaurantId, 
  restaurantName,
  cuisine 
}: RestaurantAIInsightsProps) {
  const { toast } = useToast();
  const [promoType, setPromoType] = useState<"discount" | "bundle" | "new_item" | "seasonal">("discount");
  const [targetAudience, setTargetAudience] = useState("families");
  const [promoContext, setPromoContext] = useState("");

  // Fetch demand forecast
  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ["ai-forecast", restaurantId],
    queryFn: async () => {
      // Generate sample historical data for demo
      const historicalData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (30 - i));
        return {
          date,
          dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()],
          orderCount: Math.floor(Math.random() * 50) + 20,
          totalRevenue: Math.floor(Math.random() * 5000) + 2000,
          weather: Math.random() > 0.7 ? "rain" : "clear",
          hasPromo: Math.random() > 0.8
        };
      });

      const response = await apiRequest("POST", "/api/ai/demand-forecast", {
        restaurantId,
        historicalData,
        upcomingDays: 7
      });
      return response;
    }
  });

  // Generate promo content
  const generatePromoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/generate-promo", {
        restaurantName,
        cuisine,
        targetAudience,
        promoType,
        context: promoContext
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Promo Content Generated!",
        description: "Your AI-generated promotional content is ready.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate promo content. Please try again.",
        variant: "destructive"
      });
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard.",
    });
  };

  // Prepare chart data
  const chartData = forecast?.forecast?.map((day: any) => ({
    date: new Date(day.date).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" }),
    orders: day.expectedOrders,
    confidence: day.confidenceLevel
  })) || [];

  return (
    <div className="space-y-6" data-testid="restaurant-ai-insights">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <CardTitle>AI Business Insights</CardTitle>
            </div>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              Powered by Gemini AI
            </Badge>
          </div>
          <CardDescription>
            Smart predictions and content generation for your restaurant
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forecast">Demand Forecast</TabsTrigger>
          <TabsTrigger value="insights">Peak Insights</TabsTrigger>
          <TabsTrigger value="promo">Promo Generator</TabsTrigger>
        </TabsList>

        {/* Demand Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                7-Day Order Forecast
              </CardTitle>
              <CardDescription>
                AI-predicted order volume for the next week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forecastLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#FF6B35" 
                      fill="#FF6B35" 
                      fillOpacity={0.3}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#FFD23F" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Forecast Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecast?.forecast?.slice(0, 6).map((day: any, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {new Date(day.date).toLocaleDateString("en-PH", { 
                        weekday: "long",
                        month: "short",
                        day: "numeric"
                      })}
                    </CardTitle>
                    <Badge variant={day.confidenceLevel > 70 ? "default" : "secondary"}>
                      {day.confidenceLevel}% sure
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {day.expectedOrders} orders
                  </div>
                  <div className="space-y-1">
                    {day.recommendations?.slice(0, 2).map((rec: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-green-600 mt-0.5">•</span>
                        {rec}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Peak Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Peak Hours & Stocking Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Peak Hours */}
              <div>
                <h4 className="font-medium mb-3">Predicted Peak Hours</h4>
                <div className="flex flex-wrap gap-2">
                  {forecast?.peakHours?.map((hour: string, index: number) => (
                    <Badge key={index} variant="outline" className="py-2 px-3">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {hour}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Stocking Suggestions */}
              <div>
                <h4 className="font-medium mb-3">Inventory Recommendations</h4>
                <div className="space-y-2">
                  {forecast?.stockingSuggestions?.map((suggestion: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <Package className="h-4 w-4 text-orange-600 mt-0.5" />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Insights */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium">Pro Tip</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Based on patterns, Fridays and Saturdays show 40% higher order volume. 
                  Consider scheduling more staff and preparing extra inventory for weekends.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promo Generator Tab */}
        <TabsContent value="promo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Promo Content Generator
              </CardTitle>
              <CardDescription>
                Generate engaging promotional content for your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Promo Type</label>
                  <Select value={promoType} onValueChange={(value: any) => setPromoType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Discount Offer</SelectItem>
                      <SelectItem value="bundle">Bundle Deal</SelectItem>
                      <SelectItem value="new_item">New Item Launch</SelectItem>
                      <SelectItem value="seasonal">Seasonal Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Target Audience</label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="families">Families</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="professionals">Professionals</SelectItem>
                      <SelectItem value="seniors">Seniors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Additional Context (Optional)</label>
                <Textarea
                  placeholder="E.g., Anniversary sale, Fiesta special, Rainy day promo..."
                  value={promoContext}
                  onChange={(e) => setPromoContext(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <Button 
                onClick={() => generatePromoMutation.mutate()}
                disabled={generatePromoMutation.isPending}
                className="w-full"
              >
                {generatePromoMutation.isPending ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Promo Content
                  </>
                )}
              </Button>

              {generatePromoMutation.data && (
                <div className="space-y-4 mt-6">
                  {/* Tagline */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Tagline</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatePromoMutation.data.tagline)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-lg font-bold text-orange-600">
                      {generatePromoMutation.data.tagline}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Description</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatePromoMutation.data.description)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm">{generatePromoMutation.data.description}</p>
                  </div>

                  {/* Social Media Post */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Share2 className="h-4 w-4" />
                        Social Media Post
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatePromoMutation.data.socialMediaPost)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {generatePromoMutation.data.socialMediaPost}
                    </p>
                  </div>

                  {/* SMS Message */}
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">SMS Message</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatePromoMutation.data.smsMessage)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm font-mono">{generatePromoMutation.data.smsMessage}</p>
                  </div>

                  {/* Terms */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Terms & Conditions</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {generatePromoMutation.data.terms?.map((term: string, index: number) => (
                        <li key={index}>• {term}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}