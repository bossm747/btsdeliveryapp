import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("customer" | "vendor" | "rider" | "admin")[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = "/login" 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="loading-auth">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#FF6B35]" />
            <h3 className="text-lg font-semibold text-[#004225] mb-2">Loading...</h3>
            <p className="text-gray-600">Checking your authentication status</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Redirect to={redirectTo} />;
  }

  // Check role permissions if specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="access-denied">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#004225] mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this area.
            </p>
            <p className="text-sm text-gray-500">
              Your role: <span className="font-medium capitalize">{user.role}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and has proper role
  return <>{children}</>;
}