import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  CreditCard,
  Building2,
  Upload,
  RefreshCw,
  ArrowRight,
  Store,
  Mail,
  Phone,
  Loader2,
  ExternalLink,
  HelpCircle
} from "lucide-react";

// Types based on backend API response
interface KYCDocument {
  id: string;
  docType: string;
  documentName: string | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  expiryDate: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  isVerified: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface OnboardingStatus {
  currentStep: string;
  kycStatus: "not_started" | "in_progress" | "pending_review" | "approved" | "rejected";
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycRejectionReason: string | null;
  requiredDocuments: string[];
  submittedDocuments: string[];
  bankAccountAdded: boolean;
  bankAccountVerified: boolean;
  businessProfileComplete: boolean;
  isOnboardingComplete: boolean;
  onboardingCompletedAt: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  isActive: boolean;
  isAcceptingOrders: boolean;
}

interface KYCStatusResponse {
  onboardingStatus: OnboardingStatus;
  documents: KYCDocument[];
  bankAccounts: BankAccount[];
  restaurant: Restaurant | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  business_permit: "Business Permit",
  dti_registration: "DTI Registration",
  sec_registration: "SEC Registration",
  bir_registration: "BIR Registration",
  mayors_permit: "Mayor's Permit",
  sanitary_permit: "Sanitary Permit",
  food_handler_certificate: "Food Handler's Certificate",
  valid_id: "Valid Government ID",
  proof_of_address: "Proof of Address",
  other: "Other Document",
};

const STATUS_CONFIG = {
  not_started: {
    label: "Not Started",
    color: "bg-gray-100 text-gray-700",
    icon: Clock,
    description: "You haven't started the verification process yet.",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
    description: "Some documents are still pending upload.",
  },
  pending_review: {
    label: "Under Review",
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
    description: "Your application is being reviewed by our team.",
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
    description: "Congratulations! Your vendor account is verified.",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
    description: "Your application needs revision. Please check the details below.",
  },
};

function KYCStatusSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

export default function KYCStatus() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch KYC status
  const { data, isLoading, error, refetch } = useQuery<KYCStatusResponse>({
    queryKey: ["/api/vendor/kyc/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Re-upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ docType, file }: { docType: string; file: File }) => {
      const documentUrl = `https://storage.btsdelivery.ph/kyc/${Date.now()}-${file.name}`;
      const response = await apiRequest("POST", "/api/vendor/kyc/upload-documents", {
        docType,
        documentUrl,
        documentName: file.name,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been re-uploaded for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/kyc/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReupload = (docType: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadMutation.mutate({ docType, file });
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <KYCStatusSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Status</h2>
            <p className="text-gray-600 mb-4">
              {error?.message || "Please log in to view your verification status."}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => navigate("/login")}>Login</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { onboardingStatus, documents, bankAccounts, restaurant } = data;
  const statusConfig = STATUS_CONFIG[onboardingStatus.kycStatus];
  const StatusIcon = statusConfig.icon;

  // Calculate progress
  const totalSteps = onboardingStatus.requiredDocuments.length + 2; // docs + bank account + approval
  const completedSteps =
    onboardingStatus.submittedDocuments.length +
    (onboardingStatus.bankAccountAdded ? 1 : 0) +
    (onboardingStatus.isOnboardingComplete ? 1 : 0);
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // Get rejected documents
  const rejectedDocs = documents.filter((doc) => doc.status === "rejected");
  const pendingDocs = documents.filter((doc) => doc.status === "pending");
  const approvedDocs = documents.filter((doc) => doc.status === "approved");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Verification Status</h1>
                <p className="text-sm text-gray-500">
                  {restaurant?.name || "Your Business"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Status Banner */}
        <Card
          className={`border-2 ${
            onboardingStatus.kycStatus === "approved"
              ? "border-green-200 bg-green-50"
              : onboardingStatus.kycStatus === "rejected"
              ? "border-red-200 bg-red-50"
              : onboardingStatus.kycStatus === "pending_review"
              ? "border-amber-200 bg-amber-50"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-full ${
                  onboardingStatus.kycStatus === "approved"
                    ? "bg-green-100"
                    : onboardingStatus.kycStatus === "rejected"
                    ? "bg-red-100"
                    : "bg-amber-100"
                }`}
              >
                <StatusIcon
                  className={`h-8 w-8 ${
                    onboardingStatus.kycStatus === "approved"
                      ? "text-green-600"
                      : onboardingStatus.kycStatus === "rejected"
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-semibold">Application Status</h2>
                  <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                </div>
                <p className="text-gray-600 mb-4">{statusConfig.description}</p>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verification Progress</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Submission/Review Dates */}
                {onboardingStatus.kycSubmittedAt && (
                  <p className="text-xs text-gray-500 mt-3">
                    Submitted: {new Date(onboardingStatus.kycSubmittedAt).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {onboardingStatus.kycReviewedAt && (
                  <p className="text-xs text-gray-500">
                    Reviewed: {new Date(onboardingStatus.kycReviewedAt).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Rejection Reason */}
            {onboardingStatus.kycStatus === "rejected" && onboardingStatus.kycRejectionReason && (
              <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-200">
                <div className="flex gap-2">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">Rejection Reason:</p>
                    <p className="text-red-700 text-sm">{onboardingStatus.kycRejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Approved - Go to Dashboard */}
            {onboardingStatus.isOnboardingComplete && (
              <Button
                className="mt-4 bg-green-600 hover:bg-green-700"
                onClick={() => navigate("/vendor-dashboard")}
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Document Verification
            </CardTitle>
            <CardDescription>
              Status of your submitted documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Required Documents Progress */}
            <div className="text-sm text-gray-600 mb-4">
              {onboardingStatus.submittedDocuments.length} of {onboardingStatus.requiredDocuments.length} required documents submitted
            </div>

            {/* Document List */}
            {onboardingStatus.requiredDocuments.map((docType) => {
              const doc = documents.find((d) => d.docType === docType);
              const isSubmitted = onboardingStatus.submittedDocuments.includes(docType);

              return (
                <div
                  key={docType}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    doc?.status === "approved"
                      ? "bg-green-50 border-green-200"
                      : doc?.status === "rejected"
                      ? "bg-red-50 border-red-200"
                      : isSubmitted
                      ? "bg-amber-50 border-amber-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {doc?.status === "approved" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : doc?.status === "rejected" ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : isSubmitted ? (
                      <Clock className="h-5 w-5 text-amber-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {DOC_TYPE_LABELS[docType] || docType}
                      </p>
                      {doc?.rejectionReason && (
                        <p className="text-sm text-red-600">{doc.rejectionReason}</p>
                      )}
                      {doc?.documentName && !doc?.rejectionReason && (
                        <p className="text-xs text-gray-500">{doc.documentName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc?.status === "approved" ? (
                      <Badge className="bg-green-100 text-green-700">Verified</Badge>
                    ) : doc?.status === "rejected" ? (
                      <>
                        <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReupload(docType)}
                          disabled={uploadMutation.isPending}
                        >
                          {uploadMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Re-upload
                            </>
                          )}
                        </Button>
                      </>
                    ) : isSubmitted ? (
                      <Badge className="bg-amber-100 text-amber-700">Pending Review</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleReupload(docType)}
                        disabled={uploadMutation.isPending}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Optional documents */}
            {documents.filter((d) => !onboardingStatus.requiredDocuments.includes(d.docType)).length > 0 && (
              <>
                <Separator className="my-4" />
                <p className="text-sm font-medium text-gray-700 mb-2">Additional Documents</p>
                {documents
                  .filter((d) => !onboardingStatus.requiredDocuments.includes(d.docType))
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border"
                    >
                      <div className="flex items-center gap-3">
                        {doc.status === "approved" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : doc.status === "rejected" ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600" />
                        )}
                        <span className="text-sm">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</span>
                      </div>
                      <Badge
                        className={
                          doc.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : doc.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Bank Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payout Account
            </CardTitle>
            <CardDescription>
              Bank account for receiving earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bankAccounts.length > 0 ? (
              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      account.isVerified
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {account.isVerified ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{account.bankName}</p>
                        <p className="text-sm text-gray-600">
                          {account.accountName} • {account.accountNumber}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{account.accountType} Account</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          Default
                        </Badge>
                      )}
                      <Badge
                        className={
                          account.isVerified
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {account.isVerified ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No bank account added yet</p>
                <Button onClick={() => navigate("/vendor/onboarding")}>
                  Add Bank Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restaurant Profile */}
        {restaurant && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Business Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge
                      className={
                        restaurant.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {restaurant.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge
                      className={
                        restaurant.isAcceptingOrders
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {restaurant.isAcceptingOrders ? "Accepting Orders" : "Not Accepting"}
                    </Badge>
                  </div>
                </div>
                {onboardingStatus.isOnboardingComplete && (
                  <Button variant="outline" onClick={() => navigate("/vendor-dashboard/profile")}>
                    Edit Profile
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <HelpCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Need Help?</h3>
                <p className="text-sm text-blue-800 mb-3">
                  If you have questions about the verification process or need assistance, our support team is here to help.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Mail className="h-4 w-4" />
                    <a href="mailto:partners@btsdelivery.ph" className="hover:underline">
                      partners@btsdelivery.ph
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Phone className="h-4 w-4" />
                    <a href="tel:+639171234567" className="hover:underline">
                      +63 917 123 4567
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
