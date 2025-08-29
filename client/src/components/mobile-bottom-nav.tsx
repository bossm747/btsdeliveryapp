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
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10">
      {/* Glass morphism background with gradient */}
      <div className="absolute inset-0 bts-glass backdrop-blur-xl bts-gradient-primary opacity-98"></div>
      <div className="absolute inset-0 bts-shimmer opacity-15"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      
      {/* Navigation content */}
      <nav className="relative z-10 flex items-center justify-around px-2 py-2 safe-area-pb mobile-no-select">
        {navItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <div className={`relative flex flex-col items-center p-3 rounded-2xl transition-all duration-200 min-w-[64px] touch-manipulation ${
                item.active 
                  ? 'bts-glow-accent scale-110 bg-white/20' 
                  : 'hover:bg-white/10 active:scale-95 active:bg-white/20'
              }`}>
                
                {/* Icon container with glow effect */}
                <div className={`relative p-2 rounded-xl transition-all duration-300 ${
                  item.active ? 'bts-glow-primary' : ''
                }`}>
                  <IconComponent 
                    className={`h-6 w-6 transition-all duration-300 ${
                      item.active 
                        ? 'text-[#FFD23F] drop-shadow-lg' 
                        : 'text-white/80'
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
                    ? 'text-[#FFD23F] font-bold drop-shadow-lg' 
                    : 'text-white/70'
                }`}>
                  {item.label}
                </span>
                
                {/* Active indicator dot */}
                {item.active && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#FFD23F] bts-glow-accent"></div>
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