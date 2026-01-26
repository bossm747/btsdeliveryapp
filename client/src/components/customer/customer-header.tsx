import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Menu, User, MapPin, Heart, LogOut, ArrowLeft,
  Wallet, Gift, ShoppingCart
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/stores/cart-store";
import { NotificationCenter } from "@/components/notification-center";
import btsLogo from "@assets/bts-logo-transparent.png";

interface CustomerHeaderProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
  rightContent?: React.ReactNode;
  variant?: "default" | "transparent" | "green";
}

export default function CustomerHeader({
  title = "BTS Delivery",
  showBack = false,
  backPath = "/customer-dashboard",
  rightContent,
  variant = "default"
}: CustomerHeaderProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "Successfully logged out from your account",
    });
    setShowMenu(false);
  };

  const bgClass = variant === "green"
    ? "bg-[#004225] border-green-800"
    : variant === "transparent"
      ? "bg-white/95 backdrop-blur border-gray-100"
      : "bg-white border-gray-100";

  const textClass = variant === "green" ? "text-white" : "text-gray-900";
  const buttonClass = variant === "green"
    ? "text-white hover:bg-white/10"
    : "text-gray-700 hover:bg-gray-100";

  return (
    <div className={`sticky top-0 z-50 border-b shadow-sm ${bgClass}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 ${buttonClass}`}
              onClick={() => setLocation(backPath)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <img src={btsLogo} alt="BTS Delivery" className="w-8 h-8" />
            <div>
              <h1 className={`text-lg font-bold ${textClass}`}>{title}</h1>
              {!showBack && (
                <p className={`text-xs ${variant === "green" ? "text-green-200" : "text-gray-600"} flex items-center`}>
                  <MapPin className="w-3 h-3 mr-1" />
                  Batangas Province
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {rightContent}

          {/* Cart Button */}
          <Button
            variant="ghost"
            size="sm"
            className={`p-2 relative ${buttonClass}`}
            onClick={() => setLocation("/cart")}
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-red-500 flex items-center justify-center">
                {totalItems}
              </Badge>
            )}
          </Button>

          {/* Notifications */}
          <NotificationCenter
            variant="ghost"
            size="sm"
            className={buttonClass}
            iconClassName={variant === "green" ? "text-white" : "text-gray-700"}
          />

          {/* Menu Trigger */}
          <Sheet open={showMenu} onOpenChange={setShowMenu}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className={`p-2 ${buttonClass}`}>
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user?.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] text-white">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-left">{user?.firstName} {user?.lastName}</SheetTitle>
                    <SheetDescription className="text-left">Customer ID: {user?.id?.slice(0, 8)}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <Link href="/profile-settings" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <User className="w-4 h-4 mr-3" />
                      My Profile
                    </Button>
                  </Link>
                  <Link href="/wallet" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Wallet className="w-4 h-4 mr-3" />
                      Wallet & Payments
                    </Button>
                  </Link>
                  <Link href="/loyalty" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Gift className="w-4 h-4 mr-3" />
                      Rewards & Points
                    </Button>
                  </Link>
                  <Link href="/favorites" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Heart className="w-4 h-4 mr-3" />
                      Favorites
                    </Button>
                  </Link>
                  <Link href="/addresses" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <MapPin className="w-4 h-4 mr-3" />
                      My Addresses
                    </Button>
                  </Link>
                </div>

                <Separator />

                <Button variant="ghost" className="w-full justify-start text-red-600" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-3" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
