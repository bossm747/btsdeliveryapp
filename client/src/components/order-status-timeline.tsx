import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Truck, Home, Phone, MessageCircle } from "lucide-react";
import type { OrderStatusStep } from "@/lib/types";

interface OrderStatusTimelineProps {
  orderNumber: string;
  currentStatus: string;
  steps: OrderStatusStep[];
  rider?: {
    name: string;
    phone: string;
    imageUrl?: string;
  };
  estimatedArrival?: string;
  distance?: string;
}

export default function OrderStatusTimeline({
  orderNumber,
  currentStatus,
  steps,
  rider,
  estimatedArrival,
  distance
}: OrderStatusTimelineProps) {
  
  const getStatusIcon = (status: string, isCompleted: boolean, isActive: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="w-5 h-5 text-white" />;
    }
    
    if (isActive) {
      switch (status) {
        case 'in_transit':
          return <Truck className="w-5 h-5 text-white" />;
        default:
          return <Clock className="w-5 h-5 text-white" />;
      }
    }
    
    return <Home className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-success/10 text-success';
      case 'in_transit':
        return 'bg-primary/10 text-primary';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-accent/10 text-accent';
    }
  };

  return (
    <div className="space-y-6" data-testid="order-status-timeline">
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground" data-testid="order-number">
              Order #{orderNumber}
            </h3>
            <Badge className={getStatusBadgeColor(currentStatus)} data-testid="order-status-badge">
              {currentStatus.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.status} className="flex items-center space-x-4" data-testid={`status-step-${index}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.isCompleted 
                    ? 'bg-success' 
                    : step.isActive 
                      ? 'order-status-active animate-pulse' 
                      : 'bg-muted'
                }`}>
                  {getStatusIcon(step.status, step.isCompleted, step.isActive)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground" data-testid={`status-title-${index}`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-muted-foreground" data-testid={`status-description-${index}`}>
                    {step.description}
                  </p>
                  {step.timestamp && (
                    <span className="text-xs text-muted-foreground" data-testid={`status-timestamp-${index}`}>
                      {step.timestamp}
                    </span>
                  )}
                  {step.isActive && estimatedArrival && (
                    <span className="text-xs text-success font-semibold" data-testid="estimated-arrival">
                      ETA: {estimatedArrival}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Rider Contact */}
          {rider && currentStatus === 'in_transit' && (
            <div className="mt-6 p-4 bg-muted rounded-lg" data-testid="rider-contact">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img 
                    src={rider.imageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"} 
                    alt={`${rider.name} - delivery rider`}
                    className="w-12 h-12 rounded-full object-cover"
                    data-testid="rider-image"
                  />
                  <div>
                    <h5 className="font-semibold text-foreground" data-testid="rider-name">
                      {rider.name}
                    </h5>
                    <p className="text-sm text-muted-foreground">Your delivery rider</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="w-10 h-10 p-0 bg-primary text-white hover:bg-primary/90"
                    data-testid="call-rider-button"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="w-10 h-10 p-0 bg-secondary text-white hover:bg-secondary/90"
                    data-testid="message-rider-button"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Tracking Map */}
      {currentStatus === 'in_transit' && (
        <Card data-testid="live-tracking-map">
          <div className="relative h-96 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center rounded-t-lg">
            <div className="text-center">
              <Truck className="h-16 w-16 text-primary mb-4 mx-auto" />
              <h4 className="text-xl font-bold text-foreground mb-2">Live Tracking Map</h4>
              <p className="text-muted-foreground">Real-time location ng inyong rider</p>
            </div>
            
            {/* Mock GPS pins */}
            <div className="absolute top-20 left-16 w-4 h-4 bg-secondary rounded-full animate-pulse"></div>
            <div className="absolute bottom-24 right-20 w-4 h-4 bg-primary rounded-full animate-bounce"></div>
            <div className="absolute top-32 right-32 w-3 h-3 bg-accent rounded-full"></div>
          </div>
          
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">Estimated Arrival</h4>
                <p className="text-2xl font-bold text-primary" data-testid="map-estimated-arrival">
                  {estimatedArrival || "15 minutes"}
                </p>
              </div>
              <div className="text-right">
                <h4 className="font-semibold text-foreground">Distance</h4>
                <p className="text-lg text-muted-foreground" data-testid="map-distance">
                  {distance || "2.3 km away"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
