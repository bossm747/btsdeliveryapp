import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Percent,
  Shield,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface TaxCalculation {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  vatableAmount: number;
  vatExemptAmount: number;
  vatAmount: number;
  seniorDiscount: number;
  pwdDiscount: number;
  totalDiscount: number;
  exemptionType: string | null;
  exemptionApplied: boolean;
  grossAmount: number;
  netAmount: number;
  breakdown: {
    label: string;
    amount: number;
    type: string;
  }[];
}

interface TaxExemptionData {
  hasExemption: boolean;
  activeExemption: {
    id: string;
    exemptionType: string;
    status: string;
  } | null;
}

interface TaxBreakdownProps {
  subtotal: number;
  deliveryFee?: number;
  serviceFee?: number;
  className?: string;
  showFullBreakdown?: boolean;
  onTaxCalculated?: (calculation: TaxCalculation) => void;
}

const exemptionLabels: Record<string, { label: string; icon: typeof Users }> = {
  senior: { label: "Senior Citizen", icon: Users },
  pwd: { label: "PWD", icon: Shield },
  diplomatic: { label: "Diplomatic", icon: Shield }
};

export function TaxBreakdown({
  subtotal,
  deliveryFee = 0,
  serviceFee = 0,
  className,
  showFullBreakdown = false,
  onTaxCalculated
}: TaxBreakdownProps) {
  const [isOpen, setIsOpen] = useState(showFullBreakdown);

  // Fetch user's tax exemption status
  const { data: exemptionData } = useQuery<TaxExemptionData>({
    queryKey: ["/api/customer/tax-exemption"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/customer/tax-exemption");
        return res.json();
      } catch {
        return { hasExemption: false, activeExemption: null };
      }
    },
    staleTime: 60000 // Cache for 1 minute
  });

  // Calculate taxes
  const { data: taxCalculation, isLoading } = useQuery<{ calculation: TaxCalculation }>({
    queryKey: ["/api/tax/calculate", subtotal, deliveryFee, serviceFee, exemptionData?.activeExemption?.exemptionType],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/tax/calculate", {
        subtotal,
        deliveryFee,
        serviceFee,
        exemptionType: exemptionData?.activeExemption?.exemptionType || null
      });
      return res.json();
    },
    enabled: subtotal > 0,
    staleTime: 10000 // Cache for 10 seconds
  });

  // Notify parent when calculation changes
  useEffect(() => {
    if (taxCalculation?.calculation && onTaxCalculated) {
      onTaxCalculated(taxCalculation.calculation);
    }
  }, [taxCalculation, onTaxCalculated]);

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  const calc = taxCalculation?.calculation;
  if (!calc) return null;

  const hasExemption = calc.exemptionApplied;
  const exemptionInfo = calc.exemptionType ? exemptionLabels[calc.exemptionType] : null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Exemption Badge */}
      {hasExemption && exemptionInfo && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 text-sm">
            {exemptionInfo.label} Benefits Applied
          </AlertTitle>
          <AlertDescription className="text-green-700 text-xs">
            20% discount + VAT exemption on food items
          </AlertDescription>
        </Alert>
      )}

      {/* Compact View */}
      {!showFullBreakdown && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="space-y-2">
            {/* Basic Summary */}
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>PHP {calc.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>

            {calc.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>PHP {calc.deliveryFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {calc.serviceFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Service Fee</span>
                <span>PHP {calc.serviceFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* Discount Display */}
            {calc.totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  {calc.exemptionType === "senior" ? (
                    <Users className="h-3 w-3" />
                  ) : (
                    <Shield className="h-3 w-3" />
                  )}
                  {exemptionInfo?.label} Discount (20%)
                </span>
                <span>-PHP {calc.totalDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* Tax Details Toggle */}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-1">
                  <Receipt className="h-3 w-3" />
                  Tax Details
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-2">
              <Separator />

              {/* VAT Breakdown */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vatable Amount</span>
                  <span>PHP {calc.vatableAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>

                {calc.vatExemptAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT Exempt Amount</span>
                    <span className="text-purple-600">
                      PHP {calc.vatExemptAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    VAT (12% included)
                  </span>
                  <span>PHP {calc.vatAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>

                {hasExemption && (
                  <div className="pt-2 mt-2 border-t border-dashed text-xs text-muted-foreground">
                    <Info className="h-3 w-3 inline mr-1" />
                    Prices are VAT inclusive. {exemptionInfo?.label} purchases are VAT exempt.
                  </div>
                )}
              </div>

              <Separator />
            </CollapsibleContent>

            {/* Total */}
            <div className="flex justify-between font-bold text-lg pt-2">
              <span>Total</span>
              <span>PHP {calc.netAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>

            {calc.totalDiscount > 0 && (
              <p className="text-xs text-green-600 text-center">
                You're saving PHP {calc.totalDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })} with {exemptionInfo?.label} benefits!
              </p>
            )}
          </div>
        </Collapsible>
      )}

      {/* Full Breakdown View */}
      {showFullBreakdown && (
        <div className="space-y-4">
          {calc.breakdown.map((line, index) => (
            <div
              key={index}
              className={cn(
                "flex justify-between",
                line.type === "total" && "font-bold text-lg pt-2 border-t",
                line.type === "discount" && "text-green-600",
                line.type === "tax" && "text-muted-foreground text-sm"
              )}
            >
              <span>{line.label}</span>
              <span>
                {line.type === "discount" ? "-" : ""}
                PHP {Math.abs(line.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Standalone card version for use in checkout
export function TaxBreakdownCard({
  subtotal,
  deliveryFee = 0,
  serviceFee = 0,
  onTaxCalculated
}: {
  subtotal: number;
  deliveryFee?: number;
  serviceFee?: number;
  onTaxCalculated?: (calculation: TaxCalculation) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TaxBreakdown
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          serviceFee={serviceFee}
          onTaxCalculated={onTaxCalculated}
        />
      </CardContent>
    </Card>
  );
}

// Mini version for inline display
export function TaxSummaryLine({
  subtotal,
  deliveryFee = 0,
  serviceFee = 0
}: {
  subtotal: number;
  deliveryFee?: number;
  serviceFee?: number;
}) {
  const { data: exemptionData } = useQuery<TaxExemptionData>({
    queryKey: ["/api/customer/tax-exemption"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/customer/tax-exemption");
        return res.json();
      } catch {
        return { hasExemption: false, activeExemption: null };
      }
    },
    staleTime: 60000
  });

  const hasExemption = exemptionData?.hasExemption;
  const exemptionType = exemptionData?.activeExemption?.exemptionType;

  if (!hasExemption) return null;

  const exemptionInfo = exemptionType ? exemptionLabels[exemptionType] : null;
  if (!exemptionInfo) return null;

  const discount = subtotal * 0.20; // 20% discount
  const Icon = exemptionInfo.icon;

  return (
    <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
      <Icon className="h-3 w-3" />
      {exemptionInfo.label}: Save PHP {discount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
    </Badge>
  );
}

export default TaxBreakdown;
