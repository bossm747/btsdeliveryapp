import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Heart, Coins, HandCoins } from "lucide-react";

export interface TipSelectorProps {
  /** Current tip amount in PHP */
  value: number;
  /** Callback when tip amount changes */
  onChange: (amount: number) => void;
  /** Order subtotal for percentage calculation (optional) */
  subtotal?: number;
  /** Preset tip amounts in PHP */
  presetAmounts?: number[];
  /** Whether to show percentage options */
  showPercentages?: boolean;
  /** Minimum tip amount allowed */
  minTip?: number;
  /** Maximum tip amount allowed */
  maxTip?: number;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const DEFAULT_PRESETS = [20, 50, 100];
const PERCENTAGE_PRESETS = [5, 10, 15, 20];

export default function TipSelector({
  value,
  onChange,
  subtotal,
  presetAmounts = DEFAULT_PRESETS,
  showPercentages = false,
  minTip = 0,
  maxTip = 9999,
  disabled = false,
  className,
}: TipSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  // Sync external value with internal state
  useEffect(() => {
    if (value === 0) {
      setSelectedPreset(null);
      setSelectedPercentage(null);
      setCustomAmount("");
      setIsCustom(false);
    } else if (presetAmounts.includes(value)) {
      setSelectedPreset(value);
      setSelectedPercentage(null);
      setIsCustom(false);
    } else if (subtotal && PERCENTAGE_PRESETS.some(p => Math.round(subtotal * p / 100) === value)) {
      const matchingPercent = PERCENTAGE_PRESETS.find(p => Math.round(subtotal * p / 100) === value);
      setSelectedPercentage(matchingPercent || null);
      setSelectedPreset(null);
      setIsCustom(false);
    } else if (value > 0) {
      setIsCustom(true);
      setCustomAmount(value.toString());
      setSelectedPreset(null);
      setSelectedPercentage(null);
    }
  }, [value, presetAmounts, subtotal]);

  const handlePresetClick = (amount: number) => {
    if (disabled) return;

    if (selectedPreset === amount) {
      // Deselect if clicking the same preset
      setSelectedPreset(null);
      setSelectedPercentage(null);
      setIsCustom(false);
      setCustomAmount("");
      onChange(0);
    } else {
      setSelectedPreset(amount);
      setSelectedPercentage(null);
      setIsCustom(false);
      setCustomAmount("");
      onChange(amount);
    }
  };

  const handlePercentageClick = (percentage: number) => {
    if (disabled || !subtotal) return;

    if (selectedPercentage === percentage) {
      // Deselect if clicking the same percentage
      setSelectedPercentage(null);
      setSelectedPreset(null);
      setIsCustom(false);
      setCustomAmount("");
      onChange(0);
    } else {
      const tipAmount = Math.round(subtotal * percentage / 100);
      setSelectedPercentage(percentage);
      setSelectedPreset(null);
      setIsCustom(false);
      setCustomAmount("");
      onChange(Math.min(tipAmount, maxTip));
    }
  };

  const handleNoTip = () => {
    if (disabled) return;
    setSelectedPreset(null);
    setSelectedPercentage(null);
    setIsCustom(false);
    setCustomAmount("");
    onChange(0);
  };

  const handleCustomClick = () => {
    if (disabled) return;
    setIsCustom(true);
    setSelectedPreset(null);
    setSelectedPercentage(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input or numbers only
    if (inputValue === "" || /^\d*\.?\d{0,2}$/.test(inputValue)) {
      setCustomAmount(inputValue);

      const numericValue = parseFloat(inputValue) || 0;
      const clampedValue = Math.min(Math.max(numericValue, minTip), maxTip);
      onChange(clampedValue);
    }
  };

  const handleCustomBlur = () => {
    if (customAmount === "" || parseFloat(customAmount) === 0) {
      setIsCustom(false);
      onChange(0);
    }
  };

  return (
    <Card className={cn("border-0 shadow-none", className)} data-testid="tip-selector">
      <CardContent className="p-0 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-[#FF6B35]" />
          <Label className="text-base font-semibold">Add a Tip for Your Rider</Label>
        </div>

        {/* Preset Amount Buttons */}
        <div className="grid grid-cols-4 gap-2" data-testid="preset-buttons">
          {/* No Tip Option */}
          <Button
            type="button"
            variant={value === 0 && !isCustom ? "default" : "outline"}
            className={cn(
              "h-12 text-sm font-medium transition-all",
              value === 0 && !isCustom
                ? "bg-gray-600 hover:bg-gray-700 text-white"
                : "hover:border-gray-400"
            )}
            onClick={handleNoTip}
            disabled={disabled}
            data-testid="no-tip-button"
          >
            No Tip
          </Button>

          {/* Preset Amount Buttons */}
          {presetAmounts.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant={selectedPreset === amount ? "default" : "outline"}
              className={cn(
                "h-12 text-sm font-medium transition-all",
                selectedPreset === amount
                  ? "bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                  : "hover:border-[#FF6B35] hover:text-[#FF6B35]"
              )}
              onClick={() => handlePresetClick(amount)}
              disabled={disabled}
              data-testid={`preset-${amount}`}
            >
              <Coins className="w-4 h-4 mr-1" />
              ₱{amount}
            </Button>
          ))}
        </div>

        {/* Percentage Options (if enabled and subtotal provided) */}
        {showPercentages && subtotal && subtotal > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-gray-500">Or choose a percentage:</Label>
            <div className="grid grid-cols-4 gap-2" data-testid="percentage-buttons">
              {PERCENTAGE_PRESETS.map((percentage) => {
                const tipAmount = Math.round(subtotal * percentage / 100);
                return (
                  <Button
                    key={percentage}
                    type="button"
                    variant={selectedPercentage === percentage ? "default" : "outline"}
                    className={cn(
                      "h-12 flex flex-col items-center justify-center text-xs font-medium transition-all",
                      selectedPercentage === percentage
                        ? "bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                        : "hover:border-[#FF6B35] hover:text-[#FF6B35]"
                    )}
                    onClick={() => handlePercentageClick(percentage)}
                    disabled={disabled}
                    data-testid={`percentage-${percentage}`}
                  >
                    <span>{percentage}%</span>
                    <span className="text-[10px] opacity-80">₱{tipAmount}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Amount Section */}
        <div className="space-y-2">
          {!isCustom ? (
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 text-sm hover:border-[#FF6B35] hover:text-[#FF6B35]"
              onClick={handleCustomClick}
              disabled={disabled}
              data-testid="custom-tip-button"
            >
              Enter Custom Amount
            </Button>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                ₱
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Enter tip amount"
                value={customAmount}
                onChange={handleCustomAmountChange}
                onBlur={handleCustomBlur}
                className={cn(
                  "pl-8 h-12 text-lg font-medium",
                  "focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                )}
                disabled={disabled}
                autoFocus
                data-testid="custom-amount-input"
              />
            </div>
          )}
        </div>

        {/* Selected Tip Display */}
        {value > 0 && (
          <div
            className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
            data-testid="selected-tip-display"
          >
            <div className="flex items-center gap-2 text-green-700">
              <Heart className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">Tip for rider</span>
            </div>
            <span className="font-bold text-green-700">₱{value.toFixed(2)}</span>
          </div>
        )}

        {/* Tip Message */}
        <p className="text-xs text-gray-500 text-center">
          100% of your tip goes directly to your rider. Thank you for your generosity!
        </p>
      </CardContent>
    </Card>
  );
}

// Named export for easy importing
export { TipSelector };
