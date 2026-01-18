import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, RefreshCw, ExternalLink } from "lucide-react";

interface PaymentStatusProps {
  transactionId?: string;
  paymentMethod: string;
  amount: number;
  onRefresh?: () => void;
}

interface PaymentStatusData {
  status?: 'pending' | 'success' | 'failed';
  data?: any;
  message?: string;
}

export default function PaymentStatus({
  transactionId,
  paymentMethod,
  amount,
  onRefresh
}: PaymentStatusProps) {

  const { data: paymentStatus = {} as PaymentStatusData, isLoading, refetch } = useQuery<PaymentStatusData>({
    queryKey: [`/api/payment/status/${transactionId}`],
    enabled: !!transactionId && paymentMethod !== "cash",
    refetchInterval: paymentMethod !== "cash" ? 5000 : false, // Auto-refresh every 5 seconds for digital payments
  });

  if (paymentMethod === "cash") {
    return (
      <Card data-testid="payment-status-card">
        <CardHeader>
          <CardTitle className="text-lg">Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-semibold">Cash on Delivery</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="font-bold text-lg text-primary">₱{amount.toFixed(2)}</p>
            </div>
          </div>
          <Badge variant="secondary" className="mt-4">
            <Clock className="mr-1 h-3 w-3" />
            Pay upon delivery
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card data-testid="payment-status-loading">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading payment status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (paymentStatus?.status === "success") {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (paymentStatus?.status === "failed") {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusBadge = () => {
    if (paymentStatus?.status === "success") {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    } else if (paymentStatus?.status === "failed") {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <Card data-testid="payment-status-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Payment Status</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="font-semibold">
              {paymentMethod === "gcash" ? "GCash" : paymentMethod === "maya" ? "Maya" : "Card"} Payment
            </p>
            <p className="text-sm text-muted-foreground">
              Transaction ID: {transactionId || "Processing..."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-bold text-lg">₱{amount.toFixed(2)}</p>
          </div>
          
          {paymentStatus?.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                onRefresh?.();
              }}
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Refresh Status
            </Button>
          )}
        </div>

        {paymentStatus?.data?.payout_gateway && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">Payment Gateway</p>
            <p className="font-medium">{paymentStatus.data.payout_gateway}</p>
          </div>
        )}

        {paymentStatus?.message && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">{paymentStatus.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}