import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";

export default function HeroSection() {
  const [, setLocation] = useLocation();
  const [address, setAddress] = useState("");

  const handleSearchRestaurants = () => {
    if (address.trim()) {
      setLocation(`/restaurants?location=${encodeURIComponent(address)}`);
    } else {
      setLocation("/restaurants");
    }
  };

  return (
    <section className="hero-gradient text-white" data-testid="hero-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight" data-testid="hero-title">
              Lasa ng Batangas, <br />
              <span className="text-accent">Delivered Fresh</span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed" data-testid="hero-description">
              Ang pinakasulit na food delivery sa buong Batangas Province. Order mula sa mga local restaurants at i-enjoy ang authentic Batangueño flavors sa comfort ng inyong tahanan.
            </p>
            
            {/* Location Input */}
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-md" data-testid="location-search">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <MapPin className="text-primary" size={20} />
                  <span className="text-foreground font-semibold">Saan kayo sa Batangas?</span>
                </div>
                <Input
                  type="text"
                  placeholder="I-type ang inyong address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full"
                  data-testid="address-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchRestaurants()}
                />
                <Button 
                  onClick={handleSearchRestaurants}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                  data-testid="search-restaurants-button"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Maghanap ng Restaurants
                </Button>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <img 
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
              alt="Filipino food spread with various dishes" 
              className="rounded-2xl shadow-2xl w-full h-auto"
              data-testid="hero-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
