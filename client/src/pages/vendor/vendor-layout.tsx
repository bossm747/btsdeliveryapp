import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PageTransition } from "@/components/PageTransition";
import { VendorPageWrapper } from "@/components/vendor/vendor-page-wrapper";
import {
  BarChart3,
  ShoppingBag,
  Package,
  Star,
  User,
  DollarSign,
  Store,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  Sparkles,
  Clock,
  PieChart,
  Percent,
  FileText
} from "lucide-react";
import btsLogo from "@assets/bts-logo-transparent.png";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import type { Restaurant } from "@shared/schema";

interface VendorLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { href: "/vendor-dashboard", icon: BarChart3, label: "Overview", testId: "nav-overview" },
  { href: "/vendor-dashboard/orders", icon: ShoppingBag, label: "Orders", testId: "nav-orders" },
  { href: "/vendor-dashboard/menu", icon: Package, label: "Menu", testId: "nav-menu" },
  { href: "/vendor-dashboard/analytics", icon: PieChart, label: "Analytics", testId: "nav-analytics" },
  { href: "/vendor-dashboard/promotions", icon: Star, label: "Promotions", testId: "nav-promotions" },
  { href: "/vendor-dashboard/staff", icon: User, label: "Staff", testId: "nav-staff" },
  { href: "/vendor-dashboard/inventory", icon: Package, label: "Inventory", testId: "nav-inventory" },
  { href: "/vendor-dashboard/earnings", icon: DollarSign, label: "Earnings", testId: "nav-earnings" },
  { href: "/vendor-dashboard/commission", icon: Percent, label: "Commission", testId: "nav-commission" },
  { href: "/vendor-dashboard/business-settings", icon: Clock, label: "Business Hours", testId: "nav-business-settings" },
  { href: "/vendor-dashboard/tax-reports", icon: FileText, label: "Tax Reports", testId: "nav-tax-reports" },
  { href: "/vendor-dashboard/profile", icon: Store, label: "Restaurant", testId: "nav-profile" },
];

export default function VendorLayout({ children }: VendorLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-slate-200 dark:border-slate-800">
        <img 
          src={btsLogo} 
          alt="BTS Delivery Logo" 
          className="w-8 h-8 object-contain mr-3"
        />
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {restaurant?.name || "Vendor Dashboard"}
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = location === item.href || 
            (item.href === "/vendor-dashboard" && location === "/vendor-dashboard") ||
            (item.href !== "/vendor-dashboard" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start h-11 ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
                data-testid={item.testId}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-4 pb-6">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage src={user?.profileImageUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Restaurant Owner
                  </div>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Restaurant Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = "/ai-assistant"}>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Assistant
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" data-testid="vendor-layout">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64">
          <SidebarContent />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between h-16 px-4">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              <div className="flex items-center space-x-3">
                <img 
                  src={btsLogo} 
                  alt="BTS Delivery Logo" 
                  className="w-8 h-8 object-contain"
                />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {restaurant?.name || "Vendor Dashboard"}
                </h1>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                </Button>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <VendorPageWrapper
                pageTitle="Vendor Dashboard"
                pageDescription="Manage your restaurant, orders, menu, and analytics"
              >
                <PageTransition>
                  {children}
                </PageTransition>
              </VendorPageWrapper>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}