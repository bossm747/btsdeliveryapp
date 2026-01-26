import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Store, Search, FileText, CheckCircle, XCircle, Clock,
  Eye, ChevronUp, ChevronDown, AlertCircle, Building, Phone, Mail
} from "lucide-react";
import { useAdminToast } from "@/hooks";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AdminPageWrapper,
  AdminTableSkeleton,
  AdminStatsSkeleton,
  NoPendingApprovalEmptyState,
  NoRestaurantsEmptyState,
} from "@/components/admin";

// Types
interface VendorDocument {
  id: string;
  type: "business_permit" | "valid_id" | "dti_registration" | "bir_certificate" | "sanitary_permit" | "other";
  name: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  uploadedAt: string;
}

interface VendorApplication {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  businessType: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  documents: VendorDocument[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

type SortField = "businessName" | "ownerName" | "submittedAt" | "status";
type SortDirection = "asc" | "desc";

export default function VendorApproval() {
  const adminToast = useAdminToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("submittedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Dialog states
  const [selectedVendor, setSelectedVendor] = useState<VendorApplication | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);

  // Fetch pending vendors
  const { data: vendors = [], isLoading, isError, refetch } = useQuery<VendorApplication[]>({
    queryKey: ["/api/admin/vendors/pending"],
  });

  // Fetch stats
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/vendors/stats"],
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const response = await apiRequest("POST", `/api/admin/vendor/${vendorId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors/stats"] });
      adminToast.restaurantApproved(selectedVendor?.businessName);
      setDetailsOpen(false);
      setSelectedVendor(null);
    },
    onError: (error: Error) => {
      adminToast.error(error.message || "Failed to approve vendor");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ vendorId, reason }: { vendorId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/vendor/${vendorId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors/stats"] });
      adminToast.restaurantRejected(selectedVendor?.businessName);
      setRejectDialogOpen(false);
      setDetailsOpen(false);
      setSelectedVendor(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      adminToast.error(error.message || "Failed to reject vendor");
    },
  });

  // Filter and sort vendors
  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter((v) => v.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.businessName.toLowerCase().includes(term) ||
          v.ownerName.toLowerCase().includes(term) ||
          v.email.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (sortField === "submittedAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return result;
  }, [vendors, filterStatus, searchTerm, sortField, sortDirection]);

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
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      business_permit: "Business Permit",
      valid_id: "Valid ID",
      dti_registration: "DTI Registration",
      bir_certificate: "BIR Certificate",
      sanitary_permit: "Sanitary Permit",
      other: "Other Document",
    };
    return labels[type] || type;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-vendor-approval">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="restaurants"
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
          title="Vendor Approval"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <AdminPageWrapper
          pageTitle="Vendor Approval"
          pageDescription="Review and manage vendor registration requests"
          refreshQueryKeys={[
            "/api/admin/vendors/pending",
            "/api/admin/vendors/stats",
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
                      <p className="text-3xl font-bold">{(stats as any)?.pendingCount || vendors.filter(v => v.status === 'pending').length}</p>
                      <p className="text-yellow-100 text-sm">Awaiting approval</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Approved Today</p>
                      <p className="text-3xl font-bold">{(stats as any)?.approvedToday || 0}</p>
                      <p className="text-green-100 text-sm">New vendors</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Rejected</p>
                      <p className="text-3xl font-bold">{(stats as any)?.rejectedCount || 0}</p>
                      <p className="text-red-100 text-sm">This month</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Vendors</p>
                      <p className="text-3xl font-bold">{(stats as any)?.totalVendors || 0}</p>
                      <p className="text-blue-100 text-sm">On platform</p>
                    </div>
                    <Store className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Vendor Applications</CardTitle>
                    <CardDescription>Review and manage vendor registration requests</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search vendors..."
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
                        <SelectItem value="approved">Approved</SelectItem>
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
                          onClick={() => handleSort("businessName")}
                        >
                          Business Name <SortIcon field="businessName" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("ownerName")}
                        >
                          Owner <SortIcon field="ownerName" />
                        </TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Documents</TableHead>
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
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></TableCell>
                            <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-40" /></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-16" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-28" /></TableCell>
                            <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                            <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-24" /></TableCell>
                          </TableRow>
                        ))
                      ) : isError ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center text-red-600">
                              <AlertCircle className="h-8 w-8 mb-2" />
                              <p>Error loading vendor applications</p>
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                                Try Again
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredVendors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
                            <NoPendingApprovalEmptyState />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVendors.map((vendor) => (
                          <TableRow key={vendor.id}>
                            <TableCell className="font-medium">{vendor.businessName}</TableCell>
                            <TableCell>{vendor.ownerName}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {vendor.email}
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Phone className="h-3 w-3" />
                                  {vendor.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                <FileText className="h-3 w-3 mr-1" />
                                {vendor.documents?.length || 0} files
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(vendor.submittedAt)}
                            </TableCell>
                            <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedVendor(vendor);
                                    setDetailsOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                                {vendor.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => approveMutation.mutate(vendor.id)}
                                      disabled={approveMutation.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setSelectedVendor(vendor);
                                        setRejectDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
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

      {/* Vendor Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {selectedVendor?.businessName}
            </DialogTitle>
            <DialogDescription>
              Review vendor application details and documents
            </DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Business Info</TabsTrigger>
                <TabsTrigger value="documents">Documents ({selectedVendor.documents?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Business Name</label>
                      <p className="font-medium">{selectedVendor.businessName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Owner Name</label>
                      <p className="font-medium">{selectedVendor.ownerName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Business Type</label>
                      <p className="font-medium">{selectedVendor.businessType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p>{getStatusBadge(selectedVendor.status)}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="font-medium">{selectedVendor.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="font-medium">{selectedVendor.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="font-medium">{selectedVendor.address}, {selectedVendor.city}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Submitted</label>
                      <p className="font-medium">{formatDate(selectedVendor.submittedAt)}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedVendor.description || "No description provided"}</p>
                </div>
                {selectedVendor.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="text-sm font-medium text-red-800">Rejection Reason</label>
                    <p className="text-sm text-red-700 mt-1">{selectedVendor.rejectionReason}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                {selectedVendor.documents && selectedVendor.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedVendor.documents.map((doc) => (
                      <Card key={doc.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-500" />
                            <div>
                              <p className="font-medium">{getDocumentTypeLabel(doc.type)}</p>
                              <p className="text-sm text-gray-500">{doc.name}</p>
                              <p className="text-xs text-gray-400">{formatDate(doc.uploadedAt)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(doc.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDocumentPreviewUrl(doc.url)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2">
            {selectedVendor?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate(selectedVendor.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Vendor Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application. This will be sent to the vendor.
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
                if (selectedVendor && rejectionReason.trim()) {
                  rejectMutation.mutate({ vendorId: selectedVendor.id, reason: rejectionReason });
                }
              }}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
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
