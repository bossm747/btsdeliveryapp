import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  Store,
  Truck,
  ShoppingCart,
  AlertCircle,
  Settings,
  HeadphonesIcon,
  MapPin,
  DollarSign,
  Activity,
  FileText,
  Bell,
  Radio,
  Shield
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
  description?: string;
}

const navigationItems: NavItem[] = [
  {
    id: "dispatch",
    label: "Live Dispatch",
    icon: Radio,
    badge: 12,
    badgeColor: "bg-red-500",
    description: "Real-time order tracking and assignment"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Platform performance metrics"
  },
  {
    id: "orders",
    label: "Order Management",
    icon: ShoppingCart,
    badge: 8,
    badgeColor: "bg-blue-500",
    description: "View and manage all orders"
  },
  {
    id: "restaurants", 
    label: "Restaurant Partners",
    icon: Store,
    badge: 3,
    badgeColor: "bg-orange-500",
    description: "Manage vendor partnerships"
  },
  {
    id: "riders",
    label: "Rider Management",
    icon: Truck,
    badge: 5,
    badgeColor: "bg-green-500",
    description: "Delivery rider operations"
  },
  {
    id: "users",
    label: "User Management",
    icon: Users,
    description: "Customer account management"
  },
  {
    id: "financial",
    label: "Financial Reports",
    icon: DollarSign,
    description: "Revenue, commissions & settlements"
  },
  {
    id: "zones",
    label: "Delivery Zones",
    icon: MapPin,
    description: "Service area management"
  },
  {
    id: "support",
    label: "Support Center",
    icon: HeadphonesIcon,
    badge: 15,
    badgeColor: "bg-purple-500",
    description: "Customer support tickets"
  },
  {
    id: "monitoring",
    label: "System Health",
    icon: Activity,
    description: "Platform monitoring & alerts"
  },
  {
    id: "alerts",
    label: "Alert Center",
    icon: AlertCircle,
    badge: 7,
    badgeColor: "bg-red-500",
    description: "System alerts & notifications"
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    description: "Generate business reports"
  },
  {
    id: "config",
    label: "Configuration",
    icon: Settings,
    description: "Platform settings & rules"
  }
];

export default function AdminSidebar({ activeTab, onTabChange, isOpen }: AdminSidebarProps) {
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
          <Shield className="h-8 w-8 text-blue-600" />
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Admin Console
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={cn(
              "w-full justify-start h-12 px-3",
              activeTab === item.id 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            onClick={() => onTabChange(item.id)}
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
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
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