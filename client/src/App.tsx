import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import Landing from "@/pages/shared/landing";
import Login from "@/pages/shared/login";
import Signup from "@/pages/shared/signup";
import NotFound from "@/pages/shared/not-found";

// Customer pages
import Home from "@/pages/shared/home";
import Restaurants from "@/pages/shared/restaurants";
import RestaurantDetail from "@/pages/shared/restaurant-detail";
import Cart from "@/pages/customer/cart";
import OrderTracking from "@/pages/shared/order-tracking";
import CustomerOrders from "@/pages/customer/customer-orders";
import Pabili from "@/pages/shared/pabili";
import Pabayad from "@/pages/shared/pabayad";
import Parcel from "@/pages/shared/parcel";

// Role-specific dashboards
import CustomerDashboard from "@/pages/customer/customer-dashboard";
import RiderDashboard from "@/pages/rider/rider-dashboard";
import VendorDashboard from "@/pages/vendor/vendor-dashboard";
import AdminDashboard from "@/pages/admin/admin-dashboard";

// Customer layout components
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { LanguageProvider } from "@/contexts/language-context";

function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col relative">
        <Navbar />
        <main className="flex-1 pb-safe-bottom md:pb-0 min-h-screen">
          {children}
        </main>
        <div className="hidden md:block">
          <Footer />
        </div>
        <MobileBottomNav />
      </div>
    </LanguageProvider>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

function Router() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Public routes - available to everyone */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {/* Root route - redirect based on auth status */}
      <Route path="/">
        {isAuthenticated ? (
          // Redirect authenticated users to their role-specific dashboard
          <Redirect 
            to={
              user?.role === "customer" ? "/customer-dashboard" :
              user?.role === "vendor" ? "/vendor-dashboard" :
              user?.role === "rider" ? "/rider-dashboard" :
              user?.role === "admin" ? "/admin-dashboard" : "/login"
            } 
          />
        ) : (
          <Landing />
        )}
      </Route>

      {/* Customer Dashboard */}
      <Route path="/customer-dashboard">
        <ProtectedRoute allowedRoles={["customer"]}>
          <DashboardLayout>
            <CustomerDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Customer routes - protected for customers only */}
      <Route path="/home">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <Home />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/restaurants">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <Restaurants />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/restaurant/:id">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <RestaurantDetail />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/cart">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <Cart />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/order/:id">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <OrderTracking />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/customer-orders">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <CustomerOrders />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/pabili">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <Pabili />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/pabayad">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <Pabayad />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/parcel">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <Parcel />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      {/* Vendor Dashboard - protected for vendors only */}
      <Route path="/vendor-dashboard">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <DashboardLayout>
            <VendorDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Rider Dashboard - protected for riders only */}
      <Route path="/rider-dashboard">
        <ProtectedRoute allowedRoles={["rider"]}>
          <DashboardLayout>
            <RiderDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Admin Dashboard - protected for admins only */}
      <Route path="/admin-dashboard">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Fallback for unknown routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;