import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorPageWrapper, NoMenuItemsEmptyState, NoMenuCategoriesEmptyState, VendorMenuItemSkeleton, VendorCategorySkeleton } from "@/components/vendor";
import { 
  Package, 
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  Tags,
  Sparkles,
  Loader2
} from "lucide-react";
import { useVendorToast } from "@/hooks/use-vendor-toast";
import { apiRequest } from "@/lib/queryClient";
import FileUpload from "@/components/FileUpload";
import type { Restaurant, MenuItem, MenuCategory, MenuModifier, ModifierOption, MenuItemModifier } from "@shared/schema";

export default function VendorMenu() {
  const vendorToast = useVendorToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isAddMenuItemOpen, setIsAddMenuItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddModifierOpen, setIsAddModifierOpen] = useState(false);
  const [isEditMenuItemOpen, setIsEditMenuItemOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isEditModifierOpen, setIsEditModifierOpen] = useState(false);
  const [isManageModifierOptionsOpen, setIsManageModifierOptionsOpen] = useState(false);
  const [isAssignModifiersOpen, setIsAssignModifiersOpen] = useState(false);
  
  // Form states
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: ''
  });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    restaurant_id: ''
  });
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [newModifier, setNewModifier] = useState({
    name: '',
    type: 'single',
    is_required: false,
    min_selections: 0,
    max_selections: 1
  });
  const [editingModifier, setEditingModifier] = useState<MenuModifier | null>(null);
  const [selectedModifierForOptions, setSelectedModifierForOptions] = useState<MenuModifier | null>(null);
  const [selectedItemForModifiers, setSelectedItemForModifiers] = useState<MenuItem | null>(null);
  const [newModifierOption, setNewModifierOption] = useState({ name: '', price: '0' });

  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch vendor's menu items
  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "menu"],
    enabled: !!restaurant?.id,
  });

  // Fetch vendor's categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: ["/api/vendor/categories"],
    enabled: !!restaurant,
  });

  // Fetch vendor's modifiers
  const { data: modifiers = [], isLoading: modifiersLoading } = useQuery<MenuModifier[]>({
    queryKey: ["/api/vendor/modifiers"],
    enabled: !!restaurant,
  });

  // Fetch modifier options for selected modifier
  const { data: modifierOptions = [] } = useQuery<ModifierOption[]>({
    queryKey: ["/api/vendor/modifiers", selectedModifierForOptions?.id, "options"],
    enabled: !!selectedModifierForOptions?.id,
  });

  // Fetch assigned modifiers for selected item
  const { data: itemModifiers = [] } = useQuery<MenuItemModifier[]>({
    queryKey: ["/api/vendor/menu-items", selectedItemForModifiers?.id, "modifiers"],
    enabled: !!selectedItemForModifiers?.id,
  });

  // Update menu item availability mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<MenuItem> }) => {
      return await apiRequest("PATCH", `/api/menu-items/${itemId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "menu"] });
      vendorToast.menuItemUpdated();
    },
    onError: (error: any) => {
      vendorToast.error(error.message || "Failed to update menu item");
    },
  });

  // Create menu item mutation
  const createMenuItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const response = await apiRequest('POST', '/api/vendor/menu-items', item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "menu"] });
      setNewMenuItem({ name: '', description: '', price: '', category_id: '', image_url: '' });
      setIsAddMenuItemOpen(false);
      vendorToast.menuItemAdded();
    },
    onError: () => {
      vendorToast.error("Failed to create menu item");
    }
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; description: string; restaurant_id: string }) => {
      const response = await apiRequest('POST', '/api/vendor/categories', category);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/categories'] });
      setNewCategory({ name: '', description: '', restaurant_id: '' });
      setIsAddCategoryOpen(false);
      vendorToast.categoryAdded();
    },
    onError: () => {
      vendorToast.error("Failed to create category");
    }
  });

  // Create modifier mutation
  const createModifierMutation = useMutation({
    mutationFn: async (modifier: any) => {
      const response = await apiRequest('POST', '/api/vendor/modifiers', modifier);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/modifiers'] });
      setNewModifier({ name: '', type: 'single', is_required: false, min_selections: 0, max_selections: 1 });
      setIsAddModifierOpen(false);
      vendorToast.success("Modifier created successfully");
    },
    onError: () => {
      vendorToast.error("Failed to create modifier");
    }
  });

  // Edit mutations
  const editMenuItemMutation = useMutation({
    mutationFn: async (updates: Partial<MenuItem> & { id: string }) => {
      const { id, ...data } = updates;
      return await apiRequest("PATCH", `/api/vendor/menu-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "menu"] });
      setEditingMenuItem(null);
      setIsEditMenuItemOpen(false);
      vendorToast.menuItemUpdated();
    },
    onError: () => {
      vendorToast.error("Failed to update menu item");
    }
  });

  const editCategoryMutation = useMutation({
    mutationFn: async (updates: Partial<MenuCategory> & { id: string }) => {
      const { id, ...data } = updates;
      return await apiRequest("PATCH", `/api/vendor/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/categories'] });
      setEditingCategory(null);
      setIsEditCategoryOpen(false);
      vendorToast.categoryUpdated();
    },
    onError: () => {
      vendorToast.error("Failed to update category");
    }
  });

  const editModifierMutation = useMutation({
    mutationFn: async (updates: Partial<MenuModifier> & { id: string }) => {
      const { id, ...data } = updates;
      return await apiRequest("PATCH", `/api/vendor/modifiers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/modifiers'] });
      setEditingModifier(null);
      setIsEditModifierOpen(false);
      vendorToast.success("Modifier updated successfully");
    },
    onError: () => {
      vendorToast.error("Failed to update modifier");
    }
  });

  // AI Description Generation Mutation
  const generateDescriptionMutation = useMutation({
    mutationFn: async ({ itemName, category }: { itemName: string; category: string }) => {
      const response = await apiRequest('POST', '/api/ai/generate-description', { itemName, category });
      return response;
    },
    onSuccess: (data: any) => {
      if (editingMenuItem) {
        setEditingMenuItem({ ...editingMenuItem, description: data.description });
      } else {
        setNewMenuItem(prev => ({ ...prev, description: data.description }));
      }
      vendorToast.aiContentGenerated();
    },
    onError: () => {
      vendorToast.aiError();
    }
  });

  // Delete mutations
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest("DELETE", `/api/vendor/menu-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "menu"] });
      vendorToast.menuItemDeleted();
    },
    onError: () => {
      vendorToast.error("Failed to delete menu item");
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return await apiRequest("DELETE", `/api/vendor/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/categories'] });
      vendorToast.categoryDeleted();
    },
    onError: () => {
      vendorToast.error("Failed to delete category");
    }
  });

  const deleteModifierMutation = useMutation({
    mutationFn: async (modifierId: string) => {
      return await apiRequest("DELETE", `/api/vendor/modifiers/${modifierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/modifiers'] });
      vendorToast.success("Modifier deleted successfully");
    },
    onError: () => {
      vendorToast.error("Failed to delete modifier");
    }
  });

  // Modifier options mutations
  const createModifierOptionMutation = useMutation({
    mutationFn: async (option: { modifierId: string; name: string; price: number }) => {
      const response = await apiRequest('POST', `/api/vendor/modifiers/${option.modifierId}/options`, {
        name: option.name,
        price: option.price
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/modifiers", selectedModifierForOptions?.id, "options"] });
      setNewModifierOption({ name: '', price: '0' });
      vendorToast.success("Modifier option created successfully");
    },
    onError: () => {
      vendorToast.error("Failed to create modifier option");
    }
  });

  const deleteModifierOptionMutation = useMutation({
    mutationFn: async ({ modifierId, optionId }: { modifierId: string; optionId: string }) => {
      return await apiRequest("DELETE", `/api/vendor/modifiers/${modifierId}/options/${optionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/modifiers", selectedModifierForOptions?.id, "options"] });
      vendorToast.success("Modifier option deleted successfully");
    },
    onError: () => {
      vendorToast.error("Failed to delete modifier option");
    }
  });

  const handleGenerateDescription = (itemName: string, categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (itemName.trim() && category?.name) {
      generateDescriptionMutation.mutate({ itemName, category: category.name });
    } else {
      vendorToast.error("Please enter item name and select category first");
    }
  };

  const handleCreateMenuItem = () => {
    if (newMenuItem.name.trim() && newMenuItem.price && newMenuItem.category_id) {
      createMenuItemMutation.mutate({
        ...newMenuItem,
        price: parseFloat(newMenuItem.price),
        restaurant_id: restaurant?.id || ''
      });
    }
  };

  const handleCreateCategory = () => {
    if (newCategory.name.trim()) {
      createCategoryMutation.mutate({
        name: newCategory.name,
        description: newCategory.description,
        restaurant_id: restaurant?.id || ''
      });
    }
  };

  const handleCreateModifier = () => {
    if (newModifier.name.trim()) {
      createModifierMutation.mutate({
        ...newModifier,
        restaurant_id: restaurant?.id || ''
      });
    }
  };

  const toggleMenuItemAvailability = (itemId: string, isAvailable: boolean) => {
    updateMenuItemMutation.mutate({
      itemId,
      updates: { isAvailable }
    });
  };

  if (menuLoading || categoriesLoading || modifiersLoading) {
    return (
      <VendorPageWrapper 
        refreshQueryKeys={["/api/vendor/restaurant", "/api/vendor/categories", "/api/vendor/modifiers"]}
        pageTitle="Menu Management"
        pageDescription="Manage your restaurant menu items, categories, and modifiers"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <VendorCategorySkeleton count={2} />
          <VendorMenuItemSkeleton count={6} />
        </div>
      </VendorPageWrapper>
    );
  }

  return (
    <VendorPageWrapper 
      refreshQueryKeys={["/api/vendor/restaurant", "/api/vendor/categories", "/api/vendor/modifiers"]}
      pageTitle="Menu Management"
      pageDescription="Manage your restaurant menu items, categories, and modifiers"
    >
      <div className="space-y-6" data-testid="vendor-menu-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
        <div className="flex gap-2">
          <Dialog open={isAddModifierOpen} onOpenChange={setIsAddModifierOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-modifier">
                <Plus className="mr-2 h-4 w-4" />
                Add Modifier
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-modifier">
              <DialogHeader>
                <DialogTitle>Add New Modifier Group</DialogTitle>
                <DialogDescription>Create a new modifier group like Size, Add-ons, or Spice Level for your menu items.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="modifier-name">Modifier Name</Label>
                  <Input
                    id="modifier-name"
                    value={newModifier.name}
                    onChange={(e) => setNewModifier({...newModifier, name: e.target.value})}
                    placeholder="e.g., Size, Add-ons, Spice Level"
                    data-testid="input-modifier-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="modifier-type">Selection Type</Label>
                    <select
                      id="modifier-type"
                      value={newModifier.type}
                      onChange={(e) => setNewModifier({...newModifier, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      data-testid="select-modifier-type"
                    >
                      <option value="single">Single Selection</option>
                      <option value="multiple">Multiple Selection</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="modifier-required"
                      checked={newModifier.is_required}
                      onCheckedChange={(checked) => setNewModifier({...newModifier, is_required: checked})}
                      data-testid="switch-modifier-required"
                    />
                    <Label htmlFor="modifier-required">Required</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddModifierOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateModifier} data-testid="button-save-modifier">
                    Create Modifier
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-category">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-category">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>Create a new category to organize your menu items.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    placeholder="e.g., Main Dishes"
                    data-testid="input-category-name"
                  />
                </div>
                <div>
                  <Label htmlFor="category-description">Description</Label>
                  <Textarea
                    id="category-description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    placeholder="Brief description of the category"
                    data-testid="textarea-category-description"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCategory} data-testid="button-save-category">
                    Create Category
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddMenuItemOpen} onOpenChange={setIsAddMenuItemOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-menu-item">
                <Plus className="mr-2 h-4 w-4" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid="dialog-add-menu-item">
              <DialogHeader>
                <DialogTitle>Add New Menu Item</DialogTitle>
                <DialogDescription>Add a new item to your restaurant menu with details, pricing, and images.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="item-name">Item Name</Label>
                  <Input
                    id="item-name"
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                    placeholder="e.g., Chicken Adobo"
                    data-testid="input-item-name"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="item-description">Description</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateDescription(newMenuItem.name, newMenuItem.category_id)}
                      disabled={!newMenuItem.name.trim() || !newMenuItem.category_id || generateDescriptionMutation.isPending}
                      data-testid="button-generate-description"
                      className="flex items-center gap-2"
                    >
                      {generateDescriptionMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {generateDescriptionMutation.isPending ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>
                  <Textarea
                    id="item-description"
                    value={newMenuItem.description}
                    onChange={(e) => setNewMenuItem({...newMenuItem, description: e.target.value})}
                    placeholder="Describe your menu item or click 'Generate with AI'"
                    data-testid="textarea-item-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item-price">Price (₱)</Label>
                    <Input
                      id="item-price"
                      type="number"
                      step="0.01"
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem({...newMenuItem, price: e.target.value})}
                      placeholder="0.00"
                      data-testid="input-item-price"
                    />
                  </div>
                  <div>
                    <Label htmlFor="item-category">Category</Label>
                    <select
                      id="item-category"
                      value={newMenuItem.category_id}
                      onChange={(e) => setNewMenuItem({...newMenuItem, category_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      data-testid="select-item-category"
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Item Image</Label>
                  <FileUpload
                    onUploadComplete={(url: string) => setNewMenuItem({...newMenuItem, image_url: url})}
                    acceptedTypes="image/*"
                    uploadType="restaurant"
                    data-testid="upload-item-image"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddMenuItemOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMenuItem} data-testid="button-save-menu-item">
                    Create Item
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modifiers */}
      {modifiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modifier Groups ({modifiers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {modifiers.map(modifier => (
                <div key={modifier.id} className="p-3 border rounded-lg" data-testid={`modifier-${modifier.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{modifier.name}</h3>
                    <div className="flex gap-1 items-center">
                      <span className={`text-xs px-2 py-1 rounded ${
                        modifier.type === 'single' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {modifier.type === 'single' ? 'Single' : 'Multiple'}
                      </span>
                      {modifier.isRequired && (
                        <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                          Required
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedModifierForOptions(modifier);
                          setIsManageModifierOptionsOpen(true);
                        }}
                        data-testid={`button-manage-options-${modifier.id}`}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingModifier(modifier);
                          setIsEditModifierOpen(true);
                        }}
                        data-testid={`button-edit-modifier-${modifier.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-modifier-${modifier.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Modifier</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{modifier.name}"? This will also delete all options for this modifier.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteModifierMutation.mutate(modifier.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {modifier.type === 'single' ? 'Choose one option' : 
                     `Choose ${modifier.minSelections || 0}-${modifier.maxSelections || 'unlimited'} options`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Categories ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categories.map(category => (
                <div key={category.id} className="p-3 border rounded-lg" data-testid={`category-${category.id}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCategory(category);
                          setIsEditCategoryOpen(true);
                        }}
                        data-testid={`button-edit-category-${category.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-category-${category.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{category.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCategoryMutation.mutate(category.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      <div className="space-y-4">
        {menuItems && menuItems.length === 0 ? (
          <NoMenuItemsEmptyState onAddItem={() => setIsAddMenuItemOpen(true)} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menuItems?.map((item) => (
              <Card key={item.id} className="overflow-hidden" data-testid={`menu-item-${item.id}`}>
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={item.isAvailable ?? false}
                        onCheckedChange={(checked) => toggleMenuItemAvailability(item.id, checked)}
                        data-testid={`switch-availability-${item.id}`}
                      />
                      {item.isAvailable ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary">₱{parseFloat(item.price).toFixed(2)}</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedItemForModifiers(item);
                          setIsAssignModifiersOpen(true);
                        }}
                        data-testid={`button-assign-modifiers-${item.id}`}
                      >
                        <Tags className="h-4 w-4 mr-1" />
                        Modifiers
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setEditingMenuItem(item);
                          setIsEditMenuItemOpen(true);
                        }}
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{item.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMenuItemMutation.mutate(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </VendorPageWrapper>
  );
}