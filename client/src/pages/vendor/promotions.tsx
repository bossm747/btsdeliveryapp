import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Star, 
  Plus,
  Calendar,
  Edit,
  Trash2,
  Percent,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant, Promotion, MenuCategory, MenuItem } from "@shared/schema";

export default function VendorPromotions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isCreatePromotionOpen, setIsCreatePromotionOpen] = useState(false);
  const [isEditPromotionOpen, setIsEditPromotionOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  
  // Form state
  const [newPromotion, setNewPromotion] = useState({
    name: '',
    description: '',
    type: 'percentage',
    discountType: 'percentage',
    discountValue: '',
    minimumOrder: '',
    maximumDiscount: '',
    code: '',
    usageLimit: '',
    startsAt: '',
    expiresAt: '',
    appliesTo: 'all',
    isActive: true
  });

  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch promotions
  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/vendor/promotions"],
    enabled: !!restaurant,
  });

  // Fetch categories and menu items for promotion targeting
  const { data: categories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["/api/vendor/categories"],
    enabled: !!restaurant,
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "menu"],
    enabled: !!restaurant?.id,
  });

  // Create promotion mutation
  const createPromotionMutation = useMutation({
    mutationFn: async (promotionData: any) => {
      const response = await apiRequest('POST', '/api/vendor/promotions', promotionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions'] });
      setNewPromotion({
        name: '', description: '', type: 'percentage', discountType: 'percentage',
        discountValue: '', minimumOrder: '', maximumDiscount: '', code: '',
        usageLimit: '', startsAt: '', expiresAt: '', appliesTo: 'all', isActive: true
      });
      setIsCreatePromotionOpen(false);
      toast({ title: 'Success', description: 'Promotion created successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create promotion', variant: 'destructive' });
    }
  });

  // Edit promotion mutation
  const editPromotionMutation = useMutation({
    mutationFn: async (updates: Partial<Promotion> & { id: string }) => {
      const { id, ...data } = updates;
      return await apiRequest("PATCH", `/api/vendor/promotions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions'] });
      setEditingPromotion(null);
      setIsEditPromotionOpen(false);
      toast({ title: 'Success', description: 'Promotion updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update promotion', variant: 'destructive' });
    }
  });

  // Delete promotion mutation
  const deletePromotionMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      return await apiRequest("DELETE", `/api/vendor/promotions/${promotionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions'] });
      toast({ title: 'Success', description: 'Promotion deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete promotion', variant: 'destructive' });
    }
  });

  // Toggle promotion status mutation
  const togglePromotionMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/vendor/promotions/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions'] });
      toast({ title: 'Success', description: 'Promotion status updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update promotion status', variant: 'destructive' });
    }
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
        <Dialog open={isCreatePromotionOpen} onOpenChange={setIsCreatePromotionOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" data-testid="button-create-promotion">
              <Plus className="mr-2 h-4 w-4" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="dialog-create-promotion">
            <DialogHeader>
              <DialogTitle>Create New Promotion</DialogTitle>
              <DialogDescription>Create a promotional offer to attract customers and increase sales.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="promotion-name">Promotion Name</Label>
                  <Input
                    id="promotion-name"
                    value={newPromotion.name}
                    onChange={(e) => setNewPromotion({...newPromotion, name: e.target.value})}
                    placeholder="e.g., Weekend Special"
                    data-testid="input-promotion-name"
                  />
                </div>
                <div>
                  <Label htmlFor="promotion-code">Promo Code (Optional)</Label>
                  <Input
                    id="promotion-code"
                    value={newPromotion.code}
                    onChange={(e) => setNewPromotion({...newPromotion, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., WEEKEND20"
                    data-testid="input-promotion-code"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="promotion-description">Description</Label>
                <Textarea
                  id="promotion-description"
                  value={newPromotion.description}
                  onChange={(e) => setNewPromotion({...newPromotion, description: e.target.value})}
                  placeholder="Describe your promotion..."
                  data-testid="textarea-promotion-description"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discount-type">Discount Type</Label>
                  <Select value={newPromotion.discountType} onValueChange={(value) => setNewPromotion({...newPromotion, discountType: value})}>
                    <SelectTrigger data-testid="select-discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="discount-value">Discount Value</Label>
                  <Input
                    id="discount-value"
                    type="number"
                    value={newPromotion.discountValue}
                    onChange={(e) => setNewPromotion({...newPromotion, discountValue: e.target.value})}
                    placeholder={newPromotion.discountType === 'percentage' ? '20' : '100'}
                    data-testid="input-discount-value"
                  />
                </div>
                <div>
                  <Label htmlFor="minimum-order">Min Order (₱)</Label>
                  <Input
                    id="minimum-order"
                    type="number"
                    value={newPromotion.minimumOrder}
                    onChange={(e) => setNewPromotion({...newPromotion, minimumOrder: e.target.value})}
                    placeholder="0.00"
                    data-testid="input-minimum-order"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="starts-at">Start Date</Label>
                  <Input
                    id="starts-at"
                    type="datetime-local"
                    value={newPromotion.startsAt}
                    onChange={(e) => setNewPromotion({...newPromotion, startsAt: e.target.value})}
                    data-testid="input-starts-at"
                  />
                </div>
                <div>
                  <Label htmlFor="expires-at">End Date</Label>
                  <Input
                    id="expires-at"
                    type="datetime-local"
                    value={newPromotion.expiresAt}
                    onChange={(e) => setNewPromotion({...newPromotion, expiresAt: e.target.value})}
                    data-testid="input-expires-at"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-active"
                  checked={newPromotion.isActive}
                  onCheckedChange={(checked) => setNewPromotion({...newPromotion, isActive: checked})}
                  data-testid="switch-is-active"
                />
                <Label htmlFor="is-active">Activate Immediately</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreatePromotionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  createPromotionMutation.mutate({
                    name: newPromotion.name,
                    description: newPromotion.description,
                    type: newPromotion.type,
                    discountType: newPromotion.discountType,
                    discountValue: parseFloat(newPromotion.discountValue),
                    minimumOrder: newPromotion.minimumOrder ? parseFloat(newPromotion.minimumOrder) : null,
                    code: newPromotion.code || null,
                    startsAt: newPromotion.startsAt ? new Date(newPromotion.startsAt) : null,
                    expiresAt: newPromotion.expiresAt ? new Date(newPromotion.expiresAt) : null,
                    isActive: newPromotion.isActive
                  });
                }} data-testid="button-save-promotion">
                  Create Promotion
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingPromotion(promotion);
                        setIsEditPromotionOpen(true);
                      }}
                      data-testid={`button-edit-promotion-${promotion.id}`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-promotion-${promotion.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{promotion.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePromotionMutation.mutate(promotion.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Button 
                    size="sm" 
                    variant={promotion.isActive ? "destructive" : "default"}
                    onClick={() => togglePromotionMutation.mutate({ id: promotion.id, isActive: !promotion.isActive })}
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