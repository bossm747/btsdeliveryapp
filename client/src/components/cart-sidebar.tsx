import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useLocation } from "wouter";

interface CartSidebarProps {
  deliveryFee?: number;
  serviceFee?: number;
}

export default function CartSidebar({ deliveryFee = 49, serviceFee = 0 }: CartSidebarProps) {
  const { items, updateQuantity, removeItem, getTotalPrice, getTotalItems } = useCart();
  const [, setLocation] = useLocation();

  const subtotal = getTotalPrice();
  const total = subtotal + deliveryFee + serviceFee;

  const handleProceedToCheckout = () => {
    setLocation("/cart");
  };

  if (items.length === 0) {
    return (
      <Card data-testid="empty-cart-sidebar">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold text-foreground mb-4">Your Cart</h3>
          <p className="text-muted-foreground">Your cart is empty</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="cart-sidebar">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground" data-testid="cart-title">
            Your Order
          </h3>
          <Badge variant="secondary" data-testid="cart-item-count">
            {getTotalItems()} items
          </Badge>
        </div>
        
        <div className="space-y-4 mb-6">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`cart-item-${item.id}`}>
              <div className="flex-1">
                <span className="font-semibold text-foreground block" data-testid={`cart-item-name-${item.id}`}>
                  {item.name}
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    data-testid={`decrease-cart-item-${item.id}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="mx-2 text-sm" data-testid={`cart-item-quantity-${item.id}`}>
                    {item.quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    data-testid={`increase-cart-item-${item.id}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 ml-2 text-destructive"
                    onClick={() => removeItem(item.id)}
                    data-testid={`remove-cart-item-${item.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <span className="text-primary font-bold" data-testid={`cart-item-total-${item.id}`}>
                ₱{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        
        <Separator className="my-4" />
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span data-testid="cart-subtotal">₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Delivery Fee:</span>
            <span data-testid="cart-delivery-fee">₱{deliveryFee.toFixed(2)}</span>
          </div>
          {serviceFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Service Fee:</span>
              <span data-testid="cart-service-fee">₱{serviceFee.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span data-testid="cart-total">₱{total.toFixed(2)}</span>
          </div>
        </div>
        
        <Button 
          className="w-full bg-primary text-white hover:bg-primary/90 mt-6"
          onClick={handleProceedToCheckout}
          data-testid="proceed-to-checkout-button"
        >
          Proceed to Checkout
        </Button>
      </CardContent>
    </Card>
  );
}
