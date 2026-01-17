import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, Menu, ChevronDown, Package, Users, Settings, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import NotificationCenter from "@/components/notification-center";
import LanguageToggle from "@/components/language-toggle";
import btsLogo from "@assets/bts-logo-transparent.png";

export default function Navbar() {
  const [, setLocation] = useLocation();
  const { getTotalItems } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const totalItems = getTotalItems();

  // Main services - always visible
  const mainServices = [
    { label: t("service.food"), href: "/restaurants" },
    { label: t("service.pabili"), href: "/pabili" },
    { label: t("service.pabayad"), href: "/pabayad" },
    { label: t("service.parcel"), href: "/parcel" },
  ];

  // Customer management items
  const customerItems = [
    { label: "My Orders", href: "/customer-orders", icon: Package },
    { label: "Track Order", href: "/order-tracking", icon: Package },
  ];

  // Business dashboard items
  const businessItems = [
    { label: "Vendor Dashboard", href: "/vendor-dashboard", icon: BarChart3 },
    { label: "Rider Dashboard", href: "/rider-dashboard", icon: Users },
  ];

  // Admin management items
  const adminItems = [
    { label: "Admin Dashboard", href: "/admin-dashboard", icon: Settings },
    { label: "Dispatch Console", href: "/admin/dispatch-enhanced", icon: BarChart3 },
    { label: "Manage Riders", href: "/admin/riders", icon: Users },
  ];

  return (
    <nav className="sticky top-0 z-50 bts-glass border-b border-border/50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2" data-testid="logo-link">
            <img 
              src={btsLogo} 
              alt="BTS Delivery Logo" 
              className="w-10 h-10 object-contain rounded-full bg-white p-0.5"
            />
            <span className="font-bold text-xl bts-text-gradient">BTS Delivery</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            {/* Main Services */}
            {mainServices.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors bts-hover-lift"
                data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Customer Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1">
                  <span>My Account</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Customer Services</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {customerItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.label} asChild>
                      <Link href={item.href} className="flex items-center space-x-2 w-full">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Business Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1">
                  <span>Business</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Business Dashboards</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {businessItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.label} asChild>
                      <Link href={item.href} className="flex items-center space-x-2 w-full">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Admin Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1">
                  <span>Admin</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Admin Management</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.label} asChild>
                      <Link href={item.href} className="flex items-center space-x-2 w-full">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <NotificationCenter userId="user-1" userRole="customer" />
            
            <LanguageToggle />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/cart")}
              className="relative"
              data-testid="cart-button"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t("nav.cart")}
              {totalItems > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {totalItems}
                </Badge>
              )}
            </Button>
            
            <Button className="bts-gradient-primary text-white hover:opacity-90 bts-glow-primary" data-testid="login-button">
              Mag-Login
            </Button>
          </div>
          
          <div className="md:hidden flex items-center space-x-2">
            <NotificationCenter userId="user-1" userRole="customer" />
            
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
                  {/* Main Services */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Main Services</h3>
                    {mainServices.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="text-foreground hover:text-primary transition-colors py-2 border-b border-border block"
                        onClick={() => setIsOpen(false)}
                        data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {/* Customer Items */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Customer</h3>
                    {customerItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors py-2 border-b border-border"
                          onClick={() => setIsOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Business Items */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Business</h3>
                    {businessItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors py-2 border-b border-border"
                          onClick={() => setIsOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Admin Items */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Admin</h3>
                    {adminItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors py-2 border-b border-border"
                          onClick={() => setIsOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

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
