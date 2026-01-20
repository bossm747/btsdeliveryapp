import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Users,
  Store,
  Truck,
  ShoppingCart,
  HeadphonesIcon,
  MapPin,
  DollarSign,
  FileText,
  Radio,
  CheckSquare,
  Shield,
  ShieldAlert,
  Percent,
  Tag,
  Layers,
  Settings
} from "lucide-react";
import btsLogo from "@assets/bts-logo-transparent.png";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
  isOpen: boolean;
}


interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
  description?: string;
  path: string;
}

const navigationItems: NavItem[] = [
  {
    id: "dispatch",
    label: "Live Dispatch",
    icon: Radio,
    badge: 12,
    badgeColor: "bg-red-500",
    description: "Real-time order tracking and assignment",
    path: "/admin/dispatch"
  },
  {
    id: "dispatch-enhanced",
    label: "Enhanced Dispatch",
    icon: Layers,
    badgeColor: "bg-purple-500",
    description: "Batch orders, SLA monitoring, escalations",
    path: "/admin/dispatch-enhanced"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Platform performance metrics",
    path: "/admin/analytics"
  },
  {
    id: "financial",
    label: "Financial Analytics",
    icon: DollarSign,
    description: "Revenue, profit & financial insights",
    path: "/admin/financial"
  },
  {
    id: "orders",
    label: "Order Management",
    icon: ShoppingCart,
    badge: 8,
    badgeColor: "bg-blue-500",
    description: "View and manage all orders",
    path: "/admin/orders"
  },
  {
    id: "restaurants",
    label: "Restaurant Partners",
    icon: Store,
    badge: 3,
    badgeColor: "bg-orange-500",
    description: "Manage vendor partnerships",
    path: "/admin/restaurants"
  },
  {
    id: "vendor-approval",
    label: "Vendor Approval",
    icon: CheckSquare,
    badge: 5,
    badgeColor: "bg-yellow-500",
    description: "Review pending vendor applications",
    path: "/admin/vendor-approval"
  },
  {
    id: "riders",
    label: "Rider Management",
    icon: Truck,
    badge: 5,
    badgeColor: "bg-green-500",
    description: "Delivery rider operations",
    path: "/admin/riders"
  },
  {
    id: "rider-verification",
    label: "Rider Verification",
    icon: Shield,
    badge: 8,
    badgeColor: "bg-purple-500",
    description: "Verify rider documents & background",
    path: "/admin/rider-verification"
  },
  {
    id: "users",
    label: "User Management",
    icon: Users,
    description: "Customer account management",
    path: "/admin/users"
  },
  {
    id: "fraud",
    label: "Fraud Detection",
    icon: ShieldAlert,
    badge: 0,
    badgeColor: "bg-red-500",
    description: "Fraud alerts & prevention",
    path: "/admin/fraud"
  },
  {
    id: "commission",
    label: "Commission Settings",
    icon: Percent,
    description: "Manage commission rates & tiers",
    path: "/admin/commission"
  },
  {
    id: "delivery-settings",
    label: "Delivery Settings",
    icon: Settings,
    description: "Delivery fees, rider pay & rates",
    path: "/admin/delivery-settings"
  },
  {
    id: "promos",
    label: "Promo Codes",
    icon: Tag,
    description: "Promotional codes & discounts",
    path: "/admin/promos"
  },
  {
    id: "tax",
    label: "Tax Management",
    icon: FileText,
    description: "Tax exemptions & compliance",
    path: "/admin/tax"
  },
  {
    id: "zones",
    label: "Delivery Zones",
    icon: MapPin,
    description: "Service area management",
    path: "/admin/zones"
  },
  {
    id: "support",
    label: "Support Center",
    icon: HeadphonesIcon,
    badge: 15,
    badgeColor: "bg-purple-500",
    description: "Customer support tickets",
    path: "/admin/support"
  }
];

export default function AdminSidebar({ activeTab, onTabChange, isOpen }: AdminSidebarProps) {
  const [location] = useLocation();
  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      data-testid="admin-sidebar"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <img 
            src={btsLogo} 
            alt="BTS Delivery Logo" 
            className="w-8 h-8 object-contain"
          />
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Admin Console
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = location === item.path || (activeTab === item.id);
          
          return (
            <Link key={item.id} href={item.path}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 px-3",
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                data-testid={`nav-${item.id}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      className={cn(
                        "text-white text-xs px-2 py-1 ml-auto",
                        item.badgeColor || "bg-gray-500"
                      )}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </div>
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <img 
              src={btsLogo} 
              alt="BTS" 
              className="w-5 h-5 object-contain"
            />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                System Status
              </p>
              <p className="text-xs text-blue-600">
                All services operational
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}