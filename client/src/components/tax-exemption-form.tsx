import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Upload,
  X,
  FileImage,
  Loader2,
  CalendarIcon,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Shield,
  Users,
  Briefcase,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form validation schema
const taxExemptionSchema = z.object({
  exemptionType: z.enum(['senior', 'pwd', 'diplomatic'], {
    required_error: "Please select an exemption type"
  }),
  idNumber: z.string()
    .min(1, "ID number is required")
    .max(50, "ID number is too long"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.date().optional(),
  validUntil: z.date().optional(),
});

type TaxExemptionFormData = z.infer<typeof taxExemptionSchema>;

interface TaxExemption {
  id: string;
  exemptionType: string;
  idNumber: string;
  status: string;
  validUntil: string | null;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt: string;
}

interface TaxExemptionResponse {
  success: boolean;
  hasExemption: boolean;
  activeExemption: TaxExemption | null;
  allExemptions: TaxExemption[];
}

const exemptionTypeInfo = {
  senior: {
    label: "Senior Citizen",
    description: "60 years old and above. Entitled to 20% discount and VAT exemption.",
    icon: Users,
    color: "text-blue-600"
  },
  pwd: {
    label: "Person with Disability (PWD)",
    description: "Registered PWD ID holder. Entitled to 20% discount and VAT exemption.",
    icon: Shield,
    color: "text-purple-600"
  },
  diplomatic: {
    label: "Diplomatic Personnel",
    description: "Embassy/consulate staff with diplomatic privileges. Entitled to full VAT exemption.",
    icon: Briefcase,
    color: "text-amber-600"
  }
};

const statusBadgeVariant = {
  pending: "secondary",
  verified: "default",
  rejected: "destructive",
  expired: "outline"
} as const;

const statusIcon = {
  pending: Clock,
  verified: CheckCircle2,
  rejected: XCircle,
  expired: AlertCircle
};

export default function TaxExemptionForm() {
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing exemption status
  const { data: exemptionData, isLoading } = useQuery<TaxExemptionResponse>({
    queryKey: ["/api/customer/tax-exemption"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customer/tax-exemption");
      return res.json();
    }
  });

  const form = useForm<TaxExemptionFormData>({
    resolver: zodResolver(taxExemptionSchema),
    defaultValues: {
      exemptionType: undefined,
      idNumber: "",
      firstName: "",
      lastName: "",
    }
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: TaxExemptionFormData) => {
      const payload = {
        ...data,
        idDocumentUrl,
        dateOfBirth: data.dateOfBirth?.toISOString(),
        validUntil: data.validUntil?.toISOString()
      };

      const res = await apiRequest("POST", "/api/customer/tax-exemption", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Application Submitted",
          description: "Your tax exemption application has been submitted for verification.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/customer/tax-exemption"] });
        form.reset();
        setIdDocumentUrl(null);
        setPreviewUrl(null);
      } else {
        toast({
          title: "Submission Failed",
          description: data.message || "Failed to submit application",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Handle file upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads/tax-documents", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setIdDocumentUrl(data.url || data.filePath);

      toast({
        title: "Upload Successful",
        description: "ID document uploaded"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document",
        variant: "destructive"
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setIdDocumentUrl(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = (data: TaxExemptionFormData) => {
    submitMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Show active exemption if verified
  if (exemptionData?.activeExemption) {
    const exemption = exemptionData.activeExemption;
    const typeInfo = exemptionTypeInfo[exemption.exemptionType as keyof typeof exemptionTypeInfo];
    const StatusIcon = statusIcon[exemption.status as keyof typeof statusIcon] || CheckCircle2;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Active Tax Exemption
          </CardTitle>
          <CardDescription>
            You have an active tax exemption registered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Exemption Active</AlertTitle>
            <AlertDescription className="text-green-700">
              Your {typeInfo?.label || exemption.exemptionType} exemption is verified and active.
              You are entitled to 20% discount and VAT exemption on all orders.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-muted-foreground text-sm">Type</Label>
              <p className="font-medium">{typeInfo?.label || exemption.exemptionType}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">ID Number</Label>
              <p className="font-medium">{exemption.idNumber}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Status</Label>
              <Badge variant={statusBadgeVariant[exemption.status as keyof typeof statusBadgeVariant] || "secondary"}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {exemption.status.charAt(0).toUpperCase() + exemption.status.slice(1)}
              </Badge>
            </div>
            {exemption.validUntil && (
              <div>
                <Label className="text-muted-foreground text-sm">Valid Until</Label>
                <p className="font-medium">{format(new Date(exemption.validUntil), "MMM dd, yyyy")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show pending application if exists
  const pendingExemption = exemptionData?.allExemptions?.find(e => e.status === 'pending');
  if (pendingExemption) {
    const typeInfo = exemptionTypeInfo[pendingExemption.exemptionType as keyof typeof exemptionTypeInfo];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Application Pending
          </CardTitle>
          <CardDescription>
            Your tax exemption application is being reviewed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Verification in Progress</AlertTitle>
            <AlertDescription className="text-amber-700">
              Your {typeInfo?.label || pendingExemption.exemptionType} exemption application is currently being reviewed.
              We will notify you once the verification is complete.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-muted-foreground text-sm">Type</Label>
              <p className="font-medium">{typeInfo?.label || pendingExemption.exemptionType}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">ID Number</Label>
              <p className="font-medium">{pendingExemption.idNumber}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Submitted</Label>
              <p className="font-medium">{format(new Date(pendingExemption.createdAt), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Status</Label>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Pending Review
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show rejected application message if exists
  const rejectedExemption = exemptionData?.allExemptions?.find(e => e.status === 'rejected');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Tax Exemption Registration
        </CardTitle>
        <CardDescription>
          Register for tax benefits if you are a Senior Citizen, PWD, or Diplomatic Personnel
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rejectedExemption && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Previous Application Rejected</AlertTitle>
            <AlertDescription>
              {rejectedExemption.rejectionReason || "Your previous application was not approved. Please ensure all information is correct and try again."}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Exemption Type Selection */}
            <FormField
              control={form.control}
              name="exemptionType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Exemption Type *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid gap-4"
                    >
                      {Object.entries(exemptionTypeInfo).map(([key, info]) => {
                        const Icon = info.icon;
                        return (
                          <div key={key} className="relative">
                            <RadioGroupItem
                              value={key}
                              id={key}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={key}
                              className="flex items-start gap-4 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                            >
                              <Icon className={cn("h-6 w-6 mt-0.5", info.color)} />
                              <div className="space-y-1">
                                <p className="font-medium leading-none">{info.label}</p>
                                <p className="text-sm text-muted-foreground">
                                  {info.description}
                                </p>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan" {...field} />
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dela Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ID Number */}
            <FormField
              control={form.control}
              name="idNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your ID number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the ID number shown on your Senior Citizen ID, PWD ID, or Diplomatic ID
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date of Birth (for Senior Citizen) */}
            {form.watch("exemptionType") === "senior" && (
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select date of birth</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Must be 60 years or older to qualify
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* ID Valid Until */}
            <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>ID Valid Until (if applicable)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select expiry date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Leave blank if your ID does not have an expiry date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* ID Document Upload */}
            <div className="space-y-4">
              <Label>Upload ID Document *</Label>
              <div className="text-sm text-muted-foreground mb-2">
                Please upload a clear photo of your ID for verification
              </div>

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">Click to upload ID photo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              ) : (
                <div className="relative border rounded-lg p-4">
                  <img
                    src={previewUrl}
                    alt="ID Preview"
                    className="max-h-48 mx-auto rounded"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeFile}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  {idDocumentUrl && !isUploading && (
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Document uploaded successfully
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Verification Process</AlertTitle>
              <AlertDescription>
                Your application will be reviewed within 1-2 business days.
                Once verified, the discount will be automatically applied to your orders.
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending || isUploading || !form.formState.isValid}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
