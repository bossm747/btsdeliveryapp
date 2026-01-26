import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Smile, ThumbsUp, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TipSelectorProps {
  subtotal: number;
  value: number;
  onChange: (tip: number) => void;
  className?: string;
}

const TIP_PRESETS = [
  { amount: 20, label: "₱20", icon: ThumbsUp },
  { amount: 50, label: "₱50", icon: Smile },
  { amount: 100, label: "₱100", icon: Heart },
];

const TIP_PERCENTAGES = [
  { percent: 5, label: "5%" },
  { percent: 10, label: "10%" },
  { percent: 15, label: "15%" },
];

export function TipSelector({ subtotal, value, onChange, className }: TipSelectorProps) {
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [tipMode, setTipMode] = useState<"fixed" | "percent">("fixed");

  const handlePresetClick = (amount: number) => {
    setIsCustom(false);
    setCustomAmount("");
    onChange(amount);
  };

  const handlePercentClick = (percent: number) => {
    setIsCustom(false);
    setCustomAmount("");
    const tipAmount = Math.round(subtotal * (percent / 100));
    onChange(tipAmount);
  };

  const handleCustomChange = (inputValue: string) => {
    // Only allow numbers
    const numericValue = inputValue.replace(/[^0-9]/g, "");
    setCustomAmount(numericValue);
    setIsCustom(true);
    const amount = parseInt(numericValue) || 0;
    onChange(amount);
  };

  const handleNoTip = () => {
    setIsCustom(false);
    setCustomAmount("");
    onChange(0);
  };

  const isSelected = (amount: number) => !isCustom && value === amount;
  const isPercentSelected = (percent: number) => {
    const expectedAmount = Math.round(subtotal * (percent / 100));
    return !isCustom && value === expectedAmount;
  };

  return (
    <Card className={cn("border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50", className)} data-testid="tip-selector">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-5 w-5 text-pink-500" />
          <span>Tip Your Rider</span>
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          100% of your tip goes directly to the rider! Salamat po!
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex rounded-lg bg-white/50 p-1 gap-1">
          <Button
            variant={tipMode === "fixed" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 text-xs",
              tipMode === "fixed" && "bg-blue-600 hover:bg-blue-700"
            )}
            onClick={() => setTipMode("fixed")}
          >
            Fixed Amount
          </Button>
          <Button
            variant={tipMode === "percent" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 text-xs",
              tipMode === "percent" && "bg-blue-600 hover:bg-blue-700"
            )}
            onClick={() => setTipMode("percent")}
          >
            Percentage
          </Button>
        </div>

        {/* Fixed Amount Presets */}
        {tipMode === "fixed" && (
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map(({ amount, label, icon: Icon }) => (
              <Button
                key={amount}
                variant="outline"
                className={cn(
                  "flex flex-col h-auto py-3 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all",
                  isSelected(amount) && "border-blue-500 bg-blue-100 ring-2 ring-blue-200"
                )}
                onClick={() => handlePresetClick(amount)}
                data-testid={`tip-preset-${amount}`}
              >
                <Icon className={cn(
                  "h-4 w-4 mb-1",
                  isSelected(amount) ? "text-blue-600" : "text-gray-400"
                )} />
                <span className={cn(
                  "font-semibold",
                  isSelected(amount) ? "text-blue-700" : "text-gray-700"
                )}>
                  {label}
                </span>
              </Button>
            ))}
            {/* No Tip Option */}
            <Button
              variant="outline"
              className={cn(
                "flex flex-col h-auto py-3 bg-white hover:bg-gray-50 transition-all",
                value === 0 && !isCustom && "border-gray-400 bg-gray-100"
              )}
              onClick={handleNoTip}
              data-testid="tip-none"
            >
              <span className="text-xs text-gray-500 mb-1">No</span>
              <span className="font-semibold text-gray-600">Tip</span>
            </Button>
          </div>
        )}

        {/* Percentage Presets */}
        {tipMode === "percent" && (
          <div className="grid grid-cols-4 gap-2">
            {TIP_PERCENTAGES.map(({ percent, label }) => {
              const tipAmount = Math.round(subtotal * (percent / 100));
              return (
                <Button
                  key={percent}
                  variant="outline"
                  className={cn(
                    "flex flex-col h-auto py-3 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all",
                    isPercentSelected(percent) && "border-blue-500 bg-blue-100 ring-2 ring-blue-200"
                  )}
                  onClick={() => handlePercentClick(percent)}
                  data-testid={`tip-percent-${percent}`}
                >
                  <span className={cn(
                    "font-semibold",
                    isPercentSelected(percent) ? "text-blue-700" : "text-gray-700"
                  )}>
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ₱{tipAmount}
                  </span>
                </Button>
              );
            })}
            {/* No Tip Option */}
            <Button
              variant="outline"
              className={cn(
                "flex flex-col h-auto py-3 bg-white hover:bg-gray-50 transition-all",
                value === 0 && !isCustom && "border-gray-400 bg-gray-100"
              )}
              onClick={handleNoTip}
              data-testid="tip-none-percent"
            >
              <span className="text-xs text-gray-500 mb-1">No</span>
              <span className="font-semibold text-gray-600">Tip</span>
            </Button>
          </div>
        )}

        {/* Custom Amount Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              className={cn(
                "pl-7 bg-white",
                isCustom && value > 0 && "border-blue-500 ring-2 ring-blue-200"
              )}
              data-testid="tip-custom-input"
            />
          </div>
          {isCustom && value > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNoTip}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Current Tip Display */}
        {value > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium text-pink-700">
                Your tip:
              </span>
            </div>
            <span className="font-bold text-pink-700" data-testid="tip-amount-display">
              ₱{value.toFixed(2)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TipSelector;
