import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CustomerHeader from "@/components/customer/customer-header";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Home,
  Building2,
  Briefcase,
  ArrowLeft,
  Loader2,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

// Address validation schema
const addressSchema = z.object({
  title: z.string().min(1, "Address label is required").max(100),
  streetAddress: z.string().min(5, "Street address is required").max(255),
  barangay: z.string().max(100).optional(),
  city: z.string().min(1, "City is required").max(100),
  province: z.string().min(1, "Province is required").max(100),
  zipCode: z.string().max(10).optional(),
  landmark: z.string().max(255).optional(),
  deliveryInstructions: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

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

const addressIcons: Record<string, React.ReactNode> = {
  Home: <Home className="w-5 h-5" />,
  Work: <Briefcase className="w-5 h-5" />,
  Office: <Building2 className="w-5 h-5" />,
};

export default function AddressesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Fetch addresses
  const { data: addresses = [], isLoading, error } = useQuery<Address[]>({
    queryKey: ["/api/customer/addresses"],
    enabled: !!user,
  });

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      title: "",
      streetAddress: "",
      barangay: "",
      city: "",
      province: "Batangas",
      zipCode: "",
      landmark: "",
      deliveryInstructions: "",
      isDefault: false,
    },
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const response = await apiRequest("POST", "/api/customer/addresses", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Address Added",
        description: "Your new address has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/addresses"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add address",
        variant: "destructive",
      });
    },
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddressFormData }) => {
      const response = await apiRequest("PUT", `/api/customer/addresses/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Address Updated",
        description: "Your address has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/addresses"] });
      setIsEditDialogOpen(false);
      setSelectedAddress(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update address",
        variant: "destructive",
      });
    },
  });

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/customer/addresses/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Address Deleted",
        description: "The address has been removed from your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/addresses"] });
      setIsDeleteDialogOpen(false);
      setSelectedAddress(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete address",
        variant: "destructive",
      });
    },
  });

  // Set default address mutation
  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PUT", `/api/customer/addresses/${id}/default`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Default Address Updated",
        description: "Your default delivery address has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/addresses"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set default address",
        variant: "destructive",
      });
    },
  });

  const handleAddAddress = (data: AddressFormData) => {
    createAddressMutation.mutate(data);
  };

  const handleEditAddress = (data: AddressFormData) => {
    if (selectedAddress) {
      updateAddressMutation.mutate({ id: selectedAddress.id, data });
    }
  };

  const handleDeleteAddress = () => {
    if (selectedAddress) {
      deleteAddressMutation.mutate(selectedAddress.id);
    }
  };

  const handleSetDefault = (address: Address) => {
    if (!address.isDefault) {
      setDefaultAddressMutation.mutate(address.id);
    }
  };

  const openEditDialog = (address: Address) => {
    setSelectedAddress(address);
    form.reset({
      title: address.title,
      streetAddress: address.streetAddress,
      barangay: address.barangay || "",
      city: address.city,
      province: address.province,
      zipCode: address.zipCode || "",
      landmark: address.landmark || "",
      deliveryInstructions: address.deliveryInstructions || "",
      isDefault: address.isDefault,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (address: Address) => {
    setSelectedAddress(address);
    setIsDeleteDialogOpen(true);
  };

  const getAddressIcon = (title: string) => {
    return addressIcons[title] || <MapPin className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="addresses-loading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="addresses-error">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Unable to load addresses</h2>
              <p className="text-gray-600 mb-4">
                There was an error loading your addresses. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="addresses-page">
      <CustomerHeader
        title="My Addresses"
        showBack
        backPath="/customer-dashboard"
        rightContent={
          <Button
            onClick={() => {
              form.reset();
              setIsAddDialogOpen(true);
            }}
            size="sm"
            className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
            data-testid="add-address-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Description */}
        <div className="mb-6">
          <p className="text-gray-600">Manage your delivery addresses</p>
        </div>

        {/* Address List */}
        {addresses.length === 0 ? (
          <Card data-testid="no-addresses">
            <CardContent className="p-12 text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No saved addresses</h3>
              <p className="text-gray-600 mb-4">
                Add your first delivery address to get started
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4" data-testid="address-list">
            {addresses.map((address) => (
              <Card
                key={address.id}
                className={`transition-all hover:shadow-md ${
                  address.isDefault ? "border-[#FF6B35] border-2" : ""
                }`}
                data-testid={`address-card-${address.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div
                        className={`p-3 rounded-full ${
                          address.isDefault
                            ? "bg-[#FF6B35]/10 text-[#FF6B35]"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {getAddressIcon(address.title)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg" data-testid="address-title">
                            {address.title}
                          </h3>
                          {address.isDefault && (
                            <Badge className="bg-[#FF6B35] text-white" data-testid="default-badge">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-700" data-testid="address-street">
                          {address.streetAddress}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {address.barangay && `${address.barangay}, `}
                          {address.city}, {address.province}
                          {address.zipCode && ` ${address.zipCode}`}
                        </p>
                        {address.landmark && (
                          <p className="text-gray-500 text-sm mt-1">
                            <Navigation className="w-3 h-3 inline mr-1" />
                            {address.landmark}
                          </p>
                        )}
                        {address.deliveryInstructions && (
                          <p className="text-gray-500 text-sm mt-1 italic">
                            "{address.deliveryInstructions}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!address.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(address)}
                          disabled={setDefaultAddressMutation.isPending}
                          data-testid="set-default-button"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(address)}
                        data-testid="edit-address-button"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteDialog(address)}
                        data-testid="delete-address-button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Address Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#FF6B35]" />
                Add New Address
              </DialogTitle>
              <DialogDescription>
                Add a new delivery address to your account
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddAddress)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Label</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Home, Work, Office"
                          {...field}
                          data-testid="title-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="House/Unit No., Street Name"
                          {...field}
                          data-testid="street-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="barangay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barangay</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Barangay name"
                            {...field}
                            data-testid="barangay-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City/Municipality</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="City name"
                            {...field}
                            data-testid="city-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="province-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 4200"
                            {...field}
                            data-testid="zipcode-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="landmark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landmark (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Near McDonald's, Beside the church"
                          {...field}
                          data-testid="landmark-input"
                        />
                      </FormControl>
                      <FormDescription>
                        Help riders find your location easily
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Leave at the gate, Ring doorbell twice"
                          {...field}
                          data-testid="instructions-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Set as default address</FormLabel>
                        <FormDescription>
                          Use this address by default for deliveries
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="default-switch"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                    disabled={createAddressMutation.isPending}
                    data-testid="submit-address-button"
                  >
                    {createAddressMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Address"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Address Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#FF6B35]" />
                Edit Address
              </DialogTitle>
              <DialogDescription>
                Update your delivery address details
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEditAddress)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Label</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="edit-title-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="edit-street-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="barangay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barangay</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="edit-barangay-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City/Municipality</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="edit-city-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="edit-province-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="edit-zipcode-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="landmark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landmark (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="edit-landmark-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="edit-instructions-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Set as default address</FormLabel>
                        <FormDescription>
                          Use this address by default for deliveries
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="edit-default-switch"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                    disabled={updateAddressMutation.isPending}
                    data-testid="update-address-button"
                  >
                    {updateAddressMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Address"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Address</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedAddress?.title}"? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAddress}
                className="bg-red-600 hover:bg-red-700"
                data-testid="confirm-delete-button"
              >
                {deleteAddressMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
