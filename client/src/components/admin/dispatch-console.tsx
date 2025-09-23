import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Clock, User, Truck, AlertTriangle, CheckCircle, 
  XCircle, RotateCcw, Phone, MessageSquare, Navigation
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LiveOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  restaurantName: string;
  status: string;
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  deliveryAddress: any;
  totalAmount: string;
  priority: number;
  createdAt: string;
  slaBreach: boolean;
  lastUpdate: string;
}

interface LiveRider {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  isOnline: boolean;
  currentLocation: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  };
  activeOrdersCount: number;
  maxActiveOrders: number;
  status: 'available' | 'busy' | 'offline';
  lastActivity: string;
  rating: number;
  todayDeliveries: number;
}

interface SystemAlert {
  id: string;
  type: 'sla_breach' | 'rider_offline' | 'high_demand' | 'payment_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  affectedOrders?: string[];
  affectedRiders?: string[];
}

export default function DispatchConsole() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'orders' | 'riders' | 'alerts'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);

  // Fetch live orders
  const { data: liveOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['/api/admin/dispatch/orders'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch live riders
  const { data: liveRiders = [], refetch: refetchRiders } = useQuery({
    queryKey: ['/api/admin/dispatch/riders'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch system alerts
  const { data: systemAlerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/admin/dispatch/alerts'],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const handleAssignRider = async (orderId: string, riderId: string) => {
    try {
      await apiRequest("POST", `/api/admin/dispatch/assign`, {
        orderId,
        riderId
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dispatch/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dispatch/riders'] });
      
      toast({
        title: "Rider assigned",
        description: "The order has been assigned to the rider",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign rider",
        variant: "destructive",
      });
    }
  };

  const handleReassignOrder = async (orderId: string) => {
    try {
      await apiRequest("POST", `/api/admin/dispatch/reassign`, { orderId });
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dispatch/orders'] });
      
      toast({
        title: "Order reassigned",
        description: "The order has been put back in the assignment queue",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to reassign order",
        variant: "destructive",
      });
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/dispatch/alerts/${alertId}/acknowledge`);
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dispatch/alerts'] });
      
      toast({
        title: "Alert acknowledged",
        description: "The alert has been marked as acknowledged",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert", 
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-orange-500';
      case 'ready': return 'bg-purple-500';
      case 'picked_up': return 'bg-indigo-500';
      case 'in_transit': return 'bg-cyan-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6" data-testid="dispatch-console">
      {/* Header with Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="metric-active-orders">
              {liveOrders.filter((o: LiveOrder) => !['delivered', 'cancelled'].includes(o.status)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Online Riders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="metric-online-riders">
              {liveRiders.filter((r: LiveRider) => r.isOnline).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">SLA Breaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="metric-sla-breaches">
              {liveOrders.filter((o: LiveOrder) => o.slaBreach).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Unassigned Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="metric-unassigned">
              {liveOrders.filter((o: LiveOrder) => !o.riderId && o.status === 'confirmed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="metric-critical-alerts">
              {systemAlerts.filter((a: SystemAlert) => a.severity === 'critical' && !a.acknowledged).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={selectedTab === 'orders' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('orders')}
          className="flex-1"
          data-testid="tab-orders"
        >
          <Truck className="w-4 h-4 mr-2" />
          Live Orders ({liveOrders.length})
        </Button>
        <Button
          variant={selectedTab === 'riders' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('riders')}
          className="flex-1"
          data-testid="tab-riders"
        >
          <User className="w-4 h-4 mr-2" />
          Live Riders ({liveRiders.length})
        </Button>
        <Button
          variant={selectedTab === 'alerts' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('alerts')}
          className="flex-1"
          data-testid="tab-alerts"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          System Alerts ({systemAlerts.length})
        </Button>
      </div>

      {/* Orders Tab */}
      {selectedTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Live Order Tracking
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchOrders()}
                data-testid="button-refresh-orders"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Real-time order monitoring and assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveOrders.map((order: LiveOrder) => (
                  <TableRow key={order.id} className={order.slaBreach ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                      {order.slaBreach && (
                        <AlertTriangle className="w-4 h-4 text-red-500 inline ml-2" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-gray-600">{order.customerPhone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{order.restaurantName}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(order.status)} text-white`}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.riderName ? (
                        <div>
                          <div className="font-medium">{order.riderName}</div>
                          <div className="text-sm text-gray-600">{order.riderPhone}</div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {order.estimatedDeliveryTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.priority > 2 ? "destructive" : "secondary"}>
                        P{order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {!order.riderId && order.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order.id)}
                            data-testid={`button-assign-${order.id}`}
                          >
                            Assign
                          </Button>
                        )}
                        {order.riderId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReassignOrder(order.id)}
                            data-testid={`button-reassign-${order.id}`}
                          >
                            Reassign
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-contact-customer-${order.id}`}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Riders Tab */}
      {selectedTab === 'riders' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Live Rider Tracking
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchRiders()}
                data-testid="button-refresh-riders"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Real-time rider monitoring and management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Active Orders</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Today's Deliveries</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveRiders.map((rider: LiveRider) => (
                  <TableRow key={rider.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rider.name}</div>
                        <div className="text-sm text-gray-600">{rider.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={rider.isOnline ? "default" : "secondary"}
                        className={rider.isOnline ? "bg-green-500" : ""}
                      >
                        {rider.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </TableCell>
                    <TableCell>{rider.vehicleType}</TableCell>
                    <TableCell>
                      {rider.activeOrdersCount} / {rider.maxActiveOrders}
                    </TableCell>
                    <TableCell>
                      {rider.currentLocation ? (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="text-sm">
                            {rider.currentLocation.lat.toFixed(4)}, {rider.currentLocation.lng.toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">No location</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        ⭐ {rider.rating.toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell>{rider.todayDeliveries}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-contact-rider-${rider.id}`}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-track-rider-${rider.id}`}
                        >
                          <Navigation className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Alerts Tab */}
      {selectedTab === 'alerts' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              System Alerts
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAlerts()}
                data-testid="button-refresh-alerts"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Platform-wide alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemAlerts.map((alert: SystemAlert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${alert.acknowledged ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-medium">{alert.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {!alert.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          data-testid={`button-acknowledge-${alert.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}