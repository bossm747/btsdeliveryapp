import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Shield,
  Users,
  FileText,
  Download,
  Eye,
  CalendarIcon,
  RefreshCw,
  TrendingUp,
  Percent,
  Receipt,
  FileSpreadsheet,
  Building2,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TaxExemption {
  id: string;
  userId: string;
  exemptionType: string;
  idNumber: string;
  idDocumentUrl?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  validUntil?: string;
  status: string;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

interface TaxReport {
  id: string;
  vendorId: string;
  restaurantId?: string;
  periodStart: string;
  periodEnd: string;
  reportType: string;
  reportNumber?: string;
  grossSales: string;
  vatableSales: string;
  vatExemptSales: string;
  vatCollected: string;
  vatPayable: string;
  totalOrders: number;
  totalInvoices: number;
  seniorTransactions: number;
  pwdTransactions: number;
  status: string;
  generatedAt: string;
  vendor?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
}

const exemptionTypeLabels: Record<string, string> = {
  senior: "Senior Citizen",
  pwd: "PWD",
  diplomatic: "Diplomatic"
};

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  verified: "default",
  rejected: "destructive",
  expired: "outline",
  draft: "outline",
  generated: "secondary",
  submitted: "default",
  filed: "default"
};

export default function TaxManagement() {
  const [activeTab, setActiveTab] = useState("exemptions");
  const [selectedExemption, setSelectedExemption] = useState<TaxExemption | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isGenerateReportDialogOpen, setIsGenerateReportDialogOpen] = useState(false);
  const [reportPeriodStart, setReportPeriodStart] = useState<Date>();
  const [reportPeriodEnd, setReportPeriodEnd] = useState<Date>();
  const [reportType, setReportType] = useState<string>("monthly");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending exemptions
  const { data: pendingExemptions, isLoading: loadingPending } = useQuery<{ exemptions: TaxExemption[] }>({
    queryKey: ["/api/admin/tax-exemptions/pending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/tax-exemptions/pending");
      return res.json();
    }
  });

  // Fetch all exemptions with filters
  const { data: allExemptions, isLoading: loadingAll } = useQuery<{ exemptions: TaxExemption[] }>({
    queryKey: ["/api/admin/tax-exemptions", statusFilter, typeFilter],
    queryFn: async () => {
      let url = "/api/admin/tax-exemptions?limit=100";
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (typeFilter !== "all") url += `&type=${typeFilter}`;
      const res = await apiRequest("GET", url);
      return res.json();
    }
  });

  // Fetch tax reports
  const { data: taxReports, isLoading: loadingReports } = useQuery<{ reports: TaxReport[] }>({
    queryKey: ["/api/admin/tax-reports"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/tax-reports?limit=50");
      return res.json();
    }
  });

  // Verify exemption mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) => {
      const res = await apiRequest("POST", `/api/admin/tax-exemptions/${id}/verify`, {
        approved,
        rejectionReason: reason
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Exemption Updated",
          description: data.message
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-exemptions"] });
        setIsVerifyDialogOpen(false);
        setSelectedExemption(null);
        setRejectionReason("");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update exemption",
        variant: "destructive"
      });
    }
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (!reportPeriodStart || !reportPeriodEnd) {
        throw new Error("Please select period dates");
      }
      const res = await apiRequest("POST", "/api/admin/tax-reports/generate", {
        periodStart: reportPeriodStart.toISOString(),
        periodEnd: reportPeriodEnd.toISOString(),
        reportType
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Reports Generated",
          description: data.message
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-reports"] });
        setIsGenerateReportDialogOpen(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate reports",
        variant: "destructive"
      });
    }
  });

  // Export report
  const exportReport = async (reportId: string, reportNumber: string) => {
    try {
      const res = await fetch(`/api/admin/tax-reports/${reportId}/export`, {
        credentials: "include"
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-report-${reportNumber}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Tax report downloaded"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to download report",
        variant: "destructive"
      });
    }
  };

  const handleVerify = (exemption: TaxExemption) => {
    setSelectedExemption(exemption);
    setIsVerifyDialogOpen(true);
  };

  const confirmVerification = (approved: boolean) => {
    if (!selectedExemption) return;
    verifyMutation.mutate({
      id: selectedExemption.id,
      approved,
      reason: approved ? undefined : rejectionReason
    });
  };

  // Filter exemptions by search
  const filteredExemptions = (allExemptions?.exemptions || []).filter(e => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      e.idNumber.toLowerCase().includes(search) ||
      e.user?.email?.toLowerCase().includes(search) ||
      e.user?.firstName?.toLowerCase().includes(search) ||
      e.user?.lastName?.toLowerCase().includes(search)
    );
  });

  // Calculate summary stats
  const stats = {
    pendingCount: pendingExemptions?.exemptions?.length || 0,
    verifiedCount: (allExemptions?.exemptions || []).filter(e => e.status === "verified").length,
    totalReports: taxReports?.reports?.length || 0,
    totalVatCollected: (taxReports?.reports || []).reduce((sum, r) => sum + parseFloat(r.vatCollected || "0"), 0)
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">
            Manage tax exemptions and generate BIR-compliant reports
          </p>
        </div>
        <Button onClick={() => setIsGenerateReportDialogOpen(true)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Generate Reports
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting admin review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Exemptions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifiedCount}</div>
            <p className="text-xs text-muted-foreground">
              Active exemptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Reports</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              Generated reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VAT Collected</CardTitle>
            <Percent className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP {stats.totalVatCollected.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all reports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="exemptions">
            <Shield className="mr-2 h-4 w-4" />
            Exemptions
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="mr-2 h-4 w-4" />
            Pending ({stats.pendingCount})
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* All Exemptions Tab */}
        <TabsContent value="exemptions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Exemptions</CardTitle>
                  <CardDescription>
                    Manage all registered tax exemptions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-8 w-[200px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="pwd">PWD</SelectItem>
                      <SelectItem value="diplomatic">Diplomatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredExemptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No exemptions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExemptions.map((exemption) => (
                      <TableRow key={exemption.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {exemption.user?.firstName} {exemption.user?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {exemption.user?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {exemptionTypeLabels[exemption.exemptionType] || exemption.exemptionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{exemption.idNumber}</TableCell>
                        <TableCell>
                          {exemption.validUntil
                            ? format(new Date(exemption.validUntil), "MMM dd, yyyy")
                            : "No expiry"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[exemption.status]}>
                            {exemption.status.charAt(0).toUpperCase() + exemption.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(exemption.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {exemption.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerify(exemption)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verifications</CardTitle>
              <CardDescription>
                Review and verify tax exemption applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (pendingExemptions?.exemptions?.length || 0) === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>All caught up!</AlertTitle>
                  <AlertDescription>
                    There are no pending exemption applications to review.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {pendingExemptions?.exemptions?.map((exemption) => (
                    <Card key={exemption.id} className="border-amber-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-4">
                              <Badge variant="secondary" className="text-lg">
                                {exemptionTypeLabels[exemption.exemptionType]}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Submitted {format(new Date(exemption.createdAt), "MMM dd, yyyy HH:mm")}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <Label className="text-muted-foreground text-xs">Applicant</Label>
                                <p className="font-medium">
                                  {exemption.firstName || exemption.user?.firstName}{" "}
                                  {exemption.lastName || exemption.user?.lastName}
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Email</Label>
                                <p className="font-medium">{exemption.user?.email}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">ID Number</Label>
                                <p className="font-mono font-medium">{exemption.idNumber}</p>
                              </div>
                              {exemption.dateOfBirth && (
                                <div>
                                  <Label className="text-muted-foreground text-xs">Date of Birth</Label>
                                  <p className="font-medium">
                                    {format(new Date(exemption.dateOfBirth), "MMM dd, yyyy")}
                                  </p>
                                </div>
                              )}
                            </div>

                            {exemption.idDocumentUrl && (
                              <div>
                                <Label className="text-muted-foreground text-xs">ID Document</Label>
                                <a
                                  href={exemption.idDocumentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  View uploaded document
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleVerify(exemption)}
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Reports</CardTitle>
                  <CardDescription>
                    BIR-compliant tax reports for all vendors
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-reports"] })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (taxReports?.reports?.length || 0) === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No reports generated yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => setIsGenerateReportDialogOpen(true)}
                  >
                    Generate First Report
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Gross Sales</TableHead>
                      <TableHead className="text-right">VAT Collected</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxReports?.reports?.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono text-sm">
                          {report.reportNumber || "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {report.restaurant?.name || "N/A"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {report.vendor?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.periodStart), "MMM dd")} -{" "}
                          {format(new Date(report.periodEnd), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          PHP {parseFloat(report.grossSales).toLocaleString("en-PH", {
                            minimumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          PHP {parseFloat(report.vatCollected).toLocaleString("en-PH", {
                            minimumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[report.status]}>
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportReport(report.id, report.reportNumber || report.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            CSV
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verify Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Exemption Application</DialogTitle>
            <DialogDescription>
              Verify or reject this tax exemption application
            </DialogDescription>
          </DialogHeader>

          {selectedExemption && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <p className="font-medium">
                    {exemptionTypeLabels[selectedExemption.exemptionType]}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">ID Number</Label>
                  <p className="font-mono font-medium">{selectedExemption.idNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Applicant</Label>
                  <p className="font-medium">
                    {selectedExemption.firstName || selectedExemption.user?.firstName}{" "}
                    {selectedExemption.lastName || selectedExemption.user?.lastName}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium">{selectedExemption.user?.email}</p>
                </div>
              </div>

              {selectedExemption.idDocumentUrl && (
                <div className="border rounded-lg p-4">
                  <Label className="text-muted-foreground text-xs block mb-2">
                    Uploaded ID Document
                  </Label>
                  <img
                    src={selectedExemption.idDocumentUrl}
                    alt="ID Document"
                    className="max-h-64 mx-auto rounded"
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => confirmVerification(false)}
              disabled={verifyMutation.isPending || !rejectionReason}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
            <Button
              onClick={() => confirmVerification(true)}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verify & Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={isGenerateReportDialogOpen} onOpenChange={setIsGenerateReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Tax Reports</DialogTitle>
            <DialogDescription>
              Generate BIR-compliant tax reports for all vendors
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !reportPeriodStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reportPeriodStart ? format(reportPeriodStart, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reportPeriodStart}
                      onSelect={setReportPeriodStart}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Period End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !reportPeriodEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reportPeriodEnd ? format(reportPeriodEnd, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reportPeriodEnd}
                      onSelect={setReportPeriodEnd}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will generate tax reports for all vendors based on orders in the selected period.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGenerateReportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => generateReportMutation.mutate()}
              disabled={generateReportMutation.isPending || !reportPeriodStart || !reportPeriodEnd}
            >
              {generateReportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Generate Reports
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
