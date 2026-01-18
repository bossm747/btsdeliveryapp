import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Zap, Clock, ChevronLeft, ChevronRight, Tag, Percent, Truck } from "lucide-react";

interface FlashDeal {
  id: string;
  title: string;
  description: string;
  discountPercent?: number;
  originalPrice?: number;
  discountedPrice?: number;
  restaurantId?: string;
  restaurantName?: string;
  imageUrl: string;
  expiresAt: Date;
  dealType: "percent" | "fixed" | "free-delivery" | "bundle";
  link: string;
}

const defaultDeals: FlashDeal[] = [
  {
    id: "1",
    title: "50% OFF Burgers",
    description: "All burgers half price",
    discountPercent: 50,
    restaurantName: "Batangas Burger Co.",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    dealType: "percent",
    link: "/restaurant/1"
  },
  {
    id: "2",
    title: "Free Delivery",
    description: "No delivery fee on all orders",
    restaurantName: "Lipa Lechon House",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    dealType: "free-delivery",
    link: "/restaurant/2"
  },
  {
    id: "3",
    title: "Buy 1 Get 1",
    description: "On all pasta dishes",
    discountPercent: 50,
    restaurantName: "Tanauan Italian Kitchen",
    imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop",
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
    dealType: "bundle",
    link: "/restaurant/3"
  },
  {
    id: "4",
    title: "PHP 100 OFF",
    description: "On orders over PHP 500",
    discountedPrice: 100,
    restaurantName: "Batangas Bay Seafood",
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours
    dealType: "fixed",
    link: "/restaurant/4"
  },
];

function CountdownTimer({ expiresAt }: { expiresAt: Date }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(expiresAt));

  function getTimeLeft(date: Date) {
    const diff = date.getTime() - Date.now();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const formatTime = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1 text-xs font-mono">
      <Clock className="w-3 h-3 text-red-500 countdown-pulse" />
      <span className="text-red-600 font-bold">
        {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
      </span>
    </div>
  );
}

function DealBadge({ deal }: { deal: FlashDeal }) {
  switch (deal.dealType) {
    case "percent":
      return (
        <Badge className="absolute top-3 left-3 bg-red-500 text-white font-bold px-2 py-1 deal-badge-shine">
          <Percent className="w-3 h-3 mr-1" />
          {deal.discountPercent}% OFF
        </Badge>
      );
    case "free-delivery":
      return (
        <Badge className="absolute top-3 left-3 bg-green-500 text-white font-bold px-2 py-1 deal-badge-shine">
          <Truck className="w-3 h-3 mr-1" />
          FREE DELIVERY
        </Badge>
      );
    case "bundle":
      return (
        <Badge className="absolute top-3 left-3 bg-purple-500 text-white font-bold px-2 py-1 deal-badge-shine">
          <Tag className="w-3 h-3 mr-1" />
          BOGO
        </Badge>
      );
    case "fixed":
      return (
        <Badge className="absolute top-3 left-3 bg-blue-500 text-white font-bold px-2 py-1 deal-badge-shine">
          <Tag className="w-3 h-3 mr-1" />
          PHP {deal.discountedPrice} OFF
        </Badge>
      );
  }
}

interface FlashDealsSectionProps {
  deals?: FlashDeal[];
}

export default function FlashDealsSection({ deals = defaultDeals }: FlashDealsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  if (deals.length === 0) return null;

  return (
    <div className="px-4 py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-[#004225] text-lg">Flash Deals</h3>
            <p className="text-xs text-gray-500">Limited time offers</p>
          </div>
        </div>
        <Link href="/deals">
          <Button variant="ghost" size="sm" className="text-[#FF6B35] font-medium">
            See All
          </Button>
        </Link>
      </div>

      {/* Deals Carousel */}
      <div className="relative">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-lg border hidden md:flex"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          onScroll={checkScrollButtons}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {deals.map((deal) => (
            <Link key={deal.id} href={deal.link}>
              <Card className="min-w-[260px] max-w-[260px] cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border-0 shadow-md">
                {/* Image */}
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={deal.imageUrl}
                    alt={deal.title}
                    className="w-full h-full object-cover"
                  />
                  <DealBadge deal={deal} />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Restaurant Name */}
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-white text-xs font-medium truncate">
                      {deal.restaurantName}
                    </p>
                  </div>
                </div>

                <CardContent className="p-3">
                  <h4 className="font-bold text-gray-900 mb-1">{deal.title}</h4>
                  <p className="text-gray-500 text-xs mb-2">{deal.description}</p>
                  <div className="flex items-center justify-between">
                    <CountdownTimer expiresAt={deal.expiresAt} />
                    <span className="text-xs text-[#FF6B35] font-semibold">Grab Now</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-lg border hidden md:flex"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
