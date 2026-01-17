import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import {
  Tag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
  Percent,
  Gift,
  Clock,
} from "lucide-react";

export interface PromoValidationResult {
  valid: boolean;
  code: string;
  discountType: "percentage" | "fixed" | "free_delivery" | "first_order" | "tiered";
  discountValue: number;
  discountAmount: number;
  description?: string;
  minOrderAmount?: number;
  maxDiscount?: number;
  expiresAt?: string;
  message?: string;
  error?: string;
}

export interface PromoCodeInputProps {
  /** Callback when a valid promo code is applied */
  onApply: (promo: PromoValidationResult) => void;
  /** Callback when promo code is removed */
  onRemove: () => void;
  /** Order subtotal for validation */
  subtotal: number;
  /** Currently applied promo code */
  appliedPromo?: PromoValidationResult | null;
  /** Restaurant ID for restaurant-specific promos */
  restaurantId?: string;
  /** Order type for service-specific promos (food, pabili, parcel, pabayad) */
  orderType?: string;
  /** Delivery fee for free delivery promos */
  deliveryFee?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type ValidationStatus = "idle" | "validating" | "valid" | "invalid" | "expired";

export default function PromoCodeInput({
  onApply,
  onRemove,
  subtotal,
  appliedPromo,
  restaurantId,
  orderType = "food",
  deliveryFee = 0,
  disabled = false,
  className,
}: PromoCodeInputProps) {
  const [promoCode, setPromoCode] = useState("");
  const [status, setStatus] = useState<ValidationStatus>("idle");
  const [validationResult, setValidationResult] = useState<PromoValidationResult | null>(null);

  // Validate promo code mutation
  const validatePromoMutation = useMutation({
    mutationFn: async (code: string): Promise<PromoValidationResult> => {
      const response = await apiRequest("POST", "/api/promos/validate", {
        code,
        subtotal,
        restaurantId,
        orderType,
        deliveryFee,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setValidationResult(data);
      if (data.valid) {
        setStatus("valid");
        onApply(data);
      } else if (data.error?.toLowerCase().includes("expired")) {
        setStatus("expired");
      } else {
        setStatus("invalid");
      }
    },
    onError: (error: Error) => {
      setStatus("invalid");
      setValidationResult({
        valid: false,
        code: promoCode,
        discountType: "fixed",
        discountValue: 0,
        discountAmount: 0,
        error: error.message || "Failed to validate promo code",
      });
    },
  });

  const handleApplyPromo = () => {
    if (!promoCode.trim() || disabled) return;

    setStatus("validating");
    validatePromoMutation.mutate(promoCode.trim().toUpperCase());
  };

  const handleRemovePromo = () => {
    setPromoCode("");
    setStatus("idle");
    setValidationResult(null);
    onRemove();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyPromo();
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "validating":
        return <Loader2 className="w-5 h-5 animate-spin text-gray-500" />;
      case "valid":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "invalid":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "expired":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Tag className="w-5 h-5 text-gray-400" />;
    }
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case "percentage":
        return <Percent className="w-4 h-4" />;
      case "free_delivery":
        return <Gift className="w-4 h-4" />;
      case "first_order":
        return <Gift className="w-4 h-4" />;
      case "tiered":
        return <Percent className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const formatDiscount = (result: PromoValidationResult) => {
    switch (result.discountType) {
      case "percentage":
        return `${result.discountValue}% off`;
      case "free_delivery":
        return "Free Delivery";
      case "first_order":
        return `₱${result.discountValue} first order`;
      case "tiered":
        return `₱${result.discountAmount} off`;
      default:
        return `₱${result.discountValue} off`;
    }
  };

  // If a promo is already applied, show the applied state
  if (appliedPromo?.valid) {
    return (
      <Card className={cn("border-green-200 bg-green-50", className)} data-testid="promo-applied">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-green-800">
                    {appliedPromo.code}
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 text-xs"
                  >
                    {getDiscountIcon(appliedPromo.discountType)}
                    <span className="ml-1">{formatDiscount(appliedPromo)}</span>
                  </Badge>
                </div>
                <p className="text-sm text-green-600">
                  {appliedPromo.description || `You saved ₱${appliedPromo.discountAmount.toFixed(2)}`}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-green-600 hover:text-green-700 hover:bg-green-100"
              onClick={handleRemovePromo}
              disabled={disabled}
              data-testid="remove-promo-button"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-dashed", className)} data-testid="promo-code-input">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#FF6B35]" />
          <Label className="text-base font-semibold">Promo Code</Label>
        </div>

        {/* Input Section */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase());
                if (status !== "idle") {
                  setStatus("idle");
                  setValidationResult(null);
                }
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                "uppercase font-medium tracking-wider",
                status === "valid" && "border-green-500 bg-green-50",
                status === "invalid" && "border-red-500 bg-red-50",
                status === "expired" && "border-amber-500 bg-amber-50"
              )}
              disabled={disabled || validatePromoMutation.isPending}
              data-testid="promo-input"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getStatusIcon()}
            </div>
          </div>
          <Button
            type="button"
            onClick={handleApplyPromo}
            disabled={!promoCode.trim() || disabled || validatePromoMutation.isPending}
            className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 px-6"
            data-testid="apply-promo-button"
          >
            {validatePromoMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>

        {/* Validation Feedback */}
        {status === "valid" && validationResult && (
          <div
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
            data-testid="promo-valid-message"
          >
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium text-green-700">
                Promo applied!
              </span>
              <span className="text-sm text-green-600 ml-1">
                {validationResult.description || `You'll save ₱${validationResult.discountAmount.toFixed(2)}`}
              </span>
            </div>
            <Badge className="bg-green-600 text-white">
              -₱{validationResult.discountAmount.toFixed(2)}
            </Badge>
          </div>
        )}

        {status === "invalid" && validationResult && (
          <div
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
            data-testid="promo-invalid-message"
          >
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-700">
              {validationResult.error || "Invalid promo code. Please check and try again."}
            </span>
          </div>
        )}

        {status === "expired" && validationResult && (
          <div
            className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
            data-testid="promo-expired-message"
          >
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-700">
              This promo code has expired. Please try a different code.
            </span>
          </div>
        )}

        {/* Minimum Order Warning */}
        {status === "invalid" &&
          validationResult?.minOrderAmount &&
          subtotal < validationResult.minOrderAmount && (
            <div
              className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
              data-testid="min-order-warning"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-700">
                Minimum order of ₱{validationResult.minOrderAmount.toFixed(2)} required.
                Add ₱{(validationResult.minOrderAmount - subtotal).toFixed(2)} more to use this promo.
              </span>
            </div>
          )}

        {/* Help Text */}
        {status === "idle" && (
          <p className="text-xs text-gray-500">
            Enter your promo code above to apply discounts to your order
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Named export for easy importing
export { PromoCodeInput };
