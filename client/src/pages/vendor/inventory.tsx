import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Plus,
  Edit,
  AlertTriangle,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import type { Restaurant, InventoryItem } from "@shared/schema";

export default function VendorInventory() {
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
        <Button className="bg-primary hover:bg-primary/90" data-testid="button-add-inventory">
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
            <Button className="mt-4" data-testid="button-add-first-inventory">
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
                      
                      <Button size="sm" variant="outline" data-testid={`button-edit-inventory-${item.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}