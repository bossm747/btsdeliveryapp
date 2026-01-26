import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Store, Package, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CustomerHeader from "@/components/customer/customer-header";
import { CustomerPageWrapper } from "@/components/customer/customer-page-wrapper";

interface PublicConfig {
  success: boolean;
  config: {
    serviceFees: {
      pabili: {
        serviceFee: number;
        deliveryFee: number;
        currency: string;
      };
    };
  };
}

const pabiliStores = [
  { id: "grocery", name: "Grocery Store", icon: "🛒", category: "grocery" },
  { id: "pharmacy", name: "Pharmacy", icon: "💊", category: "pharmacy" },
  { id: "hardware", name: "Hardware Store", icon: "🔨", category: "hardware" },
  { id: "market", name: "Public Market", icon: "🏪", category: "market" },
  { id: "mall", name: "Shopping Mall", icon: "🏬", category: "mall" },
  { id: "other", name: "Iba Pa", icon: "📦", category: "other" }
];

// Default fees as fallback
const DEFAULT_SERVICE_FEE = 50;
const DEFAULT_DELIVERY_FEE = 49;

export default function Pabili() {
  const { toast } = useToast();
  const [selectedStore, setSelectedStore] = useState("");
  const [items, setItems] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");

  // Fetch service fees from public config
  const { data: configData } = useQuery<PublicConfig>({
    queryKey: ["/api/config/public"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Extract fees with fallbacks
  const serviceFee = configData?.config?.serviceFees?.pabili?.serviceFee ?? DEFAULT_SERVICE_FEE;
  const deliveryFee = configData?.config?.serviceFees?.pabili?.deliveryFee ?? DEFAULT_DELIVERY_FEE;
  const totalFees = serviceFee + deliveryFee;
  const isConfigLoading = !configData;

  const handleSubmitPabili = async () => {
    if (!selectedStore || !items || !deliveryAddress || !estimatedBudget) {
      toast({
        title: "Kulang ang impormasyon",
        description: "Pakipuno lahat ng required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/pabili", {
        storeType: selectedStore,
        items: items.split("\n").filter(i => i.trim()),
        deliveryAddress,
        specialInstructions,
        estimatedBudget: parseFloat(estimatedBudget),
        serviceFee,
        deliveryFee
      });

      toast({
        title: "Pabili request submitted!",
        description: "Hahanapin namin ang best shopper para sa inyo",
      });

      // Reset form
      setSelectedStore("");
      setItems("");
      setDeliveryAddress("");
      setSpecialInstructions("");
      setEstimatedBudget("");
    } catch (error) {
      toast({
        title: "Error",
        description: "May problema sa pag-submit. Subukan ulit.",
        variant: "destructive",
      });
    }
  };

  return (
    <CustomerPageWrapper
      refreshQueryKeys={["/api/config/public"]}
      pageTitle="Pabili Service"
      pageDescription="Request shopping assistance - we'll buy and deliver items for you"
    >
      <div className="min-h-screen bg-background pb-20" data-testid="page-pabili">
        <CustomerHeader title="Pabili Service" showBack backPath="/customer-dashboard" />

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600 text-center mb-6" data-testid="text-subtitle">
            Ipabili mo, dadalhin namin! Anywhere in Batangas Province
          </p>

          <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Piliin ang Store
              </CardTitle>
              <CardDescription>
                Saan mo gustong bumili?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pabiliStores.map((store) => (
                  <Button
                    key={store.id}
                    variant={selectedStore === store.id ? "default" : "outline"}
                    className="h-24 flex-col gap-2"
                    onClick={() => setSelectedStore(store.id)}
                    data-testid={`button-store-${store.id}`}
                  >
                    <span className="text-2xl">{store.icon}</span>
                    <span className="text-sm">{store.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Listahan ng Bibilhin
              </CardTitle>
              <CardDescription>
                Isulat ang mga items na gusto mong bilhin (isa per line)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Halimbawa:&#10;1 dozen itlog&#10;2 kilo bigas&#10;1 pack kape&#10;3 lata corned beef"
                value={items}
                onChange={(e) => setItems(e.target.value)}
                rows={5}
                className="w-full"
                data-testid="input-items"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Delivery Address *</Label>
                <Textarea
                  id="address"
                  placeholder="House #, Street, Barangay, City/Municipality"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={2}
                  data-testid="input-address"
                />
              </div>

              <div>
                <Label htmlFor="budget">Estimated Budget (₱) *</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="500"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(e.target.value)}
                  data-testid="input-budget"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Hindi kasama ang service fee (₱{serviceFee}) at delivery fee (₱{deliveryFee})
                </p>
              </div>

              <div>
                <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Mga specific brand, size, o iba pang instructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={2}
                  data-testid="input-instructions"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Estimated Item Cost:</span>
                  <span>₱{estimatedBudget || "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span>₱{serviceFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>₱{deliveryFee}</span>
                </div>
                <div className="border-t pt-2 font-bold">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span data-testid="text-total">
                      ₱{estimatedBudget ? (parseFloat(estimatedBudget) + totalFees).toFixed(2) : totalFees.toString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={handleSubmitPabili}
            disabled={!selectedStore || !items || !deliveryAddress || !estimatedBudget}
            data-testid="button-submit"
          >
            Submit Pabili Request
          </Button>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Paano ito gumagana?
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Piliin ang store at isulat ang listahan ng bibilhin</li>
              <li>Magbayad ng estimated cost + fees</li>
              <li>Ang aming shopper ay bibili para sa inyo</li>
              <li>I-deliver namin sa inyong address</li>
              <li>Bibigyan kayo ng resibo at sukli (kung meron)</li>
            </ol>
          </div>
          </div>
        </div>
      </div>
      </div>
    </CustomerPageWrapper>
  );
}