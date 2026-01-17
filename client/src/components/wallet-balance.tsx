import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Wallet, Plus, ChevronRight, Smartphone, CreditCard, Building2, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// Quick top-up amount options
const TOPUP_AMOUNTS = [100, 200, 500, 1000];

interface WalletBalanceProps {
  variant?: "compact" | "full" | "checkout";
  showTopupButton?: boolean;
  showViewDetails?: boolean;
  onUseWalletChange?: (useWallet: boolean, amount: number, remainingBalance: number) => void;
  orderTotal?: number;
  className?: string;
}

interface WalletData {
  wallet: {
    id: string;
    balance: number;
    currency: string;
    isActive: boolean;
    autoUseWallet: boolean;
  } | null;
  hasWallet: boolean;
}

export function WalletBalance({
  variant = "compact",
  showTopupButton = true,
  showViewDetails = true,
  onUseWalletChange,
  orderTotal = 0,
  className
}: WalletBalanceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("gcash");
  const [useWallet, setUseWallet] = useState(false);

  // Fetch wallet data
  const { data: walletData, isLoading, error } = useQuery<WalletData>({
    queryKey: ["/api/customer/wallet"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customer/wallet");
      return response.json();
    },
    staleTime: 30000 // Cache for 30 seconds
  });

  // Top-up mutation
  const topupMutation = useMutation({
    mutationFn: async (data: { amount: number; paymentMethod: string }) => {
      const response = await apiRequest("POST", "/api/customer/wallet/topup", data);
      return response.json();
    },
    onSuccess: (data) => {
      setShowTopupDialog(false);
      if (data.topupRequest?.paymentLink) {
        window.location.href = data.topupRequest.paymentLink;
      } else {
        toast({
          title: "Top-up Initiated",
          description: "Please complete the payment in the payment app."
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/customer/wallet"] });
    },
    onError: (error: any) => {
      toast({
        title: "Top-up Failed",
        description: error.message || "Failed to initiate top-up",
        variant: "destructive"
      });
    }
  });

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/customer/wallet/create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/wallet"] });
      toast({
        title: "Wallet Created",
        description: "Your wallet has been created successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create wallet",
        variant: "destructive"
      });
    }
  });

  const handleTopup = () => {
    const amount = customAmount ? parseFloat(customAmount) : topupAmount;
    if (!amount || amount < 50) {
      toast({
        title: "Invalid Amount",
        description: "Minimum top-up amount is PHP 50",
        variant: "destructive"
      });
      return;
    }
    if (amount > 50000) {
      toast({
        title: "Invalid Amount",
        description: "Maximum top-up amount is PHP 50,000",
        variant: "destructive"
      });
      return;
    }
    topupMutation.mutate({ amount, paymentMethod });
  };

  const handleUseWalletChange = (checked: boolean) => {
    setUseWallet(checked);
    if (onUseWalletChange && walletData?.wallet) {
      const walletBalance = walletData.wallet.balance;
      const amountToUse = checked ? Math.min(walletBalance, orderTotal) : 0;
      const remainingBalance = walletBalance - amountToUse;
      onUseWalletChange(checked, amountToUse, remainingBalance);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }

  // No wallet - show create option
  if (!walletData?.hasWallet) {
    if (variant === "checkout") {
      return (
        <Card className={cn("border-dashed", className)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-600">BTS Wallet</p>
                  <p className="text-xs text-gray-400">Create wallet to earn cashback</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => createWalletMutation.mutate()}
                disabled={createWalletMutation.isPending}
              >
                {createWalletMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Link href="/wallet">
        <Button variant="ghost" size="sm" className={cn("text-gray-500", className)}>
          <Wallet className="w-4 h-4 mr-1" />
          <span className="text-xs">Create Wallet</span>
        </Button>
      </Link>
    );
  }

  const wallet = walletData.wallet!;
  const balance = wallet.balance;
  const isLowBalance = balance < 100;

  // Calculate wallet payment for checkout
  const walletPayment = useWallet ? Math.min(balance, orderTotal) : 0;
  const remainingToPay = orderTotal - walletPayment;

  // Checkout variant - detailed view for checkout page
  if (variant === "checkout") {
    return (
      <Card className={cn("border-green-200 bg-green-50/50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#004225] to-green-600 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-[#004225]">BTS Wallet</p>
                <p className="text-sm text-gray-600">Balance: {formatCurrency(balance)}</p>
              </div>
            </div>
            <Switch
              checked={useWallet}
              onCheckedChange={handleUseWalletChange}
              disabled={balance <= 0 || !wallet.isActive}
            />
          </div>

          {useWallet && balance > 0 && (
            <div className="space-y-2 pt-3 border-t border-green-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Wallet payment</span>
                <span className="font-medium text-green-600">-{formatCurrency(walletPayment)}</span>
              </div>
              {remainingToPay > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining to pay</span>
                  <span className="font-medium">{formatCurrency(remainingToPay)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Wallet balance after payment</span>
                <span>{formatCurrency(balance - walletPayment)}</span>
              </div>
            </div>
          )}

          {balance <= 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-green-200">
              <p className="text-sm text-gray-500">Insufficient balance</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTopupDialog(true)}
                className="text-[#004225] border-[#004225]"
              >
                <Plus className="w-3 h-3 mr-1" />
                Top Up
              </Button>
            </div>
          )}

          {/* Inline Top-up Dialog */}
          <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Top Up Wallet</DialogTitle>
                <DialogDescription>
                  Add funds to pay for your order
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 gap-2">
                  {TOPUP_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      variant={topupAmount === amount && !customAmount ? "default" : "outline"}
                      size="sm"
                      className={topupAmount === amount && !customAmount ? "bg-[#004225]" : ""}
                      onClick={() => {
                        setTopupAmount(amount);
                        setCustomAmount("");
                      }}
                    >
                      {amount}
                    </Button>
                  ))}
                </div>

                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min={50}
                  max={50000}
                />

                <div className="flex gap-2">
                  <Button
                    variant={paymentMethod === "gcash" ? "default" : "outline"}
                    size="sm"
                    className={cn("flex-1", paymentMethod === "gcash" && "bg-[#007DFE]")}
                    onClick={() => setPaymentMethod("gcash")}
                  >
                    GCash
                  </Button>
                  <Button
                    variant={paymentMethod === "maya" ? "default" : "outline"}
                    size="sm"
                    className={cn("flex-1", paymentMethod === "maya" && "bg-[#00D084]")}
                    onClick={() => setPaymentMethod("maya")}
                  >
                    Maya
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTopupDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleTopup}
                  disabled={topupMutation.isPending}
                  className="bg-[#004225] hover:bg-[#003018]"
                >
                  {topupMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    `Top Up ${formatCurrency(customAmount ? parseFloat(customAmount) : topupAmount)}`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Full variant - for sidebar or dashboard
  if (variant === "full") {
    return (
      <Card className={cn("bg-gradient-to-br from-[#004225] to-green-700 text-white", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5" />
              <span className="font-medium">BTS Wallet</span>
            </div>
            {showTopupButton && (
              <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Top Up Wallet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-4 gap-2">
                      {TOPUP_AMOUNTS.map((amount) => (
                        <Button
                          key={amount}
                          variant={topupAmount === amount ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTopupAmount(amount)}
                        >
                          {amount}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleTopup} disabled={topupMutation.isPending}>
                      Top Up
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
          {showViewDetails && (
            <Link href="/wallet">
              <Button variant="link" className="text-green-200 hover:text-white p-0 h-auto text-xs mt-2">
                View Details <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  // Compact variant - for header
  return (
    <Link href="/wallet">
      <div className={cn(
        "flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
        "hover:bg-gray-100",
        isLowBalance && "bg-orange-50 hover:bg-orange-100",
        className
      )}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isLowBalance ? "bg-orange-500" : "bg-gradient-to-br from-[#004225] to-green-600"
        )}>
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Wallet</span>
          <span className={cn(
            "font-semibold text-sm",
            isLowBalance ? "text-orange-600" : "text-[#004225]"
          )}>
            {formatCurrency(balance)}
          </span>
        </div>
        {isLowBalance && (
          <AlertCircle className="w-4 h-4 text-orange-500" />
        )}
      </div>
    </Link>
  );
}

// Export hook for wallet data access
export function useWallet() {
  const { data, isLoading, error, refetch } = useQuery<WalletData>({
    queryKey: ["/api/customer/wallet"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customer/wallet");
      return response.json();
    },
    staleTime: 30000
  });

  return {
    wallet: data?.wallet || null,
    hasWallet: data?.hasWallet || false,
    balance: data?.wallet?.balance || 0,
    isActive: data?.wallet?.isActive || false,
    autoUseWallet: data?.wallet?.autoUseWallet || false,
    isLoading,
    error,
    refetch
  };
}
