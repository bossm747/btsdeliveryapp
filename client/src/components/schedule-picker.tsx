import { useState, useMemo } from "react";
import { format, addDays, setHours, setMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock, Zap } from "lucide-react";

interface SchedulePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  restaurantHours?: {
    openTime: string; // "09:00"
    closeTime: string; // "21:00"
  };
  className?: string;
}

// Default restaurant hours (9am - 9pm)
const DEFAULT_HOURS = {
  openTime: "09:00",
  closeTime: "21:00"
};

// Generate 30-minute time slots
function generateTimeSlots(openTime: string, closeTime: string): string[] {
  const slots: string[] = [];
  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);

  let currentHour = openHour;
  let currentMinute = openMinute;

  while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
    const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
    slots.push(timeStr);

    // Add 30 minutes
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
  }

  return slots;
}

// Format time for display (e.g., "9:00 AM")
function formatTimeDisplay(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

export function SchedulePicker({
  value,
  onChange,
  restaurantHours = DEFAULT_HOURS,
  className
}: SchedulePickerProps) {
  const [deliveryMode, setDeliveryMode] = useState<"now" | "scheduled">(value ? "scheduled" : "now");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value ? startOfDay(value) : undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(
    value ? format(value, "HH:mm") : undefined
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Generate available dates (tomorrow and day after tomorrow)
  const availableDates = useMemo(() => {
    const tomorrow = addDays(new Date(), 1);
    const dayAfterTomorrow = addDays(new Date(), 2);
    return {
      min: startOfDay(tomorrow),
      max: startOfDay(dayAfterTomorrow)
    };
  }, []);

  // Generate time slots based on restaurant hours
  const timeSlots = useMemo(
    () => generateTimeSlots(restaurantHours.openTime, restaurantHours.closeTime),
    [restaurantHours]
  );

  // Filter time slots for the selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return timeSlots;

    const now = new Date();
    const isToday = startOfDay(selectedDate).getTime() === startOfDay(now).getTime();

    if (isToday) {
      // If somehow today is selected (shouldn't be), filter out past times + 1 hour buffer
      const bufferTime = new Date(now.getTime() + 60 * 60 * 1000);
      return timeSlots.filter(slot => {
        const [hour, minute] = slot.split(":").map(Number);
        const slotTime = setMinutes(setHours(selectedDate, hour), minute);
        return isAfter(slotTime, bufferTime);
      });
    }

    return timeSlots;
  }, [selectedDate, timeSlots]);

  // Handle mode change
  const handleModeChange = (mode: "now" | "scheduled") => {
    setDeliveryMode(mode);
    if (mode === "now") {
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      onChange(null);
    }
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);

    // Reset time selection when date changes
    if (date && selectedTime) {
      updateScheduledDateTime(date, selectedTime);
    }
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      updateScheduledDateTime(selectedDate, time);
    }
  };

  // Combine date and time into a single DateTime and call onChange
  const updateScheduledDateTime = (date: Date, time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const scheduledDate = setMinutes(setHours(date, hour), minute);
    onChange(scheduledDate);
  };

  // Disable dates outside the allowed range (only tomorrow and day after tomorrow)
  const disabledDates = (date: Date) => {
    const dateStart = startOfDay(date);
    return isBefore(dateStart, availableDates.min) || isAfter(dateStart, availableDates.max);
  };

  return (
    <Card className={cn("border-primary/20", className)} data-testid="schedule-picker">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          Delivery Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Delivery Mode Toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={deliveryMode === "now" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => handleModeChange("now")}
            data-testid="deliver-now-btn"
          >
            <Zap className="h-4 w-4 mr-1" />
            Deliver Now
          </Button>
          <Button
            type="button"
            variant={deliveryMode === "scheduled" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => handleModeChange("scheduled")}
            data-testid="schedule-later-btn"
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Schedule for Later
          </Button>
        </div>

        {/* Scheduled Delivery Options */}
        {deliveryMode === "scheduled" && (
          <div className="space-y-4 pt-2">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Date</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                    data-testid="date-picker-trigger"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={disabledDates}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Available for tomorrow or the day after (24-48 hours in advance)
              </p>
            </div>

            {/* Time Picker */}
            {selectedDate && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Time</Label>
                <Select value={selectedTime} onValueChange={handleTimeSelect}>
                  <SelectTrigger className="w-full" data-testid="time-picker-trigger">
                    <SelectValue placeholder="Select a time slot" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {formatTimeDisplay(slot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  30-minute delivery windows from {formatTimeDisplay(restaurantHours.openTime)} to {formatTimeDisplay(restaurantHours.closeTime)}
                </p>
              </div>
            )}

            {/* Selected Schedule Summary */}
            {selectedDate && selectedTime && (
              <div className="rounded-lg bg-primary/5 p-3 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Scheduled
                  </Badge>
                  <span className="text-sm font-medium">
                    {format(selectedDate, "EEE, MMM d")} at {formatTimeDisplay(selectedTime)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your order will be prepared and delivered at the scheduled time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Deliver Now Summary */}
        {deliveryMode === "now" && (
          <div className="rounded-lg bg-green-50 p-3 border border-green-200">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                ASAP
              </Badge>
              <span className="text-sm font-medium text-green-800">
                Delivery as soon as possible
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your order will be prepared and delivered right away.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
