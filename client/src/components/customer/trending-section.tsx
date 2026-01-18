import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Flame, Star, Clock, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import type { Restaurant } from "@shared/schema";

interface TrendingSectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
}

export default function TrendingSection({
  title = "What's Popular",
  subtitle = "Trending in Batangas",
  limit = 10
}: TrendingSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants", "trending"],
    queryFn: async () => {
      const response = await fetch("/api/restaurants");
      if (!response.ok) throw new Error("Failed to fetch restaurants");
      const data = await response.json();
      // Sort by popularity (totalOrders) and limit
      return data
        .sort((a: Restaurant, b: Restaurant) => (b.totalOrders || 0) - (a.totalOrders || 0))
        .slice(0, limit);
    }
  });

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
  }, [restaurants]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="min-w-[260px] h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!restaurants || restaurants.length === 0) return null;

  return (
    <div className="px-4 py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-[#004225] text-lg flex items-center gap-1">
              {title}
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <Link href="/restaurants?sort=popularity">
          <Button variant="ghost" size="sm" className="text-[#FF6B35] font-medium">
            See All
          </Button>
        </Link>
      </div>

      {/* Restaurant Carousel */}
      <div className="relative">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-lg border hidden md:flex"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          onScroll={checkScrollButtons}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {restaurants.map((restaurant, index) => {
            const address = restaurant.address as any;
            return (
              <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`}>
                <Card className="min-w-[260px] max-w-[260px] cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border-0 shadow-md group">
                  {/* Image */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={restaurant.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop"}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Rank Badge */}
                    <div className="absolute top-3 left-3 w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      #{index + 1}
                    </div>
                    {/* Featured Badge */}
                    {restaurant.isFeatured && (
                      <Badge className="absolute top-3 right-3 bg-[#004225] text-white text-xs">
                        Featured
                      </Badge>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {/* Restaurant Info on Image */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h4 className="font-bold text-white text-base truncate">{restaurant.name}</h4>
                      <p className="text-white/80 text-xs truncate">
                        {restaurant.category || "Filipino Food"} • {address?.city || "Batangas"}
                      </p>
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      {/* Rating */}
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-semibold text-sm text-gray-900">
                          {restaurant.rating || "4.5"}
                        </span>
                      </div>
                      {/* Delivery Time */}
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{restaurant.estimatedDeliveryTime || 30} min</span>
                      </div>
                      {/* Order Count */}
                      <div className="text-xs text-gray-400">
                        {(restaurant.totalOrders || 0) > 1000
                          ? `${((restaurant.totalOrders || 0) / 1000).toFixed(1)}k orders`
                          : `${restaurant.totalOrders || 0}+ orders`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-lg border hidden md:flex"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
