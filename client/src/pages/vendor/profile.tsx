import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Store, 
  Edit,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Star,
  Settings,
  Camera
} from "lucide-react";
import type { Restaurant } from "@shared/schema";

export default function VendorProfile() {
  // Fetch vendor's restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  if (restaurantLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-profile-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Restaurant Profile</h1>
        <Button className="bg-primary hover:bg-primary/90" data-testid="button-edit-restaurant">
          <Edit className="mr-2 h-4 w-4" />
          Edit Restaurant
        </Button>
      </div>

      {!restaurant ? (
        <div className="text-center py-12">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Restaurant Not Found</h3>
          <p className="text-gray-500 dark:text-gray-400">Please contact support to set up your restaurant profile</p>
        </div>
      ) : (
        <>
          {/* Restaurant Header */}
          <Card className="overflow-hidden">
            <div className="relative h-48 bg-gradient-to-r from-primary/20 to-primary/10">
              {restaurant.imageUrl ? (
                <img 
                  src={restaurant.imageUrl} 
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Camera className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20"></div>
            </div>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {restaurant.logoUrl ? (
                      <img 
                        src={restaurant.logoUrl} 
                        alt={`${restaurant.name} logo`}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                        <Store className="h-8 w-8 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{restaurant.name}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{restaurant.category}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                        <span className="font-medium">{restaurant.rating || '0.0'}</span>
                        <span className="text-gray-500 ml-1">({restaurant.totalOrders || 0} reviews)</span>
                      </div>
                      <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                        {restaurant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" data-testid="button-change-cover">
                  <Camera className="h-4 w-4 mr-2" />
                  Change Cover
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Restaurant Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Address</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {restaurant.address ?
                        typeof restaurant.address === 'object' ?
                          `${(restaurant.address as any).street || ''}, ${(restaurant.address as any).city || ''}` :
                          String(restaurant.address)
                        : 'Not provided'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Phone</p>
                    <p className="text-gray-600 dark:text-gray-400">{restaurant.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email</p>
                    <p className="text-gray-600 dark:text-gray-400">{restaurant.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Website</p>
                    <p className="text-gray-600 dark:text-gray-400">{restaurant.website || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operating Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Operating Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {restaurant.operatingHours && typeof restaurant.operatingHours === 'object' ? (
                  <div className="space-y-2">
                    {Object.entries(restaurant.operatingHours as Record<string, any>).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="font-medium capitalize">{day}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {hours.isClosed ? 'Closed' : `${hours.open} - ${hours.close}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">Operating hours not configured</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Business Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Business Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Delivery Fee</p>
                  <p className="text-2xl font-bold text-primary">₱{parseFloat(restaurant.deliveryFee || '0').toFixed(2)}</p>
                </div>
                
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Minimum Order</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{parseFloat(restaurant.minimumOrder || '0').toFixed(2)}</p>
                </div>

                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Estimated Delivery</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{restaurant.estimatedDeliveryTime || 30} min</p>
                </div>

                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Max Orders/Hour</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{restaurant.maxOrdersPerHour || 50}</p>
                </div>

                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Preparation Buffer</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{restaurant.preparationBuffer || 5} min</p>
                </div>

                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Status</p>
                  <div className="space-y-1">
                    <Badge variant={restaurant.isAcceptingOrders ? "default" : "secondary"}>
                      {restaurant.isAcceptingOrders ? 'Accepting Orders' : 'Not Accepting'}
                    </Badge>
                    {restaurant.isFeatured && (
                      <Badge variant="outline" className="ml-2">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {restaurant.description && (
            <Card>
              <CardHeader>
                <CardTitle>About {restaurant.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{restaurant.description}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}