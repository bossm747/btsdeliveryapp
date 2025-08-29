import { Link, useLocation } from "wouter";
import { 
  Home, Search, ShoppingBag, User, Package
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  icon: any;
  label: string;
  path: string;
  active: boolean;
  badge?: number | null;
}

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const cartItemCount = getTotalItems();

  // Don't show navigation on role-specific dashboards as they have their own
  const isDashboardRoute = location.includes("/customer-dashboard") || 
                          location.includes("/rider-dashboard") || 
                          location.includes("/vendor-dashboard") || 
                          location.includes("/admin-dashboard");
  
  if (isDashboardRoute) {
    return null; // Role-specific dashboards handle their own navigation
  }

  // Only show for customer routes
  const isCustomerRoute = user?.role === "customer";

  // Customer navigation items only
  const customerNavItems: NavItem[] = [
    {
      icon: Home,
      label: "Home",
      path: "/home",
      active: location === "/home"
    },
    {
      icon: Search,
      label: "Restaurants",
      path: "/restaurants",
      active: location.includes("/restaurant")
    },
    {
      icon: ShoppingBag,
      label: "Cart",
      path: "/cart",
      active: location === "/cart",
      badge: cartItemCount > 0 ? cartItemCount : null
    },
    {
      icon: Package,
      label: "Orders",
      path: "/customer-orders",
      active: location.includes("/customer-orders") || location.includes("/order-tracking")
    },
    {
      icon: User,
      label: "Profile",
      path: "/customer-dashboard",
      active: location === "/customer-dashboard"
    }
  ];

  // Only show for customer routes and not on dashboard routes
  if (!isCustomerRoute) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe-bottom">
      <div className="grid grid-cols-5 text-center">
        {customerNavItems.map((item) => {
          const Icon = item.icon;
          
          return (
            <Link key={item.label} href={item.path}>
              <div className={`py-3 px-1 transition-colors ${
                item.active 
                  ? 'text-[#FF6B35] bg-orange-50' 
                  : 'text-gray-600 hover:text-[#FF6B35]'
              }`}>
                <div className="relative">
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${
                    item.active ? 'text-[#FF6B35]' : ''
                  }`} />
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 w-4 h-4 p-0 text-xs flex items-center justify-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-medium">{item.label}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}