import { Link, useLocation } from "wouter";
import { Home, Search, ShoppingBag, User, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
// Cart context will be implemented later

export default function MobileBottomNav() {
  const [location] = useLocation();
  // Mock cart data for now
  const cartItemCount = 0;

  const navItems = [
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
      label: "Track",
      path: "/track-order",
      active: location === "/track-order"
    },
    {
      icon: User,
      label: "Profile",
      path: "/profile",
      active: location === "/profile"
    }
  ];

  return (
    <div className="mobile-bottom-nav-fixed md:hidden bts-glass border-t border-border/50 shadow-2xl">
      {/* Enhanced gradient background with glassmorphism - consistent with navbar */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#004225]/90 via-[#004225]/85 to-[#004225]/80 backdrop-blur-xl"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/10 via-transparent to-[#FFD23F]/10"></div>
      <div className="absolute inset-0 bts-shimmer opacity-20"></div>
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF6B35] via-[#FFD23F] to-[#FF6B35]"></div>
      
      {/* Navigation content */}
      <nav className="relative z-10 flex items-center justify-around px-2 py-2 safe-area-pb mobile-no-select">
        {navItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <div className={`relative flex flex-col items-center p-3 rounded-2xl transition-all duration-200 min-w-[64px] touch-manipulation ${
                item.active 
                  ? 'bg-gradient-to-b from-[#FFD23F]/30 to-[#FF6B35]/20 shadow-lg scale-105 border border-[#FFD23F]/40' 
                  : 'hover:bg-[#FFD23F]/10 active:scale-95 active:bg-[#FF6B35]/15'
              }`}>
                
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