import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Star, Clock, Users, AlertCircle } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem } from "@shared/schema";

interface MenuItemDialogProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
}

interface ModifierOption {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

interface Modifier {
  id: string;
  name: string;
  type: "single" | "multiple";
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export default function MenuItemDialog({ item, isOpen, onClose, restaurantId }: MenuItemDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState("");
  const { addItem } = useCart();
  const { toast } = useToast();

  if (!item) return null;

  // Mock modifiers - in a real app, these would come from the API
  const mockModifiers: Modifier[] = [
    {
      id: "size",
      name: "Size",
      type: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: "small", name: "Small", price: 0, isDefault: true },
        { id: "medium", name: "Medium", price: 25 },
        { id: "large", name: "Large", price: 45 }
      ]
    },
    {
      id: "addons",
      name: "Add-ons",
      type: "multiple", 
      isRequired: false,
      minSelections: 0,
      maxSelections: 5,
      options: [
        { id: "extra-cheese", name: "Extra Cheese", price: 15 },
        { id: "extra-meat", name: "Extra Meat", price: 30 },
        { id: "extra-sauce", name: "Extra Sauce", price: 10 },
        { id: "extra-veggies", name: "Extra Vegetables", price: 20 }
      ]
    },
    {
      id: "spice-level",
      name: "Spice Level",
      type: "single",
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      options: [
        { id: "mild", name: "Mild", price: 0, isDefault: true },
        { id: "medium", name: "Medium", price: 0 },
        { id: "spicy", name: "Spicy", price: 0 },
        { id: "extra-spicy", name: "Extra Spicy", price: 0 }
      ]
    }
  ];

  // Initialize default selections
  useState(() => {
    const defaults: Record<string, string[]> = {};
    mockModifiers.forEach(modifier => {
      const defaultOptions = modifier.options
        .filter(option => option.isDefault)
        .map(option => option.id);
      if (defaultOptions.length > 0) {
        defaults[modifier.id] = defaultOptions;
      } else if (modifier.isRequired && modifier.options.length > 0) {
        defaults[modifier.id] = [modifier.options[0].id];
      }
    });
    setSelectedModifiers(defaults);
  });

  const handleModifierChange = (modifierId: string, optionId: string, checked: boolean) => {
    const modifier = mockModifiers.find(m => m.id === modifierId);
    if (!modifier) return;

    setSelectedModifiers(prev => {
      const current = prev[modifierId] || [];
      
      if (modifier.type === "single") {
        return { ...prev, [modifierId]: checked ? [optionId] : [] };
      } else {
        const updated = checked 
          ? [...current, optionId]
          : current.filter(id => id !== optionId);
        
        // Enforce max selections
        if (updated.length > modifier.maxSelections) {
          updated.splice(0, updated.length - modifier.maxSelections);
        }
        
        return { ...prev, [modifierId]: updated };
      }
    });
  };

  const calculateItemPrice = () => {
    let totalPrice = parseFloat(item.price);
    
    mockModifiers.forEach(modifier => {
      const selectedOptions = selectedModifiers[modifier.id] || [];
      selectedOptions.forEach(optionId => {
        const option = modifier.options.find(o => o.id === optionId);
        if (option) {
          totalPrice += option.price;
        }
      });
    });
    
    return totalPrice;
  };

  const getTotalPrice = () => calculateItemPrice() * quantity;

  const isValidSelection = () => {
    return mockModifiers.every(modifier => {
      const selections = selectedModifiers[modifier.id]?.length || 0;
      return selections >= modifier.minSelections && selections <= modifier.maxSelections;
    });
  };

  const handleAddToCart = () => {
    if (!isValidSelection()) {
      toast({
        title: "Invalid selection",
        description: "Please complete all required selections",
        variant: "destructive"
      });
      return;
    }

    // Build modifier details for cart item
    const modifierDetails = mockModifiers
      .map(modifier => {
        const selectedOptions = selectedModifiers[modifier.id] || [];
        const optionNames = selectedOptions
          .map(optionId => modifier.options.find(o => o.id === optionId)?.name)
          .filter(Boolean);
        
        if (optionNames.length > 0) {
          return `${modifier.name}: ${optionNames.join(", ")}`;
        }
        return null;
      })
      .filter(Boolean);

    const cartItem = {
      id: `${item.id}_${Date.now()}`, // Unique ID for customized items
      name: item.name,
      price: calculateItemPrice(),
      quantity,
      restaurantId,
      specialInstructions: specialInstructions || undefined,
      modifiers: modifierDetails.length > 0 ? modifierDetails.join("; ") : undefined
    };

    addItem(cartItem);

    toast({
      title: "Added to cart",
      description: `${quantity} × ${item.name} added to your cart`,
    });

    onClose();
    setQuantity(1);
    setSpecialInstructions("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#004225]">
            Customize Your Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Header */}
          <div className="flex items-start space-x-4">
            <img 
              src={item.imageUrl || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"} 
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
              
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-lg font-bold text-[#FF6B35]">₱{item.price}</span>
                {item.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600">{item.rating}</span>
                  </div>
                )}
                {item.preparationTime && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{item.preparationTime} mins</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                {item.tags && (item.tags as string[]).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {!item.isAvailable && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Out of Stock
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Modifiers */}
          {mockModifiers.map((modifier) => (
            <div key={modifier.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">{modifier.name}</h4>
                <div className="flex items-center space-x-2">
                  {modifier.isRequired && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                  {modifier.type === "multiple" && (
                    <Badge variant="outline" className="text-xs">
                      Select up to {modifier.maxSelections}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {modifier.type === "single" ? (
                  <RadioGroup 
                    value={selectedModifiers[modifier.id]?.[0] || ""}
                    onValueChange={(value) => handleModifierChange(modifier.id, value, true)}
                  >
                    {modifier.options.map((option) => (
                      <div key={option.id} className="flex items-center justify-between p-2 rounded border hover:bg-gray-50">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="cursor-pointer">
                            {option.name}
                          </Label>
                        </div>
                        {option.price > 0 && (
                          <span className="text-sm font-medium text-green-600">+₱{option.price}</span>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {modifier.options.map((option) => (
                      <div key={option.id} className="flex items-center justify-between p-2 rounded border hover:bg-gray-50">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={option.id}
                            checked={selectedModifiers[modifier.id]?.includes(option.id) || false}
                            onCheckedChange={(checked) => 
                              handleModifierChange(modifier.id, option.id, !!checked)
                            }
                          />
                          <Label htmlFor={option.id} className="cursor-pointer">
                            {option.name}
                          </Label>
                        </div>
                        {option.price > 0 && (
                          <span className="text-sm font-medium text-green-600">+₱{option.price}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <Separator />

          {/* Special Instructions */}
          <div className="space-y-3">
            <Label htmlFor="special-instructions" className="font-semibold text-gray-900">
              Special Instructions (Optional)
            </Label>
            <Textarea
              id="special-instructions"
              placeholder="e.g., No onions, extra sauce on the side, well done..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <Separator />

          {/* Quantity and Total */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-4">
              <Label className="font-semibold text-gray-900">Quantity:</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-lg w-8 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= 10}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-[#FF6B35]">₱{getTotalPrice().toFixed(2)}</p>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button 
            className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white py-3 text-lg font-semibold"
            onClick={handleAddToCart}
            disabled={!item.isAvailable || !isValidSelection()}
          >
            {!item.isAvailable ? (
              "Out of Stock"
            ) : (
              `Add ${quantity} to Cart - ₱${getTotalPrice().toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}