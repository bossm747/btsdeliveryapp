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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  ArrowRight,
  Loader2,
  ShoppingBag,
  Store,
  Shield,
  UserCheck,
  MapPin,
  Settings,
  CheckCircle,
  Camera,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import btsLogo from "@assets/bts-logo-transparent.png";

// Multi-step schemas
const personalInfoSchema = z.object({
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

const addressSchema = z.object({
  street: z.string().min(5, "Street address is required"),
  barangay: z.string().min(2, "Barangay is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().default("Batangas"),
  postalCode: z.string().min(4, "Valid postal code is required"),
  isDefault: z.boolean().default(true),
  deliveryInstructions: z.string().optional(),
});

const preferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  preferredCuisines: z.array(z.string()).default([]),
  spiceLevel: z.enum(["mild", "medium", "hot", "extra_hot"]).default("medium"),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  promotionalEmails: z.boolean().default(true),
  orderUpdates: z.boolean().default(true),
});

type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
type AddressForm = z.infer<typeof addressSchema>;
type PreferencesForm = z.infer<typeof preferencesSchema>;

type Step = "personal" | "address" | "preferences" | "verification";

export default function MultiStepSignup() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>("personal");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  const [registrationData, setRegistrationData] = useState<any>({});
  const [verificationToken, setVerificationToken] = useState<string>("");
  const { toast } = useToast();

  // Get role from URL params if provided
  const urlParams = new URLSearchParams(window.location.search);
  const initialRole = urlParams.get("role") as "customer" | "vendor" | "rider" | "admin" | null;

  // Form for personal info step
  const personalForm = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
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

  // Form for address step
  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: "",
      barangay: "",
      city: "",
      province: "Batangas",
      postalCode: "",
      isDefault: true,
      deliveryInstructions: "",
    },
  });

  // Form for preferences step
  const preferencesForm = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      dietaryRestrictions: [],
      allergies: [],
      preferredCuisines: [],
      spiceLevel: "medium",
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      promotionalEmails: true,
      orderUpdates: true,
    },
  });

  const selectedRole = personalForm.watch("role");

  // Step progress
  const steps: { key: Step; title: string; icon: any }[] = [
    { key: "personal", title: "Personal Info", icon: User },
    { key: "address", title: "Address", icon: MapPin },
    { key: "preferences", title: "Preferences", icon: Settings },
    { key: "verification", title: "Verification", icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

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

  // Navigation handlers
  const handleNext = () => {
    const currentIndex = steps.findIndex(step => step.key === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
    }
  };

  const handlePrevious = () => {
    const currentIndex = steps.findIndex(step => step.key === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  // Step handlers
  const handlePersonalInfoSubmit = async (data: PersonalInfoForm) => {
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

      // Store registration data and token
      setRegistrationData(result);
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("userRole", result.user.role);
      localStorage.setItem("userId", result.user.id);

      // Mark step as completed and move to address
      setCompletedSteps(prev => new Set(prev).add("personal"));
      setCurrentStep("address");

      toast({
        title: "Personal Information Saved!",
        description: "Please check your email to verify your account.",
      });
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSubmit = async (data: AddressForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/user/address", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.message || "Failed to save address. Please try again.");
        return;
      }

      setCompletedSteps(prev => new Set(prev).add("address"));
      setCurrentStep("preferences");

      toast({
        title: "Address Saved!",
        description: "Now let's set up your preferences.",
      });
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesSubmit = async (data: PreferencesForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      
      // Save dietary preferences
      const dietaryResponse = await fetch("/api/user/dietary-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          dietaryRestrictions: data.dietaryRestrictions,
          allergies: data.allergies,
          preferredCuisines: data.preferredCuisines,
          spiceLevel: data.spiceLevel,
        }),
      });

      // Save notification preferences
      const notificationResponse = await fetch("/api/user/notification-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailNotifications: data.emailNotifications,
          smsNotifications: data.smsNotifications,
          pushNotifications: data.pushNotifications,
          promotionalEmails: data.promotionalEmails,
          orderUpdates: data.orderUpdates,
        }),
      });

      if (!dietaryResponse.ok || !notificationResponse.ok) {
        setError("Failed to save preferences. Please try again.");
        return;
      }

      setCompletedSteps(prev => new Set(prev).add("preferences"));
      setCurrentStep("verification");

      toast({
        title: "Preferences Saved!",
        description: "Almost done! Please verify your email to complete registration.",
      });
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerification = async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Email verification failed. Please try again.");
        return;
      }

      setCompletedSteps(prev => new Set(prev).add("verification"));

      toast({
        title: "Email Verified!",
        description: "Your account is now fully set up. Welcome to BTS Delivery!",
      });

      // Redirect to role-specific dashboard
      const userRole = localStorage.getItem("userRole");
      switch (userRole) {
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

  const handleResendVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Failed to resend verification email.");
        return;
      }

      toast({
        title: "Verification Email Sent!",
        description: "Please check your email for the verification link.",
      });
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Data for preferences
  const dietaryRestrictions = [
    "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", 
    "Dairy-Free", "Nut-Free", "Low-Sodium", "Diabetic-Friendly"
  ];

  const cuisineTypes = [
    "Filipino", "Asian", "Chinese", "Japanese", "Korean", "Thai", 
    "Italian", "American", "Mexican", "Mediterranean", "Indian", "Fast Food"
  ];

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
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <img src={btsLogo} alt="BTS Delivery" className="w-16 h-16" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#004225]">Join BTS Delivery</CardTitle>
              <CardDescription className="text-gray-600">
                Create your account and start your journey with us
              </CardDescription>
              
              {/* Progress Indicator */}
              <div className="mt-6">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.key;
                    const isCompleted = completedSteps.has(step.key);
                    const isCurrent = currentStepIndex === index;
                    
                    return (
                      <div key={step.key} className="flex items-center">
                        <div className={`
                          flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                          ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                            isCurrent ? 'border-[#FF6B35] text-[#FF6B35] bg-white' : 
                            'border-gray-300 text-gray-400 bg-white'}
                        `}>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`w-12 h-0.5 mx-2 ${
                            completedSteps.has(step.key) ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}
                  </p>
                </div>
                <Progress value={progress} className="w-full mt-3" />
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: Personal Information */}
              {currentStep === "personal" && (
                <Form {...personalForm}>
                  <form onSubmit={personalForm.handleSubmit(handlePersonalInfoSubmit)} className="space-y-4">
                    {/* Role Selection */}
                    <FormField
                      control={personalForm.control}
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
                        control={personalForm.control}
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
                        control={personalForm.control}
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
                      control={personalForm.control}
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
                      control={personalForm.control}
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
                      control={personalForm.control}
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
                      control={personalForm.control}
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
                      data-testid="button-continue"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {/* Step 2: Address Information */}
              {currentStep === "address" && (
                <Form {...addressForm}>
                  <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-[#004225]">Where do you want your orders delivered?</h3>
                      <p className="text-sm text-gray-600">Add your default delivery address</p>
                    </div>

                    <FormField
                      control={addressForm.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#004225]">Street Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="123 Main Street, Subdivision"
                              className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                              data-testid="input-street"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addressForm.control}
                        name="barangay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#004225]">Barangay</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Barangay 1"
                                className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                                data-testid="input-barangay"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addressForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#004225]">City</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Batangas City"
                                className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                                data-testid="input-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addressForm.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#004225]">Province</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value="Batangas"
                                disabled
                                className="border-gray-200 bg-gray-50"
                                data-testid="input-province"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addressForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#004225]">Postal Code</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="4200"
                                className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                                data-testid="input-postal-code"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={addressForm.control}
                      name="deliveryInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#004225]">Delivery Instructions (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="e.g., Ring doorbell twice, Leave at front door, etc."
                              className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35] resize-none"
                              rows={3}
                              data-testid="input-delivery-instructions"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="flex-1"
                        data-testid="button-previous"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white hover:opacity-90"
                        disabled={isLoading}
                        data-testid="button-continue"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 3: Preferences */}
              {currentStep === "preferences" && (
                <Form {...preferencesForm}>
                  <form onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)} className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-[#004225]">Let's personalize your experience</h3>
                      <p className="text-sm text-gray-600">Tell us about your food preferences and notification settings</p>
                    </div>

                    {/* Dietary Restrictions */}
                    <div className="space-y-3">
                      <FormLabel className="text-[#004225] text-sm font-medium">Dietary Restrictions</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {dietaryRestrictions.map((restriction) => (
                          <FormField
                            key={restriction}
                            control={preferencesForm.control}
                            name="dietaryRestrictions"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(restriction)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, restriction])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== restriction)
                                          )
                                    }}
                                    data-testid={`checkbox-dietary-${restriction.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {restriction}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Preferred Cuisines */}
                    <div className="space-y-3">
                      <FormLabel className="text-[#004225] text-sm font-medium">Preferred Cuisines</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {cuisineTypes.map((cuisine) => (
                          <FormField
                            key={cuisine}
                            control={preferencesForm.control}
                            name="preferredCuisines"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(cuisine)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, cuisine])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== cuisine)
                                          )
                                    }}
                                    data-testid={`checkbox-cuisine-${cuisine.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {cuisine}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Spice Level */}
                    <FormField
                      control={preferencesForm.control}
                      name="spiceLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#004225]">Preferred Spice Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]" data-testid="select-spice-level">
                                <SelectValue placeholder="Select spice level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mild">🌶️ Mild</SelectItem>
                              <SelectItem value="medium">🌶️🌶️ Medium</SelectItem>
                              <SelectItem value="hot">🌶️🌶️🌶️ Hot</SelectItem>
                              <SelectItem value="extra_hot">🌶️🌶️🌶️🌶️ Extra Hot</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notification Preferences */}
                    <div className="space-y-3">
                      <FormLabel className="text-[#004225] text-sm font-medium">Notification Preferences</FormLabel>
                      <div className="space-y-3">
                        {[
                          { key: "emailNotifications", label: "Email Notifications" },
                          { key: "smsNotifications", label: "SMS Notifications" },
                          { key: "pushNotifications", label: "Push Notifications" },
                          { key: "orderUpdates", label: "Order Updates" },
                          { key: "promotionalEmails", label: "Promotional Emails" },
                        ].map(({ key, label }) => (
                          <FormField
                            key={key}
                            control={preferencesForm.control}
                            name={key as keyof PreferencesForm}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base cursor-pointer">
                                    {label}
                                  </FormLabel>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={!!field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid={`checkbox-${key.toLowerCase().replace(/[A-Z]/g, '-$&').toLowerCase()}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="flex-1"
                        data-testid="button-previous"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white hover:opacity-90"
                        disabled={isLoading}
                        data-testid="button-continue"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 4: Email Verification */}
              {currentStep === "verification" && (
                <div className="text-center space-y-6">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-[#FF6B35] rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#004225]">Verify Your Email Address</h3>
                    <p className="text-gray-600">
                      We've sent a verification email to <strong>{registrationData?.user?.email}</strong>.
                      Please check your inbox and click the verification link to complete your registration.
                    </p>
                  </div>

                  {/* Manual token input for testing */}
                  <div className="space-y-4">
                    <FormLabel className="text-[#004225]">Enter Verification Token (for testing)</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        value={verificationToken}
                        onChange={(e) => setVerificationToken(e.target.value)}
                        placeholder="Enter verification token"
                        className="border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                        data-testid="input-verification-token"
                      />
                      <Button
                        onClick={() => handleEmailVerification(verificationToken)}
                        disabled={!verificationToken || isLoading}
                        className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                        data-testid="button-verify-token"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={handleResendVerification}
                      variant="outline"
                      disabled={isLoading}
                      className="w-full"
                      data-testid="button-resend-verification"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Resend Verification Email"
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handlePrevious}
                      className="w-full text-gray-600"
                      data-testid="button-previous"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Go Back
                    </Button>
                  </div>
                </div>
              )}

              {/* Login Link */}
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