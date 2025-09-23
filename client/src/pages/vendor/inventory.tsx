import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Plus,
  Edit,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Trash2,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant, InventoryItem } from "@shared/schema";

// Form validation schema
const inventoryFormSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  currentStock: z.string().min(0, "Current stock must be positive").default("0"),
  minimumStock: z.string().min(0, "Minimum stock must be positive").default("0"),
  maximumStock: z.string().optional(),
  unitCost: z.string().optional(),
  isActive: z.boolean().default(true),
  isTrackStock: z.boolean().default(true),
});

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

export default function VendorInventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch inventory items
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/vendor/inventory"],
    enabled: !!restaurant,
  });

  // Fetch low stock items
  const { data: lowStockItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/vendor/inventory/low-stock"],
    enabled: !!restaurant,
  });

  // Forms
  const addForm = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      unit: "",
      currentStock: "0",
      minimumStock: "0",
      maximumStock: "",
      unitCost: "",
      isActive: true,
      isTrackStock: true,
    },
  });

  const editForm = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
  });

  // Mutations
  const createInventoryMutation = useMutation({
    mutationFn: async (data: InventoryFormData) => {
      return await apiRequest("POST", "/api/vendor/inventory", {
        ...data,
        currentStock: parseFloat(data.currentStock) || 0,
        minimumStock: parseFloat(data.minimumStock) || 0,
        maximumStock: data.maximumStock ? parseFloat(data.maximumStock) : null,
        unitCost: data.unitCost ? parseFloat(data.unitCost) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory/low-stock"] });
      setAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Inventory item created",
        description: "The new inventory item has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InventoryFormData }) => {
      return await apiRequest("PATCH", `/api/vendor/inventory/${id}`, {
        ...data,
        currentStock: parseFloat(data.currentStock) || 0,
        minimumStock: parseFloat(data.minimumStock) || 0,
        maximumStock: data.maximumStock ? parseFloat(data.maximumStock) : null,
        unitCost: data.unitCost ? parseFloat(data.unitCost) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory/low-stock"] });
      setEditDialogOpen(false);
      setEditingItem(null);
      editForm.reset();
      toast({
        title: "Inventory item updated",
        description: "The inventory item has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/vendor/inventory/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory/low-stock"] });
      toast({
        title: "Inventory item deleted",
        description: "The inventory item has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    editForm.reset({
      name: item.name,
      description: item.description || "",
      sku: item.sku || "",
      unit: item.unit,
      currentStock: item.currentStock?.toString() || "0",
      minimumStock: item.minimumStock?.toString() || "0",
      maximumStock: item.maximumStock?.toString() || "",
      unitCost: item.unitCost?.toString() || "",
      isActive: item.isActive ?? true,
      isTrackStock: item.isTrackStock ?? true,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this inventory item?")) {
      deleteInventoryMutation.mutate(id);
    }
  };

  const onAddSubmit = (data: InventoryFormData) => {
    createInventoryMutation.mutate(data);
  };

  const onEditSubmit = (data: InventoryFormData) => {
    if (editingItem) {
      updateInventoryMutation.mutate({ id: editingItem.id, data });
    }
  };

  if (inventoryLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {lowStockItems.length > 0 && <Skeleton className="h-16" />}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-inventory-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
        <Button 
          className="bg-primary hover:bg-primary/90" 
          onClick={() => setAddDialogOpen(true)}
          data-testid="button-add-inventory"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-l-4 border-l-orange-500" data-testid="card-low-stock-alert">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-500/10 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">Low Stock Alert</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {lowStockItems.length} items are running low on stock and need to be restocked soon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventory.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Well Stocked</p>
                <p className="text-2xl font-bold text-green-600">{inventory.length - lowStockItems.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₱{inventory.reduce((sum, item) => 
                    sum + (Number(item.currentStock) * Number(item.unitCost || 0)), 0
                  ).toFixed(2)}
                </p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Items */}
      <div className="space-y-4">
        {inventory.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Inventory Items</h3>
            <p className="text-gray-500 dark:text-gray-400">Start tracking your restaurant inventory to manage stock levels</p>
            <Button 
              className="mt-4" 
              onClick={() => setAddDialogOpen(true)}
              data-testid="button-add-first-inventory"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Item
            </Button>
          </div>
        ) : (
          inventory.map((item) => {
            const currentStock = Number(item.currentStock) || 0;
            const minStock = Number(item.minimumStock) || 0;
            const isLowStock = currentStock <= minStock;
            
            return (
              <Card 
                key={item.id} 
                className={`${isLowStock ? 'border-l-4 border-l-orange-500' : ''}`} 
                data-testid={`card-inventory-${item.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                        {isLowStock && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        )}
                        {!item.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">SKU:</span>
                          <span className="ml-2 font-mono">{item.sku || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Unit:</span>
                          <span className="ml-2">{item.unit}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Min Stock:</span>
                          <span className="ml-2 font-semibold">{minStock}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Max Stock:</span>
                          <span className="ml-2">{item.maximumStock ? Number(item.maximumStock) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Current Stock</p>
                        <p className={`text-2xl font-bold ${
                          isLowStock ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {currentStock}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Unit Cost</p>
                        <p className="text-xl font-semibold text-gray-900 dark:text-white">
                          ₱{item.unitCost ? parseFloat(item.unitCost).toFixed(2) : '0.00'}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Value</p>
                        <p className="text-xl font-semibold text-primary">
                          ₱{(currentStock * Number(item.unitCost || 0)).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-inventory-${item.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(item.id)}
                          data-testid={`button-delete-inventory-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Inventory Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>
              Add a new item to your restaurant inventory. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Premium Chicken Breast" {...field} data-testid="input-item-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CHK-001" {...field} data-testid="input-item-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the item..."
                        rows={2}
                        {...field} 
                        data-testid="textarea-item-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={addForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measurement *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-item-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pieces">Pieces</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="g">Grams (g)</SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="packs">Packs</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                          <SelectItem value="cans">Cans</SelectItem>
                          <SelectItem value="bottles">Bottles</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Stock *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0" 
                          {...field} 
                          data-testid="input-current-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost (₱)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-unit-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock Level *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0" 
                          {...field} 
                          data-testid="input-minimum-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="maximumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Stock Level</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="Optional" 
                          {...field} 
                          data-testid="input-maximum-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center space-x-6">
                <FormField
                  control={addForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Item</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          This item is available for use in your restaurant
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="isTrackStock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Track Stock</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Monitor stock levels and get low stock alerts
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-track-stock"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddDialogOpen(false)}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInventoryMutation.isPending}
                  data-testid="button-save-add"
                >
                  {createInventoryMutation.isPending ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Item
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Inventory Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update the details for this inventory item.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Premium Chicken Breast" {...field} data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CHK-001" {...field} data-testid="input-edit-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the item..."
                        rows={2}
                        {...field} 
                        data-testid="textarea-edit-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measurement *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pieces">Pieces</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="g">Grams (g)</SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="packs">Packs</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                          <SelectItem value="cans">Cans</SelectItem>
                          <SelectItem value="bottles">Bottles</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Stock *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0" 
                          {...field} 
                          data-testid="input-edit-current-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost (₱)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-edit-unit-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock Level *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0" 
                          {...field} 
                          data-testid="input-edit-minimum-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="maximumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Stock Level</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="Optional" 
                          {...field} 
                          data-testid="input-edit-maximum-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center space-x-6">
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Item</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          This item is available for use in your restaurant
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isTrackStock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Track Stock</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Monitor stock levels and get low stock alerts
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-track-stock"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateInventoryMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateInventoryMutation.isPending ? (
                    <>Updating...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Item
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}