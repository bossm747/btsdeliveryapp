import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Settings, User, LogOut, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import btsLogo from "@assets/bts-logo-transparent.png";

interface AdminHeaderProps {
  title?: string;
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

export default function AdminHeader({ 
  title = "Admin Dashboard", 
  onMenuToggle, 
  isSidebarOpen = false 
}: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(3);

  // Fetch unread alerts count
  const { data: alertsCount = 0 } = useQuery({
    queryKey: ["/api/admin/alerts/count"],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: number };

  const handleLogout = () => {
    logout();
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'A';
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'Admin User';
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Menu toggle and title */}
        <div className="flex items-center space-x-4">
          {onMenuToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="lg:hidden"
              data-testid="button-menu-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <img 
                src={btsLogo} 
                alt="BTS Delivery Logo" 
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                BTS Delivery
              </h1>
            </div>
            
            {title && (
              <>
                <div className="hidden md:block text-gray-400">/</div>
                <h2 className="hidden md:block text-lg font-medium text-gray-700 dark:text-gray-300">
                  {title}
                </h2>
              </>
            )}
          </div>
        </div>

        {/* Right side - Status indicators and user menu */}
        <div className="flex items-center space-x-3">
          {/* System Status */}
          <div className="hidden sm:flex items-center space-x-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              System Online
            </Badge>
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                {(notifications > 0 || (alertsCount as number) > 0) && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {Math.max(notifications, (alertsCount as number) || 0)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                <Badge variant="secondary">{Math.max(notifications, (alertsCount as number) || 0)} unread</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start p-4">
                  <div className="font-medium text-sm">System Alert</div>
                  <div className="text-xs text-gray-600 mt-1">
                    3 orders have exceeded delivery SLA
                  </div>
                  <div className="text-xs text-gray-500 mt-1">5 minutes ago</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start p-4">
                  <div className="font-medium text-sm">New Restaurant Application</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Jollibee Batangas has submitted application for approval
                  </div>
                  <div className="text-xs text-gray-500 mt-1">15 minutes ago</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start p-4">
                  <div className="font-medium text-sm">Rider Verification</div>
                  <div className="text-xs text-gray-600 mt-1">
                    2 new riders pending document verification
                  </div>
                  <div className="text-xs text-gray-500 mt-1">1 hour ago</div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-blue-600">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            data-testid="button-settings"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full p-0"
                data-testid="button-user-menu"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.profileImageUrl} alt={getUserDisplayName()} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs leading-none text-gray-600">
                    {user?.email}
                  </p>
                  <Badge variant="outline" className="w-fit mt-1">
                    <img 
                      src={btsLogo} 
                      alt="BTS" 
                      className="w-3 h-3 mr-1 object-contain"
                    />
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600"
                data-testid="menu-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}