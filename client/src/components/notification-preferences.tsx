import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Mail,
  Phone,
  Smartphone,
  Package,
  Truck,
  Clock,
  Tag,
  Store,
  Gift,
  Shield,
  Calendar,
  Moon,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface NotificationPreferencesData {
  // Channel preferences
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;

  // Order notification preferences
  orderUpdates: boolean;
  orderPlaced: boolean;
  orderConfirmed: boolean;
  orderPreparing: boolean;
  orderReady: boolean;
  orderDelivered: boolean;

  // Rider notification preferences
  riderUpdates: boolean;
  riderAssigned: boolean;
  riderArriving: boolean;

  // Marketing/Promotional preferences
  promotionalEmails: boolean;
  restaurantUpdates: boolean;
  loyaltyRewards: boolean;

  // System preferences
  securityAlerts: boolean;
  weeklyDigest: boolean;

  // Quiet hours settings
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface NotificationPreferencesProps {
  preferences: NotificationPreferencesData | null | undefined;
  isLoading?: boolean;
}

// Generate time options for quiet hours
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    const formattedHour = hour.toString().padStart(2, "0");
    options.push({
      value: `${formattedHour}:00`,
      label: hour === 0 ? "12:00 AM" : hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`,
    });
  }
  return options;
};

const timeOptions = generateTimeOptions();

export default function NotificationPreferences({
  preferences,
  isLoading = false,
}: NotificationPreferencesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState({
    orderNotifications: true,
    riderNotifications: false,
  });

  // Local state for preferences
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferencesData>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    orderPlaced: true,
    orderConfirmed: true,
    orderPreparing: true,
    orderReady: true,
    orderDelivered: true,
    riderUpdates: true,
    riderAssigned: true,
    riderArriving: true,
    promotionalEmails: true,
    restaurantUpdates: true,
    loyaltyRewards: true,
    securityAlerts: true,
    weeklyDigest: false,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  });

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        emailNotifications: preferences.emailNotifications ?? true,
        smsNotifications: preferences.smsNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? true,
        orderUpdates: preferences.orderUpdates ?? true,
        orderPlaced: preferences.orderPlaced ?? true,
        orderConfirmed: preferences.orderConfirmed ?? true,
        orderPreparing: preferences.orderPreparing ?? true,
        orderReady: preferences.orderReady ?? true,
        orderDelivered: preferences.orderDelivered ?? true,
        riderUpdates: preferences.riderUpdates ?? true,
        riderAssigned: preferences.riderAssigned ?? true,
        riderArriving: preferences.riderArriving ?? true,
        promotionalEmails: preferences.promotionalEmails ?? true,
        restaurantUpdates: preferences.restaurantUpdates ?? true,
        loyaltyRewards: preferences.loyaltyRewards ?? true,
        securityAlerts: preferences.securityAlerts ?? true,
        weeklyDigest: preferences.weeklyDigest ?? false,
        quietHoursEnabled: preferences.quietHoursEnabled ?? false,
        quietHoursStart: preferences.quietHoursStart ?? "22:00",
        quietHoursEnd: preferences.quietHoursEnd ?? "08:00",
      });
      setHasChanges(false);
    }
  }, [preferences]);

  // Update notification preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Partial<NotificationPreferencesData>) => {
      const response = await apiRequest("PUT", "/api/customer/notification-preferences", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/notification-preferences"] });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof NotificationPreferencesData, value: boolean) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleTimeChange = (key: "quietHoursStart" | "quietHoursEnd", value: string) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updatePreferencesMutation.mutate(localPrefs);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Communication Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#FF6B35]" />
            Communication Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <Label htmlFor="email-toggle" className="font-medium cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Receive order confirmations and updates via email
                </p>
              </div>
            </div>
            <Switch
              id="email-toggle"
              checked={localPrefs.emailNotifications}
              onCheckedChange={(checked) => handleToggle("emailNotifications", checked)}
              data-testid="email-notifications-switch"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Phone className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <Label htmlFor="sms-toggle" className="font-medium cursor-pointer">
                  SMS Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Receive critical updates via text message
                </p>
              </div>
            </div>
            <Switch
              id="sms-toggle"
              checked={localPrefs.smsNotifications}
              onCheckedChange={(checked) => handleToggle("smsNotifications", checked)}
              data-testid="sms-notifications-switch"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Smartphone className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <Label htmlFor="push-toggle" className="font-medium cursor-pointer">
                  Push Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Real-time updates on your device
                </p>
              </div>
            </div>
            <Switch
              id="push-toggle"
              checked={localPrefs.pushNotifications}
              onCheckedChange={(checked) => handleToggle("pushNotifications", checked)}
              data-testid="push-notifications-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Notifications */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("orderNotifications")}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#FF6B35]" />
                Order Notifications
              </CardTitle>
              <CardDescription>
                Get updates about your order status
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                checked={localPrefs.orderUpdates}
                onCheckedChange={(checked) => handleToggle("orderUpdates", checked)}
                onClick={(e) => e.stopPropagation()}
                data-testid="order-updates-master-switch"
              />
              {expandedSections.orderNotifications ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        {expandedSections.orderNotifications && localPrefs.orderUpdates && (
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm text-gray-500 mb-4">
              Choose which order status updates you want to receive:
            </p>

            <div className="grid gap-3">
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm">Order Placed</span>
                </div>
                <Switch
                  checked={localPrefs.orderPlaced}
                  onCheckedChange={(checked) => handleToggle("orderPlaced", checked)}
                  data-testid="order-placed-switch"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm">Order Confirmed</span>
                </div>
                <Switch
                  checked={localPrefs.orderConfirmed}
                  onCheckedChange={(checked) => handleToggle("orderConfirmed", checked)}
                  data-testid="order-confirmed-switch"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="text-sm">Order Preparing</span>
                </div>
                <Switch
                  checked={localPrefs.orderPreparing}
                  onCheckedChange={(checked) => handleToggle("orderPreparing", checked)}
                  data-testid="order-preparing-switch"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="text-sm">Order Ready for Pickup</span>
                </div>
                <Switch
                  checked={localPrefs.orderReady}
                  onCheckedChange={(checked) => handleToggle("orderReady", checked)}
                  data-testid="order-ready-switch"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-sm">Order Delivered</span>
                </div>
                <Switch
                  checked={localPrefs.orderDelivered}
                  onCheckedChange={(checked) => handleToggle("orderDelivered", checked)}
                  data-testid="order-delivered-switch"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Rider Notifications */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("riderNotifications")}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#FF6B35]" />
                Rider Updates
              </CardTitle>
              <CardDescription>
                Track your delivery rider in real-time
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                checked={localPrefs.riderUpdates}
                onCheckedChange={(checked) => handleToggle("riderUpdates", checked)}
                onClick={(e) => e.stopPropagation()}
                data-testid="rider-updates-master-switch"
              />
              {expandedSections.riderNotifications ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        {expandedSections.riderNotifications && localPrefs.riderUpdates && (
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm text-gray-500 mb-4">
              Choose which rider updates you want to receive:
            </p>

            <div className="grid gap-3">
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Rider Assigned</span>
                </div>
                <Switch
                  checked={localPrefs.riderAssigned}
                  onCheckedChange={(checked) => handleToggle("riderAssigned", checked)}
                  data-testid="rider-assigned-switch"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Rider Arriving</span>
                </div>
                <Switch
                  checked={localPrefs.riderArriving}
                  onCheckedChange={(checked) => handleToggle("riderArriving", checked)}
                  data-testid="rider-arriving-switch"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Marketing & Promotional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#FF6B35]" />
            Marketing & Promotions
          </CardTitle>
          <CardDescription>
            Stay updated with offers and deals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-full">
                <Tag className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <Label htmlFor="promo-toggle" className="font-medium cursor-pointer">
                  Promotional Offers
                </Label>
                <p className="text-sm text-gray-500">
                  Discounts, vouchers, and special deals
                </p>
              </div>
            </div>
            <Switch
              id="promo-toggle"
              checked={localPrefs.promotionalEmails}
              onCheckedChange={(checked) => handleToggle("promotionalEmails", checked)}
              data-testid="promotional-emails-switch"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <Store className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <Label htmlFor="restaurant-toggle" className="font-medium cursor-pointer">
                  Restaurant Updates
                </Label>
                <p className="text-sm text-gray-500">
                  New menus and updates from your favorites
                </p>
              </div>
            </div>
            <Switch
              id="restaurant-toggle"
              checked={localPrefs.restaurantUpdates}
              onCheckedChange={(checked) => handleToggle("restaurantUpdates", checked)}
              data-testid="restaurant-updates-switch"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Gift className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <Label htmlFor="loyalty-toggle" className="font-medium cursor-pointer">
                  Loyalty & Rewards
                </Label>
                <p className="text-sm text-gray-500">
                  Points earned and reward updates
                </p>
              </div>
            </div>
            <Switch
              id="loyalty-toggle"
              checked={localPrefs.loyaltyRewards}
              onCheckedChange={(checked) => handleToggle("loyaltyRewards", checked)}
              data-testid="loyalty-rewards-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#FF6B35]" />
            System Notifications
          </CardTitle>
          <CardDescription>
            Important account and security updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <Label htmlFor="security-toggle" className="font-medium cursor-pointer">
                  Security Alerts
                </Label>
                <p className="text-sm text-gray-500">
                  Login alerts and account security updates
                </p>
              </div>
            </div>
            <Switch
              id="security-toggle"
              checked={localPrefs.securityAlerts}
              onCheckedChange={(checked) => handleToggle("securityAlerts", checked)}
              data-testid="security-alerts-switch"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-full">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <Label htmlFor="digest-toggle" className="font-medium cursor-pointer">
                  Weekly Digest
                </Label>
                <p className="text-sm text-gray-500">
                  Weekly summary of your orders and savings
                </p>
              </div>
            </div>
            <Switch
              id="digest-toggle"
              checked={localPrefs.weeklyDigest}
              onCheckedChange={(checked) => handleToggle("weeklyDigest", checked)}
              data-testid="weekly-digest-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-[#FF6B35]" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-full">
                <Moon className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <Label htmlFor="quiet-toggle" className="font-medium cursor-pointer">
                  Enable Quiet Hours
                </Label>
                <p className="text-sm text-gray-500">
                  Pause non-urgent notifications during set times
                </p>
              </div>
            </div>
            <Switch
              id="quiet-toggle"
              checked={localPrefs.quietHoursEnabled}
              onCheckedChange={(checked) => handleToggle("quietHoursEnabled", checked)}
              data-testid="quiet-hours-switch"
            />
          </div>

          {localPrefs.quietHoursEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Select
                    value={localPrefs.quietHoursStart || "22:00"}
                    onValueChange={(value) => handleTimeChange("quietHoursStart", value)}
                  >
                    <SelectTrigger id="quiet-start" data-testid="quiet-hours-start-select">
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Select
                    value={localPrefs.quietHoursEnd || "08:00"}
                    onValueChange={(value) => handleTimeChange("quietHoursEnd", value)}
                  >
                    <SelectTrigger id="quiet-end" data-testid="quiet-hours-end-select">
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Critical notifications like security alerts will still be delivered.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-4">
        <Button
          onClick={handleSave}
          className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 shadow-lg"
          disabled={!hasChanges || updatePreferencesMutation.isPending}
          data-testid="save-notification-preferences-button"
        >
          {updatePreferencesMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </div>
    </div>
  );
}
