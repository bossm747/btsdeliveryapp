import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Clock, Truck, MapPin, Phone, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import MenuBrowser from "@/components/menu-browser";
import CartSidebar from "@/components/cart-sidebar";
import type { Restaurant, MenuCategory, MenuItem } from "@shared/schema";

export default function RestaurantDetail() {
  const { id } = useParams();

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", id],
    enabled: !!id,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: ["/api/restaurants", id, "categories"],
    enabled: !!id,
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", id, "menu"],
    enabled: !!id,
  });

  if (restaurantLoading || categoriesLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="restaurant-loading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <Skeleton className="h-64 w-full rounded-xl mb-6" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="restaurant-not-found">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-foreground mb-4">Restaurant not found</h1>
            <p className="text-muted-foreground mb-6">The restaurant you're looking for doesn't exist or has been removed.</p>
            <Link href="/restaurants">
              <Button>Back to Restaurants</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const address = restaurant.address as any;
  const operatingHours = restaurant.operatingHours as any;
  const deliveryText = restaurant.deliveryFee === "0" ? "Free delivery" : `₱${restaurant.deliveryFee} delivery fee`;

  return (
    <div className="min-h-screen bg-background py-8" data-testid="restaurant-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/restaurants">
          <Button variant="ghost" className="mb-6" data-testid="back-to-restaurants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Restaurants
          </Button>
        </Link>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Restaurant Header */}
            <Card className="mb-8" data-testid="restaurant-header">
              <div className="relative">
                <img 
                  src={restaurant.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"} 
                  alt={`${restaurant.name} restaurant`}
                  className="w-full h-64 object-cover rounded-t-lg"
                  data-testid="restaurant-hero-image"
                />
                {restaurant.isFeatured && (
                  <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground">
                    Featured
                  </Badge>
                )}
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="restaurant-name">
                      {restaurant.name}
                    </h1>
                    <div className="flex items-center space-x-4 text-muted-foreground">
                      <span data-testid="restaurant-category">{restaurant.category}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span data-testid="restaurant-location">{address?.city || "Batangas"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-4 md:mt-0">
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 text-accent fill-current" />
                      <span className="font-semibold text-lg" data-testid="restaurant-rating">
                        {restaurant.rating || "4.5"}
                      </span>
                      <span className="text-muted-foreground">({restaurant.totalOrders || 0} orders)</span>
                    </div>
                  </div>
                </div>

                {restaurant.description && (
                  <p className="text-muted-foreground mb-4" data-testid="restaurant-description">
                    {restaurant.description}
                  </p>
                )}

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-success" />
                    <span className="text-sm" data-testid="delivery-time">
                      {restaurant.estimatedDeliveryTime || 30} mins delivery
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="text-sm" data-testid="delivery-fee">
                      {deliveryText}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold" data-testid="minimum-order">
                      Min order: ₱{restaurant.minimumOrder || 0}
                    </span>
                  </div>
                  {restaurant.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-secondary" />
                      <span className="text-sm" data-testid="restaurant-phone">
                        {restaurant.phone}
                      </span>
                    </div>
                  )}
                </div>

                {operatingHours && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="font-semibold text-foreground mb-2">Operating Hours</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                      {Object.entries(operatingHours).map(([day, hours]: [string, any]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize">{day}:</span>
                          <span>{hours?.open} - {hours?.close}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Menu Browser */}
            <MenuBrowser 
              categories={categories || []}
              menuItems={menuItems || []}
              restaurantId={restaurant.id}
            />
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CartSidebar 
                deliveryFee={parseFloat(restaurant.deliveryFee)}
                serviceFee={0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
