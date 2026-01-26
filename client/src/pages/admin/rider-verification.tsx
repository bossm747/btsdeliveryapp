import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck, Search, FileText, CheckCircle, XCircle, Clock,
  Eye, ChevronUp, ChevronDown, AlertCircle, User, Phone, Mail,
  Shield, Car, FileCheck, AlertTriangle, Bike
} from "lucide-react";
import { useAdminToast } from "@/hooks";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AdminPageWrapper,
  AdminRidersSkeleton,
  NoPendingVerificationEmptyState,
  NoRidersEmptyState,
} from "@/components/admin";

// Types
interface RiderDocument {
  id: string;
  type: "valid_id" | "drivers_license" | "vehicle_registration" | "insurance" | "nbi_clearance" | "barangay_clearance" | "selfie_with_id";
  name: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface BackgroundCheck {
  id: string;
  status: "pending" | "in_progress" | "passed" | "failed";
  initiatedAt: string;
  completedAt?: string;
  notes?: string;
}

interface RiderVerification {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  vehicleType: "motorcycle" | "bicycle" | "car";
  vehicleMake?: string;
  vehicleModel?: string;
  plateNumber?: string;
  status: "pending" | "documents_review" | "background_check" | "verified" | "rejected";
  documents: RiderDocument[];
  backgroundCheck?: BackgroundCheck;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

type SortField = "firstName" | "submittedAt" | "status" | "vehicleType";
type SortDirection = "asc" | "desc";

const DOCUMENT_REQUIREMENTS = [
  { type: "valid_id", label: "Valid Government ID", required: true },
  { type: "drivers_license", label: "Driver's License", required: true },
  { type: "vehicle_registration", label: "Vehicle Registration (OR/CR)", required: true },
  { type: "insurance", label: "Vehicle Insurance", required: false },
  { type: "nbi_clearance", label: "NBI Clearance", required: true },
  { type: "barangay_clearance", label: "Barangay Clearance", required: false },
  { type: "selfie_with_id", label: "Selfie with ID", required: true },
];

export default function RiderVerification() {
  const adminToast = useAdminToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("submittedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Dialog states
  const [selectedRider, setSelectedRider] = useState<RiderVerification | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectDocumentDialogOpen, setRejectDocumentDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<RiderDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);

  // Fetch pending riders
  const { data: riders = [], isLoading, isError, refetch } = useQuery<RiderVerification[]>({
    queryKey: ["/api/admin/riders/pending-verification"],
  });

  // Fetch stats
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/riders/verification-stats"],
  });

  // Verify document mutation
  const verifyDocumentMutation = useMutation({
    mutationFn: async ({ riderId, documentId, action, reason }: { riderId: string; documentId: string; action: "approve" | "reject"; reason?: string }) => {
      const response = await apiRequest("POST", `/api/admin/riders/${riderId}/verify-document`, {
        documentId,
        action,
        reason,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders/pending-verification"] });
      adminToast.success(`Document has been ${variables.action === "approve" ? "approved" : "rejected"} successfully.`);
      setRejectDocumentDialogOpen(false);
      setSelectedDocument(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      adminToast.error(error.message || "Failed to verify document");
    },
  });

  // Complete verification mutation
  const completeVerificationMutation = useMutation({
    mutationFn: async (riderId: string) => {
      const response = await apiRequest("POST", `/api/admin/riders/${riderId}/complete-verification`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders/pending-verification"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders/verification-stats"] });
      adminToast.riderVerified(selectedRider ? `${selectedRider.firstName} ${selectedRider.lastName}` : undefined);
      setDetailsOpen(false);
      setSelectedRider(null);
    },
    onError: (error: Error) => {
      adminToast.error(error.message || "Failed to complete verification");
    },
  });

  // Reject rider mutation
  const rejectRiderMutation = useMutation({
    mutationFn: async ({ riderId, reason }: { riderId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/riders/${riderId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders/pending-verification"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders/verification-stats"] });
      adminToast.riderRejected(selectedRider ? `${selectedRider.firstName} ${selectedRider.lastName}` : undefined);
      setRejectDialogOpen(false);
      setDetailsOpen(false);
      setSelectedRider(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      adminToast.error(error.message || "Failed to reject rider");
    },
  });

  // Initiate background check mutation
  const initiateBackgroundCheckMutation = useMutation({
    mutationFn: async (riderId: string) => {
      const response = await apiRequest("POST", `/api/admin/riders/${riderId}/background-check`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders/pending-verification"] });
      adminToast.success("Background check process has been started.");
    },
    onError: (error: Error) => {
      adminToast.error(error.message || "Failed to initiate background check");
    },
  });

  // Filter and sort riders
  const filteredRiders = useMemo(() => {
    let result = [...riders];

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter((r) => r.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.firstName.toLowerCase().includes(term) ||
          r.lastName.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term) ||
          r.phone.includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = sortField === "firstName" ? `${a.firstName} ${a.lastName}` : a[sortField];
      let bVal: string | number = sortField === "firstName" ? `${b.firstName} ${b.lastName}` : b[sortField];

      if (sortField === "submittedAt") {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return result;
  }, [riders, filterStatus, searchTerm, sortField, sortDirection]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('[data-testid="admin-sidebar"]');
      const target = event.target as Node;

      if (sidebarOpen && sidebar && !sidebar.contains(target)) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sidebarOpen]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "documents_review":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><FileCheck className="h-3 w-3 mr-1" />Documents Review</Badge>;
      case "background_check":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><Shield className="h-3 w-3 mr-1" />Background Check</Badge>;
      case "verified":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "motorcycle":
        return <Bike className="h-4 w-4" />;
      case "bicycle":
        return <Bike className="h-4 w-4" />;
      case "car":
        return <Car className="h-4 w-4" />;
      default:
        return <Truck className="h-4 w-4" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const doc = DOCUMENT_REQUIREMENTS.find((d) => d.type === type);
    return doc?.label || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDocumentProgress = (documents: RiderDocument[]) => {
    const approved = documents.filter((d) => d.status === "approved").length;
    const total = DOCUMENT_REQUIREMENTS.filter((d) => d.required).length;
    return Math.round((approved / total) * 100);
  };

  const canCompleteVerification = (rider: RiderVerification) => {
    const requiredDocs = DOCUMENT_REQUIREMENTS.filter((d) => d.required);
    const allApproved = requiredDocs.every((req) =>
      rider.documents.some((doc) => doc.type === req.type && doc.status === "approved")
    );
    const backgroundCheckPassed = rider.backgroundCheck?.status === "passed";
    return allApproved && backgroundCheckPassed;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-rider-verification">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="riders"
        onTabChange={() => {}}
        isOpen={sidebarOpen}
      />

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <AdminHeader
          title="Rider Verification"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <AdminPageWrapper
          pageTitle="Rider Verification"
          pageDescription="Review and verify rider documents and background checks"
          refreshQueryKeys={[
            "/api/admin/riders/pending-verification",
            "/api/admin/riders/verification-stats",
          ]}
        >
          <main className="p-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                      <p className="text-yellow-100 text-sm font-medium">Pending Review</p>
                      <p className="text-3xl font-bold">{(stats as any)?.pendingCount || riders.filter(r => r.status === 'pending' || r.status === 'documents_review').length}</p>
                      <p className="text-yellow-100 text-sm">Awaiting verification</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Background Check</p>
                      <p className="text-3xl font-bold">{(stats as any)?.backgroundCheckCount || riders.filter(r => r.status === 'background_check').length}</p>
                      <p className="text-purple-100 text-sm">In progress</p>
                    </div>
                    <Shield className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Verified Today</p>
                      <p className="text-3xl font-bold">{(stats as any)?.verifiedToday || 0}</p>
                      <p className="text-green-100 text-sm">New riders</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Riders</p>
                      <p className="text-3xl font-bold">{(stats as any)?.totalRiders || 0}</p>
                      <p className="text-blue-100 text-sm">Active on platform</p>
                    </div>
                    <Truck className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Rider Applications</CardTitle>
                    <CardDescription>Review and verify rider documents and background checks</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search riders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full sm:w-64"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Applications</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="documents_review">Documents Review</SelectItem>
                        <SelectItem value="background_check">Background Check</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("firstName")}
                        >
                          Rider Name <SortIcon field="firstName" />
                        </TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("vehicleType")}
                        >
                          Vehicle <SortIcon field="vehicleType" />
                        </TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Background</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("submittedAt")}
                        >
                          Submitted <SortIcon field="submittedAt" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("status")}
                        >
                          Status <SortIcon field="status" />
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-28" /></TableCell>
                            <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-36" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-28" /></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                            <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                          </TableRow>
                        ))
                      ) : isError ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex flex-col items-center text-red-600">
                              <AlertCircle className="h-8 w-8 mb-2" />
                              <p>Error loading rider applications</p>
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                                Try Again
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredRiders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="p-0">
                            <NoPendingVerificationEmptyState />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRiders.map((rider) => (
                          <TableRow key={rider.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                {rider.firstName} {rider.lastName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {rider.email}
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Phone className="h-3 w-3" />
                                  {rider.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getVehicleIcon(rider.vehicleType)}
                                <span className="capitalize">{rider.vehicleType}</span>
                                {rider.plateNumber && (
                                  <Badge variant="outline" className="text-xs">
                                    {rider.plateNumber}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="w-24">
                                <Progress value={getDocumentProgress(rider.documents)} className="h-2" />
                                <span className="text-xs text-gray-500">
                                  {rider.documents.filter(d => d.status === "approved").length}/{DOCUMENT_REQUIREMENTS.filter(d => d.required).length} approved
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {rider.backgroundCheck ? (
                                getStatusBadge(rider.backgroundCheck.status)
                              ) : (
                                <Badge variant="outline" className="text-gray-500">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Not Started
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(rider.submittedAt)}
                            </TableCell>
                            <TableCell>{getStatusBadge(rider.status)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRider(rider);
                                  setDetailsOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            </div>
          </main>
        </AdminPageWrapper>
      </div>

      {/* Rider Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedRider?.firstName} {selectedRider?.lastName}
            </DialogTitle>
            <DialogDescription>
              Review rider application details, documents, and background check status
            </DialogDescription>
          </DialogHeader>

          {selectedRider && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Personal Info</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="background">Background Check</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="font-medium">{selectedRider.firstName} {selectedRider.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="font-medium">{selectedRider.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="font-medium">{selectedRider.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="font-medium">{selectedRider.address}, {selectedRider.city}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Vehicle Type</label>
                      <p className="font-medium flex items-center gap-2">
                        {getVehicleIcon(selectedRider.vehicleType)}
                        <span className="capitalize">{selectedRider.vehicleType}</span>
                      </p>
                    </div>
                    {selectedRider.vehicleMake && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Vehicle</label>
                        <p className="font-medium">{selectedRider.vehicleMake} {selectedRider.vehicleModel}</p>
                      </div>
                    )}
                    {selectedRider.plateNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Plate Number</label>
                        <p className="font-medium">{selectedRider.plateNumber}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p>{getStatusBadge(selectedRider.status)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Submitted</label>
                      <p className="font-medium">{formatDate(selectedRider.submittedAt)}</p>
                    </div>
                  </div>
                </div>
                {selectedRider.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="text-sm font-medium text-red-800">Rejection Reason</label>
                    <p className="text-sm text-red-700 mt-1">{selectedRider.rejectionReason}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="mb-4">
                  <Progress value={getDocumentProgress(selectedRider.documents)} className="h-3" />
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedRider.documents.filter(d => d.status === "approved").length} of {DOCUMENT_REQUIREMENTS.filter(d => d.required).length} required documents approved
                  </p>
                </div>

                <div className="space-y-3">
                  {DOCUMENT_REQUIREMENTS.map((req) => {
                    const doc = selectedRider.documents.find((d) => d.type === req.type);
                    return (
                      <Card key={req.type} className={`p-4 ${!doc ? 'bg-gray-50' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${doc ? 'bg-blue-100' : 'bg-gray-200'}`}>
                              <FileText className={`h-5 w-5 ${doc ? 'text-blue-600' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {req.label}
                                {req.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                              </p>
                              {doc ? (
                                <p className="text-sm text-gray-500">{doc.name}</p>
                              ) : (
                                <p className="text-sm text-gray-400">Not uploaded</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc ? (
                              <>
                                {getStatusBadge(doc.status)}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDocumentPreviewUrl(doc.url)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {doc.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => verifyDocumentMutation.mutate({
                                        riderId: selectedRider.id,
                                        documentId: doc.id,
                                        action: "approve",
                                      })}
                                      disabled={verifyDocumentMutation.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setSelectedDocument(doc);
                                        setRejectDocumentDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-gray-400">
                                Missing
                              </Badge>
                            )}
                          </div>
                        </div>
                        {doc?.rejectionReason && (
                          <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
                            Rejection reason: {doc.rejectionReason}
                          </p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="background" className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-purple-500" />
                      <div>
                        <h3 className="font-semibold">Background Check</h3>
                        <p className="text-sm text-gray-500">Criminal and identity verification</p>
                      </div>
                    </div>
                    {selectedRider.backgroundCheck ? (
                      getStatusBadge(selectedRider.backgroundCheck.status)
                    ) : (
                      <Button
                        onClick={() => initiateBackgroundCheckMutation.mutate(selectedRider.id)}
                        disabled={initiateBackgroundCheckMutation.isPending}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {initiateBackgroundCheckMutation.isPending ? "Initiating..." : "Start Background Check"}
                      </Button>
                    )}
                  </div>

                  {selectedRider.backgroundCheck && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          <p className="font-medium capitalize">{selectedRider.backgroundCheck.status.replace("_", " ")}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Initiated</label>
                          <p className="font-medium">{formatDate(selectedRider.backgroundCheck.initiatedAt)}</p>
                        </div>
                        {selectedRider.backgroundCheck.completedAt && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Completed</label>
                            <p className="font-medium">{formatDate(selectedRider.backgroundCheck.completedAt)}</p>
                          </div>
                        )}
                      </div>
                      {selectedRider.backgroundCheck.notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Notes</label>
                          <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded">{selectedRider.backgroundCheck.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                <Card className="p-6 bg-blue-50 border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Verification Checklist</h4>
                  <div className="space-y-2">
                    {DOCUMENT_REQUIREMENTS.filter(d => d.required).map((req) => {
                      const doc = selectedRider.documents.find((d) => d.type === req.type);
                      const isApproved = doc?.status === "approved";
                      return (
                        <div key={req.type} className="flex items-center gap-2">
                          <Checkbox checked={isApproved} disabled />
                          <span className={isApproved ? "text-green-700" : "text-gray-600"}>{req.label}</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedRider.backgroundCheck?.status === "passed"} disabled />
                      <span className={selectedRider.backgroundCheck?.status === "passed" ? "text-green-700" : "text-gray-600"}>
                        Background Check Passed
                      </span>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2">
            {selectedRider?.status !== "verified" && selectedRider?.status !== "rejected" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={rejectRiderMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => selectedRider && completeVerificationMutation.mutate(selectedRider.id)}
                  disabled={!selectedRider || !canCompleteVerification(selectedRider) || completeVerificationMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {completeVerificationMutation.isPending ? "Verifying..." : "Complete Verification"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Rider Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Rider Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application. This will be sent to the rider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedRider && rejectionReason.trim()) {
                  rejectRiderMutation.mutate({ riderId: selectedRider.id, reason: rejectionReason });
                }
              }}
              disabled={!rejectionReason.trim() || rejectRiderMutation.isPending}
            >
              {rejectRiderMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Document Dialog */}
      <Dialog open={rejectDocumentDialogOpen} onOpenChange={setRejectDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Document: {selectedDocument && getDocumentTypeLabel(selectedDocument.type)}</label>
            </div>
            <Textarea
              placeholder="Enter rejection reason (e.g., blurry image, expired document)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDocumentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedRider && selectedDocument && rejectionReason.trim()) {
                  verifyDocumentMutation.mutate({
                    riderId: selectedRider.id,
                    documentId: selectedDocument.id,
                    action: "reject",
                    reason: rejectionReason,
                  });
                }
              }}
              disabled={!rejectionReason.trim() || verifyDocumentMutation.isPending}
            >
              {verifyDocumentMutation.isPending ? "Rejecting..." : "Reject Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!documentPreviewUrl} onOpenChange={() => setDocumentPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-gray-100 rounded-lg">
            {documentPreviewUrl && (
              <img
                src={documentPreviewUrl}
                alt="Document preview"
                className="max-w-full max-h-[60vh] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-document.png";
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" asChild>
              <a href={documentPreviewUrl || "#"} target="_blank" rel="noopener noreferrer">
                Open in New Tab
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
