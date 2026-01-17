import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, Gift,
  Settings, History, Calendar, Filter, CreditCard, Smartphone,
  Building2, ChevronRight, AlertCircle, CheckCircle2, Clock, TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import btsLogo from "@assets/bts-logo-transparent.png";

// Quick top-up amount options
const TOPUP_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

// Transaction type icons and colors
const TRANSACTION_STYLES: Record<string, { icon: any; color: string; bgColor: string }> = {
  topup: { icon: ArrowDownLeft, color: "text-green-600", bgColor: "bg-green-100" },
  payment: { icon: ArrowUpRight, color: "text-red-600", bgColor: "bg-red-100" },
  refund: { icon: RefreshCw, color: "text-blue-600", bgColor: "bg-blue-100" },
  cashback: { icon: Gift, color: "text-purple-600", bgColor: "bg-purple-100" },
  withdrawal: { icon: ArrowUpRight, color: "text-orange-600", bgColor: "bg-orange-100" },
  adjustment: { icon: Settings, color: "text-gray-600", bgColor: "bg-gray-100" }
};

interface WalletData {
  wallet: {
    id: string;
    balance: number;
    currency: string;
    isActive: boolean;
    autoUseWallet: boolean;
    lowBalanceAlert: number;
    totalTopups: number;
    totalSpent: number;
    totalCashback: number;
    totalRefunds: number;
    lastTopupAt: string | null;
    lastTransactionAt: string | null;
    createdAt: string;
  } | null;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    status: string;
    createdAt: string;
  }>;
  hasWallet: boolean;
}

interface TransactionData {
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceId: string | null;
    referenceType: string | null;
    description: string;
    status: string;
    paymentMethod: string | null;
    createdAt: string;
    completedAt: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SummaryData {
  hasWallet: boolean;
  currentBalance: number;
  summary: {
    totalTopups: number;
    totalPayments: number;
    totalRefunds: number;
    totalCashback: number;
    transactionCount: number;
  };
  month: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("gcash");
  const [transactionFilter, setTransactionFilter] = useState<string>("all");
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Fetch wallet data
  const { data: walletData, isLoading: walletLoading, error: walletError } = useQuery<WalletData>({
    queryKey: ["/api/customer/wallet"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customer/wallet");
      return response.json();
    }
  });

  // Fetch transaction history
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<TransactionData>({
    queryKey: ["/api/customer/wallet/transactions", transactionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (transactionFilter !== "all") {
        params.append("type", transactionFilter);
      }
      params.append("limit", "20");
      const response = await apiRequest("GET", `/api/customer/wallet/transactions?${params.toString()}`);
      return response.json();
    },
    enabled: walletData?.hasWallet === true
  });

  // Fetch monthly summary
  const { data: summaryData } = useQuery<SummaryData>({
    queryKey: ["/api/customer/wallet/summary"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customer/wallet/summary");
      return response.json();
    },
    enabled: walletData?.hasWallet === true
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

  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { autoUseWallet?: boolean; lowBalanceAlert?: number }) => {
      const response = await apiRequest("PUT", "/api/customer/wallet/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/wallet"] });
      toast({
        title: "Settings Updated",
        description: "Your wallet settings have been updated."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (walletLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // No wallet state
  if (!walletData?.hasWallet) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-[#004225] to-green-600 rounded-full flex items-center justify-center mb-4">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Create Your BTS Wallet</CardTitle>
              <CardDescription className="text-lg">
                Pay faster, earn cashback, and manage your funds all in one place
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                  <CreditCard className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium">Fast Checkout</h4>
                    <p className="text-sm text-gray-600">Pay instantly without entering payment details</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                  <Gift className="w-6 h-6 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-medium">Earn Cashback</h4>
                    <p className="text-sm text-gray-600">Get up to 5% cashback on every order</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium">Easy Refunds</h4>
                    <p className="text-sm text-gray-600">Refunds credited instantly to your wallet</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => createWalletMutation.mutate()}
                disabled={createWalletMutation.isPending}
                className="w-full md:w-auto bg-[#004225] hover:bg-[#003018] text-white px-8 py-6 text-lg"
              >
                {createWalletMutation.isPending ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Create My Wallet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const wallet = walletData.wallet!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004225] to-green-700 text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <img src={btsLogo} alt="BTS" className="w-10 h-10" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">BTS Wallet</h1>
                <p className="text-green-200 text-sm">Your digital wallet</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Balance Card */}
          <Card className="bg-white/10 backdrop-blur border-white/20 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm mb-1">Available Balance</p>
                  <p className="text-3xl md:text-4xl font-bold">
                    {formatCurrency(wallet.balance)}
                  </p>
                  {wallet.lastTransactionAt && (
                    <p className="text-green-200 text-xs mt-2">
                      Last activity: {formatDate(wallet.lastTransactionAt)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-white text-[#004225] hover:bg-green-50">
                        <Plus className="w-4 h-4 mr-2" />
                        Top Up
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Top Up Wallet</DialogTitle>
                        <DialogDescription>
                          Add funds to your BTS Wallet
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        {/* Quick amounts */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Select Amount</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {TOPUP_AMOUNTS.map((amount) => (
                              <Button
                                key={amount}
                                variant={topupAmount === amount && !customAmount ? "default" : "outline"}
                                className={topupAmount === amount && !customAmount ? "bg-[#004225]" : ""}
                                onClick={() => {
                                  setTopupAmount(amount);
                                  setCustomAmount("");
                                }}
                              >
                                {formatCurrency(amount)}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Custom amount */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Or Enter Custom Amount</Label>
                          <Input
                            type="number"
                            placeholder="Enter amount (50 - 50,000)"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            min={50}
                            max={50000}
                          />
                        </div>

                        {/* Payment method */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant={paymentMethod === "gcash" ? "default" : "outline"}
                              className={paymentMethod === "gcash" ? "bg-[#007DFE]" : ""}
                              onClick={() => setPaymentMethod("gcash")}
                            >
                              <Smartphone className="w-4 h-4 mr-2" />
                              GCash
                            </Button>
                            <Button
                              variant={paymentMethod === "maya" ? "default" : "outline"}
                              className={paymentMethod === "maya" ? "bg-[#00D084]" : ""}
                              onClick={() => setPaymentMethod("maya")}
                            >
                              <Smartphone className="w-4 h-4 mr-2" />
                              Maya
                            </Button>
                            <Button
                              variant={paymentMethod === "card" ? "default" : "outline"}
                              className={paymentMethod === "card" ? "bg-gray-800" : ""}
                              onClick={() => setPaymentMethod("card")}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Card
                            </Button>
                            <Button
                              variant={paymentMethod === "bank" ? "default" : "outline"}
                              className={paymentMethod === "bank" ? "bg-blue-600" : ""}
                              onClick={() => setPaymentMethod("bank")}
                            >
                              <Building2 className="w-4 h-4 mr-2" />
                              Bank
                            </Button>
                          </div>
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
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Top Up {formatCurrency(customAmount ? parseFloat(customAmount) : topupAmount)}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-8 -mt-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <ArrowDownLeft className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{formatCurrency(wallet.totalTopups)}</p>
              <p className="text-xs text-gray-500">Total Top-ups</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ArrowUpRight className="w-6 h-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{formatCurrency(wallet.totalSpent)}</p>
              <p className="text-xs text-gray-500">Total Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Gift className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{formatCurrency(wallet.totalCashback)}</p>
              <p className="text-xs text-gray-500">Cashback Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{formatCurrency(wallet.totalRefunds)}</p>
              <p className="text-xs text-gray-500">Total Refunds</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Summary */}
        {summaryData?.hasWallet && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-[#004225]" />
                {summaryData.month} Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Top-ups</p>
                  <p className="font-semibold text-green-600">+{formatCurrency(summaryData.summary.totalTopups)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payments</p>
                  <p className="font-semibold text-red-600">-{formatCurrency(summaryData.summary.totalPayments)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Cashback</p>
                  <p className="font-semibold text-purple-600">+{formatCurrency(summaryData.summary.totalCashback)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Transactions</p>
                  <p className="font-semibold">{summaryData.summary.transactionCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <History className="w-5 h-5 mr-2" />
                Transaction History
              </CardTitle>
              <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="topup">Top-ups</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="refund">Refunds</SelectItem>
                  <SelectItem value="cashback">Cashback</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !transactionsData?.transactions.length ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactionsData.transactions.map((transaction) => {
                  const style = TRANSACTION_STYLES[transaction.type] || TRANSACTION_STYLES.adjustment;
                  const Icon = style.icon;
                  const isCredit = ['topup', 'refund', 'cashback'].includes(transaction.type);

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${style.bgColor}`}>
                          <Icon className={`w-5 h-5 ${style.color}`} />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{transaction.type}</p>
                          <p className="text-xs text-gray-500">{transaction.description || formatDate(transaction.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        <div className="flex items-center justify-end space-x-1">
                          {transaction.status === 'completed' ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : transaction.status === 'pending' ? (
                            <Clock className="w-3 h-3 text-yellow-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-500 capitalize">{transaction.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {transactionsData.pagination.totalPages > 1 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" size="sm">
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Settings</DialogTitle>
            <DialogDescription>
              Customize your wallet preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Auto-use Wallet at Checkout</Label>
                <p className="text-sm text-gray-500">
                  Automatically use wallet balance when placing orders
                </p>
              </div>
              <Switch
                checked={wallet.autoUseWallet}
                onCheckedChange={(checked) => {
                  updateSettingsMutation.mutate({ autoUseWallet: checked });
                }}
              />
            </div>

            <Separator />

            <div>
              <Label className="font-medium mb-2 block">Low Balance Alert</Label>
              <p className="text-sm text-gray-500 mb-2">
                Get notified when your balance falls below this amount
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">PHP</span>
                <Input
                  type="number"
                  defaultValue={wallet.lowBalanceAlert}
                  className="w-32"
                  min={0}
                  max={10000}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value >= 0 && value <= 10000) {
                      updateSettingsMutation.mutate({ lowBalanceAlert: value });
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
