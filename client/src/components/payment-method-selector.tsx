import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Smartphone,
  Banknote,
  Plus,
  Trash2,
  Star,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Payment method type definitions
export interface SavedPaymentMethod {
  id: string;
  customerId: string;
  type: string; // card, gcash, maya, bank_account
  provider: string;
  token: string;
  displayName: string | null;
  lastFour: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  brand: string | null;
  nickname: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface PaymentMethodSelectorProps {
  onSelectPaymentMethod: (method: {
    type: 'saved' | 'new' | 'cod';
    savedMethodId?: string;
    paymentProvider?: string;
    paymentMethodType?: string;
    saveForFuture?: boolean;
  }) => void;
  selectedMethodId?: string;
  showSaveOption?: boolean;
  className?: string;
}

// Payment type icons
const PaymentTypeIcon = ({ type, brand }: { type: string; brand?: string | null }) => {
  switch (type) {
    case 'gcash':
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          GC
        </div>
      );
    case 'maya':
      return (
        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          M
        </div>
      );
    case 'card':
      if (brand?.toLowerCase() === 'visa') {
        return (
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            VISA
          </div>
        );
      }
      if (brand?.toLowerCase() === 'mastercard') {
        return (
          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            MC
          </div>
        );
      }
      return <CreditCard className="w-10 h-10 text-gray-500" />;
    case 'bank_account':
      return <Building2 className="w-10 h-10 text-gray-500" />;
    default:
      return <CreditCard className="w-10 h-10 text-gray-500" />;
  }
};

// Format masked payment method display
const formatPaymentDisplay = (method: SavedPaymentMethod) => {
  if (method.nickname) {
    return method.nickname;
  }
  if (method.displayName) {
    return method.displayName;
  }

  const typeLabel = method.type === 'gcash' ? 'GCash'
    : method.type === 'maya' ? 'Maya'
    : method.type === 'card' ? (method.brand || 'Card')
    : method.type === 'bank_account' ? 'Bank Account'
    : method.type;

  if (method.lastFour) {
    return `${typeLabel} ---- ${method.lastFour}`;
  }
  return typeLabel;
};

export function PaymentMethodSelector({
  onSelectPaymentMethod,
  selectedMethodId,
  showSaveOption = true,
  className
}: PaymentMethodSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedValue, setSelectedValue] = useState<string>(selectedMethodId || 'cod');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<string>('gcash');
  const [newPaymentNickname, setNewPaymentNickname] = useState('');
  const [saveNewMethod, setSaveNewMethod] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch saved payment methods
  const { data: savedMethods, isLoading } = useQuery<SavedPaymentMethod[]>({
    queryKey: ["/api/customer/payment-methods"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customer/payment-methods");
      const data = await response.json();
      return data.paymentMethods || [];
    },
    staleTime: 60000 // Cache for 1 minute
  });

  // Delete payment method mutation
  const deleteMutation = useMutation({
    mutationFn: async (methodId: string) => {
      const response = await apiRequest("DELETE", `/api/customer/payment-methods/${methodId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/payment-methods"] });
      toast({
        title: "Payment method removed",
        description: "The payment method has been removed successfully."
      });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive"
      });
    }
  });

  // Set default payment method mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: string) => {
      const response = await apiRequest("PATCH", `/api/customer/payment-methods/${methodId}/default`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/payment-methods"] });
      toast({
        title: "Default updated",
        description: "Your default payment method has been updated."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set default payment method",
        variant: "destructive"
      });
    }
  });

  // Handle selection change
  const handleSelectionChange = (value: string) => {
    setSelectedValue(value);

    if (value === 'cod') {
      onSelectPaymentMethod({ type: 'cod' });
    } else if (value.startsWith('saved_')) {
      const methodId = value.replace('saved_', '');
      const method = savedMethods?.find(m => m.id === methodId);
      if (method) {
        onSelectPaymentMethod({
          type: 'saved',
          savedMethodId: method.id,
          paymentProvider: method.provider,
          paymentMethodType: method.type
        });
      }
    } else if (value.startsWith('new_')) {
      const paymentType = value.replace('new_', '');
      onSelectPaymentMethod({
        type: 'new',
        paymentProvider: 'nexuspay',
        paymentMethodType: paymentType,
        saveForFuture: saveNewMethod
      });
    }
  };

  // Handle save for future checkbox
  const handleSaveForFutureChange = (checked: boolean) => {
    setSaveNewMethod(checked);
    if (selectedValue.startsWith('new_')) {
      const paymentType = selectedValue.replace('new_', '');
      onSelectPaymentMethod({
        type: 'new',
        paymentProvider: 'nexuspay',
        paymentMethodType: paymentType,
        saveForFuture: checked
      });
    }
  };

  // Find default payment method
  const defaultMethod = savedMethods?.find(m => m.isDefault);

  // Auto-select default method on load
  useState(() => {
    if (defaultMethod && !selectedMethodId) {
      setSelectedValue(`saved_${defaultMethod.id}`);
      onSelectPaymentMethod({
        type: 'saved',
        savedMethodId: defaultMethod.id,
        paymentProvider: defaultMethod.provider,
        paymentMethodType: defaultMethod.type
      });
    }
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="payment-method-selector">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedValue}
          onValueChange={handleSelectionChange}
          className="space-y-3"
        >
          {/* Saved Payment Methods */}
          {savedMethods && savedMethods.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Saved Payment Methods</Label>
              {savedMethods.map((method) => (
                <div
                  key={method.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 border rounded-lg transition-all",
                    selectedValue === `saved_${method.id}`
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <RadioGroupItem
                    value={`saved_${method.id}`}
                    id={`saved_${method.id}`}
                    className="shrink-0"
                  />
                  <Label
                    htmlFor={`saved_${method.id}`}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    <PaymentTypeIcon type={method.type} brand={method.brand} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {formatPaymentDisplay(method)}
                        </span>
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {method.lastFour && (
                        <span className="text-sm text-muted-foreground">
                          {method.type === 'card' && method.expiryMonth && method.expiryYear
                            ? `Expires ${method.expiryMonth.toString().padStart(2, '0')}/${method.expiryYear.toString().slice(-2)}`
                            : `Ending in ${method.lastFour}`}
                        </span>
                      )}
                    </div>
                  </Label>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!method.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.preventDefault();
                          setDefaultMutation.mutate(method.id);
                        }}
                        disabled={setDefaultMutation.isPending}
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteConfirmId(method.id);
                      }}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Payment Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              {savedMethods && savedMethods.length > 0 ? 'Or pay with' : 'Online Payment'}
            </Label>

            {/* GCash */}
            <div
              className={cn(
                "flex items-center space-x-3 p-3 border rounded-lg transition-all",
                selectedValue === "new_gcash"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <RadioGroupItem value="new_gcash" id="new_gcash" />
              <Label htmlFor="new_gcash" className="flex items-center gap-3 flex-1 cursor-pointer">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  GC
                </div>
                <div>
                  <span className="font-medium">GCash</span>
                  <span className="text-sm text-muted-foreground block">Pay with GCash e-wallet</span>
                </div>
              </Label>
            </div>

            {/* Maya */}
            <div
              className={cn(
                "flex items-center space-x-3 p-3 border rounded-lg transition-all",
                selectedValue === "new_maya"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <RadioGroupItem value="new_maya" id="new_maya" />
              <Label htmlFor="new_maya" className="flex items-center gap-3 flex-1 cursor-pointer">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  M
                </div>
                <div>
                  <span className="font-medium">Maya</span>
                  <span className="text-sm text-muted-foreground block">Pay with Maya e-wallet</span>
                </div>
              </Label>
            </div>

            {/* Card */}
            <div
              className={cn(
                "flex items-center space-x-3 p-3 border rounded-lg transition-all",
                selectedValue === "new_card"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <RadioGroupItem value="new_card" id="new_card" />
              <Label htmlFor="new_card" className="flex items-center gap-3 flex-1 cursor-pointer">
                <CreditCard className="w-10 h-10 text-gray-500" />
                <div>
                  <span className="font-medium">Credit/Debit Card</span>
                  <span className="text-sm text-muted-foreground block">Visa, Mastercard, JCB</span>
                </div>
              </Label>
            </div>
          </div>

          {/* Cash on Delivery */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Cash Payment</Label>
            <div
              className={cn(
                "flex items-center space-x-3 p-3 border rounded-lg transition-all",
                selectedValue === "cod"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <RadioGroupItem value="cod" id="cod" />
              <Label htmlFor="cod" className="flex items-center gap-3 flex-1 cursor-pointer">
                <Banknote className="w-10 h-10 text-green-600" />
                <div>
                  <span className="font-medium">Cash on Delivery</span>
                  <span className="text-sm text-muted-foreground block">Pay when your order arrives</span>
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>

        {/* Save for future checkbox - only for new payment methods */}
        {showSaveOption && selectedValue.startsWith('new_') && (
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="saveForFuture"
              checked={saveNewMethod}
              onCheckedChange={handleSaveForFutureChange}
            />
            <Label htmlFor="saveForFuture" className="text-sm cursor-pointer">
              Save this payment method for future orders
            </Label>
          </div>
        )}

        {/* Security note */}
        <Alert className="bg-muted/50">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            Your payment information is securely processed. We never store your full card numbers.
          </AlertDescription>
        </Alert>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Payment Method</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this payment method? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Hook for using saved payment methods
export function useSavedPaymentMethods() {
  const queryClient = useQueryClient();

  const { data: savedMethods, isLoading, error } = useQuery<SavedPaymentMethod[]>({
    queryKey: ["/api/customer/payment-methods"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customer/payment-methods");
      const data = await response.json();
      return data.paymentMethods || [];
    },
    staleTime: 60000
  });

  const saveMutation = useMutation({
    mutationFn: async (data: {
      type: string;
      provider: string;
      token: string;
      displayName?: string;
      lastFour?: string;
      expiryMonth?: number;
      expiryYear?: number;
      brand?: string;
      nickname?: string;
      isDefault?: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/customer/payment-methods", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/payment-methods"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (methodId: string) => {
      const response = await apiRequest("DELETE", `/api/customer/payment-methods/${methodId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/payment-methods"] });
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: string) => {
      const response = await apiRequest("PATCH", `/api/customer/payment-methods/${methodId}/default`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/payment-methods"] });
    }
  });

  return {
    savedMethods: savedMethods || [],
    isLoading,
    error,
    savePaymentMethod: saveMutation.mutateAsync,
    deletePaymentMethod: deleteMutation.mutateAsync,
    setDefaultPaymentMethod: setDefaultMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSettingDefault: setDefaultMutation.isPending
  };
}

export default PaymentMethodSelector;
