import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserX,
  Users,
  Activity,
  TrendingUp,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Settings,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

// Types
interface FraudAlert {
  id: string;
  userId: string;
  orderId?: string;
  ruleId?: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  riskScore: number;
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed';
  statusReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
  userBlocked?: boolean;
  orderCancelled?: boolean;
  refundIssued?: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: string;
    status: string;
  };
}

interface FraudRule {
  id: string;
  name: string;
  description?: string;
  ruleType: string;
  conditions: any;
  action: string;
  severity: string;
  scoreImpact: number;
  isActive: boolean;
  triggerCount: number;
  falsePositiveCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

interface FraudStats {
  alertsToday: number;
  highRiskOrders: number;
  blockedUsers: number;
  falsePositiveRate: number;
  alertsBySeverity: Record<string, number>;
  alertsByType: Record<string, number>;
  recentTrends: { date: string; count: number }[];
}

// Severity badge component
const SeverityBadge = ({ severity }: { severity: string }) => {
  const variants: Record<string, string> = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <Badge className={variants[severity] || variants.medium}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    confirmed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <Badge className={variants[status] || variants.pending}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Risk score gauge component
const RiskScoreGauge = ({ score }: { score: number }) => {
  const getColor = () => {
    if (score >= 75) return "text-red-600";
    if (score >= 50) return "text-orange-500";
    if (score >= 25) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            score >= 75 ? "bg-red-500" :
            score >= 50 ? "bg-orange-500" :
            score >= 25 ? "bg-yellow-500" :
            "bg-green-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`font-semibold ${getColor()}`}>{score}</span>
    </div>
  );
};

export default function FraudDashboard() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("alerts");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FraudRule | null>(null);

  // Fetch fraud stats
  const { data: stats, isLoading: statsLoading } = useQuery<{ success: boolean; data: FraudStats }>({
    queryKey: ["/api/admin/fraud/stats"],
  });

  // Fetch fraud alerts
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery<{
    success: boolean;
    data: { alerts: FraudAlert[]; total: number };
  }>({
    queryKey: ["/api/admin/fraud/alerts", filterStatus, filterSeverity],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterSeverity !== "all") params.append("severity", filterSeverity);
      params.append("limit", "50");
      const response = await fetch(`/api/admin/fraud/alerts?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
  });

  // Fetch fraud rules
  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useQuery<{
    success: boolean;
    data: FraudRule[];
  }>({
    queryKey: ["/api/admin/fraud/rules"],
  });

  // Fetch high risk users
  const { data: highRiskUsersData } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ["/api/admin/fraud/high-risk-users"],
  });

  // Fetch blocked users
  const { data: blockedUsersData } = useQuery<{
    success: boolean;
    data: { users: any[]; total: number };
  }>({
    queryKey: ["/api/admin/fraud/blocked-users"],
  });

  // Review alert mutation
  const reviewAlertMutation = useMutation({
    mutationFn: async (data: {
      alertId: string;
      decision: 'dismissed' | 'confirmed';
      blockUser?: boolean;
      cancelOrder?: boolean;
      issueRefund?: boolean;
      notes?: string;
    }) => {
      const response = await fetch(`/api/admin/fraud/alerts/${data.alertId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          decision: data.decision,
          blockUser: data.blockUser,
          cancelOrder: data.cancelOrder,
          issueRefund: data.issueRefund,
          notes: data.notes,
        }),
      });
      if (!response.ok) throw new Error("Failed to review alert");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Alert reviewed successfully" });
      refetchAlerts();
      setReviewDialogOpen(false);
      setSelectedAlert(null);
    },
    onError: () => {
      toast({ title: "Failed to review alert", variant: "destructive" });
    },
  });

  // Toggle rule mutation
  const toggleRuleMutation = useMutation({
    mutationFn: async (data: { ruleId: string; isActive: boolean }) => {
      const response = await fetch(`/api/admin/fraud/rules/${data.ruleId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: data.isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle rule");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Rule updated successfully" });
      refetchRules();
    },
    onError: () => {
      toast({ title: "Failed to update rule", variant: "destructive" });
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (data: { userId: string; reason: string; duration?: number }) => {
      const response = await fetch(`/api/admin/fraud/user/${data.userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: data.reason, duration: data.duration }),
      });
      if (!response.ok) throw new Error("Failed to block user");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User blocked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fraud/blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fraud/high-risk-users"] });
    },
    onError: () => {
      toast({ title: "Failed to block user", variant: "destructive" });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/fraud/user/${userId}/unblock`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unblock user");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User unblocked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fraud/blocked-users"] });
    },
    onError: () => {
      toast({ title: "Failed to unblock user", variant: "destructive" });
    },
  });

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

  const fraudStats = stats?.data;
  const alerts = alertsData?.data?.alerts || [];
  const rules = rulesData?.data || [];
  const highRiskUsers = highRiskUsersData?.data || [];
  const blockedUsers = blockedUsersData?.data?.users || [];

  // Review dialog state
  const [reviewDecision, setReviewDecision] = useState<'dismissed' | 'confirmed'>('dismissed');
  const [reviewBlockUser, setReviewBlockUser] = useState(false);
  const [reviewCancelOrder, setReviewCancelOrder] = useState(false);
  const [reviewIssueRefund, setReviewIssueRefund] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  const handleReviewAlert = () => {
    if (!selectedAlert) return;
    reviewAlertMutation.mutate({
      alertId: selectedAlert.id,
      decision: reviewDecision,
      blockUser: reviewBlockUser,
      cancelOrder: reviewCancelOrder,
      issueRefund: reviewIssueRefund,
      notes: reviewNotes,
    });
  };

  const openReviewDialog = (alert: FraudAlert) => {
    setSelectedAlert(alert);
    setReviewDecision('dismissed');
    setReviewBlockUser(false);
    setReviewCancelOrder(false);
    setReviewIssueRefund(false);
    setReviewNotes("");
    setReviewDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-fraud-dashboard">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="fraud"
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
          title="Fraud Detection"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Alerts Today</p>
                      <p className="text-3xl font-bold">{fraudStats?.alertsToday || 0}</p>
                      <p className="text-red-100 text-sm">Requires attention</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">High-Risk Orders</p>
                      <p className="text-3xl font-bold">{fraudStats?.highRiskOrders || 0}</p>
                      <p className="text-orange-100 text-sm">Pending review</p>
                    </div>
                    <ShieldAlert className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Blocked Users</p>
                      <p className="text-3xl font-bold">{fraudStats?.blockedUsers || 0}</p>
                      <p className="text-purple-100 text-sm">Active blocks</p>
                    </div>
                    <UserX className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">False Positive Rate</p>
                      <p className="text-3xl font-bold">{(fraudStats?.falsePositiveRate || 0).toFixed(1)}%</p>
                      <p className="text-green-100 text-sm">Detection accuracy</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                <TabsTrigger value="alerts" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="rules" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rules
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Alerts Tab */}
              <TabsContent value="alerts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Fraud Alerts</CardTitle>
                        <CardDescription>Review and manage fraud alerts</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Severity</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => refetchAlerts()}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Risk Score</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alertsLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              Loading alerts...
                            </TableCell>
                          </TableRow>
                        ) : alerts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              No alerts found
                            </TableCell>
                          </TableRow>
                        ) : (
                          alerts.map((alert) => (
                            <TableRow key={alert.id}>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {alert.alertType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {alert.user?.firstName} {alert.user?.lastName}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    {alert.user?.email}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {alert.order ? (
                                  <div className="text-sm">
                                    <div className="font-medium">#{alert.order.orderNumber}</div>
                                    <div className="text-gray-500 text-xs">
                                      PHP {parseFloat(alert.order.totalAmount).toFixed(2)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <RiskScoreGauge score={alert.riskScore} />
                              </TableCell>
                              <TableCell>
                                <SeverityBadge severity={alert.severity} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={alert.status} />
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {format(new Date(alert.createdAt), "MMM d, HH:mm")}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openReviewDialog(alert)}
                                    disabled={alert.status !== 'pending'}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Rules Tab */}
              <TabsContent value="rules" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Fraud Rules</CardTitle>
                        <CardDescription>Configure fraud detection rules</CardDescription>
                      </div>
                      <Button onClick={() => setRuleDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rule
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Score Impact</TableHead>
                          <TableHead>Triggers</TableHead>
                          <TableHead>False Positives</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rulesLoading ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
                              Loading rules...
                            </TableCell>
                          </TableRow>
                        ) : rules.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                              No rules configured
                            </TableCell>
                          </TableRow>
                        ) : (
                          rules.map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{rule.name}</div>
                                  {rule.description && (
                                    <div className="text-xs text-gray-500 truncate max-w-xs">
                                      {rule.description}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {rule.ruleType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {rule.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <SeverityBadge severity={rule.severity} />
                              </TableCell>
                              <TableCell className="font-medium">
                                +{rule.scoreImpact}
                              </TableCell>
                              <TableCell>{rule.triggerCount}</TableCell>
                              <TableCell>{rule.falsePositiveCount}</TableCell>
                              <TableCell>
                                <Switch
                                  checked={rule.isActive}
                                  onCheckedChange={(checked) =>
                                    toggleRuleMutation.mutate({ ruleId: rule.id, isActive: checked })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingRule(rule);
                                      setRuleDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* High Risk Users */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-orange-500" />
                        High Risk Users
                      </CardTitle>
                      <CardDescription>Users with elevated risk scores</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {highRiskUsers.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No high risk users</p>
                        ) : (
                          highRiskUsers.map((item: any) => (
                            <div
                              key={item.user.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <div className="font-medium">
                                  {item.user.firstName} {item.user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{item.user.email}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <RiskScoreGauge score={item.riskScore.riskScore} />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm("Block this user?")) {
                                      blockUserMutation.mutate({
                                        userId: item.user.id,
                                        reason: "High risk score",
                                      });
                                    }
                                  }}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Blocked Users */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserX className="h-5 w-5 text-red-500" />
                        Blocked Users
                      </CardTitle>
                      <CardDescription>Users currently blocked from the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {blockedUsers.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No blocked users</p>
                        ) : (
                          blockedUsers.map((item: any) => (
                            <div
                              key={item.user.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <div className="font-medium">
                                  {item.user.firstName} {item.user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{item.user.email}</div>
                                {item.riskScore.blockedReason && (
                                  <div className="text-xs text-red-500 mt-1">
                                    Reason: {item.riskScore.blockedReason}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unblockUserMutation.mutate(item.user.id)}
                              >
                                Unblock
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Alerts by Severity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Alerts by Severity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {['critical', 'high', 'medium', 'low'].map((severity) => {
                          const count = fraudStats?.alertsBySeverity?.[severity] || 0;
                          const total = Object.values(fraudStats?.alertsBySeverity || {}).reduce((a, b) => a + b, 0) || 1;
                          const percentage = (count / total) * 100;

                          return (
                            <div key={severity} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize">{severity}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    severity === 'critical' ? 'bg-red-500' :
                                    severity === 'high' ? 'bg-orange-500' :
                                    severity === 'medium' ? 'bg-yellow-500' :
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Alerts by Type */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Alerts by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(fraudStats?.alertsByType || {}).map(([type, count]) => {
                          const total = Object.values(fraudStats?.alertsByType || {}).reduce((a, b) => a + b, 0) || 1;
                          const percentage = ((count as number) / total) * 100;

                          return (
                            <div key={type} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize">{type}</span>
                                <span className="font-medium">{count as number}</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Trends */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Alert Trends (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 flex items-end justify-between gap-2">
                        {(fraudStats?.recentTrends || []).map((trend, index) => {
                          const maxCount = Math.max(...(fraudStats?.recentTrends || []).map(t => t.count), 1);
                          const height = (trend.count / maxCount) * 100;

                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                              <div
                                className="w-full bg-blue-500 rounded-t transition-all"
                                style={{ height: `${height}%`, minHeight: '4px' }}
                              />
                              <span className="text-xs text-gray-500">
                                {format(new Date(trend.date), "MMM d")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Review Alert Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Fraud Alert</DialogTitle>
            <DialogDescription>
              Review and take action on this fraud alert
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              {/* Alert Details */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Type</span>
                  <Badge variant="outline" className="capitalize">{selectedAlert.alertType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Severity</span>
                  <SeverityBadge severity={selectedAlert.severity} />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Risk Score</span>
                  <RiskScoreGauge score={selectedAlert.riskScore} />
                </div>
                {selectedAlert.user && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">User</span>
                    <span className="text-sm">{selectedAlert.user.email}</span>
                  </div>
                )}
                {selectedAlert.order && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Order</span>
                    <span className="text-sm">#{selectedAlert.order.orderNumber}</span>
                  </div>
                )}
              </div>

              {/* Decision */}
              <div className="space-y-2">
                <Label>Decision</Label>
                <Select value={reviewDecision} onValueChange={(v: any) => setReviewDecision(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dismissed">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-gray-500" />
                        Dismiss (False Positive)
                      </div>
                    </SelectItem>
                    <SelectItem value="confirmed">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-red-500" />
                        Confirm Fraud
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              {reviewDecision === 'confirmed' && (
                <div className="space-y-3 p-3 border rounded-lg">
                  <Label className="text-sm font-medium">Actions to Take</Label>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="blockUser" className="text-sm">Block User</Label>
                    <Switch
                      id="blockUser"
                      checked={reviewBlockUser}
                      onCheckedChange={setReviewBlockUser}
                    />
                  </div>
                  {selectedAlert.orderId && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cancelOrder" className="text-sm">Cancel Order</Label>
                        <Switch
                          id="cancelOrder"
                          checked={reviewCancelOrder}
                          onCheckedChange={setReviewCancelOrder}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="issueRefund" className="text-sm">Issue Refund</Label>
                        <Switch
                          id="issueRefund"
                          checked={reviewIssueRefund}
                          onCheckedChange={setReviewIssueRefund}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this review..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReviewAlert}
              disabled={reviewAlertMutation.isPending}
              variant={reviewDecision === 'confirmed' ? 'destructive' : 'default'}
            >
              {reviewAlertMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
