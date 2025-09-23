import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Search, Star, Clock, AlertCircle, Zap, Flame, Leaf } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import MenuItemDialog from "./menu-item-dialog";
import type { MenuItem, MenuCategory } from "@shared/schema";

interface MenuBrowserProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  restaurantId: string;
}

export default function MenuBrowser({ categories, menuItems, restaurantId }: MenuBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const { addItem, items } = useCart();
  const { toast } = useToast();

  const filteredItems = menuItems.filter(item => {
    // Category filter
    if (selectedCategory && item.categoryId !== selectedCategory) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = item.name.toLowerCase().includes(searchLower);
      const matchesDescription = item.description?.toLowerCase().includes(searchLower);
      const matchesTags = item.tags && (item.tags as string[]).some(tag => 
        tag.toLowerCase().includes(searchLower)
      );
      if (!matchesName && !matchesDescription && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });

  // Quick add to cart (without customization)
  const handleQuickAddToCart = (item: MenuItem) => {
    addItem({
      id: `${item.id}_${Date.now()}`,
      name: item.name,
      price: parseFloat(item.price),
      quantity: 1,
      restaurantId: restaurantId,
      originalItemId: item.id
    });
    
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`,
    });
  };

  // Open customization dialog
  const handleCustomizeItem = (item: MenuItem) => {
    setSelectedItem(item);
    setShowCustomization(true);
  };

  // Get icon for dietary tags
  const getDietaryIcon = (tag: string) => {
    switch (tag.toLowerCase()) {
      case 'spicy': return <Flame className="w-3 h-3 text-red-500" />;
      case 'vegetarian': return <Leaf className="w-3 h-3 text-green-500" />;
      case 'bestseller': return <Star className="w-3 h-3 text-yellow-500" />;
      case 'new': return <Zap className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  const getItemQuantityInCart = (itemId: string) => {
    const cartItem = items.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  return (
    <>
      <div className="grid lg:grid-cols-4 gap-8" data-testid="menu-browser">
        {/* Categories Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-[#004225] mb-4" data-testid="categories-title">
              Categories
            </h3>
            
            {/* Menu Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="menu-search-input"
              />
            </div>

            <Separator className="my-4" />
            
            <div className="space-y-2">
            <button
              className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                !selectedCategory 
                  ? "bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border-2 border-[#FF6B35]/20 shadow-sm" 
                  : "hover:bg-gray-50 border border-gray-200"
              }`}
              onClick={() => setSelectedCategory(null)}
              data-testid="category-all"
            >
              <span className={`flex items-center space-x-2 ${
                selectedCategory === null ? "font-semibold text-[#FF6B35]" : "text-gray-700"
              }`}>
                <span>🍽️</span>
                <span>All Items</span>
              </span>
              <Badge variant="outline" className="text-xs">
                {filteredItems.length}
              </Badge>
            </button>
            
            {categories.map((category) => {
              const categoryItems = menuItems.filter(item => item.categoryId === category.id);
              const isSelected = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border-2 border-[#FF6B35]/20 shadow-sm" 
                      : "hover:bg-gray-50 border border-gray-200"
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`category-${category.id}`}
                >
                  <span className={`flex items-center space-x-2 ${
                    isSelected ? "font-semibold text-[#FF6B35]" : "text-gray-700"
                  }`}>
                    <span>{category.name}</span>
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {categoryItems.length}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-foreground mb-4" data-testid="menu-items-title">
          {selectedCategory 
            ? categories.find(c => c.id === selectedCategory)?.name || "Menu Items"
            : "All Items"
          }
        </h3>
        
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const quantityInCart = getItemQuantityInCart(item.id);
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={item.imageUrl || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      data-testid={`menu-item-image-${item.id}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground" data-testid={`menu-item-name-${item.id}`}>
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`menu-item-description-${item.id}`}>
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-primary font-bold" data-testid={`menu-item-price-${item.id}`}>
                              ₱{item.price}
                            </span>
                            {item.isSpicy && (
                              <Badge variant="destructive" className="text-xs">🌶️ Spicy</Badge>
                            )}
                            {item.isVegetarian && (
                              <Badge variant="secondary" className="text-xs">🥬 Vegetarian</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {quantityInCart > 0 && (
                            <div className="flex items-center space-x-2 bg-muted rounded-lg px-2 py-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                data-testid={`decrease-quantity-${item.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-semibold" data-testid={`item-quantity-${item.id}`}>
                                {quantityInCart}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                data-testid={`increase-quantity-${item.id}`}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            className="bg-primary text-white hover:bg-primary/90"
                            onClick={() => handleAddToCart(item)}
                            disabled={!item.isAvailable}
                            data-testid={`add-to-cart-${item.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!item.isAvailable && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Currently unavailable
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No items found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Menu Item Customization Dialog */}
    <MenuItemDialog
      item={selectedItem}
      open={showCustomization}
      onOpenChange={setShowCustomization}
      onAddToCart={(customizedItem) => {
        addItem(customizedItem);
        setShowCustomization(false);
        toast({
          title: "Added to cart",
          description: `${customizedItem.name} has been added to your cart`,
        });
      }}
    />
    </>
  );
}
