import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface RestaurantFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  deliveryTime: string;
  onDeliveryTimeChange: (value: string) => void;
  rating: string;
  onRatingChange: (value: string) => void;
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
}: RestaurantFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg mb-8" data-testid="restaurant-filters">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Maghanap ng restaurant o food..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger data-testid="category-select">
            <SelectValue placeholder="Lahat ng Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Lahat ng Category</SelectItem>
            <SelectItem value="Filipino Food">Filipino Food</SelectItem>
            <SelectItem value="Fast Food">Fast Food</SelectItem>
            <SelectItem value="Chinese">Chinese</SelectItem>
            <SelectItem value="Japanese">Japanese</SelectItem>
            <SelectItem value="Coffee">Coffee Shop</SelectItem>
            <SelectItem value="Bakery">Bakery</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={deliveryTime} onValueChange={onDeliveryTimeChange}>
          <SelectTrigger data-testid="delivery-time-select">
            <SelectValue placeholder="Delivery Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anytime</SelectItem>
            <SelectItem value="15-30">15-30 mins</SelectItem>
            <SelectItem value="30-45">30-45 mins</SelectItem>
            <SelectItem value="45+">45+ mins</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={rating} onValueChange={onRatingChange}>
          <SelectTrigger data-testid="rating-select">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Rating</SelectItem>
            <SelectItem value="4.5+">4.5+ stars</SelectItem>
            <SelectItem value="4.0+">4.0+ stars</SelectItem>
            <SelectItem value="3.5+">3.5+ stars</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
