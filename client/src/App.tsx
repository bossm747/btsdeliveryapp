import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { LanguageProvider } from "@/contexts/language-context";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import Home from "@/pages/home";
import Restaurants from "@/pages/restaurants";
import RestaurantDetail from "@/pages/restaurant-detail";
import Cart from "@/pages/cart";
import OrderTracking from "@/pages/order-tracking";
import Pabili from "@/pages/pabili";
import Pabayad from "@/pages/pabayad";
import Parcel from "@/pages/parcel";
import RiderDashboard from "@/pages/rider-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import VendorDashboard from "@/pages/vendor-dashboard";
import BtsDashboard from "@/pages/admin/bts-dashboard";
import MapTrackingDemo from "@/pages/map-tracking-demo";
import NotFound from "@/pages/not-found";
import Preloader from "@/components/preloader";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/restaurants" component={Restaurants} />
      <Route path="/restaurant/:id" component={RestaurantDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/order/:id" component={OrderTracking} />
      <Route path="/pabili" component={Pabili} />
      <Route path="/pabayad" component={Pabayad} />
      <Route path="/parcel" component={Parcel} />
      <Route path="/rider-dashboard" component={RiderDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/vendor-dashboard" component={VendorDashboard} />
      <Route path="/bts-dashboard" component={BtsDashboard} />
      <Route path="/map-tracking-demo" component={MapTrackingDemo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showPreloader, setShowPreloader] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Auto-skip preloader after maximum time to prevent getting stuck
    const timeout = setTimeout(() => {
      if (showPreloader) {
        handleLoadComplete();
      }
    }, 6000); // Maximum 6 seconds for extended animation
    
    // Skip preloader if already visited in this session
    try {
      const hasVisited = sessionStorage.getItem('hasVisited');
      if (hasVisited) {
        setShowPreloader(false);
        setShowContent(true);
      } else {
        sessionStorage.setItem('hasVisited', 'true');
      }
    } catch (error) {
      // Continue with preloader if sessionStorage fails
    }
    
    return () => clearTimeout(timeout);
  }, []);

  const handleLoadComplete = () => {
    setShowPreloader(false);
    // Small delay to ensure smooth transition
    setTimeout(() => {
      setShowContent(true);
    }, 100);
  };

  if (showPreloader) {
    return <Preloader onLoadComplete={handleLoadComplete} />;
  }

  return (
    <div className={`fade-in-content ${showContent ? 'visible' : ''}`}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <CartProvider>
            <TooltipProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 pb-24 md:pb-0 min-h-screen">
                  <Router />
                </main>
                {/* Hide footer on mobile, show desktop footer */}
                <div className="hidden md:block">
                  <Footer />
                </div>
              </div>
              {/* Mobile bottom navigation - only on mobile */}
              <MobileBottomNav />
              <Toaster />
            </TooltipProvider>
          </CartProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
