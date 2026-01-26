// BTS Delivery Platform - Admin Payout Management Dashboard
// Manage vendor settlements, process payouts, and track payment history

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { AdminPageWrapper } from "@/components/admin";
import { useAdminToast } from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Wallet,
  DollarSign,
  Store,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Send,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Banknote,
  CreditCard,
  FileText,
  Eye,
  MoreVertical,
  ArrowUpRight,
  Building,
  User,
  Phone,
  Mail
} from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types
interface VendorSettlement {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail?: string;
  vendorPhone?: string;
  periodStart: string;
  periodEnd: string;
  totalOrders: number;
  grossRevenue: number;
  platformCommission: number;
  deliveryFees: number;
  netAmount: number;
  status: "pending" | "approved" | "processing" | "paid" | "disputed" | "failed";
  createdAt: string;
  paidAt?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  orders?: {
    orderId: string;
    orderNumber: string;
    amount: number;
    commission: number;
    completedAt: string;
  }[];
}

interface PayoutRecord {
  id: string;
  settlementId: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  paymentMethod: string;
  transactionId?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  error?: string;
}

interface PayoutSummary {
  totalPending: number;
  totalPendingAmount: number;
  totalProcessing: number;
  totalProcessingAmount: number;
  totalPaidThisMonth: number;
  totalPaidAmountThisMonth: number;
  totalDisputed: number;
  totalDisputedAmount: number;
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { color: string; icon: any }> = {
    pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
    approved: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: CheckCircle },
    processing: { color: "bg-purple-100 text-purple-800 border-purple-300", icon: RefreshCw },
    paid: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
    completed: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
    disputed: { color: "bg-red-100 text-red-800 border-red-300", icon: AlertCircle },
    failed: { color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{status}</span>
    </Badge>
  );
};

export default function PayoutManagement() {
  const adminToast = useAdminToast();
  const qClient = useQueryClient();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("settlements");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSettlements, setSelectedSettlements] = useState<string[]>([]);
  const [settlementDetail, setSettlementDetail] = useState<VendorSettlement | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);

  // Fetch settlements
  const { data: settlementsData, isLoading: settlementsLoading, refetch: refetchSettlements } = useQuery({
    queryKey: ["/api/admin/financial/settlements", statusFilter, page, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });
      const res = await fetch(`/api/admin/financial/settlements?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch settlements");
      return res.json();
    },
  });

  // Fetch payouts
  const { data: payoutsData, isLoading: payoutsLoading, refetch: refetchPayouts } = useQuery({
    queryKey: ["/api/admin/financial/payouts", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      const res = await fetch(`/api/admin/financial/payouts?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
    enabled: selectedTab === "payouts",
  });

  // Fetch summary metrics
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/admin/financial/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/financial/dashboard?timeRange=30d", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  // Process payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: async (payoutIds: string[]) => {
      const res = await fetch("/api/admin/financial/payouts/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payoutIds }),
      });
      if (!res.ok) throw new Error("Failed to process payouts");
      return res.json();
    },
    onSuccess: (data) => {
      adminToast.success("Payouts Processed", `Successfully processed ${data.processed || 1} payout(s)`);
      qClient.invalidateQueries({ queryKey: ["/api/admin/financial/settlements"] });
      qClient.invalidateQueries({ queryKey: ["/api/admin/financial/payouts"] });
      setSelectedSettlements([]);
      setShowBatchDialog(false);
      setShowConfirmDialog(false);
    },
    onError: (error: any) => {
      adminToast.error("Payout Failed", error.message || "Failed to process payout");
    },
  });

  // Approve settlement mutation
  const approveSettlementMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/financial/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update settlement");
      return res.json();
    },
    onSuccess: () => {
      adminToast.success("Settlement Updated", "Settlement status updated successfully");
      qClient.invalidateQueries({ queryKey: ["/api/admin/financial/settlements"] });
    },
    onError: (error: any) => {
      adminToast.error("Update Failed", error.message || "Failed to update settlement");
    },
  });

  // Generate settlements mutation
  const generateSettlementsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/financial/settlements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to generate settlements");
      return res.json();
    },
    onSuccess: (data) => {
      adminToast.success("Settlements Generated", `Generated ${data.generated || 0} new settlement(s)`);
      refetchSettlements();
    },
    onError: (error: any) => {
      adminToast.error("Generation Failed", error.message || "Failed to generate settlements");
    },
  });

  // Handle settlement selection
  const toggleSettlementSelection = (id: string) => {
    setSelectedSettlements((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Select all pending settlements
  const selectAllPending = () => {
    const pendingIds = (settlementsData?.settlements || [])
      .filter((s: VendorSettlement) => s.status === "pending" || s.status === "approved")
      .map((s: VendorSettlement) => s.id);
    setSelectedSettlements(pendingIds);
  };

  // Calculate selected amount
  const selectedTotalAmount = (settlementsData?.settlements || [])
    .filter((s: VendorSettlement) => selectedSettlements.includes(s.id))
    .reduce((sum: number, s: VendorSettlement) => sum + s.netAmount, 0);

  // Extract metrics from summary
  const metrics: PayoutSummary = {
    totalPending: summaryData?.payouts?.pendingCount || settlementsData?.pendingCount || 0,
    totalPendingAmount: summaryData?.payouts?.pendingAmount || settlementsData?.pendingAmount || 0,
    totalProcessing: summaryData?.payouts?.processingCount || 0,
    totalProcessingAmount: summaryData?.payouts?.processingAmount || 0,
    totalPaidThisMonth: summaryData?.payouts?.paidThisMonthCount || 0,
    totalPaidAmountThisMonth: summaryData?.payouts?.paidThisMonthAmount || 0,
    totalDisputed: summaryData?.payouts?.disputedCount || 0,
    totalDisputedAmount: summaryData?.payouts?.disputedAmount || 0,
  };

  const settlements: VendorSettlement[] = settlementsData?.settlements || [];
  const payouts: PayoutRecord[] = payoutsData?.payouts || [];
  const totalPages = Math.ceil((settlementsData?.total || 0) / 20);

  return (
    <AdminPageWrapper 
      title="Payout Management" 
      description="Manage vendor settlements and process payouts"
    >
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar activeTab="payouts" isOpen={sidebarOpen} />

        <div className="flex-1 flex flex-col lg:ml-64">
          <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-auto p-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Payout Management
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Review settlements, process payouts, and track payment history
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4 lg:mt-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    refetchSettlements();
                    refetchPayouts();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateSettlementsMutation.mutate()}
                  disabled={generateSettlementsMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Settlements
                </Button>
                {selectedSettlements.length > 0 && (
                  <Button onClick={() => setShowBatchDialog(true)} className="bg-green-600 hover:bg-green-700">
                    <Send className="h-4 w-4 mr-2" />
                    Process {selectedSettlements.length} Payout(s)
                  </Button>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Pending Payouts</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {metrics.totalPending}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(metrics.totalPendingAmount)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Processing</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {metrics.totalProcessing}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(metrics.totalProcessingAmount)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Paid This Month</p>
                      <p className="text-2xl font-bold text-green-600">
                        {metrics.totalPaidThisMonth}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(metrics.totalPaidAmountThisMonth)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Disputed</p>
                      <p className="text-2xl font-bold text-red-600">
                        {metrics.totalDisputed}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(metrics.totalDisputedAmount)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="settlements" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Vendor Settlements
                </TabsTrigger>
                <TabsTrigger value="payouts" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Payout History
                </TabsTrigger>
              </TabsList>

              {/* Settlements Tab */}
              <TabsContent value="settlements" className="space-y-4">
                {/* Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search vendor name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="disputed">Disputed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={selectAllPending}>
                        Select All Pending
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Settlements Table */}
                <Card>
                  <CardContent className="p-0">
                    {settlementsLoading ? (
                      <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : settlements.length === 0 ? (
                      <div className="p-12 text-center">
                        <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No settlements found</h3>
                        <p className="text-gray-500 mt-1">
                          Generate new settlements or adjust your filters
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={selectedSettlements.length === settlements.filter(s => s.status === "pending" || s.status === "approved").length && selectedSettlements.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) selectAllPending();
                                  else setSelectedSettlements([]);
                                }}
                              />
                            </TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Gross Revenue</TableHead>
                            <TableHead className="text-right">Commission</TableHead>
                            <TableHead className="text-right">Net Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlements.map((settlement) => (
                            <TableRow key={settlement.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <TableCell>
                                <Checkbox
                                  checked={selectedSettlements.includes(settlement.id)}
                                  onCheckedChange={() => toggleSettlementSelection(settlement.id)}
                                  disabled={settlement.status === "paid" || settlement.status === "processing"}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Store className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{settlement.vendorName}</p>
                                    <p className="text-xs text-gray-500">{settlement.vendorId}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{format(new Date(settlement.periodStart), "MMM d")} - {format(new Date(settlement.periodEnd), "MMM d, yyyy")}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {settlement.totalOrders}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(settlement.grossRevenue)}
                              </TableCell>
                              <TableCell className="text-right text-orange-600">
                                -{formatCurrency(settlement.platformCommission)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                {formatCurrency(settlement.netAmount)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={settlement.status} />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSettlementDetail(settlement)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {settlement.status === "pending" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => approveSettlementMutation.mutate({ id: settlement.id, status: "approved" })}
                                      disabled={approveSettlementMutation.isPending}
                                    >
                                      Approve
                                    </Button>
                                  )}
                                  {(settlement.status === "pending" || settlement.status === "approved") && (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => {
                                        setProcessingPayout(settlement.id);
                                        setShowConfirmDialog(true);
                                      }}
                                    >
                                      <Send className="h-4 w-4 mr-1" />
                                      Pay
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <p className="text-sm text-gray-500">
                          Showing page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payouts Tab */}
              <TabsContent value="payouts" className="space-y-4">
                <Card>
                  <CardContent className="p-0">
                    {payoutsLoading ? (
                      <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : payouts.length === 0 ? (
                      <div className="p-12 text-center">
                        <Banknote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No payouts yet</h3>
                        <p className="text-gray-500 mt-1">
                          Process settlements to create payout records
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Processed At</TableHead>
                            <TableHead>Processed By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payouts.map((payout) => (
                            <TableRow key={payout.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <Store className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{payout.vendorName}</p>
                                    <p className="text-xs text-gray-500">{payout.vendorId}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-bold text-green-600">
                                {formatCurrency(payout.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {payout.paymentMethod || "Bank Transfer"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {payout.transactionId || "-"}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={payout.status} />
                              </TableCell>
                              <TableCell>
                                {payout.processedAt ? (
                                  <div>
                                    <p className="text-sm">{format(new Date(payout.processedAt), "MMM d, yyyy")}</p>
                                    <p className="text-xs text-gray-500">{format(new Date(payout.processedAt), "HH:mm")}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {payout.processedBy || "-"}
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
          </main>
        </div>
      </div>

      {/* Settlement Detail Dialog */}
      <Dialog open={!!settlementDetail} onOpenChange={() => setSettlementDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Settlement Details</DialogTitle>
            <DialogDescription>
              Review vendor settlement breakdown and order details
            </DialogDescription>
          </DialogHeader>

          {settlementDetail && (
            <div className="space-y-6">
              {/* Vendor Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center">
                    <Store className="h-7 w-7 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{settlementDetail.vendorName}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {settlementDetail.vendorEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {settlementDetail.vendorEmail}
                        </span>
                      )}
                      {settlementDetail.vendorPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {settlementDetail.vendorPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Period & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Settlement Period</Label>
                  <p className="font-medium">
                    {format(new Date(settlementDetail.periodStart), "MMM d")} - {format(new Date(settlementDetail.periodEnd), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={settlementDetail.status} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold">Financial Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Orders</span>
                    <span className="font-medium">{settlementDetail.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gross Revenue</span>
                    <span className="font-medium">{formatCurrency(settlementDetail.grossRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Platform Commission</span>
                    <span>-{formatCurrency(settlementDetail.platformCommission)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Fees (passed to rider)</span>
                    <span>-{formatCurrency(settlementDetail.deliveryFees)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold text-green-600">
                    <span>Net Payout Amount</span>
                    <span>{formatCurrency(settlementDetail.netAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Account Info */}
              {settlementDetail.bankAccount && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Bank Account
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bank Name</span>
                        <span className="font-medium">{settlementDetail.bankAccount.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Account Number</span>
                        <span className="font-mono">{settlementDetail.bankAccount.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Account Name</span>
                        <span className="font-medium">{settlementDetail.bankAccount.accountName}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettlementDetail(null)}>
              Close
            </Button>
            {settlementDetail && (settlementDetail.status === "pending" || settlementDetail.status === "approved") && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setProcessingPayout(settlementDetail.id);
                  setSettlementDetail(null);
                  setShowConfirmDialog(true);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Process Payout
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Payout Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Batch Payout</DialogTitle>
            <DialogDescription>
              You are about to process payouts for {selectedSettlements.length} vendor(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertTitle>Total Payout Amount</AlertTitle>
              <AlertDescription className="text-2xl font-bold text-green-600">
                {formatCurrency(selectedTotalAmount)}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">Selected Vendors:</h4>
              <ScrollArea className="h-[150px]">
                <ul className="space-y-2">
                  {settlements
                    .filter((s) => selectedSettlements.includes(s.id))
                    .map((s) => (
                      <li key={s.id} className="flex justify-between text-sm">
                        <span>{s.vendorName}</span>
                        <span className="font-medium">{formatCurrency(s.netAmount)}</span>
                      </li>
                    ))}
                </ul>
              </ScrollArea>
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                This action will initiate bank transfers to the selected vendors. 
                Please ensure all settlement amounts are correct before proceeding.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => processPayoutMutation.mutate(selectedSettlements)}
              disabled={processPayoutMutation.isPending}
            >
              {processPayoutMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm & Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Payout Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payout</DialogTitle>
            <DialogDescription>
              Are you sure you want to process this payout?
            </DialogDescription>
          </DialogHeader>

          {processingPayout && (
            <div className="space-y-4">
              {(() => {
                const settlement = settlements.find((s) => s.id === processingPayout);
                if (!settlement) return null;
                return (
                  <>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Store className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{settlement.vendorName}</h3>
                          <p className="text-sm text-gray-500">
                            {format(new Date(settlement.periodStart), "MMM d")} - {format(new Date(settlement.periodEnd), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Payout Amount</p>
                        <p className="text-3xl font-bold text-green-600">
                          {formatCurrency(settlement.netAmount)}
                        </p>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This will initiate a bank transfer to the vendor's registered account.
                      </AlertDescription>
                    </Alert>
                  </>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowConfirmDialog(false);
              setProcessingPayout(null);
            }}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (processingPayout) {
                  processPayoutMutation.mutate([processingPayout]);
                }
              }}
              disabled={processPayoutMutation.isPending}
            >
              {processPayoutMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Process Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageWrapper>
  );
}
