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
import MultiStepSignup from "@/pages/shared/multistep-signup";
import NotFound from "@/pages/shared/not-found";

// Customer pages
import Home from "@/pages/shared/home";
import Restaurants from "@/pages/shared/restaurants";
import RestaurantDetail from "@/pages/shared/restaurant-detail";
import Cart from "@/pages/customer/cart";
import OrderTracking from "@/pages/shared/order-tracking";
import CustomerOrders from "@/pages/customer/customer-orders";
import CustomerAddresses from "@/pages/customer/addresses";
import CustomerFavorites from "@/pages/customer/favorites";
import CustomerProfileSettings from "@/pages/customer/profile-settings";
import CustomerLoyalty from "@/pages/customer/loyalty";
import CustomerWallet from "@/pages/customer/wallet";
import Pabili from "@/pages/shared/pabili";
import Pabayad from "@/pages/shared/pabayad";
import Parcel from "@/pages/shared/parcel";

// Role-specific dashboards
import CustomerDashboard from "@/pages/customer/customer-dashboard";
import RiderDashboard from "@/pages/rider/rider-dashboard";
import RiderPendingOrders from "@/pages/rider/pending-orders";
import RiderEarnings from "@/pages/rider/earnings";
import RiderPerformance from "@/pages/rider/performance";

// Vendor components
import VendorLayout from "@/pages/vendor/vendor-layout";
import VendorOverview from "@/pages/vendor/overview";
import VendorOrders from "@/pages/vendor/orders";
import VendorMenu from "@/pages/vendor/menu";
import VendorPromotions from "@/pages/vendor/promotions";
import VendorStaff from "@/pages/vendor/staff";
import VendorInventory from "@/pages/vendor/inventory";
import VendorEarnings from "@/pages/vendor/earnings";
import VendorProfile from "@/pages/vendor/profile";
import VendorAnalytics from "@/pages/vendor/analytics";
import VendorCommission from "@/pages/vendor/commission";
import VendorBusinessSettings from "@/pages/vendor/business-settings";
import AIAssistant from "@/pages/vendor/ai-assistant";

import AdminDashboard from "@/pages/admin/admin-dashboard";
import AdminDispatch from "@/pages/admin/admin-dispatch";
import DispatchConsoleEnhanced from "@/pages/admin/dispatch-console-enhanced";
import AdminAnalyticsPage from "@/pages/admin/admin-analytics";
import AdminOrders from "@/pages/admin/admin-orders";
import AdminRestaurants from "@/pages/admin/admin-restaurants";
import AdminUsers from "@/pages/admin/admin-users";
import VendorApproval from "@/pages/admin/vendor-approval";
import RiderVerification from "@/pages/admin/rider-verification";
import SupportTickets from "@/pages/admin/support-tickets";
import CommissionSettings from "@/pages/admin/commission-settings";
import DeliveryZones from "@/pages/admin/delivery-zones";
import PromoManagement from "@/pages/admin/promo-management";
import FinancialDashboard from "@/pages/admin/financial-dashboard";
import FraudDashboard from "@/pages/admin/fraud-dashboard";
import TaxManagement from "@/pages/admin/tax-management";
import VendorTaxReports from "@/pages/vendor/tax-reports";

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
      <Route path="/signup" component={MultiStepSignup} />
      <Route path="/signup-basic" component={Signup} />
      
      {/* Root route - redirect based on auth status */}
      <Route path="/">
        {isAuthenticated ? (
          // Redirect authenticated users to their role-specific dashboard
          <Redirect 
            to={
              user?.role === "customer" ? "/customer-dashboard" :
              user?.role === "vendor" ? "/vendor-dashboard" :
              user?.role === "rider" ? "/rider-dashboard" :
              user?.role === "admin" ? "/admin/dispatch" : "/login"
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

      <Route path="/addresses">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <CustomerAddresses />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/favorites">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <CustomerFavorites />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/profile-settings">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <CustomerProfileSettings />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/loyalty">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <CustomerLoyalty />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/wallet">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerLayout>
            <CustomerWallet />
          </CustomerLayout>
        </ProtectedRoute>
      </Route>

      {/* Vendor Routes - protected for vendors only */}
      <Route path="/vendor-dashboard">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorOverview />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/orders">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorOrders />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/menu">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorMenu />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/promotions">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorPromotions />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/staff">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorStaff />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/inventory">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorInventory />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/earnings">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorEarnings />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/profile">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorProfile />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/analytics">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorAnalytics />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/commission">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorCommission />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/business-settings">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorBusinessSettings />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vendor-dashboard/tax-reports">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <VendorLayout>
            <VendorTaxReports />
          </VendorLayout>
        </ProtectedRoute>
      </Route>

      {/* AI Assistant - protected for vendors only */}
      <Route path="/ai-assistant">
        <ProtectedRoute allowedRoles={["vendor"]}>
          <DashboardLayout>
            <AIAssistant />
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

      <Route path="/rider-dashboard/pending-orders">
        <ProtectedRoute allowedRoles={["rider"]}>
          <DashboardLayout>
            <RiderPendingOrders />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/rider-dashboard/earnings">
        <ProtectedRoute allowedRoles={["rider"]}>
          <DashboardLayout>
            <RiderEarnings />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/rider-dashboard/performance">
        <ProtectedRoute allowedRoles={["rider"]}>
          <DashboardLayout>
            <RiderPerformance />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Admin Routes - protected for admins only */}
      <Route path="/admin-dashboard">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/dispatch">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <AdminDispatch />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/dispatch-enhanced">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <DispatchConsoleEnhanced />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/analytics">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <AdminAnalyticsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/orders">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <AdminOrders />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/restaurants">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <AdminRestaurants />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <AdminUsers />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Vendor Approval Workflow */}
      <Route path="/admin/vendor-approval">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <VendorApproval />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Rider Verification */}
      <Route path="/admin/rider-verification">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <RiderVerification />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Support Tickets */}
      <Route path="/admin/support">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <SupportTickets />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Commission Settings */}
      <Route path="/admin/commission">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <CommissionSettings />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Delivery Zones */}
      <Route path="/admin/zones">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <DeliveryZones />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Promo Management */}
      <Route path="/admin/promos">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <PromoManagement />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/fraud">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <FraudDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/tax">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <TaxManagement />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Placeholder routes for remaining admin sections */}
      <Route path="/admin/riders">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <RiderVerification />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/financial">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <FinancialDashboard />
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