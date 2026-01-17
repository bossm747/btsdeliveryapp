import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  HeadphonesIcon, Search, MessageSquare, CheckCircle, Clock,
  AlertCircle, ChevronUp, ChevronDown, Send, Plus, User,
  AlertTriangle, Zap, ArrowUpRight, Tag, Calendar, UserCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types
interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "vendor" | "rider" | "admin";
  senderAvatar?: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_response" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: "order_issue" | "payment" | "account" | "delivery" | "vendor" | "technical" | "other";
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerRole: "customer" | "vendor" | "rider";
  assignedTo?: string;
  assignedToName?: string;
  orderId?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

type SortField = "ticketNumber" | "createdAt" | "priority" | "status";
type SortDirection = "asc" | "desc";

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const STATUS_COLORS = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_response: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const CATEGORY_LABELS = {
  order_issue: "Order Issue",
  payment: "Payment",
  account: "Account",
  delivery: "Delivery",
  vendor: "Vendor",
  technical: "Technical",
  other: "Other",
};

export default function SupportTickets() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Dialog states
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    priority: "medium" as const,
    category: "other" as const,
    customerId: "",
    customerName: "",
    customerEmail: "",
  });

  // Fetch tickets
  const { data: tickets = [], isLoading, isError, refetch } = useQuery<SupportTicket[]>({
    queryKey: ["/api/admin/support-tickets"],
  });

  // Fetch stats
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/support-tickets/stats"],
  });

  // Fetch admin users for assignment
  const { data: adminUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users/admins"],
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: typeof newTicket) => {
      const response = await apiRequest("POST", "/api/admin/support-tickets", ticketData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets/stats"] });
      toast({
        title: "Ticket Created",
        description: "The support ticket has been created successfully.",
      });
      setCreateTicketOpen(false);
      setNewTicket({
        subject: "",
        description: "",
        priority: "medium",
        category: "other",
        customerId: "",
        customerName: "",
        customerEmail: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async ({ ticketId, content, isInternal }: { ticketId: string; content: string; isInternal: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/support-tickets/${ticketId}/messages`, {
        content,
        isInternal,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      setNewMessage("");
      setIsInternalNote(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/support-tickets/${ticketId}/status`, { status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets/stats"] });
      toast({
        title: "Status Updated",
        description: `Ticket status changed to ${variables.status.replace("_", " ")}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Assign ticket mutation
  const assignTicketMutation = useMutation({
    mutationFn: async ({ ticketId, adminId }: { ticketId: string; adminId: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/support-tickets/${ticketId}/assign`, { adminId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      toast({
        title: "Ticket Assigned",
        description: "The ticket has been assigned successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign ticket",
        variant: "destructive",
      });
    },
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ ticketId, priority }: { ticketId: string; priority: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/support-tickets/${ticketId}/priority`, { priority });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      toast({
        title: "Priority Updated",
        description: "The ticket priority has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update priority",
        variant: "destructive",
      });
    },
  });

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== "all") {
      result = result.filter((t) => t.priority === filterPriority);
    }

    // Filter by category
    if (filterCategory !== "all") {
      result = result.filter((t) => t.category === filterCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(term) ||
          t.subject.toLowerCase().includes(term) ||
          t.customerName.toLowerCase().includes(term) ||
          t.customerEmail.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (sortField === "createdAt") {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      if (sortField === "priority") {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aVal = priorityOrder[a.priority];
        bVal = priorityOrder[b.priority];
      }

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return result;
  }, [tickets, filterStatus, filterPriority, filterCategory, searchTerm, sortField, sortDirection]);

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

  // Scroll to bottom of messages when ticket changes
  useEffect(() => {
    if (selectedTicket && detailsOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket, detailsOpen]);

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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Zap className="h-3 w-3" />;
      case "high":
        return <AlertTriangle className="h-3 w-3" />;
      case "medium":
        return <ArrowUpRight className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-3 w-3" />;
      case "in_progress":
        return <Clock className="h-3 w-3" />;
      case "waiting_response":
        return <MessageSquare className="h-3 w-3" />;
      case "resolved":
      case "closed":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
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

  const formatRelativeTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleSendMessage = () => {
    if (selectedTicket && newMessage.trim()) {
      addMessageMutation.mutate({
        ticketId: selectedTicket.id,
        content: newMessage.trim(),
        isInternal: isInternalNote,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-support-tickets">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="support"
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
          title="Support Tickets"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Open</p>
                      <p className="text-3xl font-bold">{(stats as any)?.openCount || tickets.filter(t => t.status === 'open').length}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">In Progress</p>
                      <p className="text-3xl font-bold">{(stats as any)?.inProgressCount || tickets.filter(t => t.status === 'in_progress').length}</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Urgent</p>
                      <p className="text-3xl font-bold">{(stats as any)?.urgentCount || tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length}</p>
                    </div>
                    <Zap className="h-8 w-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Resolved Today</p>
                      <p className="text-3xl font-bold">{(stats as any)?.resolvedToday || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Avg Response</p>
                      <p className="text-3xl font-bold">{(stats as any)?.avgResponseTime || "2h"}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>All Tickets</CardTitle>
                    <CardDescription>Manage and respond to customer support requests</CardDescription>
                  </div>
                  <Button onClick={() => setCreateTicketOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_response">Waiting Response</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("ticketNumber")}
                        >
                          Ticket # <SortIcon field="ticketNumber" />
                        </TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("priority")}
                        >
                          Priority <SortIcon field="priority" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("status")}
                        >
                          Status <SortIcon field="status" />
                        </TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("createdAt")}
                        >
                          Created <SortIcon field="createdAt" />
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mr-2" />
                              Loading tickets...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : isError ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="flex flex-col items-center text-red-600">
                              <AlertCircle className="h-8 w-8 mb-2" />
                              <p>Error loading tickets</p>
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                                Try Again
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredTickets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            <HeadphonesIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No support tickets found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTickets.map((ticket) => (
                          <TableRow key={ticket.id} className="cursor-pointer hover:bg-gray-50" onClick={() => {
                            setSelectedTicket(ticket);
                            setDetailsOpen(true);
                          }}>
                            <TableCell className="font-mono text-sm">{ticket.ticketNumber}</TableCell>
                            <TableCell className="max-w-[200px] truncate font-medium">{ticket.subject}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{ticket.customerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-sm">
                                  <p className="font-medium">{ticket.customerName}</p>
                                  <p className="text-xs text-gray-500 capitalize">{ticket.customerRole}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                <Tag className="h-3 w-3 mr-1" />
                                {CATEGORY_LABELS[ticket.category]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={PRIORITY_COLORS[ticket.priority]}>
                                {getPriorityIcon(ticket.priority)}
                                <span className="ml-1 capitalize">{ticket.priority}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[ticket.status]}>
                                {getStatusIcon(ticket.status)}
                                <span className="ml-1 capitalize">{ticket.status.replace("_", " ")}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ticket.assignedToName ? (
                                <div className="flex items-center gap-1">
                                  <UserCircle className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">{ticket.assignedToName}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatRelativeTime(ticket.createdAt)}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setDetailsOpen(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                View
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
      </div>

      {/* Ticket Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <HeadphonesIcon className="h-5 w-5" />
                  {selectedTicket?.ticketNumber}
                </DialogTitle>
                <DialogDescription>{selectedTicket?.subject}</DialogDescription>
              </div>
              {selectedTicket && (
                <div className="flex items-center gap-2">
                  <Badge className={PRIORITY_COLORS[selectedTicket.priority]}>
                    {getPriorityIcon(selectedTicket.priority)}
                    <span className="ml-1 capitalize">{selectedTicket.priority}</span>
                  </Badge>
                  <Badge className={STATUS_COLORS[selectedTicket.status]}>
                    {getStatusIcon(selectedTicket.status)}
                    <span className="ml-1 capitalize">{selectedTicket.status.replace("_", " ")}</span>
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedTicket && (
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="conversation" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="conversation">Conversation</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>

                <TabsContent value="conversation" className="flex-1 overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1 pr-4 max-h-[400px]">
                    <div className="space-y-4 py-4">
                      {/* Initial ticket message */}
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{selectedTicket.customerName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{selectedTicket.customerName}</span>
                            <Badge variant="outline" className="text-xs capitalize">{selectedTicket.customerRole}</Badge>
                            <span className="text-xs text-gray-500">{formatDate(selectedTicket.createdAt)}</span>
                          </div>
                          <div className="bg-gray-100 rounded-lg p-3 text-sm">
                            {selectedTicket.description}
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      {selectedTicket.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.senderRole === 'admin' ? 'flex-row-reverse' : ''}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.senderAvatar} />
                            <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className={`flex-1 ${message.senderRole === 'admin' ? 'text-right' : ''}`}>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-sm">{message.senderName}</span>
                              {message.isInternal && (
                                <Badge variant="secondary" className="text-xs">Internal Note</Badge>
                              )}
                              <span className="text-xs text-gray-500">{formatDate(message.createdAt)}</span>
                            </div>
                            <div className={`rounded-lg p-3 text-sm inline-block max-w-[80%] ${
                              message.senderRole === 'admin'
                                ? message.isInternal
                                  ? 'bg-yellow-100 text-yellow-900'
                                  : 'bg-blue-500 text-white'
                                : 'bg-gray-100'
                            }`}>
                              {message.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  {selectedTicket.status !== 'closed' && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="internalNote"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="internalNote" className="text-sm text-gray-600">
                          Internal note (not visible to customer)
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type your response..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1"
                          rows={2}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || addMessageMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500">Customer</Label>
                      <p className="font-medium">{selectedTicket.customerName}</p>
                      <p className="text-sm text-gray-500">{selectedTicket.customerEmail}</p>
                      {selectedTicket.customerPhone && (
                        <p className="text-sm text-gray-500">{selectedTicket.customerPhone}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-500">Category</Label>
                      <p className="font-medium">{CATEGORY_LABELS[selectedTicket.category]}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Created</Label>
                      <p className="font-medium">{formatDate(selectedTicket.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Last Updated</Label>
                      <p className="font-medium">{formatDate(selectedTicket.updatedAt)}</p>
                    </div>
                    {selectedTicket.orderId && (
                      <div>
                        <Label className="text-gray-500">Related Order</Label>
                        <p className="font-medium font-mono">{selectedTicket.orderId}</p>
                      </div>
                    )}
                    {selectedTicket.resolvedAt && (
                      <div>
                        <Label className="text-gray-500">Resolved</Label>
                        <p className="font-medium">{formatDate(selectedTicket.resolvedAt)}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(value) => updateStatusMutation.mutate({
                          ticketId: selectedTicket.id,
                          status: value,
                        })}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="waiting_response">Waiting Response</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={selectedTicket.priority}
                        onValueChange={(value) => updatePriorityMutation.mutate({
                          ticketId: selectedTicket.id,
                          priority: value,
                        })}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Assign To</Label>
                      <Select
                        value={selectedTicket.assignedTo || ""}
                        onValueChange={(value) => assignTicketMutation.mutate({
                          ticketId: selectedTicket.id,
                          adminId: value,
                        })}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Select admin" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminUsers.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id}>
                              {admin.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={createTicketOpen} onOpenChange={setCreateTicketOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a new support ticket on behalf of a customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={newTicket.customerName}
                  onChange={(e) => setNewTicket({ ...newTicket, customerName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={newTicket.customerEmail}
                  onChange={(e) => setNewTicket({ ...newTicket, customerEmail: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <Label>Subject</Label>
              <Input
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Detailed description of the issue..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value: any) => setNewTicket({ ...newTicket, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value: any) => setNewTicket({ ...newTicket, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTicketOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTicketMutation.mutate(newTicket)}
              disabled={
                !newTicket.subject.trim() ||
                !newTicket.description.trim() ||
                !newTicket.customerName.trim() ||
                !newTicket.customerEmail.trim() ||
                createTicketMutation.isPending
              }
            >
              {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
