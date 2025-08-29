import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, Search, ShoppingBag, User, MapPin, Truck, 
  Navigation, Package, BarChart3, Bell, Settings 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";

interface NavItem {
  icon: any;
  label: string;
  path: string;
  active: boolean;
  badge?: number | null;
  tabAction?: string;
}

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { getTotalItems } = useCart();
  const cartItemCount = getTotalItems();

  // Determine user context based on current route
  const isRiderDashboard = location.includes("/rider-dashboard");
  const isAdminDashboard = location.includes("/admin-dashboard") || location.includes("/admin-riders") || location.includes("/bts-dashboard");
  const isVendorDashboard = location.includes("/vendor-dashboard");

  // Track active rider tab
  const [activeRiderTab, setActiveRiderTab] = useState("tracking");

  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveRiderTab(event.detail.tab);
    };

    window.addEventListener('riderTabChange', handleTabChange as EventListener);
    
    return () => {
      window.removeEventListener('riderTabChange', handleTabChange as EventListener);
    };
  }, []);

  // Rider navigation items
  const riderNavItems: NavItem[] = [
    {
      icon: Navigation,
      label: "Live Map",
      path: "/rider-dashboard",
      active: activeRiderTab === "tracking",
      tabAction: "tracking"
    },
    {
      icon: Package,
      label: "Deliveries",
      path: "/rider-dashboard",
      active: activeRiderTab === "deliveries",
      tabAction: "deliveries"
    },
    {
      icon: BarChart3,
      label: "Earnings",
      path: "/rider-dashboard",
      active: activeRiderTab === "earnings",
      tabAction: "earnings"
    },
    {
      icon: Bell,
      label: "Notifications",
      path: "/rider-dashboard",
      active: activeRiderTab === "notifications",
      tabAction: "notifications"
    },
    {
      icon: User,
      label: "Profile",
      path: "/rider-dashboard",
      active: activeRiderTab === "profile",
      tabAction: "profile"
    }
  ];

  // Admin navigation items
  const adminNavItems: NavItem[] = [
    {
      icon: BarChart3,
      label: "Dashboard",
      path: "/admin-dashboard",
      active: location === "/admin-dashboard"
    },
    {
      icon: Truck,
      label: "Riders",
      path: "/admin-riders",
      active: location === "/admin-riders"
    },
    {
      icon: Package,
      label: "Orders",
      path: "/admin-dashboard",
      active: false
    },
    {
      icon: MapPin,
      label: "Tracking",
      path: "/bts-dashboard",
      active: location === "/bts-dashboard"
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/admin-dashboard",
      active: false
    }
  ];

  // Vendor navigation items
  const vendorNavItems: NavItem[] = [
    {
      icon: Home,
      label: "Dashboard",
      path: "/vendor-dashboard",
      active: location === "/vendor-dashboard"
    },
    {
      icon: Package,
      label: "Orders",
      path: "/vendor-dashboard",
      active: false
    },
    {
      icon: Search,
      label: "Menu",
      path: "/vendor-dashboard",
      active: false
    },
    {
      icon: BarChart3,
      label: "Analytics",
      path: "/vendor-dashboard",
      active: false
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/vendor-dashboard",
      active: false
    }
  ];

  // Default customer navigation items
  const customerNavItems: NavItem[] = [
    {
      icon: Home,
      label: "Home",
      path: "/",
      active: location === "/" || location === ""
    },
    {
      icon: Search,
      label: "Search",
      path: "/restaurants",
      active: location.includes("/restaurants") || location.includes("/restaurant/")
    },
    {
      icon: ShoppingBag,
      label: "Cart",
      path: "/cart",
      active: location === "/cart",
      badge: cartItemCount > 0 ? cartItemCount : null
    },
    {
      icon: MapPin,
      label: "Orders",
      path: "/customer-orders",
      active: location === "/customer-orders" || location.includes("/order/")
    },
    {
      icon: User,
      label: "Profile",
      path: "/profile",
      active: location === "/profile"
    }
  ];

  // Select appropriate navigation items based on context
  let navItems = customerNavItems;
  if (isRiderDashboard) {
    navItems = riderNavItems;
  } else if (isAdminDashboard) {
    navItems = adminNavItems;
  } else if (isVendorDashboard) {
    navItems = vendorNavItems;
  }

  return (
    <div className="mobile-bottom-nav-container">
      {/* Enhanced gradient background with glassmorphism - consistent with navbar */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#004225]/90 via-[#004225]/85 to-[#004225]/80 backdrop-blur-xl"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/10 via-transparent to-[#FFD23F]/10"></div>
      <div className="absolute inset-0 bts-shimmer opacity-20"></div>
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF6B35] via-[#FFD23F] to-[#FF6B35]"></div>
      
      {/* Navigation content */}
      <nav className="relative z-10 flex items-center justify-around px-2 py-2 safe-area-pb mobile-no-select">
        {navItems.map((item, index) => {
          const IconComponent = item.icon;
          
          const handleClick = (e: React.MouseEvent) => {
            if (item.tabAction && isRiderDashboard) {
              e.preventDefault();
              // Trigger tab change event for rider dashboard
              const tabEvent = new CustomEvent('riderTabChange', { 
                detail: { tab: item.tabAction } 
              });
              window.dispatchEvent(tabEvent);
            }
          };
          
          return (
            <Link key={item.path + (item.tabAction || '')} href={item.path}>
              <div 
                className={`relative flex flex-col items-center p-3 rounded-2xl transition-all duration-200 min-w-[64px] touch-manipulation ${
                  item.active 
                    ? 'bg-gradient-to-b from-[#FFD23F]/30 to-[#FF6B35]/20 shadow-lg scale-105 border border-[#FFD23F]/40' 
                    : 'hover:bg-[#FFD23F]/10 active:scale-95 active:bg-[#FF6B35]/15'
                }`}
                onClick={handleClick}
              >
                
                {/* Icon container with glow effect */}
                <div className={`relative p-2 rounded-xl transition-all duration-300 ${
                  item.active ? 'bg-gradient-to-br from-[#FFD23F]/20 to-[#FF6B35]/20 shadow-lg' : ''
                }`}>
                  <IconComponent 
                    className={`h-6 w-6 transition-all duration-300 ${
                      item.active 
                        ? 'text-[#FFD23F] drop-shadow-[0_2px_8px_rgba(255,210,63,0.8)]' 
                        : 'text-white/90 hover:text-[#FFD23F]/80'
                    }`}
                  />
                  
                  {/* Badge for cart count */}
                  {item.badge && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[#FF6B35] text-white text-xs bts-glow-accent">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </div>
                
                {/* Label with gradient text */}
                <span className={`text-xs font-medium mt-1 transition-all duration-300 ${
                  item.active 
                    ? 'text-[#FFD23F] font-bold drop-shadow-[0_1px_4px_rgba(255,210,63,0.8)]' 
                    : 'text-white/80 hover:text-white'
                }`}>
                  {item.label}
                </span>
                
                {/* Enhanced active indicator */}
                {item.active && (
                  <div className="absolute -bottom-1 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] shadow-lg drop-shadow-[0_2px_6px_rgba(255,210,63,0.6)]"></div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* Safe area bottom spacing for iOS */}
      <div className="h-safe-area-inset-bottom bg-transparent"></div>
    </div>
  );
}