import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpRight, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const payoutSchema = z.object({
  amount: z.number().min(100, "Minimum payout is ₱100").max(50000, "Maximum payout is ₱50,000"),
  paymentMethod: z.enum(["gcash", "maya"]),
  accountNumber: z.string().regex(/^09\d{9}$/, "Please enter a valid mobile number (09XXXXXXXXX)"),
  accountName: z.string().min(3, "Account name is required"),
});

type PayoutFormData = z.infer<typeof payoutSchema>;

interface RiderPayoutProps {
  riderId: string;
  currentBalance: number;
  onPayoutSuccess?: () => void;
}

export default function RiderPayout({ riderId, currentBalance, onPayoutSuccess }: RiderPayoutProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [payoutLink, setPayoutLink] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<PayoutFormData>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: "gcash",
      accountNumber: "",
      accountName: "",
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async (data: PayoutFormData) => {
      const response = await apiRequest("POST", "/api/rider/payout", {
        riderId,
        amount: data.amount,
        accountNumber: data.accountNumber,
        name: data.accountName,
        paymentMethod: data.paymentMethod,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Payout initiated!",
          description: "Your payout request has been processed.",
        });
        setPayoutLink(data.payoutLink);
        form.reset();
        onPayoutSuccess?.();
      } else {
        throw new Error(data.message || "Payout failed");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payout failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PayoutFormData) => {
    if (data.amount > currentBalance) {
      toast({
        title: "Insufficient balance",
        description: `Your current balance is ₱${currentBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }
    payoutMutation.mutate(data);
  };

  const handleQuickAmount = (amount: number) => {
    if (amount <= currentBalance) {
      form.setValue("amount", amount);
    }
  };

  return (
    <Card data-testid="rider-payout-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Earnings & Payout
        </CardTitle>
        <CardDescription>
          Withdraw your earnings via GCash or Maya
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold text-primary" data-testid="available-balance">
              ₱{currentBalance.toFixed(2)}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary text-white"
                disabled={currentBalance < 100}
                data-testid="withdraw-button"
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Withdraw Earnings</DialogTitle>
                <DialogDescription>
                  Transfer your earnings to your GCash or Maya account
                </DialogDescription>
              </DialogHeader>
              
              {payoutLink ? (
                <div className="space-y-4 py-4">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <h3 className="font-semibold">Payout Initiated!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your payout request has been processed successfully.
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => {
                        window.open(payoutLink, "_blank");
                      }}
                    >
                      View Payout Details
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPayoutLink(null);
                        setIsDialogOpen(false);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount to Withdraw</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input
                                type="number"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="amount-input"
                              />
                              <div className="flex gap-2">
                                {[500, 1000, 2000, 5000].map((amount) => (
                                  <Button
                                    key={amount}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuickAmount(amount)}
                                    disabled={amount > currentBalance}
                                    className="flex-1"
                                    data-testid={`quick-amount-${amount}`}
                                  >
                                    ₱{amount}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="payment-method-select">
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="gcash" data-testid="payment-method-gcash">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-blue-100 text-blue-700">GCash</Badge>
                                </div>
                              </SelectItem>
                              <SelectItem value="maya" data-testid="payment-method-maya">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-100 text-green-700">Maya</Badge>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="09XXXXXXXXX"
                              {...field}
                              data-testid="account-number-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Juan Dela Cruz"
                              {...field}
                              data-testid="account-name-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <p className="font-semibold">Important:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Minimum withdrawal: ₱100</li>
                            <li>Processing time: 1-3 business days</li>
                            <li>Ensure your account details are correct</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-primary text-white"
                        disabled={payoutMutation.isPending}
                        data-testid="confirm-payout-button"
                      >
                        {payoutMutation.isPending ? "Processing..." : "Confirm Payout"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Today's Earnings</span>
            <span className="font-medium">₱523.50</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">This Week</span>
            <span className="font-medium">₱2,845.00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">This Month</span>
            <span className="font-medium">₱12,450.50</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}