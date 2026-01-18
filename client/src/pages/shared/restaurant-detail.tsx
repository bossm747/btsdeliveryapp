import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuBrowserSkeleton } from "@/components/skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, Clock, Truck, MapPin, Phone, ArrowLeft, Heart, Share2, 
  Info, MessageCircle, ThumbsUp, Calendar, Globe, Facebook, 
  Instagram, CheckCircle2, XCircle, AlertCircle, Users, Award
} from "lucide-react";
import { Link } from "wouter";
import MenuBrowser from "@/components/menu-browser";
import CartSidebar from "@/components/cart-sidebar";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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

  const { data: reviews, isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: ["/api/restaurants", id, "reviews"],
    enabled: !!id,
  });

  const [isFavorite, setIsFavorite] = useState(false);
  const { toast } = useToast();

  if (restaurantLoading || categoriesLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="restaurant-loading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button skeleton */}
          <Skeleton className="h-10 w-40 mb-6 rounded-md" />

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              {/* Restaurant header card skeleton */}
              <div className="mb-8 rounded-xl overflow-hidden border bg-card">
                {/* Hero image */}
                <Skeleton className="h-64 w-full rounded-none" />

                {/* Content */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
                    <div className="flex-1">
                      <Skeleton className="h-9 w-64 mb-3" />
                      <div className="flex items-center space-x-4 mb-3">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-4" />
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-5 w-4" />
                        <Skeleton className="h-5 w-8" />
                      </div>
                      <Skeleton className="h-16 w-full max-w-2xl" />
                    </div>
                    <div className="flex flex-col items-end space-y-3 mt-4 md:mt-0">
                      <Skeleton className="h-12 w-36 rounded-xl" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </div>

                  {/* Quick info grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-3 w-16 mb-1" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Menu browser skeleton */}
              <div className="rounded-xl border bg-card p-6">
                <div className="flex space-x-2 mb-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24 rounded-md" />
                  ))}
                </div>
                <MenuBrowserSkeleton itemCount={5} />
              </div>
            </div>

            {/* Cart sidebar skeleton */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="rounded-xl border bg-card p-6">
                  <Skeleton className="h-6 w-24 mb-4" />
                  <div className="space-y-3 mb-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-px w-full mb-4" />
                  <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              </div>
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
  const socialMedia = restaurant.socialMedia as any;
  const deliveryText = restaurant.deliveryFee === "0" ? "Free delivery" : `₱${restaurant.deliveryFee} delivery fee`;

  // Check if restaurant is currently open
  const isCurrentlyOpen = () => {
    if (!operatingHours) return null;
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5);
    
    const dayHours = operatingHours[currentDay];
    if (!dayHours || dayHours.isClosed) return false;
    
    if (dayHours.open && dayHours.close) {
      return currentTime >= dayHours.open && currentTime <= dayHours.close;
    }
    return true;
  };

  const openStatus = isCurrentlyOpen();

  // Toggle favorite
  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite 
        ? `${restaurant.name} removed from your favorites` 
        : `${restaurant.name} added to your favorites`,
    });
  };

  // Share restaurant
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Check out ${restaurant.name} on BTS Delivery`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Restaurant link copied to clipboard",
      });
    }
  };

  // Calculate review statistics
  const reviewStats = reviews ? {
    average: reviews.reduce((sum: number, review: any) => sum + review.restaurantRating, 0) / reviews.length,
    total: reviews.length,
    distribution: [5, 4, 3, 2, 1].map(rating => 
      reviews.filter((review: any) => review.restaurantRating === rating).length
    )
  } : null;

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
            <Card className="mb-8 overflow-hidden" data-testid="restaurant-header">
              <div className="relative">
                <img 
                  src={restaurant.imageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"} 
                  alt={`${restaurant.name} restaurant`}
                  className="w-full h-64 object-cover"
                  data-testid="restaurant-hero-image"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex space-x-2">
                  {restaurant.isFeatured && (
                    <Badge className="bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white">
                      <Award className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {openStatus !== null && (
                    <Badge variant={openStatus ? "default" : "destructive"} className="bg-white/90 text-black">
                      {openStatus ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                          Open Now
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1 text-red-600" />
                          Closed
                        </>
                      )}
                    </Badge>
                  )}
                  {!restaurant.isAcceptingOrders && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Not Accepting Orders
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-white/90 hover:bg-white text-black"
                    onClick={handleToggleFavorite}
                    data-testid="favorite-button"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-white/90 hover:bg-white text-black"
                    onClick={handleShare}
                    data-testid="share-button"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-3xl font-bold text-[#004225]" data-testid="restaurant-name">
                        {restaurant.name}
                      </h1>
                      {(restaurant as any).isVerified && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-gray-600 mb-3">
                      <span className="font-medium" data-testid="restaurant-category">{restaurant.category}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span data-testid="restaurant-location">{address?.city || "Batangas"}</span>
                      </div>
                      <span>•</span>
                      <span className="font-semibold text-green-600">₱₱</span>
                    </div>

                    {restaurant.description && (
                      <p className="text-gray-700 mb-4 max-w-2xl" data-testid="restaurant-description">
                        {restaurant.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-3">
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-2 rounded-xl border border-yellow-200">
                      <Star className="w-5 h-5 text-yellow-500 fill-current" />
                      <span className="font-bold text-lg text-gray-900" data-testid="restaurant-rating">
                        {reviewStats?.average?.toFixed(1) || restaurant.rating || "4.5"}
                      </span>
                      <span className="text-gray-600">
                        ({reviewStats?.total || restaurant.totalReviews || 0} reviews)
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{restaurant.totalOrders || 0} orders completed</span>
                    </div>
                  </div>
                </div>


                {/* Quick Info Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Delivery Time</p>
                      <p className="font-semibold text-gray-900" data-testid="delivery-time">
                        {restaurant.estimatedDeliveryTime || 30} mins
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Delivery Fee</p>
                      <p className="font-semibold text-gray-900" data-testid="delivery-fee">
                        {deliveryText}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-sm">₱</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Minimum Order</p>
                      <p className="font-semibold text-gray-900" data-testid="minimum-order">
                        ₱{restaurant.minimumOrder || 0}
                      </p>
                    </div>
                  </div>
                  
                  {restaurant.phone && (
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Phone className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Contact</p>
                        <p className="font-semibold text-gray-900" data-testid="restaurant-phone">
                          {restaurant.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Restaurant Information Tabs */}
            <Card className="mb-8">
              <Tabs defaultValue="menu" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4">
                  <TabsTrigger value="menu" className="flex items-center space-x-2">
                    <span>🍽️</span>
                    <span>Menu</span>
                  </TabsTrigger>
                  <TabsTrigger value="info" className="flex items-center space-x-2">
                    <span>ℹ️</span>
                    <span>Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="flex items-center space-x-2">
                    <span>⭐</span>
                    <span>Reviews</span>
                  </TabsTrigger>
                  <TabsTrigger value="photos" className="flex items-center space-x-2">
                    <span>📸</span>
                    <span>Photos</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="menu" className="mt-6">
                  <MenuBrowser 
                    categories={categories || []}
                    menuItems={menuItems || []}
                    restaurantId={restaurant.id}
                  />
                </TabsContent>
                
                <TabsContent value="info" className="mt-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Operating Hours */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-green-600" />
                          <span>Operating Hours</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {operatingHours ? (
                          Object.entries(operatingHours).map(([day, hours]: [string, any]) => {
                            const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day;
                            const isClosed = hours?.isClosed;
                            
                            return (
                              <div 
                                key={day} 
                                className={`flex justify-between items-center p-2 rounded ${
                                  isToday ? 'bg-blue-50 border border-blue-200' : ''
                                }`}
                              >
                                <span className={`capitalize font-medium ${isToday ? 'text-blue-900' : 'text-gray-700'}`}>
                                  {day}
                                  {isToday && <Badge className="ml-2 text-xs bg-blue-500">Today</Badge>}
                                </span>
                                <span className={`${
                                  isClosed 
                                    ? 'text-red-600 font-medium' 
                                    : isToday ? 'text-blue-900 font-semibold' : 'text-gray-600'
                                }`}>
                                  {isClosed ? 'Closed' : `${hours?.open} - ${hours?.close}`}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-500">Operating hours not available</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Contact & Location */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <MapPin className="w-5 h-5 text-blue-600" />
                          <span>Contact & Location</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                            <div>
                              <p className="font-medium text-gray-900">Address</p>
                              <p className="text-sm text-gray-600">
                                {address?.street || 'Street address not available'}<br />
                                {address?.barangay && `${address.barangay}, `}
                                {address?.city || 'Batangas'}, {address?.province || 'Batangas'}
                                {address?.zipCode && ` ${address.zipCode}`}
                              </p>
                            </div>
                          </div>
                          
                          {restaurant.phone && (
                            <div className="flex items-center space-x-3">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-900">Phone</p>
                                <p className="text-sm text-gray-600">{restaurant.phone}</p>
                              </div>
                            </div>
                          )}
                          
                          {restaurant.email && (
                            <div className="flex items-center space-x-3">
                              <span className="w-4 h-4 text-gray-500">📧</span>
                              <div>
                                <p className="font-medium text-gray-900">Email</p>
                                <p className="text-sm text-gray-600">{restaurant.email}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Social Media */}
                        {socialMedia && (socialMedia.facebook || socialMedia.instagram) && (
                          <div className="pt-4 border-t border-gray-200">
                            <p className="font-medium text-gray-900 mb-3">Follow Us</p>
                            <div className="flex space-x-3">
                              {socialMedia.facebook && (
                                <a 
                                  href={socialMedia.facebook}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                                >
                                  <Facebook className="w-4 h-4" />
                                  <span className="text-sm">Facebook</span>
                                </a>
                              )}
                              {socialMedia.instagram && (
                                <a 
                                  href={socialMedia.instagram}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 text-pink-600 hover:text-pink-800"
                                >
                                  <Instagram className="w-4 h-4" />
                                  <span className="text-sm">Instagram</span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="reviews" className="mt-6">
                  <div className="space-y-6">
                    {/* Reviews Summary */}
                    {reviewStats && (
                      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <div className="text-center">
                              <div className="text-4xl font-bold text-gray-900 mb-2">
                                {reviewStats.average.toFixed(1)}
                              </div>
                              <div className="flex items-center justify-center mb-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star 
                                    key={i}
                                    className={`w-5 h-5 ${
                                      i < Math.floor(reviewStats.average) 
                                        ? 'text-yellow-500 fill-current' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-sm text-gray-600">{reviewStats.total} reviews</p>
                            </div>
                            
                            <div className="flex-1 ml-8">
                              {reviewStats.distribution.map((count, index) => {
                                const rating = 5 - index;
                                const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                                
                                return (
                                  <div key={rating} className="flex items-center space-x-3 mb-2">
                                    <span className="text-sm font-medium w-6">{rating}★</span>
                                    <Progress value={percentage} className="flex-1 h-2" />
                                    <span className="text-sm text-gray-500 w-8">{count}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Individual Reviews */}
                    <div className="space-y-4">
                      {reviews && reviews.length > 0 ? (
                        reviews.slice(0, 10).map((review: any) => (
                          <Card key={review.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-4">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                    {review.customer?.firstName?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {review.customer?.firstName || 'Anonymous'}
                                      </p>
                                      <div className="flex items-center space-x-2">
                                        <div className="flex">
                                          {Array.from({ length: 5 }).map((_, i) => (
                                            <Star 
                                              key={i}
                                              className={`w-4 h-4 ${
                                                i < review.restaurantRating 
                                                  ? 'text-yellow-500 fill-current' 
                                                  : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-sm text-gray-500">
                                          {new Date(review.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {review.comment && (
                                    <p className="text-gray-700 text-sm">{review.comment}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <Card className="text-center py-12">
                          <CardContent>
                            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
                            <p className="text-gray-600">Be the first to review this restaurant!</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="photos" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {restaurant.galleryImages && (restaurant.galleryImages as string[]).length > 0 ? (
                          (restaurant.galleryImages as string[]).map((image, index) => (
                            <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img 
                                src={image} 
                                alt={`${restaurant.name} photo ${index + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                              />
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-2xl">📸</span>
                            </div>
                            <p className="text-gray-600">No photos available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CartSidebar 
                deliveryFee={parseFloat(restaurant.deliveryFee || "0")}
                serviceFee={0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
