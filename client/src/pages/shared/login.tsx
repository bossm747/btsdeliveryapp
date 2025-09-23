import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Truck, 
  AlertCircle,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import btsLogo from "@assets/bts-logo-transparent.png";

const loginSchema = z.object({
  email: z.string().email("Valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Login failed. Please try again.");
        return;
      }

      // Store session and redirect based on role
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("userRole", result.user.role);
      localStorage.setItem("userId", result.user.id);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.firstName || result.user.email}!`,
      });

      // Redirect to role-specific dashboard
      switch (result.user.role) {
        case "customer":
          navigate("/customer-dashboard");
          break;
        case "vendor":
          navigate("/vendor-dashboard");
          break;
        case "rider":
          navigate("/rider-dashboard");
          break;
        case "admin":
          navigate("/admin-dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    await handleLogin(data.email, data.password);
  };

  const handleDemoLogin = async (email: string, password: string) => {
    form.setValue("email", email);
    form.setValue("password", password);
    await handleLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col" data-testid="page-login">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <img src={btsLogo} alt="BTS Delivery" className="w-10 h-10" />
                <div>
                  <h1 className="text-xl font-bold text-[#004225]">BTS Delivery</h1>
                  <p className="text-xs text-gray-600">Batangas Province</p>
                </div>
              </div>
            </Link>

            <Link href="/">
              <Button variant="ghost" className="text-[#004225]" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <img src={btsLogo} alt="BTS Delivery" className="w-16 h-16" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#004225]">Welcome Back!</CardTitle>
              <CardDescription className="text-gray-600">
                Sign in to your BTS Delivery account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#004225]">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="your@email.com"
                              className="pl-10 border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                              data-testid="input-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#004225]">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-10 pr-10 border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                              data-testid="input-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1 h-8 w-8 p-0"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-end">
                    <Link href="/forgot-password">
                      <Button variant="link" className="px-0 text-[#FF6B35] hover:text-[#004225]">
                        Forgot password?
                      </Button>
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white hover:opacity-90 py-3"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Don't have an account?</span>
                </div>
              </div>

              <Link href="/signup">
                <Button
                  variant="outline"
                  className="w-full border-[#004225] text-[#004225] hover:bg-[#004225] hover:text-white"
                  data-testid="button-signup"
                >
                  Create New Account
                </Button>
              </Link>

              {/* Demo Login Buttons */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-medium text-gray-700 text-center">Try Demo Accounts</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs p-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => handleDemoLogin("maria.santos@gmail.com", "password123")}
                    disabled={isLoading}
                    data-testid="button-demo-customer"
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <span className="font-medium">Customer</span>
                      <span className="text-xs opacity-70">Maria Santos</span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs p-3 border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => handleDemoLogin("chef.mang.tomas@gmail.com", "password123")}
                    disabled={isLoading}
                    data-testid="button-demo-vendor"
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <span className="font-medium">Vendor</span>
                      <span className="text-xs opacity-70">Chef Tomas</span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs p-3 border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => handleDemoLogin("rider.mark.santos@gmail.com", "password123")}
                    disabled={isLoading}
                    data-testid="button-demo-rider"
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <span className="font-medium">Rider</span>
                      <span className="text-xs opacity-70">Mark Santos</span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs p-3 border-purple-200 text-purple-700 hover:bg-purple-50"
                    onClick={() => handleDemoLogin("admin.supervisor@btsdelivery.com", "password123")}
                    disabled={isLoading}
                    data-testid="button-demo-admin"
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs opacity-70">Patrick Santiago</span>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}