import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Percent, Utensils, Truck, Gift } from "lucide-react";

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  gradient: string;
  icon: React.ReactNode;
  badge?: string;
}

const defaultPromos: PromoBanner[] = [
  {
    id: "1",
    title: "50% OFF First Order",
    subtitle: "Use code BTSDELIVER for your first food delivery",
    ctaText: "Order Now",
    ctaLink: "/restaurants",
    gradient: "from-[#FF6B35] via-[#FF8B5B] to-[#FFD23F]",
    icon: <Percent className="w-12 h-12 text-white/90" />,
    badge: "LIMITED TIME"
  },
  {
    id: "2",
    title: "Free Delivery Weekend",
    subtitle: "Enjoy free delivery on all orders over PHP 500",
    ctaText: "Browse Restaurants",
    ctaLink: "/restaurants",
    gradient: "from-[#004225] via-[#006B3D] to-[#00A651]",
    icon: <Truck className="w-12 h-12 text-white/90" />,
    badge: "WEEKEND SPECIAL"
  },
  {
    id: "3",
    title: "Pabili Service Promo",
    subtitle: "Get 20% off service fee on grocery shopping",
    ctaText: "Try Pabili",
    ctaLink: "/pabili",
    gradient: "from-[#8B5CF6] via-[#A78BFA] to-[#C4B5FD]",
    icon: <Utensils className="w-12 h-12 text-white/90" />,
  },
  {
    id: "4",
    title: "Earn Double Points",
    subtitle: "Get 2x loyalty points on every order this week",
    ctaText: "View Rewards",
    ctaLink: "/loyalty",
    gradient: "from-[#F59E0B] via-[#FBBF24] to-[#FCD34D]",
    icon: <Gift className="w-12 h-12 text-white/90" />,
    badge: "BONUS"
  },
];

interface PromoBannerCarouselProps {
  promos?: PromoBanner[];
  autoplayDelay?: number;
}

export default function PromoBannerCarousel({
  promos = defaultPromos,
  autoplayDelay = 5000
}: PromoBannerCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const autoplayPlugin = Autoplay({ delay: autoplayDelay, stopOnInteraction: true });

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);
  const scrollTo = useCallback((index: number) => api?.scrollTo(index), [api]);

  return (
    <div className="relative w-full">
      <Carousel
        setApi={setApi}
        plugins={[autoplayPlugin]}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {promos.map((promo) => (
            <CarouselItem key={promo.id}>
              <div className={`relative overflow-hidden rounded-2xl mx-4 bg-gradient-to-r ${promo.gradient}`}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/3" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/3" />
                </div>

                <div className="relative px-6 py-8 md:px-10 md:py-12 flex items-center justify-between min-h-[180px]">
                  {/* Content */}
                  <div className="flex-1 pr-4">
                    {promo.badge && (
                      <span className="inline-block px-3 py-1 text-xs font-bold bg-white/20 text-white rounded-full mb-3 backdrop-blur-sm">
                        {promo.badge}
                      </span>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                      {promo.title}
                    </h2>
                    <p className="text-white/90 text-sm md:text-base mb-4 max-w-md">
                      {promo.subtitle}
                    </p>
                    <Link href={promo.ctaLink}>
                      <Button
                        className="bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-lg"
                        size="sm"
                      >
                        {promo.ctaText}
                      </Button>
                    </Link>
                  </div>

                  {/* Icon */}
                  <div className="hidden md:flex items-center justify-center w-24 h-24 bg-white/10 rounded-2xl backdrop-blur-sm">
                    {promo.icon}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-white/60 transition-all duration-300 carousel-progress"
                    style={{ width: `${((current + 1) / count) * 100}%` }}
                  />
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Arrows - Desktop Only */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow-lg hidden md:flex"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-6 w-6 text-gray-800" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow-lg hidden md:flex"
          onClick={scrollNext}
        >
          <ChevronRight className="h-6 w-6 text-gray-800" />
        </Button>
      </Carousel>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`transition-all duration-300 rounded-full ${
              index === current
                ? "w-6 h-2 bg-[#FF6B35]"
                : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
