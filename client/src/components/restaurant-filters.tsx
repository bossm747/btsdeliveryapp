import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, Filter, MapPin, Clock, Star, DollarSign, 
  Leaf, Zap, Heart, ChevronDown, X, SlidersHorizontal 
} from "lucide-react";

interface RestaurantFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  deliveryTime: string;
  onDeliveryTimeChange: (value: string) => void;
  rating: string;
  onRatingChange: (value: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (value: [number, number]) => void;
  dietaryFilters: string[];
  onDietaryFiltersChange: (filters: string[]) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  distance: number;
  onDistanceChange: (value: number) => void;
  isOpen: boolean;
  onIsOpenChange: (value: boolean) => void;
  location?: string;
  onLocationChange?: (value: string) => void;
  onClearFilters: () => void;
}

export default function RestaurantFilters({
  searchTerm,
  onSearchChange,
  category,
  onCategoryChange,
  deliveryTime,
  onDeliveryTimeChange,
  rating,
  onRatingChange,
  priceRange,
  onPriceRangeChange,
  dietaryFilters,
  onDietaryFiltersChange,
  sortBy,
  onSortByChange,
  distance,
  onDistanceChange,
  isOpen,
  onIsOpenChange,
  location,
  onLocationChange,
  onClearFilters
}: RestaurantFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Calculate active filters count
  const calculateActiveFilters = () => {
    let count = 0;
    if (searchTerm) count++;
    if (category !== "all") count++;
    if (deliveryTime !== "all") count++;
    if (rating !== "all") count++;
    if (priceRange[0] > 0 || priceRange[1] < 1000) count++;
    if (dietaryFilters.length > 0) count++;
    if (sortBy !== "default") count++;
    if (distance < 50) count++;
    if (isOpen) count++;
    setActiveFiltersCount(count);
  };

  // Handle dietary filter toggle
  const handleDietaryFilterToggle = (filter: string) => {
    const updatedFilters = dietaryFilters.includes(filter)
      ? dietaryFilters.filter(f => f !== filter)
      : [...dietaryFilters, filter];
    onDietaryFiltersChange(updatedFilters);
  };

  const dietaryOptions = [
    { id: "vegetarian", label: "Vegetarian", icon: "🥬" },
    { id: "halal", label: "Halal", icon: "☪️" },
    { id: "vegan", label: "Vegan", icon: "🌱" },
    { id: "gluten-free", label: "Gluten-Free", icon: "🌾" },
    { id: "dairy-free", label: "Dairy-Free", icon: "🥛" },
    { id: "keto", label: "Keto-Friendly", icon: "🥑" },
    { id: "healthy", label: "Healthy Options", icon: "💚" }
  ];

  return (
    <Card className="bg-gradient-to-r from-white to-gray-50/50 shadow-lg border-2 border-gray-100 mb-8" data-testid="restaurant-filters">
      <CardContent className="p-6">
        {/* Main Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search restaurants, dishes, or cuisines..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 pr-4 h-12 text-lg bg-white border-2 border-gray-200 focus:border-[#FF6B35] rounded-xl shadow-sm"
            data-testid="search-input"
          />
        </div>

        {/* Quick Filters Row */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-fit min-w-[150px]" data-testid="category-select">
              <SelectValue placeholder="All Cuisines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cuisines</SelectItem>
              <SelectItem value="Filipino Food">🇵🇭 Filipino</SelectItem>
              <SelectItem value="Fast Food">🍟 Fast Food</SelectItem>
              <SelectItem value="Chinese">🥡 Chinese</SelectItem>
              <SelectItem value="Japanese">🍱 Japanese</SelectItem>
              <SelectItem value="Korean">🍜 Korean</SelectItem>
              <SelectItem value="Italian">🍕 Italian</SelectItem>
              <SelectItem value="American">🍔 American</SelectItem>
              <SelectItem value="Coffee">☕ Coffee & Drinks</SelectItem>
              <SelectItem value="Bakery">🥐 Bakery</SelectItem>
              <SelectItem value="Desserts">🍰 Desserts</SelectItem>
              <SelectItem value="Healthy">🥗 Healthy</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={deliveryTime} onValueChange={onDeliveryTimeChange}>
            <SelectTrigger className="w-fit min-w-[130px]" data-testid="delivery-time-select">
              <SelectValue placeholder="Any Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Time</SelectItem>
              <SelectItem value="15-30">⚡ 15-30 mins</SelectItem>
              <SelectItem value="30-45">🚚 30-45 mins</SelectItem>
              <SelectItem value="45+">🕐 45+ mins</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={rating} onValueChange={onRatingChange}>
            <SelectTrigger className="w-fit min-w-[120px]" data-testid="rating-select">
              <SelectValue placeholder="Any Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Rating</SelectItem>
              <SelectItem value="4.5+">⭐ 4.5+ stars</SelectItem>
              <SelectItem value="4.0+">🌟 4.0+ stars</SelectItem>
              <SelectItem value="3.5+">✨ 3.5+ stars</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-fit min-w-[140px]" data-testid="sort-select">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">🎯 Recommended</SelectItem>
              <SelectItem value="rating">⭐ Highest Rated</SelectItem>
              <SelectItem value="delivery-time">⚡ Fastest Delivery</SelectItem>
              <SelectItem value="price-low">💸 Price: Low to High</SelectItem>
              <SelectItem value="price-high">💰 Price: High to Low</SelectItem>
              <SelectItem value="popularity">🔥 Most Popular</SelectItem>
              <SelectItem value="newest">✨ Newest</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant={showAdvanced ? "default" : "outline"}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="relative"
            data-testid="advanced-filters-toggle"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-[#FF6B35]">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Advanced Filters Collapsible */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleContent className="space-y-6">
            <Separator />
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Location & Distance */}
              {onLocationChange && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-[#FF6B35]" />
                    <h4 className="font-semibold text-gray-800">Location & Distance</h4>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Enter your location"
                      value={location || ""}
                      onChange={(e) => onLocationChange(e.target.value)}
                      className="pl-4"
                      data-testid="location-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Within {distance}km</label>
                    <Slider
                      value={[distance]}
                      onValueChange={(value) => onDistanceChange(value[0])}
                      max={50}
                      min={1}
                      step={1}
                      className="w-full"
                      data-testid="distance-slider"
                    />
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-gray-800">Price Range</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>₱{priceRange[0]}</span>
                    <span>₱{priceRange[1]}</span>
                  </div>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => onPriceRangeChange(value as [number, number])}
                    max={1000}
                    min={0}
                    step={50}
                    className="w-full"
                    data-testid="price-range-slider"
                  />
                </div>
              </div>

              {/* Restaurant Features */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-gray-800">Features</h4>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={isOpen}
                      onCheckedChange={(checked) => onIsOpenChange(!!checked)}
                      data-testid="open-now-checkbox"
                    />
                    <span className="text-sm">Open now</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Dietary Preferences */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Leaf className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-gray-800">Dietary Preferences</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((option) => (
                  <Button
                    key={option.id}
                    variant={dietaryFilters.includes(option.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDietaryFilterToggle(option.id)}
                    className={`${
                      dietaryFilters.includes(option.id) 
                        ? "bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white" 
                        : "hover:bg-gray-100"
                    }`}
                    data-testid={`dietary-filter-${option.id}`}
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {activeFiltersCount > 0 && `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied`}
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="ghost" 
                  onClick={onClearFilters}
                  data-testid="clear-filters-button"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
                <Button 
                  onClick={() => setShowAdvanced(false)}
                  className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                  data-testid="apply-filters-button"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && !showAdvanced && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {searchTerm && (
              <Badge variant="secondary" className="text-sm">
                Search: {searchTerm}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => onSearchChange("")} />
              </Badge>
            )}
            {category !== "all" && (
              <Badge variant="secondary" className="text-sm">
                {category}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => onCategoryChange("all")} />
              </Badge>
            )}
            {dietaryFilters.map((filter) => (
              <Badge key={filter} variant="secondary" className="text-sm">
                {dietaryOptions.find(opt => opt.id === filter)?.label}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => handleDietaryFilterToggle(filter)} 
                />
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
