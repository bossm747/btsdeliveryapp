import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  ShoppingBag,
  CreditCard,
  Truck,
  Pizza,
  Coffee,
  Beef,
  Fish,
  Salad,
  IceCream,
  Soup,
  Sandwich,
} from "lucide-react";

interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  link: string;
  gradient?: string;
  isService?: boolean;
}

const categories: CategoryItem[] = [
  // Main Services
  {
    id: "food",
    label: "Food",
    icon: <Utensils className="w-5 h-5" />,
    link: "/restaurants",
    gradient: "from-[#FF6B35] to-[#FFD23F]",
    isService: true
  },
  {
    id: "pabili",
    label: "Pabili",
    icon: <ShoppingBag className="w-5 h-5" />,
    link: "/pabili",
    gradient: "from-green-500 to-green-400",
    isService: true
  },
  {
    id: "pabayad",
    label: "Pabayad",
    icon: <CreditCard className="w-5 h-5" />,
    link: "/pabayad",
    gradient: "from-blue-500 to-blue-400",
    isService: true
  },
  {
    id: "parcel",
    label: "Parcel",
    icon: <Truck className="w-5 h-5" />,
    link: "/parcel",
    gradient: "from-purple-500 to-purple-400",
    isService: true
  },
  // Food subcategories
  {
    id: "pizza",
    label: "Pizza",
    icon: <Pizza className="w-5 h-5" />,
    link: "/restaurants?category=Pizza"
  },
  {
    id: "coffee",
    label: "Coffee",
    icon: <Coffee className="w-5 h-5" />,
    link: "/restaurants?category=Coffee"
  },
  {
    id: "meat",
    label: "Filipino",
    icon: <Beef className="w-5 h-5" />,
    link: "/restaurants?category=Filipino"
  },
  {
    id: "seafood",
    label: "Seafood",
    icon: <Fish className="w-5 h-5" />,
    link: "/restaurants?category=Seafood"
  },
  {
    id: "salads",
    label: "Healthy",
    icon: <Salad className="w-5 h-5" />,
    link: "/restaurants?category=Healthy"
  },
  {
    id: "desserts",
    label: "Desserts",
    icon: <IceCream className="w-5 h-5" />,
    link: "/restaurants?category=Desserts"
  },
  {
    id: "soup",
    label: "Soup",
    icon: <Soup className="w-5 h-5" />,
    link: "/restaurants?category=Soup"
  },
  {
    id: "fastfood",
    label: "Fast Food",
    icon: <Sandwich className="w-5 h-5" />,
    link: "/restaurants?category=Fast%20Food"
  },
];

interface CategoryPillsProps {
  onCategorySelect?: (categoryId: string) => void;
  selectedCategory?: string;
}

export default function CategoryPills({ onCategorySelect, selectedCategory }: CategoryPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(selectedCategory);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const handleCategoryClick = (category: CategoryItem) => {
    setActiveCategory(category.id);
    onCategorySelect?.(category.id);
  };

  return (
    <div className="relative px-4 py-3">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md border border-gray-200 hidden md:flex"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide py-1"
        onScroll={checkScrollButtons}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          const isService = category.isService;

          return (
            <Link key={category.id} href={category.link}>
              <button
                onClick={() => handleCategoryClick(category)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap
                  transition-all duration-200 font-medium text-sm
                  ${isService
                    ? `bg-gradient-to-r ${category.gradient} text-white shadow-md hover:shadow-lg hover:scale-105`
                    : isActive
                      ? "bg-[#004225] text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                  ${isActive && !isService ? "ring-2 ring-[#FF6B35] ring-offset-2" : ""}
                `}
              >
                <span className={isService ? "opacity-90" : ""}>{category.icon}</span>
                <span>{category.label}</span>
              </button>
            </Link>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md border border-gray-200 hidden md:flex"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Gradient Fade Effect */}
      <div className="absolute left-4 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none md:hidden" />
      <div className="absolute right-4 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none md:hidden" />
    </div>
  );
}
