import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Percent, 
  Tag, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Gift,
  Sparkles,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface PromoCodeValidationResult {
  valid: boolean;
  code?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  description?: string;
  expiresAt?: string;
  message?: string;
}

interface PromoCodeInputProps {
  subtotal: number;
  appliedCode: string;
  onApply: (code: string, discount: number) => void;
  onRemove: () => void;
  className?: string;
}

export function PromoCodeInput({ 
  subtotal, 
  appliedCode, 
  onApply, 
  onRemove, 
  className 
}: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [validationResult, setValidationResult] = useState<PromoCodeValidationResult | null>(null);
  const [showInput, setShowInput] = useState(!appliedCode);

  const validatePromoMutation = useMutation({
    mutationFn: async (promoCode: string): Promise<PromoCodeValidationResult> => {
      const response = await apiRequest("POST", "/api/promos/validate", {
        code: promoCode,
        orderTotal: subtotal
      });
      return response.json();
    },
    onSuccess: (result) => {
      setValidationResult(result);
      if (result.valid && result.discountAmount !== undefined) {
        onApply(code.toUpperCase(), result.discountAmount);
        setShowInput(false);
      }
    },
    onError: (error: any) => {
      setValidationResult({
        valid: false,
        message: error.message || "Failed to validate promo code. Please try again."
      });
    }
  });

  const handleApply = () => {
    if (!code.trim()) return;
    setValidationResult(null);
    validatePromoMutation.mutate(code.trim().toUpperCase());
  };

  const handleRemove = () => {
    setCode("");
    setValidationResult(null);
    setShowInput(true);
    onRemove();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  const isLoading = validatePromoMutation.isPending;

  return (
    <Card className={cn("border-green-100 bg-gradient-to-br from-green-50 to-emerald-50", className)} data-testid="promo-code-section">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-5 w-5 text-green-600" />
          <span>Promo Code</span>
          {appliedCode && (
            <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Applied
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Applied Promo Display */}
        {appliedCode && !showInput && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              <div>
                <span className="font-bold text-green-800 tracking-wider">
                  {appliedCode}
                </span>
                {validationResult?.description && (
                  <p className="text-xs text-green-600 mt-0.5">
                    {validationResult.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {validationResult?.discountAmount && (
                <Badge className="bg-green-600 hover:bg-green-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  -₱{validationResult.discountAmount.toFixed(2)}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                data-testid="remove-promo-btn"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Promo Input */}
        {showInput && (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Enter promo code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setValidationResult(null);
                  }}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "pl-9 uppercase tracking-wider font-medium bg-white",
                    validationResult?.valid === false && "border-red-300 focus-visible:ring-red-200",
                    validationResult?.valid === true && "border-green-300 focus-visible:ring-green-200"
                  )}
                  disabled={isLoading}
                  data-testid="promo-code-input"
                />
              </div>
              <Button
                onClick={handleApply}
                disabled={!code.trim() || isLoading}
                className="bg-green-600 hover:bg-green-700 min-w-[80px]"
                data-testid="apply-promo-btn"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>

            {/* Validation Message */}
            {validationResult && (
              <Alert 
                variant={validationResult.valid ? "default" : "destructive"}
                className={cn(
                  "py-2",
                  validationResult.valid 
                    ? "bg-green-50 border-green-200 text-green-800" 
                    : "bg-red-50 border-red-200"
                )}
              >
                {validationResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription className="ml-2">
                  {validationResult.valid ? (
                    <span>
                      <strong>{validationResult.discountType === "percentage" 
                        ? `${validationResult.discountValue}% off` 
                        : `₱${validationResult.discountValue} off`
                      }</strong>
                      {" — "}You save ₱{validationResult.discountAmount?.toFixed(2)}!
                    </span>
                  ) : (
                    validationResult.message || "Invalid promo code"
                  )}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Helpful hint */}
        {showInput && !validationResult && !code && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Have a promo code? Enter it above to get a discount!
          </p>
        )}

        {/* Show input button when promo is applied */}
        {appliedCode && !showInput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInput(true)}
            className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Tag className="h-4 w-4 mr-1" />
            Use a different code
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default PromoCodeInput;
