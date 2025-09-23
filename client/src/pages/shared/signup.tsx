import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Truck, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  ShoppingBag,
  Store,
  Shield,
  UserCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import btsLogo from "@assets/bts-logo-transparent.png";

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().min(11, "Valid phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.enum(["customer", "vendor", "rider", "admin"], {
    required_error: "Please select a role",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get role from URL params if provided
  const urlParams = new URLSearchParams(window.location.search);
  const initialRole = urlParams.get("role") as "customer" | "vendor" | "rider" | "admin" | null;

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: initialRole || undefined,
    },
  });

  const selectedRole = form.watch("role");

  const roleInfo = {
    customer: {
      title: "Customer",
      description: "Order food, pabili services, and more",
      icon: ShoppingBag,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      features: ["Place orders", "Track deliveries", "Rate & review"]
    },
    vendor: {
      title: "Restaurant/Vendor",
      description: "Manage your restaurant and receive orders",
      icon: Store,
      color: "text-green-600",
      bgColor: "bg-green-50",
      features: ["Manage menu", "Process orders", "View analytics"]
    },
    rider: {
      title: "Delivery Rider",
      description: "Deliver orders and earn money",
      icon: Truck,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      features: ["Accept deliveries", "Earn money", "Flexible schedule"]
    },
    admin: {
      title: "Administrator",
      description: "Manage platform and users",
      icon: Shield,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      features: ["User management", "Platform analytics", "System control"]
    }
  };

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: data.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Registration failed. Please try again.");
        return;
      }

      toast({
        title: "Account Created Successfully!",
        description: `Welcome to BTS Delivery, ${data.firstName}!`,
      });

      // Auto-login after successful registration
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("userRole", result.user.role);
      localStorage.setItem("userId", result.user.id);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col" data-testid="page-signup">
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
              <CardTitle className="text-2xl font-bold text-[#004225]">Join BTS Delivery</CardTitle>
              <CardDescription className="text-gray-600">
                Create your account and start your journey with us
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
                  {/* Role Selection */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#004225]">I want to join as</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]" data-testid="select-role">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(roleInfo).map(([key, info]) => {
                              const Icon = info.icon;
                              return (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center">
                                    <Icon className={`w-4 h-4 mr-2 ${info.color}`} />
                                    {info.title}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Role Info Display */}
                  {selectedRole && (
                    <div className={`p-4 rounded-lg ${roleInfo[selectedRole].bgColor} border`}>
                      <div className="flex items-center mb-2">
                        {(() => {
                          const Icon = roleInfo[selectedRole].icon;
                          return <Icon className={`w-5 h-5 mr-2 ${roleInfo[selectedRole].color}`} />;
                        })()}
                        <h4 className={`font-semibold ${roleInfo[selectedRole].color}`}>
                          {roleInfo[selectedRole].title}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{roleInfo[selectedRole].description}</p>
                      <div className="flex flex-wrap gap-1">
                        {roleInfo[selectedRole].features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#004225]">First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Juan"
                              className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#004225]">Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Dela Cruz"
                              className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Fields */}
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
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#004225]">Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type="tel"
                              placeholder="09123456789"
                              className="pl-10 border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                              data-testid="input-phone"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password Fields */}
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

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#004225]">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-10 pr-10 border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                              data-testid="input-confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1 h-8 w-8 p-0"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              data-testid="button-toggle-confirm-password"
                            >
                              {showConfirmPassword ? (
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

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white hover:opacity-90 py-3"
                    disabled={isLoading}
                    data-testid="button-signup"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Already have an account?</span>
                </div>
              </div>

              <Link href="/login">
                <Button
                  variant="outline"
                  className="w-full border-[#004225] text-[#004225] hover:bg-[#004225] hover:text-white"
                  data-testid="button-login"
                >
                  Sign In Instead
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}