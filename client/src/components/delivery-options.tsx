import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Hand,
  DoorOpen,
  PersonStanding,
  Info,
  Camera
} from "lucide-react";
import { DELIVERY_TYPES, type DeliveryType } from "@shared/schema";

interface DeliveryOptionsProps {
  value: DeliveryType;
  onChange: (type: DeliveryType) => void;
  contactlessInstructions: string;
  onContactlessInstructionsChange: (instructions: string) => void;
  className?: string;
}

interface DeliveryOption {
  value: DeliveryType;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const deliveryOptions: DeliveryOption[] = [
  {
    value: DELIVERY_TYPES.HAND_TO_CUSTOMER,
    label: "Hand it to me",
    description: "Rider will hand the order directly to you",
    icon: <Hand className="h-5 w-5" />,
  },
  {
    value: DELIVERY_TYPES.LEAVE_AT_DOOR,
    label: "Leave at door",
    description: "Rider will leave the order at your door and take a photo",
    icon: <DoorOpen className="h-5 w-5" />,
    badge: "Contactless",
    badgeVariant: "secondary",
  },
  {
    value: DELIVERY_TYPES.MEET_OUTSIDE,
    label: "Meet outside",
    description: "Meet the rider outside your building or gate",
    icon: <PersonStanding className="h-5 w-5" />,
  },
];

export function DeliveryOptions({
  value,
  onChange,
  contactlessInstructions,
  onContactlessInstructionsChange,
  className = "",
}: DeliveryOptionsProps) {
  const [showInstructions, setShowInstructions] = useState(
    value === DELIVERY_TYPES.LEAVE_AT_DOOR
  );

  useEffect(() => {
    setShowInstructions(value === DELIVERY_TYPES.LEAVE_AT_DOOR);
  }, [value]);

  return (
    <Card className={className} data-testid="delivery-options-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" />
          Delivery Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={value}
          onValueChange={(val) => onChange(val as DeliveryType)}
          className="space-y-3"
          data-testid="delivery-type-radio-group"
        >
          {deliveryOptions.map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                value === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
              onClick={() => onChange(option.value)}
              data-testid={`delivery-option-${option.value}`}
            >
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-md ${
                      value === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {option.icon}
                  </div>
                  <Label
                    htmlFor={option.value}
                    className="font-medium cursor-pointer"
                  >
                    {option.label}
                  </Label>
                  {option.badge && (
                    <Badge variant={option.badgeVariant || "secondary"} className="text-xs">
                      {option.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground pl-9">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {/* Contactless Instructions for Leave at Door */}
        {showInstructions && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <Alert className="border-blue-200 bg-blue-50">
              <Camera className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                The rider will take a photo of your order at the delivery location as proof of delivery.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="contactless-instructions" className="text-sm font-medium">
                Drop-off instructions (optional)
              </Label>
              <Textarea
                id="contactless-instructions"
                placeholder="E.g., Leave by the gate, Place on the porch, Ring doorbell and leave..."
                value={contactlessInstructions}
                onChange={(e) => onContactlessInstructionsChange(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={200}
                data-testid="contactless-instructions-input"
              />
              <p className="text-xs text-muted-foreground text-right">
                {contactlessInstructions.length}/200 characters
              </p>
            </div>
          </div>
        )}

        {/* Info Message for Hand to Customer */}
        {value === DELIVERY_TYPES.HAND_TO_CUSTOMER && (
          <Alert className="border-gray-200 bg-gray-50">
            <Info className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-gray-700 text-sm">
              Please be available to receive your order. The rider may contact you upon arrival.
            </AlertDescription>
          </Alert>
        )}

        {/* Info Message for Meet Outside */}
        {value === DELIVERY_TYPES.MEET_OUTSIDE && (
          <Alert className="border-green-200 bg-green-50">
            <PersonStanding className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 text-sm">
              The rider will notify you when they're nearby. Please be ready to meet them outside.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for order summary display
export function DeliveryTypeDisplay({
  deliveryType,
  contactlessInstructions,
  deliveryProofPhoto,
  className = "",
}: {
  deliveryType: DeliveryType;
  contactlessInstructions?: string | null;
  deliveryProofPhoto?: string | null;
  className?: string;
}) {
  const option = deliveryOptions.find((opt) => opt.value === deliveryType);

  if (!option) return null;

  return (
    <div className={`space-y-3 ${className}`} data-testid="delivery-type-display">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
          {option.icon}
        </div>
        <div>
          <p className="font-medium text-sm">{option.label}</p>
          <p className="text-xs text-muted-foreground">{option.description}</p>
        </div>
        {option.badge && (
          <Badge variant="secondary" className="text-xs ml-auto">
            {option.badge}
          </Badge>
        )}
      </div>

      {/* Show contactless instructions if present */}
      {contactlessInstructions && (
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Drop-off Instructions:
          </p>
          <p className="text-sm" data-testid="contactless-instructions-display">
            {contactlessInstructions}
          </p>
        </div>
      )}

      {/* Show delivery proof photo if available */}
      {deliveryProofPhoto && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Camera className="h-3 w-3" />
            Delivery Proof Photo:
          </p>
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={deliveryProofPhoto}
              alt="Delivery proof"
              className="w-full h-48 object-cover"
              data-testid="delivery-proof-photo"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Badge component for rider's view
export function DeliveryTypeBadge({
  deliveryType,
  showIcon = true,
  size = "default",
}: {
  deliveryType: DeliveryType;
  showIcon?: boolean;
  size?: "default" | "sm" | "lg";
}) {
  const getConfig = () => {
    switch (deliveryType) {
      case DELIVERY_TYPES.LEAVE_AT_DOOR:
        return {
          icon: <DoorOpen className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />,
          label: "Leave at Door",
          className: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case DELIVERY_TYPES.MEET_OUTSIDE:
        return {
          icon: <PersonStanding className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />,
          label: "Meet Outside",
          className: "bg-green-100 text-green-700 border-green-200",
        };
      default:
        return {
          icon: <Hand className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />,
          label: "Hand to Customer",
          className: "bg-gray-100 text-gray-700 border-gray-200",
        };
    }
  };

  const config = getConfig();

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1`}
      data-testid="delivery-type-badge"
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

export default DeliveryOptions;
