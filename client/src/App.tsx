import { useState, lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Preloader from "@/components/preloader";

// Lazy load all pages for code splitting
const Landing = lazy(() => import("@/pages/shared/landing"));
const Login = lazy(() => import("@/pages/shared/login"));
const MultiStepSignup = lazy(() => import("@/pages/shared/multistep-signup"));
const NotFound = lazy(() => import("@/pages/shared/not-found"));

// Customer pages
const Home = lazy(() => import("@/pages/shared/home"));
const Restaurants = lazy(() => import("@/pages/shared/restaurants"));
const RestaurantDetail = lazy(() => import("@/pages/shared/restaurant-detail"));
const Cart = lazy(() => import("@/pages/customer/cart"));
const OrderTracking = lazy(() => import("@/pages/shared/order-tracking"));
const CustomerOrders = lazy(() => import("@/pages/customer/customer-orders"));
const CustomerAddresses = lazy(() => import("@/pages/customer/addresses"));
const CustomerFavorites = lazy(() => import("@/pages/customer/favorites"));
const CustomerProfileSettings = lazy(() => import("@/pages/customer/profile-settings"));
const CustomerLoyalty = lazy(() => import("@/pages/customer/loyalty"));
const CustomerWallet = lazy(() => import("@/pages/customer/wallet"));
const Pabili = lazy(() => import("@/pages/shared/pabili"));
const Pabayad = lazy(() => import("@/pages/shared/pabayad"));
const Parcel = lazy(() => import("@/pages/shared/parcel"));

// Role-specific dashboards
const CustomerDashboard = lazy(() => import("@/pages/customer/customer-dashboard"));
const RiderDashboard = lazy(() => import("@/pages/rider/rider-dashboard"));
const RiderPendingOrders = lazy(() => import("@/pages/rider/pending-orders"));
const RiderEarnings = lazy(() => import("@/pages/rider/earnings"));
const RiderPerformance = lazy(() => import("@/pages/rider/performance"));

// Vendor components
const VendorLayout = lazy(() => import("@/pages/vendor/vendor-layout"));
const VendorOverview = lazy(() => import("@/pages/vendor/overview"));
const VendorOrders = lazy(() => import("@/pages/vendor/orders"));
const VendorMenu = lazy(() => import("@/pages/vendor/menu"));
const VendorPromotions = lazy(() => import("@/pages/vendor/promotions"));
const VendorStaff = lazy(() => import("@/pages/vendor/staff"));
const VendorInventory = lazy(() => import("@/pages/vendor/inventory"));
const VendorEarnings = lazy(() => import("@/pages/vendor/earnings"));
const VendorProfile = lazy(() => import("@/pages/vendor/profile"));
const VendorAnalytics = lazy(() => import("@/pages/vendor/analytics"));
const VendorCommission = lazy(() => import("@/pages/vendor/commission"));
const VendorBusinessSettings = lazy(() => import("@/pages/vendor/business-settings"));
const AIAssistant = lazy(() => import("@/pages/vendor/ai-assistant"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/admin-dashboard"));
const DispatchConsoleEnhanced = lazy(() => import("@/pages/admin/dispatch-console-enhanced"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/admin-analytics"));
const AdminOrders = lazy(() => import("@/pages/admin/admin-orders"));
const AdminRestaurants = lazy(() => import("@/pages/admin/admin-restaurants"));
const AdminUsers = lazy(() => import("@/pages/admin/admin-users"));
const VendorApproval = lazy(() => import("@/pages/admin/vendor-approval"));
const RiderVerification = lazy(() => import("@/pages/admin/rider-verification"));
const SupportTickets = lazy(() => import("@/pages/admin/support-tickets"));
const CommissionSettings = lazy(() => import("@/pages/admin/commission-settings"));
const DeliveryZones = lazy(() => import("@/pages/admin/delivery-zones"));
const PromoManagement = lazy(() => import("@/pages/admin/promo-management"));
const FinancialDashboard = lazy(() => import("@/pages/admin/financial-dashboard"));
const FraudDashboard = lazy(() => import("@/pages/admin/fraud-dashboard"));
const TaxManagement = lazy(() => import("@/pages/admin/tax-management"));
const AdminRiders = lazy(() => import("@/pages/admin/admin-riders"));
const VendorTaxReports = lazy(() => import("@/pages/vendor/tax-reports"));

// Layout components (loaded immediately as they're used often)
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { LanguageProvider } from "@/contexts/language-context";

// Loading fallback for lazy components
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

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
    <Suspense fallback={<PageLoader />}>
    <Switch>
      {/* Public routes - available to everyone */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={MultiStepSignup} />
      <Route path="/signup-basic" component={MultiStepSignup} />

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

      {/* Admin Riders Management */}
      <Route path="/admin/riders">
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout>
            <AdminRiders />
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

      {/* Root route - redirect based on auth status (must be near end to not match other routes) */}
      <Route path="/">
        {isAuthenticated ? (
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

      {/* Fallback for unknown routes */}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="App">
      {isLoading && <Preloader onLoadComplete={() => setIsLoading(false)} />}
      {!isLoading && (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      )}
    </div>
  );
}

export default App;