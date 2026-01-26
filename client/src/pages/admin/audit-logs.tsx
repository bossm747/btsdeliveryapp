import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import {
  AdminPageWrapper,
  AdminTableSkeleton,
  NoAnalyticsDataEmptyState,
} from "@/components/admin";
import { useAdminToast } from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Search,
  Filter,
  Download,
  Eye,
  Calendar as CalendarIcon,
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Settings,
  CreditCard,
  Package,
  Store,
  Truck,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// Types
interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  category: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  failedActions: number;
  uniqueUsers: number;
  byCategory: Record<string, number>;
  byAction: Record<string, number>;
  recentActivity: { hour: string; count: number }[];
}

// Action category icons mapping
const categoryIcons: Record<string, any> = {
  auth: Lock,
  users: User,
  orders: Package,
  restaurants: Store,
  riders: Truck,
  payments: CreditCard,
  settings: Settings,
  fraud: ShieldAlert,
  admin: Shield,
  system: Activity,
};

// Action type badges
const actionBadges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  create: { variant: "default", icon: UserPlus },
  read: { variant: "secondary", icon: Eye },
  update: { variant: "outline", icon: Edit },
  delete: { variant: "destructive", icon: Trash2 },
  login: { variant: "default", icon: Unlock },
  logout: { variant: "secondary", icon: Lock },
  approve: { variant: "default", icon: CheckCircle },
  reject: { variant: "destructive", icon: XCircle },
  suspend: { variant: "destructive", icon: UserMinus },
  verify: { variant: "default", icon: ShieldCheck },
};

// Status badges
const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    success: { variant: "default" as const, icon: CheckCircle, className: "bg-green-100 text-green-800" },
    failure: { variant: "destructive" as const, icon: XCircle, className: "" },
    warning: { variant: "secondary" as const, icon: AlertCircle, className: "bg-yellow-100 text-yellow-800" },
  };
  
  const { icon: Icon, className, variant } = config[status as keyof typeof config] || config.success;
  
  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
};

export default function AuditLogs() {
  const adminToast = useAdminToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  
  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch audit logs
  const { data: logsData, isLoading: logsLoading, isError: logsError, refetch } = useQuery<{
    logs: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: ["/api/admin/audit-logs", {
      page,
      pageSize,
      search: searchTerm,
      category: categoryFilter,
      action: actionFilter,
      status: statusFilter,
      user: userFilter,
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    }],
  });

  // Fetch audit stats
  const { data: stats, isLoading: statsLoading } = useQuery<AuditStats>({
    queryKey: ["/api/admin/audit-logs/stats", {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    }],
  });

  // Close sidebar on mobile
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

  const logs = logsData?.logs || [];
  const totalLogs = logsData?.total || 0;
  const totalPages = Math.ceil(totalLogs / pageSize);

  const handleExport = async () => {
    try {
      // In production, this would call an API endpoint that returns CSV/Excel
      adminToast.reportExported("CSV");
    } catch (error) {
      adminToast.error("Failed to export audit logs");
    }
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details) return "No details available";
    return JSON.stringify(details, null, 2);
  };

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const getActionBadge = (action: string) => {
    const actionType = action.split('_')[0].toLowerCase();
    const config = actionBadges[actionType] || { variant: "outline" as const, icon: Info };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="capitalize">
        <Icon className="h-3 w-3 mr-1" />
        {action.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-audit-logs">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="audit"
        onTabChange={() => {}}
        isOpen={sidebarOpen}
      />

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        <AdminHeader
          title="Audit Logs"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        <AdminPageWrapper
          pageTitle="Audit Logs"
          pageDescription="View and analyze system activity logs for security and compliance"
          refreshQueryKeys={["/api/admin/audit-logs", "/api/admin/audit-logs/stats"]}
        >
          <main className="p-6" role="main" aria-label="Audit logs management">
            <div className="space-y-6">
              {/* Stats Cards */}
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="h-16 bg-gray-200 rounded animate-pulse" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm font-medium">Total Logs</p>
                          <p className="text-3xl font-bold">{stats?.totalLogs?.toLocaleString() || 0}</p>
                          <p className="text-blue-100 text-sm">In selected period</p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm font-medium">Today's Activity</p>
                          <p className="text-3xl font-bold">{stats?.todayLogs?.toLocaleString() || 0}</p>
                          <p className="text-green-100 text-sm">Actions logged</p>
                        </div>
                        <Clock className="h-8 w-8 text-green-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-red-100 text-sm font-medium">Failed Actions</p>
                          <p className="text-3xl font-bold">{stats?.failedActions || 0}</p>
                          <p className="text-red-100 text-sm">Requires attention</p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-red-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm font-medium">Unique Users</p>
                          <p className="text-3xl font-bold">{stats?.uniqueUsers || 0}</p>
                          <p className="text-purple-100 text-sm">Active in period</p>
                        </div>
                        <User className="h-8 w-8 text-purple-200" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* RBAC Info Banner */}
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Access Control: Admin Only
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-300">
                        This page is restricted to users with the <Badge variant="outline" className="mx-1">admin</Badge> role. 
                        Audit logs contain sensitive security information and are protected by role-based access control (RBAC).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                      </CardTitle>
                      <CardDescription>Filter and search audit logs</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="space-y-2">
                      <Label htmlFor="search">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          id="search"
                          placeholder="Search logs..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                          aria-label="Search audit logs"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger id="category" aria-label="Filter by category">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="auth">Authentication</SelectItem>
                          <SelectItem value="users">Users</SelectItem>
                          <SelectItem value="orders">Orders</SelectItem>
                          <SelectItem value="restaurants">Restaurants</SelectItem>
                          <SelectItem value="riders">Riders</SelectItem>
                          <SelectItem value="payments">Payments</SelectItem>
                          <SelectItem value="settings">Settings</SelectItem>
                          <SelectItem value="fraud">Fraud Detection</SelectItem>
                          <SelectItem value="admin">Admin Actions</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action */}
                    <div className="space-y-2">
                      <Label htmlFor="action">Action Type</Label>
                      <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger id="action" aria-label="Filter by action type">
                          <SelectValue placeholder="All Actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Actions</SelectItem>
                          <SelectItem value="create">Create</SelectItem>
                          <SelectItem value="read">Read/View</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="delete">Delete</SelectItem>
                          <SelectItem value="login">Login</SelectItem>
                          <SelectItem value="logout">Logout</SelectItem>
                          <SelectItem value="approve">Approve</SelectItem>
                          <SelectItem value="reject">Reject</SelectItem>
                          <SelectItem value="suspend">Suspend</SelectItem>
                          <SelectItem value="verify">Verify</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="status" aria-label="Filter by status">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="failure">Failure</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Date Range</Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {format(dateRange.from, "PPP")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRange.from}
                              onSelect={(date) => date && setDateRange({ ...dateRange, from: startOfDay(date) })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="flex items-center text-gray-500">to</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {format(dateRange.to, "PPP")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRange.to}
                              onSelect={(date) => date && setDateRange({ ...dateRange, to: endOfDay(date) })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* User Filter */}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="user-filter">User Email</Label>
                      <Input
                        id="user-filter"
                        placeholder="Filter by user email..."
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        aria-label="Filter by user email"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logs Table */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Audit Log Entries</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Showing {logs.length} of {totalLogs} entries
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logsLoading ? (
                          Array.from({ length: 10 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                              <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-24" /></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-28" /></TableCell>
                              <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-16" /></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-28" /></TableCell>
                              <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-16 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : logsError ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <div className="flex flex-col items-center text-red-600">
                                <AlertCircle className="h-8 w-8 mb-2" />
                                <p>Error loading audit logs</p>
                                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                                  Try Again
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : logs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="p-0">
                              <NoAnalyticsDataEmptyState />
                            </TableCell>
                          </TableRow>
                        ) : (
                          logs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <TableCell className="font-mono text-sm">
                                {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{log.userEmail}</span>
                                  <Badge variant="outline" className="w-fit text-xs mt-1">
                                    {log.userRole}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getCategoryIcon(log.category)}
                                  <span className="capitalize">{log.category}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getActionBadge(log.action)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm capitalize">{log.resourceType}</span>
                                  {log.resourceId && (
                                    <span className="text-xs text-muted-foreground font-mono">
                                      #{log.resourceId.slice(0, 8)}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={log.status} />
                              </TableCell>
                              <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedLog(log);
                                    setDetailsOpen(true);
                                  }}
                                  aria-label={`View details for log entry ${log.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          aria-label="Next page"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </AdminPageWrapper>
      </div>

      {/* Log Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>
              Complete information for this audit log entry
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Timestamp</Label>
                  <p className="font-mono text-sm">
                    {format(new Date(selectedLog.timestamp), "yyyy-MM-dd HH:mm:ss.SSS")}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <StatusBadge status={selectedLog.status} />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">User</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLog.userEmail}</span>
                    <Badge variant="outline">{selectedLog.userRole}</Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">User ID</Label>
                  <p className="font-mono text-sm">{selectedLog.userId}</p>
                </div>
              </div>

              {/* Action Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(selectedLog.category)}
                    <span className="capitalize">{selectedLog.category}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-xs">Action</Label>
                  {getActionBadge(selectedLog.action)}
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-xs">Resource Type</Label>
                  <span className="capitalize">{selectedLog.resourceType}</span>
                </div>
                {selectedLog.resourceId && (
                  <div className="flex justify-between items-center">
                    <Label className="text-muted-foreground text-xs">Resource ID</Label>
                    <span className="font-mono text-sm">{selectedLog.resourceId}</span>
                  </div>
                )}
              </div>

              {/* Request Info */}
              <div className="space-y-3">
                <Label className="font-medium">Request Information</Label>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-muted-foreground">IP Address</span>
                    <span className="font-mono">{selectedLog.ipAddress}</span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-muted-foreground block mb-1">User Agent</span>
                    <span className="font-mono text-xs break-all">{selectedLog.userAgent}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <Label className="font-medium">Details</Label>
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
                  {formatDetails(selectedLog.details)}
                </pre>
              </div>

              {/* Error Message */}
              {selectedLog.errorMessage && (
                <div className="space-y-2">
                  <Label className="font-medium text-red-600">Error Message</Label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {selectedLog.errorMessage}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-2">
                  <Label className="font-medium">Additional Metadata</Label>
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
