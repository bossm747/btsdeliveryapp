import HeroSection from "@/components/hero-section";
import ServiceCards from "@/components/service-cards";
import RestaurantCard from "@/components/restaurant-card";
import AIRecommendations from "@/components/ai-recommendations";
import AdvancedChatbot from "@/components/advanced-chatbot";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Download, Users, Bike, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Restaurant } from "@shared/schema";

export default function Home() {
  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const featuredRestaurants = restaurants?.filter(r => r.isFeatured).slice(0, 6) || [];

  return (
    <div className="min-h-screen" data-testid="home-page">
      <HeroSection />
      <ServiceCards />
      
      {/* AI Recommendations Section */}
      <section className="py-16 bg-gradient-to-br from-orange-50 to-yellow-50" data-testid="ai-recommendations-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-orange-500" />
              <h2 className="text-4xl font-bold text-foreground">
                AI-Powered Recommendations
              </h2>
            </div>
            <p className="text-xl text-muted-foreground">
              Personalized suggestions just for you, powered by Innovatehub AI "Pareng Boyong"
            </p>
          </div>
          <AIRecommendations customerId="user-1" />
        </div>
      </section>
      
      {/* Featured Restaurants */}
      <section className="py-16 bg-background" data-testid="featured-restaurants-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-4" data-testid="featured-restaurants-title">
                Mga Sikat na Restaurants
              </h2>
              <p className="text-xl text-muted-foreground">
                Mga pinakakasikatan sa buong Batangas Province
              </p>
            </div>
            <Link href="/restaurants">
              <Button variant="ghost" className="text-primary font-semibold hover:text-primary/80" data-testid="view-all-restaurants">
                Tignan Lahat <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : featuredRestaurants.length > 0 ? (
              featuredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground text-lg">No featured restaurants available at the moment.</p>
                <Link href="/restaurants">
                  <Button className="mt-4">Browse All Restaurants</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* For Riders Section */}
      <section className="py-16 bg-white" data-testid="riders-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Para sa mga Riders</h2>
            <p className="text-xl text-muted-foreground">Kumita habang nagse-serve sa community</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-xl">₱</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Competitive Earnings</h3>
                    <p className="text-muted-foreground">Earn ₱500-₱1,500 per day with flexible working hours</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <span className="text-secondary text-xl">🛣️</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Smart Route Planning</h3>
                    <p className="text-muted-foreground">GPS-powered navigation for efficient deliveries</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <span className="text-accent text-xl">🛡️</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Insurance Coverage</h3>
                    <p className="text-muted-foreground">Protected while on duty with comprehensive insurance</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <img 
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Filipino delivery rider on motorcycle" 
                className="rounded-2xl shadow-xl w-full h-auto"
              />
              
              <div className="text-center">
                <Button className="bg-primary text-white px-8 py-4 text-lg hover:bg-primary/90" data-testid="become-rider-button">
                  Maging Rider Ngayon
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Requirements: Valid license, motorcycle, smartphone
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Local Business Support */}
      <section className="py-16 bg-background" data-testid="local-business-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Supporting Local Batangas Businesses</h2>
            <p className="text-xl text-muted-foreground">Proudly serving authentic Batangueño establishments</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
                title: "Traditional Eateries",
                description: "Authentic Batangueño flavors from family-owned restaurants"
              },
              {
                image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
                title: "Coffee Shops",
                description: "Local barako coffee and specialty drinks"
              },
              {
                image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
                title: "Bakeries",
                description: "Fresh pandesal and Filipino pastries daily"
              },
              {
                image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
                title: "Market Vendors",
                description: "Fresh produce and local specialties"
              }
            ].map((business, index) => (
              <div key={business.title} className="text-center space-y-4" data-testid={`business-${index}`}>
                <img 
                  src={business.image} 
                  alt={business.title}
                  className="w-full h-48 object-cover rounded-xl shadow-lg"
                />
                <h3 className="font-bold text-foreground">{business.title}</h3>
                <p className="text-sm text-muted-foreground">{business.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started CTA */}
      <section className="py-16 hero-gradient text-white" data-testid="get-started-section">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Experience BTS Delivery?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of satisfied customers across Batangas Province
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/restaurants">
              <Button className="bg-white text-primary px-8 py-4 text-lg hover:bg-white/90" data-testid="order-now-button">
                <ArrowRight className="mr-2 h-5 w-5" />
                <div className="text-left">
                  <div className="text-xs">Start Ordering</div>
                  <div className="text-lg font-bold">Order Now</div>
                </div>
              </Button>
            </Link>
            
            <Button 
              className="bg-black/20 backdrop-blur text-white border border-white/30 px-8 py-4 text-lg hover:bg-black/30" 
              data-testid="save-webapp-button"
              onClick={() => {
                alert("Add to Home Screen: On your mobile browser, tap the Share button and select 'Add to Home Screen' to install BTS Delivery as a web app!");
              }}
            >
              <Download className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="text-xs">Save as Web App</div>
                <div className="text-lg font-bold">Install PWA</div>
              </div>
            </Button>
          </div>
          
          <div className="mb-8">
            <p className="text-white/80 text-sm">
              ✓ No app download needed • ✓ Works on any device • ✓ Always up-to-date
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-8 text-white/80">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>50K+ Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>4.8 Rating</span>
            </div>
            <div className="flex items-center space-x-2">
              <Bike className="h-5 w-5" />
              <span>1000+ Riders</span>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced AI Chatbot - Floating on all pages */}
      <AdvancedChatbot />
    </div>
  );
}
