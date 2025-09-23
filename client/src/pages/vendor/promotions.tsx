import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Star, 
  Plus,
  Calendar
} from "lucide-react";
import type { Restaurant, Promotion } from "@shared/schema";

export default function VendorPromotions() {
  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch promotions
  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/vendor/promotions"],
    enabled: !!restaurant,
  });

  if (promotionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-promotions-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promotions Management</h1>
        <Button className="bg-primary hover:bg-primary/90" data-testid="button-create-promotion">
          <Plus className="mr-2 h-4 w-4" />
          Create Promotion
        </Button>
      </div>

      {promotions.length === 0 ? (
        <div className="text-center py-12">
          <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Active Promotions</h3>
          <p className="text-gray-500 dark:text-gray-400">Create your first promotion to attract more customers</p>
          <Button className="mt-4" data-testid="button-create-first-promotion">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Promotion
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promotion) => (
            <Card key={promotion.id} className="hover:shadow-lg transition-shadow" data-testid={`card-promotion-${promotion.id}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant={promotion.isActive ? "default" : "secondary"}>
                    {promotion.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Discount</p>
                    <p className="font-semibold text-primary">
                      {promotion.discountValue}{promotion.type === 'percentage' ? '%' : '₱'}
                    </p>
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{promotion.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{promotion.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    Valid: {promotion.startDate ? new Date(promotion.startDate).toLocaleDateString() : 'N/A'} - {promotion.endDate ? new Date(promotion.endDate).toLocaleDateString() : 'N/A'}
                  </div>
                  
                  {promotion.code && (
                    <div className="text-xs">
                      <span className="text-gray-500">Code: </span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {promotion.code}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-3">
                    <span>Uses: {promotion.currentRedemptions || 0}</span>
                    {promotion.maxRedemptions && (
                      <span>Max: {promotion.maxRedemptions}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button size="sm" variant="outline" data-testid={`button-edit-promotion-${promotion.id}`}>
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant={promotion.isActive ? "destructive" : "default"}
                    data-testid={`button-toggle-promotion-${promotion.id}`}
                  >
                    {promotion.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}