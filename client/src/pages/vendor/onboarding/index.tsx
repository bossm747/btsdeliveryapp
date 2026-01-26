import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  Upload,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Store,
  FileCheck,
  AlertCircle,
  User,
  Lock
} from "lucide-react";

// Types
interface BusinessInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessType: string;
  businessCategory: string;
  businessDescription: string;
  businessAddress: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
  };
}

interface DocumentInfo {
  business_permit: File | null;
  bir_registration: File | null;
  valid_id: File | null;
  sanitary_permit: File | null;
  food_handler_certificate: File | null;
}

interface BankInfo {
  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
  accountType: "savings" | "checking";
  branchName: string;
  isDefault: boolean;
}

const STEPS = [
  { id: 1, title: "Business Information", icon: Building2 },
  { id: 2, title: "Document Upload", icon: FileText },
  { id: 3, title: "Bank Account", icon: CreditCard },
  { id: 4, title: "Review & Submit", icon: CheckCircle2 },
];

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "food_stall", label: "Food Stall" },
  { value: "catering", label: "Catering" },
  { value: "bakery", label: "Bakery" },
  { value: "grocery", label: "Grocery Store" },
  { value: "convenience_store", label: "Convenience Store" },
  { value: "other", label: "Other" },
];

const PHILIPPINE_BANKS = [
  { value: "bdo", label: "BDO Unibank", code: "BDO" },
  { value: "bpi", label: "Bank of the Philippine Islands (BPI)", code: "BPI" },
  { value: "metrobank", label: "Metropolitan Bank & Trust Co.", code: "MBTC" },
  { value: "landbank", label: "Land Bank of the Philippines", code: "LBP" },
  { value: "pnb", label: "Philippine National Bank", code: "PNB" },
  { value: "unionbank", label: "UnionBank of the Philippines", code: "UBP" },
  { value: "rcbc", label: "Rizal Commercial Banking Corp", code: "RCBC" },
  { value: "chinabank", label: "China Banking Corporation", code: "CBC" },
  { value: "security_bank", label: "Security Bank", code: "SBC" },
  { value: "eastwest", label: "EastWest Bank", code: "EWB" },
  { value: "gcash", label: "GCash", code: "GCASH" },
  { value: "maya", label: "Maya (PayMaya)", code: "MAYA" },
];

const REQUIRED_DOCS: Record<string, { label: string; description: string; required: boolean }> = {
  business_permit: { label: "Business Permit", description: "Mayor's permit or business license", required: true },
  bir_registration: { label: "BIR Registration", description: "Certificate of Registration (COR)", required: true },
  valid_id: { label: "Valid Government ID", description: "Any valid government-issued ID of the owner", required: true },
  sanitary_permit: { label: "Sanitary Permit", description: "Health/sanitary permit from LGU", required: false },
  food_handler_certificate: { label: "Food Handler's Certificate", description: "Food safety certification", required: false },
};

export default function VendorOnboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Form states
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    businessType: "",
    businessCategory: "",
    businessDescription: "",
    businessAddress: {
      street: "",
      barangay: "",
      city: "",
      province: "",
      zipCode: "",
    },
  });

  const [documents, setDocuments] = useState<DocumentInfo>({
    business_permit: null,
    bir_registration: null,
    valid_id: null,
    sanitary_permit: null,
    food_handler_certificate: null,
  });

  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});

  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bankName: "",
    bankCode: "",
    accountName: "",
    accountNumber: "",
    accountType: "savings",
    branchName: "",
    isDefault: true,
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async (data: BusinessInfo) => {
      const response = await apiRequest("POST", "/api/vendor/register", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        businessName: data.businessName,
        businessType: data.businessType,
        businessCategory: data.businessCategory || data.businessType,
        businessDescription: data.businessDescription,
        businessAddress: data.businessAddress,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      localStorage.setItem("authToken", data.token);
      setRegistrationComplete(true);
      toast({
        title: "Registration Successful!",
        description: "Please verify your email and continue with document upload.",
      });
      setCurrentStep(2);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ docType, file }: { docType: string; file: File }) => {
      // First upload to a file storage (simulated with base64 for demo)
      // In production, use proper file upload to S3/CloudStorage
      const formData = new FormData();
      formData.append("file", file);
      
      // Simulate file upload - in production, upload to cloud storage first
      const documentUrl = `https://storage.btsdelivery.ph/kyc/${Date.now()}-${file.name}`;
      
      const response = await apiRequest("POST", "/api/vendor/kyc/upload-documents", {
        docType,
        documentUrl,
        documentName: file.name,
      });
      return { docType, response: await response.json() };
    },
    onSuccess: ({ docType, response }) => {
      setUploadedDocs((prev) => ({ ...prev, [docType]: response.document.id }));
      toast({
        title: "Document Uploaded",
        description: `${REQUIRED_DOCS[docType]?.label || docType} uploaded successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bankAccountMutation = useMutation({
    mutationFn: async (data: BankInfo) => {
      const response = await apiRequest("POST", "/api/vendor/kyc/bank-account", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Added",
        description: "Your bank account has been saved for payouts.",
      });
      setCurrentStep(4);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Bank Account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validation functions
  const validateBusinessInfo = () => {
    const errors: string[] = [];
    if (!businessInfo.firstName) errors.push("First name is required");
    if (!businessInfo.lastName) errors.push("Last name is required");
    if (!businessInfo.email || !/\S+@\S+\.\S+/.test(businessInfo.email)) errors.push("Valid email is required");
    if (!businessInfo.phone || businessInfo.phone.length < 10) errors.push("Valid phone number is required");
    if (!businessInfo.password || businessInfo.password.length < 6) errors.push("Password must be at least 6 characters");
    if (businessInfo.password !== businessInfo.confirmPassword) errors.push("Passwords do not match");
    if (!businessInfo.businessName) errors.push("Business name is required");
    if (!businessInfo.businessType) errors.push("Business type is required");
    if (!businessInfo.businessAddress.street) errors.push("Street address is required");
    if (!businessInfo.businessAddress.city) errors.push("City is required");
    if (!businessInfo.businessAddress.province) errors.push("Province is required");
    return errors;
  };

  const validateDocuments = () => {
    const requiredDocs = ["business_permit", "bir_registration", "valid_id"];
    const foodBusiness = ["restaurant", "food_stall", "catering", "bakery"].includes(businessInfo.businessType);
    if (foodBusiness) {
      requiredDocs.push("sanitary_permit");
    }
    
    const missing = requiredDocs.filter((doc) => !uploadedDocs[doc]);
    return missing;
  };

  const validateBankInfo = () => {
    const errors: string[] = [];
    if (!bankInfo.bankName) errors.push("Bank name is required");
    if (!bankInfo.accountName) errors.push("Account name is required");
    if (!bankInfo.accountNumber) errors.push("Account number is required");
    return errors;
  };

  // Handlers
  const handleBusinessInfoChange = useCallback((field: string, value: string) => {
    if (field.startsWith("address.")) {
      const addressField = field.replace("address.", "");
      setBusinessInfo((prev) => ({
        ...prev,
        businessAddress: { ...prev.businessAddress, [addressField]: value },
      }));
    } else {
      setBusinessInfo((prev) => ({ ...prev, [field]: value }));
    }
  }, []);

  const handleFileSelect = useCallback((docType: keyof DocumentInfo, file: File | null) => {
    setDocuments((prev) => ({ ...prev, [docType]: file }));
    if (file && authToken) {
      uploadDocumentMutation.mutate({ docType, file });
    }
  }, [authToken, uploadDocumentMutation]);

  const handleBankInfoChange = useCallback((field: string, value: string | boolean) => {
    setBankInfo((prev) => ({ ...prev, [field]: value }));
    if (field === "bankName") {
      const bank = PHILIPPINE_BANKS.find((b) => b.value === value);
      if (bank) {
        setBankInfo((prev) => ({ ...prev, bankName: bank.label, bankCode: bank.code }));
      }
    }
  }, []);

  const handleNextStep = () => {
    if (currentStep === 1) {
      const errors = validateBusinessInfo();
      if (errors.length > 0) {
        toast({
          title: "Please Fix Errors",
          description: errors.join(", "),
          variant: "destructive",
        });
        return;
      }
      if (!registrationComplete) {
        registerMutation.mutate(businessInfo);
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      const missing = validateDocuments();
      if (missing.length > 0) {
        toast({
          title: "Missing Documents",
          description: `Please upload: ${missing.map((d) => REQUIRED_DOCS[d]?.label || d).join(", ")}`,
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const errors = validateBankInfo();
      if (errors.length > 0) {
        toast({
          title: "Please Fix Errors",
          description: errors.join(", "),
          variant: "destructive",
        });
        return;
      }
      bankAccountMutation.mutate(bankInfo);
    }
  };

  const handleSubmit = async () => {
    toast({
      title: "Application Submitted! 🎉",
      description: "Your vendor application has been submitted for review. We'll notify you via email.",
    });
    navigate("/vendor/onboarding/kyc-status");
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Become a BTS Partner</h1>
                <p className="text-sm text-gray-500">Vendor Registration</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Already registered? Login
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep >= step.id
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-16 md:w-24 h-1 mx-2 rounded ${
                      currentStep > step.id ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs md:text-sm">
            {STEPS.map((step) => (
              <span
                key={step.id}
                className={`${currentStep >= step.id ? "text-primary font-medium" : "text-gray-400"}`}
              >
                {step.title}
              </span>
            ))}
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </div>

        {/* Step Content */}
        <Card className="shadow-lg">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Tell us about yourself and your business. This information will be used for verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personal Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" /> Personal Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={businessInfo.firstName}
                        onChange={(e) => handleBusinessInfoChange("firstName", e.target.value)}
                        placeholder="Juan"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={businessInfo.lastName}
                        onChange={(e) => handleBusinessInfoChange("lastName", e.target.value)}
                        placeholder="Dela Cruz"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          className="pl-10"
                          value={businessInfo.email}
                          onChange={(e) => handleBusinessInfoChange("email", e.target.value)}
                          placeholder="juan@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          className="pl-10"
                          value={businessInfo.phone}
                          onChange={(e) => handleBusinessInfoChange("phone", e.target.value)}
                          placeholder="09171234567"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Account Security */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Account Security
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={businessInfo.password}
                        onChange={(e) => handleBusinessInfoChange("password", e.target.value)}
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={businessInfo.confirmPassword}
                        onChange={(e) => handleBusinessInfoChange("confirmPassword", e.target.value)}
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Business Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Store className="h-4 w-4" /> Business Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={businessInfo.businessName}
                        onChange={(e) => handleBusinessInfoChange("businessName", e.target.value)}
                        placeholder="Your Restaurant Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessType">Business Type *</Label>
                      <Select
                        value={businessInfo.businessType}
                        onValueChange={(value) => handleBusinessInfoChange("businessType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="businessCategory">Category</Label>
                      <Input
                        id="businessCategory"
                        value={businessInfo.businessCategory}
                        onChange={(e) => handleBusinessInfoChange("businessCategory", e.target.value)}
                        placeholder="e.g., Filipino Cuisine, Fast Food"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="businessDescription">Business Description</Label>
                      <Textarea
                        id="businessDescription"
                        value={businessInfo.businessDescription}
                        onChange={(e) => handleBusinessInfoChange("businessDescription", e.target.value)}
                        placeholder="Tell customers about your business..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Business Address
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        value={businessInfo.businessAddress.street}
                        onChange={(e) => handleBusinessInfoChange("address.street", e.target.value)}
                        placeholder="123 Main Street, Building Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="barangay">Barangay</Label>
                      <Input
                        id="barangay"
                        value={businessInfo.businessAddress.barangay}
                        onChange={(e) => handleBusinessInfoChange("address.barangay", e.target.value)}
                        placeholder="Barangay"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City/Municipality *</Label>
                      <Input
                        id="city"
                        value={businessInfo.businessAddress.city}
                        onChange={(e) => handleBusinessInfoChange("address.city", e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="province">Province *</Label>
                      <Input
                        id="province"
                        value={businessInfo.businessAddress.province}
                        onChange={(e) => handleBusinessInfoChange("address.province", e.target.value)}
                        placeholder="Province"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={businessInfo.businessAddress.zipCode}
                        onChange={(e) => handleBusinessInfoChange("address.zipCode", e.target.value)}
                        placeholder="1234"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Document Upload */}
          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Document Upload
                </CardTitle>
                <CardDescription>
                  Upload required documents for KYC verification. Accepted formats: PDF, JPG, PNG (max 5MB each).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(REQUIRED_DOCS).map(([docType, doc]) => {
                  const isFoodBusiness = ["restaurant", "food_stall", "catering", "bakery"].includes(
                    businessInfo.businessType
                  );
                  const isRequired = doc.required || (isFoodBusiness && docType === "sanitary_permit");
                  const isUploaded = !!uploadedDocs[docType];
                  const currentFile = documents[docType as keyof DocumentInfo];

                  return (
                    <div
                      key={docType}
                      className={`border rounded-lg p-4 transition-colors ${
                        isUploaded
                          ? "bg-green-50 border-green-200"
                          : "bg-white hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileCheck className={`h-4 w-4 ${isUploaded ? "text-green-600" : "text-gray-400"}`} />
                            <span className="font-medium text-gray-900">{doc.label}</span>
                            {isRequired && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {isUploaded && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Uploaded</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{doc.description}</p>
                          {currentFile && (
                            <p className="text-xs text-primary mt-1">{currentFile.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`file-${docType}`}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleFileSelect(docType as keyof DocumentInfo, file);
                            }}
                          />
                          <Button
                            variant={isUploaded ? "outline" : "default"}
                            size="sm"
                            onClick={() => document.getElementById(`file-${docType}`)?.click()}
                            disabled={uploadDocumentMutation.isPending}
                          >
                            {uploadDocumentMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                {isUploaded ? "Replace" : "Upload"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Important Notes:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>All documents must be clear and readable</li>
                        <li>Documents should be valid and not expired</li>
                        <li>File size limit: 5MB per document</li>
                        <li>Processing time: 1-3 business days</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Bank Account */}
          {currentStep === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Bank Account Details
                </CardTitle>
                <CardDescription>
                  Add your bank account for receiving payouts. Earnings will be transferred weekly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Select
                      value={PHILIPPINE_BANKS.find((b) => b.label === bankInfo.bankName)?.value || ""}
                      onValueChange={(value) => handleBankInfoChange("bankName", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {PHILIPPINE_BANKS.map((bank) => (
                          <SelectItem key={bank.value} value={bank.value}>
                            {bank.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="accountName">Account Name *</Label>
                    <Input
                      id="accountName"
                      value={bankInfo.accountName}
                      onChange={(e) => handleBankInfoChange("accountName", e.target.value)}
                      placeholder="As it appears on your bank account"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must match exactly with your bank records
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      value={bankInfo.accountNumber}
                      onChange={(e) => handleBankInfoChange("accountNumber", e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={bankInfo.accountType}
                      onValueChange={(value) => handleBankInfoChange("accountType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="checking">Checking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="branchName">Branch Name (Optional)</Label>
                    <Input
                      id="branchName"
                      value={bankInfo.branchName}
                      onChange={(e) => handleBankInfoChange("branchName", e.target.value)}
                      placeholder="e.g., Makati Main Branch"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <CreditCard className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Payout Information:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Payouts are processed every Monday</li>
                        <li>Minimum payout amount: ₱500</li>
                        <li>Processing time: 1-2 business days</li>
                        <li>Platform commission: 15% per transaction</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Review & Submit
                </CardTitle>
                <CardDescription>
                  Please review your information before submitting your application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Summary */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Business Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Owner:</span>{" "}
                      <span className="text-gray-900">
                        {businessInfo.firstName} {businessInfo.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>{" "}
                      <span className="text-gray-900">{businessInfo.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>{" "}
                      <span className="text-gray-900">{businessInfo.phone}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Business Name:</span>{" "}
                      <span className="text-gray-900">{businessInfo.businessName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{" "}
                      <span className="text-gray-900">
                        {BUSINESS_TYPES.find((t) => t.value === businessInfo.businessType)?.label}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-500">Address:</span>{" "}
                      <span className="text-gray-900">
                        {businessInfo.businessAddress.street},{" "}
                        {businessInfo.businessAddress.barangay && `${businessInfo.businessAddress.barangay}, `}
                        {businessInfo.businessAddress.city}, {businessInfo.businessAddress.province}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Documents Summary */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Uploaded Documents
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(uploadedDocs).map(([docType]) => (
                      <Badge key={docType} className="bg-green-100 text-green-700">
                        <FileCheck className="h-3 w-3 mr-1" />
                        {REQUIRED_DOCS[docType]?.label || docType}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Bank Account Summary */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Bank Account
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Bank:</span>{" "}
                      <span className="text-gray-900">{bankInfo.bankName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Account Name:</span>{" "}
                      <span className="text-gray-900">{bankInfo.accountName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Account Number:</span>{" "}
                      <span className="text-gray-900">
                        {"*".repeat(bankInfo.accountNumber.length - 4)}
                        {bankInfo.accountNumber.slice(-4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{" "}
                      <span className="text-gray-900 capitalize">{bankInfo.accountType}</span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="bg-gray-50 border rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    By submitting this application, you agree to our{" "}
                    <a href="#" className="text-primary hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-primary hover:underline">
                      Vendor Agreement
                    </a>
                    . Your application will be reviewed within 1-3 business days.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="border-t p-6 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={handleNextStep}
                disabled={registerMutation.isPending || bankAccountMutation.isPending}
              >
                {(registerMutation.isPending || bankAccountMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {currentStep === 1 && !registrationComplete ? "Register & Continue" : "Continue"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Application
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
