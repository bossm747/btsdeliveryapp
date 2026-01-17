import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  Clock,
  Calendar as CalendarIcon,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Settings,
  Timer,
  Power,
  Loader2,
  Sun,
  Moon
} from "lucide-react";
import { format } from "date-fns";
import type { Restaurant } from "@shared/schema";

// Types for business hours
interface DayHours {
  open: string;
  close: string;
  isClosed: boolean;
}

interface WeeklySchedule {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface HolidayHours {
  id: string;
  date: string;
  name: string;
  isClosed: boolean;
  open?: string;
  close?: string;
}

interface BusinessSettings {
  autoAcceptOrders: boolean;
  preparationTime: number;
  maxOrdersPerHour: number;
  temporaryClosure: boolean;
  closureReason?: string;
  closureUntil?: string;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DEFAULT_HOURS: DayHours = { open: '09:00', close: '21:00', isClosed: false };

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { ...DEFAULT_HOURS },
  tuesday: { ...DEFAULT_HOURS },
  wednesday: { ...DEFAULT_HOURS },
  thursday: { ...DEFAULT_HOURS },
  friday: { ...DEFAULT_HOURS },
  saturday: { ...DEFAULT_HOURS },
  sunday: { open: '10:00', close: '20:00', isClosed: false },
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

export default function BusinessSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for business hours
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [holidays, setHolidays] = useState<HolidayHours[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    autoAcceptOrders: false,
    preparationTime: 15,
    maxOrdersPerHour: 50,
    temporaryClosure: false,
  });

  // Holiday dialog state
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Partial<HolidayHours>>({
    date: '',
    name: '',
    isClosed: true,
    open: '09:00',
    close: '17:00'
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch vendor's restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Initialize state from restaurant data
  useEffect(() => {
    if (restaurant) {
      // Set operating hours
      if (restaurant.operatingHours && typeof restaurant.operatingHours === 'object') {
        setSchedule(restaurant.operatingHours as WeeklySchedule);
      }

      // Set holiday hours
      if (restaurant.holidayHours && Array.isArray(restaurant.holidayHours)) {
        setHolidays(restaurant.holidayHours as HolidayHours[]);
      }

      // Set business settings
      setSettings({
        autoAcceptOrders: restaurant.isAcceptingOrders ?? false,
        preparationTime: restaurant.preparationBuffer ?? 15,
        maxOrdersPerHour: restaurant.maxOrdersPerHour ?? 50,
        temporaryClosure: restaurant.pauseUntil ? new Date(restaurant.pauseUntil) > new Date() : false,
        closureUntil: restaurant.pauseUntil ? new Date(restaurant.pauseUntil).toISOString() : undefined,
      });
    }
  }, [restaurant]);

  // Save business settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: {
      operatingHours: WeeklySchedule;
      holidayHours: HolidayHours[];
      preparationBuffer: number;
      maxOrdersPerHour: number;
      isAcceptingOrders: boolean;
      pauseUntil: string | null;
    }) => {
      return await apiRequest('PATCH', '/api/vendor/restaurant', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/restaurant"] });
      toast({
        title: "Settings Saved",
        description: "Your business settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle schedule change for a specific day
  const handleScheduleChange = (
    day: keyof WeeklySchedule,
    field: keyof DayHours,
    value: string | boolean
  ) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Add holiday
  const handleAddHoliday = () => {
    if (!newHoliday.date || !newHoliday.name) {
      toast({
        title: "Missing Information",
        description: "Please provide both date and name for the holiday.",
        variant: "destructive",
      });
      return;
    }

    const holiday: HolidayHours = {
      id: crypto.randomUUID(),
      date: newHoliday.date,
      name: newHoliday.name,
      isClosed: newHoliday.isClosed ?? true,
      open: newHoliday.isClosed ? undefined : newHoliday.open,
      close: newHoliday.isClosed ? undefined : newHoliday.close,
    };

    setHolidays(prev => [...prev, holiday].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ));

    setNewHoliday({
      date: '',
      name: '',
      isClosed: true,
      open: '09:00',
      close: '17:00'
    });
    setSelectedDate(undefined);
    setIsAddHolidayOpen(false);

    toast({
      title: "Holiday Added",
      description: `${holiday.name} has been added to your schedule.`,
    });
  };

  // Remove holiday
  const handleRemoveHoliday = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
    toast({
      title: "Holiday Removed",
      description: "The holiday has been removed from your schedule.",
    });
  };

  // Save all settings
  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({
      operatingHours: schedule,
      holidayHours: holidays,
      preparationBuffer: settings.preparationTime,
      maxOrdersPerHour: settings.maxOrdersPerHour,
      isAcceptingOrders: settings.autoAcceptOrders,
      pauseUntil: settings.temporaryClosure && settings.closureUntil
        ? settings.closureUntil
        : null,
    });
  };

  // Toggle temporary closure
  const handleToggleClosure = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      temporaryClosure: enabled,
      closureUntil: enabled ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
    }));
  };

  if (restaurantLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-business-settings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your operating hours, holidays, and business preferences
          </p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={saveSettingsMutation.isPending}
          className="bg-primary hover:bg-primary/90"
          data-testid="button-save-settings"
        >
          {saveSettingsMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Temporary Closure Alert */}
      {settings.temporaryClosure && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                    Restaurant Temporarily Closed
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {settings.closureUntil
                      ? `Closed until ${format(new Date(settings.closureUntil), 'PPP p')}`
                      : 'Your restaurant is currently closed to new orders'
                    }
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleClosure(false)}
                className="border-orange-500 text-orange-700 hover:bg-orange-100"
              >
                <Power className="mr-2 h-4 w-4" />
                Reopen Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="hours" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Holidays
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Weekly Schedule Tab */}
        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Operating Hours
              </CardTitle>
              <CardDescription>
                Set your regular operating hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg"
                  data-testid={`schedule-${day}`}
                >
                  <div className="flex items-center justify-between sm:justify-start gap-4 min-w-[140px]">
                    <span className="font-medium capitalize text-gray-900 dark:text-white">
                      {day}
                    </span>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Switch
                        checked={!schedule[day].isClosed}
                        onCheckedChange={(checked) => handleScheduleChange(day, 'isClosed', !checked)}
                        data-testid={`switch-${day}-open`}
                      />
                      <Badge variant={schedule[day].isClosed ? "secondary" : "default"}>
                        {schedule[day].isClosed ? 'Closed' : 'Open'}
                      </Badge>
                    </div>
                  </div>

                  {!schedule[day].isClosed && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        <Select
                          value={schedule[day].open}
                          onValueChange={(value) => handleScheduleChange(day, 'open', value)}
                        >
                          <SelectTrigger className="w-28" data-testid={`select-${day}-open`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={`${day}-open-${time}`} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <span className="text-gray-500">to</span>

                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-blue-500" />
                        <Select
                          value={schedule[day].close}
                          onValueChange={(value) => handleScheduleChange(day, 'close', value)}
                        >
                          <SelectTrigger className="w-28" data-testid={`select-${day}-close`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={`${day}-close-${time}`} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const standardHours: DayHours = { open: '09:00', close: '21:00', isClosed: false };
                  setSchedule({
                    monday: standardHours,
                    tuesday: standardHours,
                    wednesday: standardHours,
                    thursday: standardHours,
                    friday: standardHours,
                    saturday: standardHours,
                    sunday: { ...standardHours, open: '10:00', close: '20:00' },
                  });
                }}
              >
                Set Standard Hours (9AM-9PM)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSchedule(prev => ({
                    ...prev,
                    saturday: { ...prev.saturday, isClosed: true },
                    sunday: { ...prev.sunday, isClosed: true },
                  }));
                }}
              >
                Close Weekends
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newSchedule = { ...schedule };
                  DAYS_OF_WEEK.forEach(day => {
                    newSchedule[day] = { ...newSchedule[day], isClosed: false };
                  });
                  setSchedule(newSchedule);
                }}
              >
                Open All Days
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Holiday & Special Hours
                  </CardTitle>
                  <CardDescription>
                    Set special operating hours or closures for holidays
                  </CardDescription>
                </div>
                <Dialog open={isAddHolidayOpen} onOpenChange={setIsAddHolidayOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-holiday">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Holiday
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Holiday or Special Hours</DialogTitle>
                      <DialogDescription>
                        Set special operating hours for a specific date
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                setSelectedDate(date);
                                setNewHoliday(prev => ({
                                  ...prev,
                                  date: date ? format(date, 'yyyy-MM-dd') : ''
                                }));
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="holiday-name">Holiday Name</Label>
                        <Input
                          id="holiday-name"
                          placeholder="e.g., Christmas Day, New Year"
                          value={newHoliday.name || ''}
                          onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="holiday-closed">Closed All Day</Label>
                        <Switch
                          id="holiday-closed"
                          checked={newHoliday.isClosed}
                          onCheckedChange={(checked) => setNewHoliday(prev => ({ ...prev, isClosed: checked }))}
                        />
                      </div>

                      {!newHoliday.isClosed && (
                        <div className="flex items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <Label>Open</Label>
                            <Select
                              value={newHoliday.open}
                              onValueChange={(value) => setNewHoliday(prev => ({ ...prev, open: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={`holiday-open-${time}`} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label>Close</Label>
                            <Select
                              value={newHoliday.close}
                              onValueChange={(value) => setNewHoliday(prev => ({ ...prev, close: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={`holiday-close-${time}`} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddHolidayOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddHoliday}>
                        Add Holiday
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">No Holidays Scheduled</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Add special hours or closures for holidays and events
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg"
                      data-testid={`holiday-${holiday.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <CalendarIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{holiday.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format(new Date(holiday.date), 'PPPP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={holiday.isClosed ? "secondary" : "default"}>
                          {holiday.isClosed ? 'Closed' : `${holiday.open} - ${holiday.close}`}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveHoliday(holiday.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Common Holidays Quick Add */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Add Common Holidays</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                { name: 'Christmas Day', month: 11, day: 25 },
                { name: 'New Year', month: 0, day: 1 },
                { name: 'Independence Day', month: 5, day: 12 },
                { name: 'Rizal Day', month: 11, day: 30 },
                { name: 'Labor Day', month: 4, day: 1 },
              ].map((h) => {
                const year = new Date().getFullYear();
                const holidayDate = new Date(year, h.month, h.day);
                if (holidayDate < new Date()) {
                  holidayDate.setFullYear(year + 1);
                }
                const dateStr = format(holidayDate, 'yyyy-MM-dd');
                const exists = holidays.some(holiday => holiday.date === dateStr);

                return (
                  <Button
                    key={h.name}
                    variant="outline"
                    size="sm"
                    disabled={exists}
                    onClick={() => {
                      setHolidays(prev => [...prev, {
                        id: crypto.randomUUID(),
                        date: dateStr,
                        name: h.name,
                        isClosed: true,
                      }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
                    }}
                  >
                    {exists ? <CheckCircle className="mr-1 h-3 w-3" /> : <Plus className="mr-1 h-3 w-3" />}
                    {h.name}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Auto Accept & Preparation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Order Preferences
              </CardTitle>
              <CardDescription>
                Configure how your restaurant handles incoming orders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Auto-Accept Orders</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically accept incoming orders without manual confirmation
                  </p>
                </div>
                <Switch
                  checked={settings.autoAcceptOrders}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoAcceptOrders: checked }))}
                  data-testid="switch-auto-accept"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Preparation Time (minutes)
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Average time needed to prepare an order
                </p>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={settings.preparationTime}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      preparationTime: parseInt(e.target.value) || 15
                    }))}
                    className="w-24"
                    data-testid="input-prep-time"
                  />
                  <span className="text-gray-500">minutes</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-medium">Maximum Orders Per Hour</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Limit the number of orders you can accept per hour
                </p>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={settings.maxOrdersPerHour}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxOrdersPerHour: parseInt(e.target.value) || 50
                    }))}
                    className="w-24"
                    data-testid="input-max-orders"
                  />
                  <span className="text-gray-500">orders/hour</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Temporary Closure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Temporary Closure
              </CardTitle>
              <CardDescription>
                Temporarily stop accepting orders without changing your regular hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Pause Orders</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Stop accepting new orders temporarily
                  </p>
                </div>
                <Switch
                  checked={settings.temporaryClosure}
                  onCheckedChange={handleToggleClosure}
                  data-testid="switch-temp-closure"
                />
              </div>

              {settings.temporaryClosure && (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg space-y-3">
                  <div className="space-y-2">
                    <Label>Closure Reason (optional)</Label>
                    <Input
                      placeholder="e.g., Kitchen maintenance, Staff meeting"
                      value={settings.closureReason || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, closureReason: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Reopen Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={settings.closureUntil ? settings.closureUntil.slice(0, 16) : ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        closureUntil: new Date(e.target.value).toISOString()
                      }))}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
