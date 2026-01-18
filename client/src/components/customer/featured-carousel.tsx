import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Link } from "wouter";
import { Sparkles, Star, Clock, Truck, ChevronLeft, ChevronRight } from "lucide-react";
import type { Restaurant } from "@shared/schema";

interface FeaturedCarouselProps {
  title?: string;
  subtitle?: string;
  autoplayDelay?: number;
}

export default function FeaturedCarousel({
  title = "Featured Restaurants",
  subtitle = "Hand-picked favorites for you",
  autoplayDelay = 4000
}: FeaturedCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants", "featured"],
    queryFn: async () => {
      const response = await fetch("/api/restaurants");
      if (!response.ok) throw new Error("Failed to fetch restaurants");
      const data = await response.json();
      return data.filter((r: Restaurant) => r.isFeatured).slice(0, 8);
    }
  });

  const autoplayPlugin = Autoplay({ delay: autoplayDelay, stopOnInteraction: true });

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);
  const scrollTo = useCallback((index: number) => api?.scrollTo(index), [api]);

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-40 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!restaurants || restaurants.length === 0) return null;

  return (
    <div className="px-4 py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-[#FFD23F] to-[#FF6B35] rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-[#004225] text-lg">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <Link href="/restaurants?featured=true">
          <Button variant="ghost" size="sm" className="text-[#FF6B35] font-medium">
            View All
          </Button>
        </Link>
      </div>

      {/* Featured Carousel */}
      <div className="relative">
        <Carousel
          setApi={setApi}
          plugins={[autoplayPlugin]}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {restaurants.map((restaurant) => {
              const address = restaurant.address as any;
              const deliveryText = restaurant.deliveryFee === "0"
                ? "Free delivery"
                : `PHP ${restaurant.deliveryFee} delivery`;

              return (
                <CarouselItem key={restaurant.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/2">
                  <Link href={`/restaurant/${restaurant.id}`}>
                    <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-0 shadow-lg group h-full">
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={restaurant.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop"}
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Featured Badge */}
                        <Badge className="absolute top-3 left-3 bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white font-bold featured-badge-shine">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                        {/* Rating */}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="font-bold text-sm">{restaurant.rating || "4.5"}</span>
                        </div>
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        {/* Content on Image */}
                        <div className="absolute bottom-4 left-4 right-4">
                          <h4 className="font-bold text-white text-xl mb-1">{restaurant.name}</h4>
                          <p className="text-white/90 text-sm mb-2">
                            {restaurant.category || "Filipino Food"} • {address?.city || "Batangas"}
                          </p>
                        </div>
                      </div>

                      <CardContent className="p-4 bg-gradient-to-b from-white to-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{restaurant.estimatedDeliveryTime || 30} min</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Truck className="w-4 h-4 text-blue-500" />
                            <span className={`font-medium ${restaurant.deliveryFee === "0" ? "text-green-600" : "text-gray-600"}`}>
                              {deliveryText}
                            </span>
                          </div>
                        </div>
                        {restaurant.description && (
                          <p className="text-gray-500 text-xs mt-2 line-clamp-2">
                            {restaurant.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -left-2 md:left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg hidden md:flex z-10"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-6 w-6 text-gray-800" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-2 md:right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg hidden md:flex z-10"
          onClick={scrollNext}
        >
          <ChevronRight className="h-6 w-6 text-gray-800" />
        </Button>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`transition-all duration-300 rounded-full ${
              index === current
                ? "w-6 h-2 bg-[#FF6B35]"
                : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
