import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Heart,
  HeartOff,
  Star,
  Clock,
  Truck,
  MapPin,
  ArrowLeft,
  Search,
  Store,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  rating?: string;
  estimatedDeliveryTime?: number;
  deliveryFee?: string;
  isOpen?: boolean;
  address?: {
    street?: string;
    city?: string;
    province?: string;
  };
}

interface FavoriteRestaurant {
  id: string;
  userId: string;
  restaurantId: string;
  createdAt: string;
  restaurant: Restaurant;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteRestaurant | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  // Fetch favorite restaurants
  const { data: favorites = [], isLoading, error } = useQuery<FavoriteRestaurant[]>({
    queryKey: ["/api/customer/favorites"],
    enabled: !!user,
  });

  // Remove from favorites mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      const response = await apiRequest("DELETE", `/api/customer/favorites/${restaurantId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Removed from Favorites",
        description: "Restaurant has been removed from your favorites.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/favorites"] });
      setIsRemoveDialogOpen(false);
      setSelectedFavorite(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove from favorites",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFavorite = () => {
    if (selectedFavorite) {
      removeFavoriteMutation.mutate(selectedFavorite.restaurantId);
    }
  };

  const openRemoveDialog = (favorite: FavoriteRestaurant) => {
    setSelectedFavorite(favorite);
    setIsRemoveDialogOpen(true);
  };

  // Filter favorites based on search query
  const filteredFavorites = favorites.filter((favorite) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      favorite.restaurant.name.toLowerCase().includes(query) ||
      favorite.restaurant.category?.toLowerCase().includes(query) ||
      favorite.restaurant.description?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="favorites-loading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="favorites-error">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Unable to load favorites</h2>
              <p className="text-gray-600 mb-4">
                There was an error loading your favorite restaurants. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8" data-testid="favorites-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/customer-dashboard">
              <Button variant="ghost" data-testid="back-button">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#004225]" data-testid="page-title">
                My Favorites
              </h1>
              <p className="text-gray-600">
                {favorites.length} favorite restaurant{favorites.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Search */}
          {favorites.length > 0 && (
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
          )}
        </div>

        {/* Favorites Grid */}
        {favorites.length === 0 ? (
          <Card data-testid="no-favorites">
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No favorite restaurants yet</h3>
              <p className="text-gray-600 mb-4">
                Start adding your favorite restaurants to quickly find them later
              </p>
              <Link href="/restaurants">
                <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                  <Store className="mr-2 h-4 w-4" />
                  Browse Restaurants
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredFavorites.length === 0 ? (
          <Card data-testid="no-search-results">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-gray-600">
                No favorite restaurants match "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="favorites-grid">
            {filteredFavorites.map((favorite) => (
              <Card
                key={favorite.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
                data-testid={`favorite-card-${favorite.id}`}
              >
                <div className="relative">
                  <img
                    src={
                      favorite.restaurant.imageUrl ||
                      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
                    }
                    alt={favorite.restaurant.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge
                      className={
                        favorite.restaurant.isOpen !== false
                          ? "bg-green-500 text-white"
                          : "bg-gray-500 text-white"
                      }
                    >
                      {favorite.restaurant.isOpen !== false ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  {/* Remove Favorite Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 bg-white/80 hover:bg-white text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.preventDefault();
                      openRemoveDialog(favorite);
                    }}
                    data-testid="remove-favorite-button"
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </Button>
                </div>

                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3
                        className="font-bold text-lg text-[#004225] group-hover:text-[#FF6B35] transition-colors"
                        data-testid="restaurant-name"
                      >
                        {favorite.restaurant.name}
                      </h3>
                      <p className="text-sm text-gray-600" data-testid="restaurant-category">
                        {favorite.restaurant.category || "Restaurant"}
                      </p>
                    </div>
                    {favorite.restaurant.rating && (
                      <div className="flex items-center gap-1 bg-[#FFD23F]/20 px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 text-[#FF6B35] fill-current" />
                        <span className="font-bold text-sm text-[#004225]">
                          {favorite.restaurant.rating}
                        </span>
                      </div>
                    )}
                  </div>

                  {favorite.restaurant.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {favorite.restaurant.description}
                    </p>
                  )}

                  {favorite.restaurant.address?.city && (
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <MapPin className="w-4 h-4 mr-1" />
                      {favorite.restaurant.address.city}
                      {favorite.restaurant.address.province &&
                        `, ${favorite.restaurant.address.province}`}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1 text-green-600" />
                      <span>{favorite.restaurant.estimatedDeliveryTime || 30} mins</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Truck className="w-4 h-4 mr-1 text-blue-600" />
                      <span>
                        {favorite.restaurant.deliveryFee === "0"
                          ? "Free delivery"
                          : `₱${favorite.restaurant.deliveryFee || "50"}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link href={`/restaurant/${favorite.restaurant.id}`} className="flex-1">
                      <Button
                        className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                        data-testid="view-restaurant-button"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Menu
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <HeartOff className="w-5 h-5 text-gray-500" />
                Remove from Favorites
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove "{selectedFavorite?.restaurant.name}" from
                your favorites?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveFavorite}
                className="bg-red-600 hover:bg-red-700"
                data-testid="confirm-remove-button"
              >
                {removeFavoriteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
