/**
 * Address Selector Component
 * For selecting saved addresses during checkout
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Plus,
  Star,
  Home,
  Building2,
  Briefcase,
  Navigation,
  CheckCircle2,
  Loader2,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { AddressAutocomplete } from "./address-autocomplete";

// Address interface matching the backend schema
interface Address {
  id: string;
  userId: string;
  title: string;
  streetAddress: string;
  barangay?: string;
  city: string;
  province: string;
  zipCode?: string;
  landmark?: string;
  deliveryInstructions?: string;
  coordinates?: { lat: number; lng: number };
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Selected address for checkout
export interface SelectedDeliveryAddress {
  id?: string; // Present if from saved addresses
  street: string;
  barangay?: string;
  city: string;
  province: string;
  zipCode?: string;
  landmark?: string;
  deliveryInstructions?: string;
  coordinates?: { lat: number; lng: number };
  isNewAddress: boolean;
}

interface AddressSelectorProps {
  onAddressSelect: (address: SelectedDeliveryAddress) => void;
  selectedAddressId?: string;
  className?: string;
  showAddNewOption?: boolean;
  allowNewAddressEntry?: boolean;
}

const addressIcons: Record<string, React.ReactNode> = {
  Home: <Home className="w-4 h-4" />,
  Work: <Briefcase className="w-4 h-4" />,
  Office: <Building2 className="w-4 h-4" />,
};

export function AddressSelector({
  onAddressSelect,
  selectedAddressId,
  className,
  showAddNewOption = true,
  allowNewAddressEntry = true,
}: AddressSelectorProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(selectedAddressId || null);
  const [showNewAddressDialog, setShowNewAddressDialog] = useState(false);
  const [isUsingNewAddress, setIsUsingNewAddress] = useState(false);

  // Fetch saved addresses
  const {
    data: addresses = [],
    isLoading,
    error,
  } = useQuery<Address[]>({
    queryKey: ["/api/customer/addresses"],
    enabled: !!user,
  });

  // Sort addresses: default first, then by title
  const sortedAddresses = [...addresses].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.title.localeCompare(b.title);
  });

  // Auto-select default address on first load
  React.useEffect(() => {
    if (!selectedId && sortedAddresses.length > 0 && !isUsingNewAddress) {
      const defaultAddress = sortedAddresses.find((a) => a.isDefault) || sortedAddresses[0];
      setSelectedId(defaultAddress.id);
      handleAddressSelection(defaultAddress);
    }
  }, [sortedAddresses, selectedId, isUsingNewAddress]);

  const handleAddressSelection = (address: Address) => {
    setSelectedId(address.id);
    setIsUsingNewAddress(false);
    onAddressSelect({
      id: address.id,
      street: address.streetAddress,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      zipCode: address.zipCode,
      landmark: address.landmark,
      deliveryInstructions: address.deliveryInstructions,
      coordinates: address.coordinates,
      isNewAddress: false,
    });
  };

  const handleNewAddressSelect = (addressDetails: any) => {
    setSelectedId(null);
    setIsUsingNewAddress(true);
    setShowNewAddressDialog(false);

    // Convert from AddressAutocomplete format
    const newAddress: SelectedDeliveryAddress = {
      street: addressDetails.street || addressDetails.formattedAddress || "",
      barangay: addressDetails.barangay || "",
      city: addressDetails.city || "",
      province: addressDetails.province || "Batangas",
      zipCode: addressDetails.zipCode || "",
      coordinates: addressDetails.coordinates,
      isNewAddress: true,
    };

    onAddressSelect(newAddress);
  };

  const getAddressIcon = (title: string) => {
    return addressIcons[title] || <MapPin className="w-4 h-4" />;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)} data-testid="address-selector-loading">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("border-destructive", className)} data-testid="address-selector-error">
        <CardContent className="p-4 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive">Failed to load saved addresses</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/customer/addresses"] })}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No saved addresses - show entry option
  if (addresses.length === 0) {
    return (
      <div className={cn("space-y-4", className)} data-testid="address-selector-empty">
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No saved addresses yet</p>
            {allowNewAddressEntry && (
              <>
                <AddressAutocomplete
                  placeholder="Enter your delivery address..."
                  showValidation={true}
                  onAddressSelect={handleNewAddressSelect}
                />
                <p className="text-xs text-muted-foreground mt-3">
                  You can save this address to your account after checkout
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} data-testid="address-selector">
      <RadioGroup
        value={isUsingNewAddress ? "new-address" : selectedId || ""}
        onValueChange={(value) => {
          if (value === "new-address") {
            setShowNewAddressDialog(true);
          } else {
            const address = addresses.find((a) => a.id === value);
            if (address) {
              handleAddressSelection(address);
            }
          }
        }}
      >
        {/* Saved Addresses */}
        {sortedAddresses.map((address) => (
          <div key={address.id} className="relative">
            <RadioGroupItem
              value={address.id}
              id={`address-${address.id}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`address-${address.id}`}
              className={cn(
                "flex cursor-pointer rounded-lg border-2 p-4 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                selectedId === address.id && !isUsingNewAddress
                  ? "border-primary bg-primary/5"
                  : "border-muted",
                address.isDefault && "ring-1 ring-orange-200"
              )}
              data-testid={`address-option-${address.id}`}
            >
              <div className="flex items-start gap-3 w-full">
                {/* Selection indicator */}
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                    selectedId === address.id && !isUsingNewAddress
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted"
                  )}
                >
                  {selectedId === address.id && !isUsingNewAddress && (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>

                {/* Address icon */}
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0",
                    address.isDefault
                      ? "bg-orange-100 text-orange-600"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {getAddressIcon(address.title)}
                </div>

                {/* Address details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{address.title}</span>
                    {address.isDefault && (
                      <Badge
                        variant="secondary"
                        className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0"
                      >
                        <Star className="w-3 h-3 mr-0.5" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground truncate">{address.streetAddress}</p>
                  <p className="text-xs text-muted-foreground">
                    {address.barangay && `${address.barangay}, `}
                    {address.city}, {address.province}
                    {address.zipCode && ` ${address.zipCode}`}
                  </p>
                  {address.landmark && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {address.landmark}
                    </p>
                  )}
                </div>
              </div>
            </Label>
          </div>
        ))}

        {/* Add New Address Option */}
        {showAddNewOption && allowNewAddressEntry && (
          <div className="relative">
            <RadioGroupItem value="new-address" id="new-address" className="peer sr-only" />
            <Label
              htmlFor="new-address"
              className={cn(
                "flex cursor-pointer rounded-lg border-2 border-dashed p-4 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                isUsingNewAddress ? "border-primary bg-primary/5" : "border-muted"
              )}
              data-testid="add-new-address-option"
            >
              <div className="flex items-center gap-3 w-full">
                {/* Selection indicator */}
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    isUsingNewAddress
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted"
                  )}
                >
                  {isUsingNewAddress && <CheckCircle2 className="h-4 w-4" />}
                </div>

                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <Plus className="w-4 h-4" />
                </div>

                <div className="flex-1">
                  <span className="font-medium text-sm">Use a different address</span>
                  <p className="text-xs text-muted-foreground">
                    Enter a new delivery address for this order
                  </p>
                </div>
              </div>
            </Label>
          </div>
        )}
      </RadioGroup>

      {/* New Address Dialog */}
      <Dialog open={showNewAddressDialog} onOpenChange={setShowNewAddressDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Enter Delivery Address
            </DialogTitle>
            <DialogDescription>
              Enter the address where you want your order delivered
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <AddressAutocomplete
              placeholder="Search for your address..."
              showValidation={true}
              manualEntryAllowed={true}
              onAddressSelect={handleNewAddressSelect}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Compact version for space-constrained areas
export function AddressSelectorCompact({
  onAddressSelect,
  selectedAddressId,
  className,
}: Omit<AddressSelectorProps, "showAddNewOption" | "allowNewAddressEntry">) {
  const { user } = useAuth();
  const [showSelector, setShowSelector] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<SelectedDeliveryAddress | null>(null);

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["/api/customer/addresses"],
    enabled: !!user,
  });

  // Set initial address
  React.useEffect(() => {
    if (!currentAddress && addresses.length > 0) {
      const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
      const selected: SelectedDeliveryAddress = {
        id: defaultAddress.id,
        street: defaultAddress.streetAddress,
        barangay: defaultAddress.barangay,
        city: defaultAddress.city,
        province: defaultAddress.province,
        zipCode: defaultAddress.zipCode,
        isNewAddress: false,
      };
      setCurrentAddress(selected);
      onAddressSelect(selected);
    }
  }, [addresses, currentAddress, onAddressSelect]);

  const handleSelect = (address: SelectedDeliveryAddress) => {
    setCurrentAddress(address);
    setShowSelector(false);
    onAddressSelect(address);
  };

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <div className={className}>
      {/* Current Selection Display */}
      <div
        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setShowSelector(true)}
        data-testid="address-selector-compact"
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <div>
            {currentAddress ? (
              <>
                <p className="font-medium text-sm">{currentAddress.street}</p>
                <p className="text-xs text-muted-foreground">
                  {currentAddress.city}, {currentAddress.province}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select delivery address</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Selector Dialog */}
      <Dialog open={showSelector} onOpenChange={setShowSelector}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Delivery Address</DialogTitle>
            <DialogDescription>Choose where to deliver your order</DialogDescription>
          </DialogHeader>
          <AddressSelector
            onAddressSelect={handleSelect}
            selectedAddressId={currentAddress?.id}
            showAddNewOption={true}
            allowNewAddressEntry={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AddressSelector;
