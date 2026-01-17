/**
 * User Risk Profile Component
 *
 * Displays comprehensive fraud risk information for a user including:
 * - Risk score and level
 * - Risk factors breakdown
 * - Recent alerts
 * - Device fingerprints
 * - Order statistics
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Globe,
  Clock,
  Package,
  XCircle,
  Ban,
  CheckCircle,
  Activity,
  AlertCircle,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface UserRiskProfileProps {
  userId: string;
  onClose?: () => void;
}

interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface DeviceFingerprint {
  id: string;
  fingerprintHash: string;
  deviceInfo: any;
  ipAddress?: string;
  ipInfo?: any;
  isTrusted: boolean;
  trustScore: number;
  firstSeen: string;
  lastSeen: string;
  sessionCount: number;
  orderCount: number;
  isBlocked: boolean;
  isSuspicious: boolean;
}

interface FraudAlert {
  id: string;
  alertType: string;
  severity: string;
  status: string;
  riskScore: number;
  createdAt: string;
  details: any;
}

interface UserRiskData {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    status: string;
    createdAt: string;
  };
  riskScore: {
    id: string;
    userId: string;
    riskScore: number;
    riskLevel: string;
    factors: RiskFactor[];
    flagCount: number;
    confirmedFraudCount: number;
    dismissedAlertCount: number;
    totalOrders: number;
    cancelledOrders: number;
    refundedOrders: number;
    chargebackCount: number;
    failedPaymentCount: number;
    deviceCount: number;
    ipAddressCount: number;
    isBlocked: boolean;
    blockedAt?: string;
    blockedReason?: string;
    lastCalculated: string;
  } | null;
  recentAlerts: FraudAlert[];
  deviceCount: number;
  orderStats: {
    total: number;
    cancelled: number;
    refunded: number;
  };
  devices: DeviceFingerprint[];
}

// Risk level indicator colors
const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-100';
    case 'high': return 'text-orange-600 bg-orange-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'low': return 'text-green-600 bg-green-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getRiskIcon = (level: string) => {
  switch (level) {
    case 'critical': return <ShieldX className="h-6 w-6 text-red-600" />;
    case 'high': return <ShieldAlert className="h-6 w-6 text-orange-600" />;
    case 'medium': return <Shield className="h-6 w-6 text-yellow-600" />;
    case 'low': return <ShieldCheck className="h-6 w-6 text-green-600" />;
    default: return <Shield className="h-6 w-6 text-gray-600" />;
  }
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const variants: Record<string, string> = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <Badge className={variants[severity] || variants.medium}>
      {severity}
    </Badge>
  );
};

export default function UserRiskProfile({ userId, onClose }: UserRiskProfileProps) {
  const { toast } = useToast();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState<string>("");

  // Fetch user risk profile
  const { data, isLoading, error, refetch } = useQuery<{ success: boolean; data: UserRiskData }>({
    queryKey: ["/api/admin/fraud/user", userId, "risk"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/fraud/user/${userId}/risk`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user risk profile");
      return response.json();
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (data: { reason: string; duration?: number }) => {
      const response = await fetch(`/api/admin/fraud/user/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to block user");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User blocked successfully" });
      refetch();
      setBlockDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fraud/blocked-users"] });
    },
    onError: () => {
      toast({ title: "Failed to block user", variant: "destructive" });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/fraud/user/${userId}/unblock`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unblock user");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User unblocked successfully" });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fraud/blocked-users"] });
    },
    onError: () => {
      toast({ title: "Failed to unblock user", variant: "destructive" });
    },
  });

  const handleBlockUser = () => {
    if (!blockReason) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    blockUserMutation.mutate({
      reason: blockReason,
      duration: blockDuration ? parseInt(blockDuration) : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">Failed to load risk profile</p>
        <p className="text-gray-500">Unable to fetch user risk data</p>
        <Button onClick={() => refetch()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const { user, riskScore, recentAlerts, orderStats, devices } = data.data;
  const riskLevel = riskScore?.riskLevel || 'low';
  const riskScoreValue = riskScore?.riskScore || 0;
  const factors = riskScore?.factors || [];
  const isBlocked = riskScore?.isBlocked || false;

  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${getRiskLevelColor(riskLevel)}`}>
            {getRiskIcon(riskLevel)}
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user.firstName} {user.lastName}
            </h2>
            <div className="flex items-center gap-2 text-gray-500">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2 text-gray-500">
                <Phone className="h-4 w-4" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isBlocked ? (
            <Button
              variant="outline"
              onClick={() => unblockUserMutation.mutate()}
              disabled={unblockUserMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Unblock User
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setBlockDialogOpen(true)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Block User
            </Button>
          )}
        </div>
      </div>

      {/* Blocked Status Banner */}
      {isBlocked && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <ShieldX className="h-5 w-5" />
            <span className="font-medium">User is currently blocked</span>
          </div>
          {riskScore?.blockedReason && (
            <p className="mt-1 text-sm text-red-600">Reason: {riskScore.blockedReason}</p>
          )}
          {riskScore?.blockedAt && (
            <p className="text-sm text-red-500">
              Blocked on: {format(new Date(riskScore.blockedAt), "PPp")}
            </p>
          )}
        </div>
      )}

      {/* Risk Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Risk Assessment</span>
            <Badge className={getRiskLevelColor(riskLevel)}>
              {riskLevel.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">Risk Score</span>
                <span className="font-bold text-lg">{riskScoreValue}/100</span>
              </div>
              <Progress value={riskScoreValue} className="h-3" />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 pt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{riskScore?.flagCount || 0}</div>
              <div className="text-xs text-gray-500">Times Flagged</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{riskScore?.confirmedFraudCount || 0}</div>
              <div className="text-xs text-gray-500">Confirmed Fraud</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{riskScore?.dismissedAlertCount || 0}</div>
              <div className="text-xs text-gray-500">False Positives</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{riskScore?.failedPaymentCount || 0}</div>
              <div className="text-xs text-gray-500">Failed Payments</div>
            </div>
          </div>

          {/* Last Calculated */}
          {riskScore?.lastCalculated && (
            <p className="text-xs text-gray-400 text-right">
              Last calculated: {format(new Date(riskScore.lastCalculated), "PPp")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Risk Factors */}
      {factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Factors</CardTitle>
            <CardDescription>Breakdown of contributing risk factors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {factors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {factor.name.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-gray-500">{factor.description}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={factor.score >= 20 ? "destructive" : factor.score >= 10 ? "secondary" : "outline"}>
                      +{factor.score}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{orderStats.total}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{orderStats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
              <div className="text-xs text-gray-400">
                {orderStats.total > 0 ? ((orderStats.cancelled / orderStats.total) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{orderStats.refunded}</div>
              <div className="text-sm text-gray-600">Refunded</div>
              <div className="text-xs text-gray-400">
                {orderStats.total > 0 ? ((orderStats.refunded / orderStats.total) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Alerts
          </CardTitle>
          <CardDescription>Last 10 fraud alerts for this user</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAlerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent alerts</p>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={alert.severity} />
                    <div>
                      <div className="font-medium capitalize">{alert.alertType}</div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(alert.createdAt), "PPp")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        alert.status === 'confirmed' ? 'destructive' :
                        alert.status === 'dismissed' ? 'secondary' :
                        'outline'
                      }
                    >
                      {alert.status}
                    </Badge>
                    <span className="text-sm font-medium">Score: {alert.riskScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Fingerprints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Known Devices ({devices.length})
          </CardTitle>
          <CardDescription>Devices associated with this user</CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No devices recorded</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {devices.map((device, index) => (
                <AccordionItem key={device.id} value={device.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-gray-500" />
                      <span className="font-mono text-sm">
                        {device.fingerprintHash.substring(0, 16)}...
                      </span>
                      <div className="flex gap-2">
                        {device.isTrusted && (
                          <Badge variant="outline" className="text-green-600">Trusted</Badge>
                        )}
                        {device.isSuspicious && (
                          <Badge variant="destructive">Suspicious</Badge>
                        )}
                        {device.isBlocked && (
                          <Badge variant="destructive">Blocked</Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">First Seen:</span>
                          <span className="ml-2">
                            {format(new Date(device.firstSeen), "PPp")}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Seen:</span>
                          <span className="ml-2">
                            {format(new Date(device.lastSeen), "PPp")}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Sessions:</span>
                          <span className="ml-2 font-medium">{device.sessionCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Orders:</span>
                          <span className="ml-2 font-medium">{device.orderCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Trust Score:</span>
                          <span className="ml-2 font-medium">{device.trustScore}/100</span>
                        </div>
                        {device.ipAddress && (
                          <div>
                            <span className="text-gray-500">IP Address:</span>
                            <span className="ml-2 font-mono">{device.ipAddress}</span>
                          </div>
                        )}
                      </div>
                      {device.ipInfo && (
                        <div className="pt-2 border-t">
                          <div className="text-sm">
                            <span className="text-gray-500">Location:</span>
                            <span className="ml-2">
                              {device.ipInfo.city}, {device.ipInfo.country}
                            </span>
                          </div>
                          {(device.ipInfo.isVpn || device.ipInfo.isProxy) && (
                            <div className="flex gap-2 mt-2">
                              {device.ipInfo.isVpn && (
                                <Badge variant="destructive">VPN Detected</Badge>
                              )}
                              {device.ipInfo.isProxy && (
                                <Badge variant="destructive">Proxy Detected</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Account Status:</span>
              <Badge className="ml-2" variant={user.status === 'active' ? 'default' : 'destructive'}>
                {user.status}
              </Badge>
            </div>
            <div>
              <span className="text-gray-500">Member Since:</span>
              <span className="ml-2">{format(new Date(user.createdAt), "PP")}</span>
            </div>
            <div>
              <span className="text-gray-500">Devices Used:</span>
              <span className="ml-2 font-medium">{riskScore?.deviceCount || devices.length}</span>
            </div>
            <div>
              <span className="text-gray-500">IP Addresses:</span>
              <span className="ml-2 font-medium">{riskScore?.ipAddressCount || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block User Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              This will prevent the user from placing orders and accessing the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for blocking *</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for blocking this user..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Block Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Leave empty for permanent block"
                value={blockDuration}
                onChange={(e) => setBlockDuration(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Leave empty for a permanent block, or enter hours for a temporary block.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockUser}
              disabled={blockUserMutation.isPending || !blockReason}
            >
              {blockUserMutation.isPending ? "Blocking..." : "Block User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
