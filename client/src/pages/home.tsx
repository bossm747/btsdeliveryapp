import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Bell, ChevronRight, Clock, Star, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Restaurant } from "@shared/schema";
import MobileNav from "@/components/mobile-nav";
import PWAInstall from "@/components/pwa-install";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const featuredRestaurants = restaurants?.filter(r => r.isFeatured).slice(0, 6) || [];

  const services = [
    { 
      name: "Food", 
      icon: "🍔", 
      path: "/restaurants",
      color: "bg-orange-100",
      description: "Order from restaurants"
    },
    { 
      name: "Pabili", 
      icon: "🛒", 
      path: "/pabili",
      color: "bg-green-100",
      description: "Shopping service"
    },
    { 
      name: "Pabayad", 
      icon: "💳", 
      path: "/pabayad",
      color: "bg-blue-100",
      description: "Bills payment"
    },
    { 
      name: "Padala", 
      icon: "📦", 
      path: "/parcel",
      color: "bg-purple-100",
      description: "Send parcels"
    },
    { 
      name: "Mart", 
      icon: "🏪", 
      path: "/mart",
      color: "bg-yellow-100",
      description: "Grocery shopping"
    },
    { 
      name: "Express", 
      icon: "🚚", 
      path: "/express",
      color: "bg-red-100",
      description: "Express delivery"
    }
  ];

  const categories = [
    { name: "All", emoji: "🍽️", active: true },
    { name: "Fast Food", emoji: "🍟" },
    { name: "Pizza", emoji: "🍕" },
    { name: "Filipino", emoji: "🥘" },
    { name: "Chicken", emoji: "🍗" },
    { name: "Coffee", emoji: "☕" },
    { name: "Desserts", emoji: "🍰" },
    { name: "Healthy", emoji: "🥗" }
  ];

  const promos = [
    {
      title: "50% OFF First Order",
      subtitle: "New users only",
      color: "from-orange-400 to-red-500",
      emoji: "🎉"
    },
    {
      title: "Free Delivery",
      subtitle: "Min. order ₱500",
      color: "from-green-400 to-emerald-500",
      emoji: "🚚"
    },
    {
      title: "Cashback ₱100",
      subtitle: "Use GCash payment",
      color: "from-blue-400 to-purple-500",
      emoji: "💰"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="home-page">
      {/* Mobile Header - Fixed */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        {/* Location Bar */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <Link href="/location">
              <button className="flex items-center gap-2 flex-1" data-testid="button-location">
                <MapPin className="h-5 w-5 text-orange-500" />
                <div className="text-left">
                  <p className="text-xs text-gray-500">Deliver to</p>
                  <p className="text-sm font-semibold truncate">Batangas City, Batangas</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </button>
            </Link>
            <Link href="/notifications">
              <button className="ml-3 p-2 relative" data-testid="button-notifications">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for food, shops, or services"
              className="pl-10 pr-4 h-10 bg-gray-50 border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-8 md:pb-4">
        {/* Services Grid */}
        <section className="px-4 py-6 bg-gradient-to-b from-white to-gray-50/50 border-b border-gray-100">
          <h2 className="text-lg font-bold mb-4 text-[#004225] flex items-center">
            <span className="w-1 h-6 bg-gradient-to-b from-[#FF6B35] to-[#FFD23F] rounded-full mr-3"></span>
            Our Services
          </h2>
          <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
            {services.map((service) => (
              <Link key={service.path} href={service.path}>
                <div className="flex flex-col items-center p-4 rounded-2xl bts-hover-lift transition-all bg-white border-2 border-gray-100 hover:border-[#FFD23F]/30 shadow-lg hover:shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] flex items-center justify-center mb-3 shadow-lg">
                    <span className="text-2xl filter drop-shadow-sm">{service.icon}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#004225] text-center leading-tight">{service.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Promotions Carousel */}
        <section className="px-4 py-6 bg-gradient-to-r from-[#004225]/5 to-[#FF6B35]/5 border-b border-[#FFD23F]/20">
          <h2 className="text-lg font-bold mb-4 text-[#004225] flex items-center">
            <span className="w-1 h-6 bg-gradient-to-b from-[#FFD23F] to-[#FF6B35] rounded-full mr-3"></span>
            Special Offers
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {promos.map((promo, index) => (
              <div
                key={index}
                className="min-w-[300px] p-5 rounded-2xl bg-gradient-to-br from-[#FF6B35] via-[#FF6B35] to-[#004225] text-white shadow-2xl bts-hover-lift border border-[#FFD23F]/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{promo.title}</h3>
                    <p className="text-sm opacity-90">{promo.subtitle}</p>
                  </div>
                  <span className="text-3xl">{promo.emoji}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="px-4 py-6 bg-gradient-to-l from-white to-[#FFD23F]/10 border-b border-gray-100">
          <h2 className="text-lg font-bold mb-4 text-[#004225] flex items-center">
            <span className="w-1 h-6 bg-gradient-to-b from-[#004225] to-[#FF6B35] rounded-full mr-3"></span>
            Categories
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((category) => (
              <button
                key={category.name}
                className={`flex flex-col items-center min-w-[80px] p-4 rounded-2xl transition-all bts-hover-lift shadow-lg ${
                  category.active 
                    ? 'bg-gradient-to-br from-[#FF6B35] to-[#004225] text-white shadow-xl border-2 border-[#FFD23F]/50' 
                    : 'bg-white border-2 border-gray-200 hover:border-[#FF6B35]/30 hover:shadow-xl'
                }`}
                data-testid={`category-${category.name.toLowerCase()}`}
              >
                <span className="text-2xl mb-1">{category.emoji}</span>
                <span className="text-xs font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* AI Recommendations */}
        <section className="px-4 py-6 bg-gradient-to-br from-[#FFD23F]/10 via-white to-[#FF6B35]/10 border-b border-[#004225]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD23F] to-[#FF6B35] flex items-center justify-center shadow-lg">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-[#004225]">AI Recommendations</h2>
            </div>
            <Link href="/ai-recommendations">
              <Button variant="ghost" size="sm" className="text-[#FF6B35] hover:bg-[#FF6B35]/10 border border-[#FF6B35]/30">
                See all
              </Button>
            </Link>
          </div>
          
          <div className="bg-gradient-to-br from-white to-[#FFD23F]/10 rounded-2xl p-5 border-2 border-[#FFD23F]/30 shadow-xl backdrop-blur-sm">
            <p className="text-sm text-gray-700 mb-2">Powered by Innovatehub AI "Pareng Boyong"</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span>🍗</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Jollibee Batangas</p>
                    <p className="text-xs text-gray-500">95% match • Fast delivery</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Popular Restaurants */}
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Popular Near You</h2>
            <Link href="/restaurants">
              <Button variant="ghost" size="sm" className="text-orange-500">
                See all
              </Button>
            </Link>
          </div>
          
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-20 h-20 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                </Card>
              ))
            ) : featuredRestaurants.length > 0 ? (
              featuredRestaurants.map((restaurant) => (
                <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`}>
                  <Card className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex gap-3">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🍽️</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{restaurant.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{restaurant.cuisine}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-xs font-medium">{restaurant.rating || 4.5}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{restaurant.deliveryTime || '25-35'} min</span>
                          </div>
                          {restaurant.isFeatured && (
                            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-600">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No restaurants available in your area</p>
                <Link href="/restaurants">
                  <Button className="mt-4">Browse All Restaurants</Button>
                </Link>
              </Card>
            )}
          </div>
        </section>

        {/* Recommended Dishes */}
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Try Something New</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Chickenjoy", restaurant: "Jollibee", price: "₱89", emoji: "🍗" },
              { name: "Hawaiian Pizza", restaurant: "Greenwich", price: "₱299", emoji: "🍕" },
              { name: "PM2 Inasal", restaurant: "Mang Inasal", price: "₱139", emoji: "🍖" },
              { name: "Sisig Bowl", restaurant: "Max's", price: "₱175", emoji: "🥘" }
            ].map((dish, index) => (
              <Card key={index} className="p-3">
                <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-3xl">{dish.emoji}</span>
                </div>
                <h4 className="font-medium text-sm">{dish.name}</h4>
                <p className="text-xs text-gray-500">{dish.restaurant}</p>
                <p className="text-sm font-bold text-orange-500 mt-1">{dish.price}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
      
      {/* PWA Install Prompt */}
      <PWAInstall />
    </div>
  );
}