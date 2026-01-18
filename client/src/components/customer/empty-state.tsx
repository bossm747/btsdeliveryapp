import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Package,
  ShoppingBag,
  Heart,
  MapPin,
  CreditCard,
  Search,
  Utensils,
  Clock,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateType =
  | "orders"
  | "favorites"
  | "addresses"
  | "cart"
  | "search"
  | "restaurants"
  | "notifications"
  | "rewards";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  className?: string;
}

const emptyStateConfig: Record<
  EmptyStateType,
  {
    icon: ReactNode;
    title: string;
    description: string;
    actionLabel: string;
    actionLink: string;
    gradient: string;
  }
> = {
  orders: {
    icon: <Package className="w-12 h-12" />,
    title: "No orders yet",
    description: "Start exploring restaurants and place your first order!",
    actionLabel: "Browse Restaurants",
    actionLink: "/restaurants",
    gradient: "from-[#FF6B35]/10 to-[#FFD23F]/10",
  },
  favorites: {
    icon: <Heart className="w-12 h-12" />,
    title: "No favorites yet",
    description: "Save your favorite restaurants for quick access later.",
    actionLabel: "Discover Restaurants",
    actionLink: "/restaurants",
    gradient: "from-pink-100 to-red-50",
  },
  addresses: {
    icon: <MapPin className="w-12 h-12" />,
    title: "No saved addresses",
    description: "Add your delivery addresses for faster checkout.",
    actionLabel: "Add Address",
    actionLink: "/addresses",
    gradient: "from-blue-50 to-cyan-50",
  },
  cart: {
    icon: <ShoppingBag className="w-12 h-12" />,
    title: "Your cart is empty",
    description: "Add items from your favorite restaurants to get started.",
    actionLabel: "Browse Menu",
    actionLink: "/restaurants",
    gradient: "from-green-50 to-emerald-50",
  },
  search: {
    icon: <Search className="w-12 h-12" />,
    title: "No results found",
    description: "Try adjusting your search or filters to find what you're looking for.",
    actionLabel: "Clear Filters",
    actionLink: "/restaurants",
    gradient: "from-gray-50 to-slate-50",
  },
  restaurants: {
    icon: <Utensils className="w-12 h-12" />,
    title: "No restaurants available",
    description: "We're expanding! Check back soon for new restaurants in your area.",
    actionLabel: "Try Different Location",
    actionLink: "/restaurants",
    gradient: "from-orange-50 to-amber-50",
  },
  notifications: {
    icon: <Clock className="w-12 h-12" />,
    title: "No notifications",
    description: "You're all caught up! We'll notify you when there's something new.",
    actionLabel: "Go to Dashboard",
    actionLink: "/customer-dashboard",
    gradient: "from-purple-50 to-violet-50",
  },
  rewards: {
    icon: <Gift className="w-12 h-12" />,
    title: "No rewards yet",
    description: "Start ordering to earn points and unlock exclusive rewards!",
    actionLabel: "Start Earning",
    actionLink: "/restaurants",
    gradient: "from-yellow-50 to-orange-50",
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfig[type];

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;
  const displayActionLink = actionLink || config.actionLink;

  return (
    <Card
      className={cn(
        "border-dashed border-2 border-gray-200 bg-gradient-to-br",
        config.gradient,
        className
      )}
    >
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div
          className="mb-4 text-gray-300"
          aria-hidden="true"
        >
          {config.icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {displayTitle}
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          {displayDescription}
        </p>
        {onAction ? (
          <Button
            onClick={onAction}
            className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
            aria-label={displayActionLabel}
          >
            {displayActionLabel}
          </Button>
        ) : (
          <Link href={displayActionLink}>
            <Button
              className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
              aria-label={displayActionLabel}
            >
              {displayActionLabel}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for inline use
export function EmptyStateInline({
  type,
  className,
}: {
  type: EmptyStateType;
  className?: string;
}) {
  const config = emptyStateConfig[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 text-center",
        className
      )}
      role="status"
      aria-label={config.title}
    >
      <div className="mb-3 text-gray-300" aria-hidden="true">
        {config.icon}
      </div>
      <p className="text-sm text-gray-500">{config.title}</p>
    </div>
  );
}

export default EmptyState;
