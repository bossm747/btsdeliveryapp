import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem, MenuCategory } from "@shared/schema";

interface MenuBrowserProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  restaurantId: string;
}

export default function MenuBrowser({ categories, menuItems, restaurantId }: MenuBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addItem, items } = useCart();
  const { toast } = useToast();

  const filteredItems = selectedCategory 
    ? menuItems.filter(item => item.categoryId === selectedCategory)
    : menuItems;

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      quantity: 1,
      restaurantId: restaurantId
    });
    
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`,
    });
  };

  const getItemQuantityInCart = (itemId: string) => {
    const cartItem = items.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  return (
    <div className="grid lg:grid-cols-4 gap-8" data-testid="menu-browser">
      {/* Categories */}
      <Card className="lg:col-span-1">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-foreground mb-4" data-testid="categories-title">
            Categories
          </h3>
          <div className="space-y-3">
            <div
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                !selectedCategory 
                  ? "bg-primary/5 border-l-4 border-primary" 
                  : "hover:bg-muted"
              }`}
              onClick={() => setSelectedCategory(null)}
              data-testid="category-all"
            >
              <span className={selectedCategory === null ? "font-semibold text-primary" : ""}>
                🍽️ All Items
              </span>
              <span className="text-sm text-muted-foreground">
                {menuItems.length} items
              </span>
            </div>
            
            {categories.map((category) => {
              const categoryItems = menuItems.filter(item => item.categoryId === category.id);
              const isSelected = selectedCategory === category.id;
              
              return (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? "bg-primary/5 border-l-4 border-primary" 
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`category-${category.id}`}
                >
                  <span className={isSelected ? "font-semibold text-primary" : ""}>
                    {category.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {categoryItems.length} items
                  </span>
                </div>
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
  );
}
