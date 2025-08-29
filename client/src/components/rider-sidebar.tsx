import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Package, 
  Clock, 
  DollarSign, 
  Star, 
  TrendingUp, 
  Navigation, 
  Activity, 
  Brain,
  Menu,
  X,
  Settings,
  LogOut,
  User,
  BarChart3
} from 'lucide-react';

interface RiderSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  riderData?: {
    name?: string;
    rating?: number;
    totalDeliveries?: number;
    earningsBalance?: number;
  };
  isOnline: boolean;
  activeDeliveries: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
}

const navItems: NavItem[] = [
  {
    id: 'map',
    label: 'Live Tracking',
    icon: MapPin,
    description: 'Real-time GPS tracking'
  },
  {
    id: 'active',
    label: 'Active Deliveries',
    icon: Package,
    description: 'Current orders'
  },
  {
    id: 'available',
    label: 'Available Orders',
    icon: Clock,
    description: 'New opportunities'
  },
  {
    id: 'history',
    label: 'Delivery History',
    icon: BarChart3,
    description: 'Past deliveries'
  },
  {
    id: 'earnings',
    label: 'Earnings & Payout',
    icon: DollarSign,
    description: 'Financial overview'
  }
];

export default function RiderSidebar({
  activeTab,
  onTabChange,
  riderData,
  isOnline,
  activeDeliveries
}: RiderSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] rounded-xl flex items-center justify-center shadow-lg">
            <Navigation className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#004225]">BTS Rider</h2>
            <p className="text-sm text-gray-600">Dashboard</p>
          </div>
        </div>

        {/* Online Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span className="text-sm font-medium">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 text-xs">
              <Brain className="h-3 w-3 mr-1" />
              AI
            </Badge>
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 text-xs">
              <Activity className="h-3 w-3 mr-1" />
              GPS
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gradient-to-br from-[#FF6B35]/10 to-[#FFD23F]/10 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-4 w-4 text-[#FF6B35]" />
            </div>
            <div className="text-lg font-bold text-[#004225]">
              ₱{(riderData?.earningsBalance || 0).toFixed(0)}
            </div>
            <div className="text-xs text-gray-600">Today's Earnings</div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-br from-[#004225]/10 to-[#FF6B35]/10 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-4 w-4 text-[#FFD23F]" />
            </div>
            <div className="text-lg font-bold text-[#004225]">
              {(riderData?.rating || 0).toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">Rating</div>
          </div>
        </div>
        
        <div className="mt-4 text-center p-3 bg-gradient-to-r from-[#004225]/5 to-[#FF6B35]/5 rounded-lg">
          <div className="text-2xl font-bold text-[#004225]">
            {riderData?.totalDeliveries || 0}
          </div>
          <div className="text-sm text-gray-600">Total Deliveries</div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 p-6 space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Navigation
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all duration-200 group active:scale-98 touch-manipulation",
                isActive
                  ? "bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white shadow-lg shadow-[#FF6B35]/25 scale-105"
                  : "hover:bg-[#004225]/5 text-gray-700 dark:text-gray-300 hover:text-[#004225] active:bg-[#004225]/10"
              )}
              data-testid={`sidebar-nav-${item.id}`}
            >
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                isActive 
                  ? "bg-white/20" 
                  : "bg-gray-100 dark:bg-gray-800 group-hover:bg-[#FF6B35]/10"
              )}>
                <Icon className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-white" : "text-[#FF6B35]"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{item.label}</span>
                  {item.id === 'active' && activeDeliveries > 0 && (
                    <Badge 
                      variant={isActive ? "secondary" : "default"}
                      className={cn(
                        "ml-2 text-xs",
                        isActive 
                          ? "bg-white/20 text-white border-white/30" 
                          : "bg-[#FF6B35] text-white"
                      )}
                    >
                      {activeDeliveries}
                    </Badge>
                  )}
                </div>
                <div className={cn(
                  "text-xs truncate transition-colors",
                  isActive ? "text-white/80" : "text-gray-500"
                )}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-600 hover:text-[#004225] hover:bg-[#004225]/5"
        >
          <Settings className="h-4 w-4 mr-3" />
          Settings
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
        
        <Separator className="my-4" />
        
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] rounded-lg flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-[#004225] truncate">
              {riderData?.name || "Juan Dela Cruz"}
            </div>
            <div className="text-xs text-gray-500">Rider</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button - Native App Style */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setIsMobileMenuOpen(true)}
          size="icon"
          className="bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] shadow-xl border-0 rounded-2xl w-12 h-12 active:scale-95 transition-transform duration-150"
          data-testid="mobile-menu-toggle"
        >
          <Menu className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-sm">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay - Native App Style */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Backdrop with blur effect */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar - Native mobile drawer style */}
          <div className="relative w-[85vw] max-w-sm bg-white dark:bg-gray-900 shadow-2xl h-full transform transition-transform duration-300 ease-out rounded-r-3xl overflow-hidden">
            {/* Mobile Header with close gesture area */}
            <div className="absolute top-4 right-4 z-10">
              <Button
                onClick={() => setIsMobileMenuOpen(false)}
                size="icon"
                variant="ghost"
                className="rounded-full w-10 h-10 bg-gray-100 dark:bg-gray-800 active:scale-95 transition-all duration-150"
                data-testid="mobile-menu-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Swipe indicator */}
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            
            <div className="pt-4">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}