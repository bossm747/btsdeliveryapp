import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package, MapPin, User, Phone, Ruler, Weight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CustomerHeader from "@/components/customer/customer-header";

interface PackageSize {
  id: string;
  name: string;
  description: string;
  maxWeight: string;
  price: number;
}

interface PublicConfig {
  success: boolean;
  config: {
    serviceFees: {
      parcel: {
        packages: PackageSize[];
        currency: string;
      };
    };
  };
}

// Default package sizes as fallback
const DEFAULT_PACKAGE_SIZES: PackageSize[] = [
  { id: "small", name: "Small", description: "Kasya sa shoebox", maxWeight: "3kg", price: 60 },
  { id: "medium", name: "Medium", description: "Kasya sa balikbayan box (small)", maxWeight: "10kg", price: 100 },
  { id: "large", name: "Large", description: "Kasya sa balikbayan box (large)", maxWeight: "20kg", price: 150 },
  { id: "xlarge", name: "Extra Large", description: "Malaking item/appliance", maxWeight: "50kg", price: 250 }
];

export default function Parcel() {
  const { toast } = useToast();
  const [packageSize, setPackageSize] = useState("small");
  const [itemDescription, setItemDescription] = useState("");
  const [itemValue, setItemValue] = useState("");

  // Sender info
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");

  // Receiver info
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [specialInstructions, setSpecialInstructions] = useState("");

  // Fetch service fees from public config
  const { data: configData } = useQuery<PublicConfig>({
    queryKey: ["/api/config/public"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Extract package sizes with fallback
  const packageSizes = configData?.config?.serviceFees?.parcel?.packages ?? DEFAULT_PACKAGE_SIZES;

  const selectedPackage = packageSizes.find(p => p.id === packageSize) || packageSizes[0];

  const handleSubmitParcel = async () => {
    if (!senderName || !senderPhone || !pickupAddress || 
        !receiverName || !receiverPhone || !deliveryAddress || !itemDescription) {
      toast({
        title: "Kulang ang impormasyon",
        description: "Pakipuno lahat ng required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/parcel", {
        packageSize,
        itemDescription,
        itemValue: itemValue ? parseFloat(itemValue) : 0,
        sender: {
          name: senderName,
          phone: senderPhone,
          address: pickupAddress
        },
        receiver: {
          name: receiverName,
          phone: receiverPhone,
          address: deliveryAddress
        },
        specialInstructions,
        deliveryFee: selectedPackage.price
      });

      toast({
        title: "Parcel delivery booked!",
        description: "Kukunin namin ang package within 2 hours",
      });

      // Reset form
      setPackageSize("small");
      setItemDescription("");
      setItemValue("");
      setSenderName("");
      setSenderPhone("");
      setPickupAddress("");
      setReceiverName("");
      setReceiverPhone("");
      setDeliveryAddress("");
      setSpecialInstructions("");
    } catch (error) {
      toast({
        title: "Error",
        description: "May problema sa pag-book. Subukan ulit.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="page-parcel">
      <CustomerHeader title="Parcel Delivery" showBack backPath="/customer-dashboard" />

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600 text-center mb-6" data-testid="text-subtitle">
            Magpadala ng packages anywhere in Batangas Province
          </p>

          <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Package Size *</Label>
                <RadioGroup value={packageSize} onValueChange={setPackageSize}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {packageSizes.map((size) => (
                      <div key={size.id} className="flex items-start space-x-2">
                        <RadioGroupItem value={size.id} id={size.id} />
                        <Label htmlFor={size.id} className="cursor-pointer flex-1">
                          <div className="border rounded-lg p-3 hover:bg-gray-50">
                            <div className="font-semibold">{size.name} - ₱{size.price}</div>
                            <div className="text-sm text-gray-600">{size.description}</div>
                            <div className="text-xs text-gray-500">Max: {size.maxWeight}</div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="item-desc">Item Description *</Label>
                <Textarea
                  id="item-desc"
                  placeholder="Ano ang laman ng package? (e.g., documents, clothes, gadget)"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={2}
                  data-testid="input-description"
                />
              </div>

              <div>
                <Label htmlFor="item-value">Declared Value (₱) - Optional</Label>
                <Input
                  id="item-value"
                  type="number"
                  placeholder="Para sa insurance purposes"
                  value={itemValue}
                  onChange={(e) => setItemValue(e.target.value)}
                  data-testid="input-value"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Sender Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sender-name">Name *</Label>
                  <Input
                    id="sender-name"
                    placeholder="Full name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    data-testid="input-sender-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="sender-phone">Phone Number *</Label>
                  <Input
                    id="sender-phone"
                    placeholder="09XX XXX XXXX"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    data-testid="input-sender-phone"
                  />
                </div>

                <div>
                  <Label htmlFor="pickup-address">Pickup Address *</Label>
                  <Textarea
                    id="pickup-address"
                    placeholder="Complete address para sa pickup"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    rows={3}
                    data-testid="input-pickup-address"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Receiver Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="receiver-name">Name *</Label>
                  <Input
                    id="receiver-name"
                    placeholder="Full name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    data-testid="input-receiver-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="receiver-phone">Phone Number *</Label>
                  <Input
                    id="receiver-phone"
                    placeholder="09XX XXX XXXX"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    data-testid="input-receiver-phone"
                  />
                </div>

                <div>
                  <Label htmlFor="delivery-address">Delivery Address *</Label>
                  <Textarea
                    id="delivery-address"
                    placeholder="Complete address para sa delivery"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={3}
                    data-testid="input-delivery-address"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Special Instructions (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Fragile ba? May specific time ba? Other instructions..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
                data-testid="input-instructions"
              />
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle>Delivery Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Package Size:</span>
                  <span>{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Weight:</span>
                  <span>{selectedPackage.maxWeight}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="font-bold text-yellow-600" data-testid="text-fee">
                    ₱{selectedPackage.price}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

            <Button
              size="lg"
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              onClick={handleSubmitParcel}
              disabled={!senderName || !senderPhone || !pickupAddress ||
                      !receiverName || !receiverPhone || !deliveryAddress || !itemDescription}
              data-testid="button-submit"
            >
              Book Parcel Delivery
            </Button>

            <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">📦 Reminders</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Siguraduhing tama ang package size para maiwasan ang additional charges</li>
                <li>I-pack ng maayos ang fragile items</li>
                <li>Bawal ang prohibited items (weapons, illegal drugs, etc.)</li>
                <li>Pickup within 2 hours, delivery within the day</li>
                <li>Cash on delivery available for item value up to ₱5,000</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}