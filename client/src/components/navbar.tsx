import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, Menu } from "lucide-react";
import btsLogo from "@assets/btslogo.png";

export default function Navbar() {
  const [, setLocation] = useLocation();
  const { getTotalItems } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const totalItems = getTotalItems();

  const navigationItems = [
    { label: "Food", href: "/restaurants" },
    { label: "Pabili", href: "/pabili" },
    { label: "Pabayad", href: "/pabayad" },
    { label: "Parcel", href: "/parcel" },
    { label: "Para sa Vendors", href: "/vendor-dashboard" },
    { label: "Para sa Riders", href: "/rider-dashboard" },
  ];

  return (
    <nav className="sticky top-0 z-50 sticky-header border-b border-border" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2" data-testid="logo-link">
            <img 
              src={btsLogo} 
              alt="BTS Delivery Logo" 
              className="w-10 h-10 object-contain"
            />
            <span className="font-bold text-xl text-foreground">BTS Delivery</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors"
                data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Link>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/cart")}
              className="relative"
              data-testid="cart-button"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart
              {totalItems > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {totalItems}
                </Badge>
              )}
            </Button>
            
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="login-button">
              Mag-Login
            </Button>
          </div>
          
          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/cart")}
              className="relative"
              data-testid="mobile-cart-button"
            >
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {totalItems}
                </Badge>
              )}
            </Button>
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="mobile-menu-button">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="text-foreground hover:text-primary transition-colors py-2 border-b border-border"
                      onClick={() => setIsOpen(false)}
                      data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4">
                    Mag-Login
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
