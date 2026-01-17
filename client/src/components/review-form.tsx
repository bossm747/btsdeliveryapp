import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  Camera,
  X,
  Loader2,
  Send,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Review validation schema
const reviewSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  reviewText: z.string().min(10, "Review must be at least 10 characters").max(1000, "Review must be less than 1000 characters"),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export interface ReviewFormProps {
  /** Order ID to submit review for */
  orderId: string;
  /** Restaurant name for display */
  restaurantName?: string;
  /** Callback when review is submitted successfully */
  onSuccess?: (review: any) => void;
  /** Callback when review submission fails */
  onError?: (error: Error) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is in a dialog/modal context */
  isDialog?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const RATING_LABELS = [
  "", // 0 index placeholder
  "Poor",
  "Fair",
  "Good",
  "Very Good",
  "Excellent",
];

const RATING_COLORS = [
  "",
  "text-red-500",
  "text-orange-500",
  "text-amber-500",
  "text-lime-500",
  "text-green-500",
];

export default function ReviewForm({
  orderId,
  restaurantName,
  onSuccess,
  onError,
  onCancel,
  isDialog = false,
  className,
}: ReviewFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hoveredRating, setHoveredRating] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      reviewText: "",
    },
  });

  const currentRating = form.watch("rating");
  const displayRating = hoveredRating || currentRating;

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      // Create FormData if there are photos
      if (photos.length > 0) {
        const formData = new FormData();
        formData.append("rating", data.rating.toString());
        formData.append("reviewText", data.reviewText);
        photos.forEach((photo, index) => {
          formData.append(`photos`, photo);
        });

        const response = await fetch(`/api/orders/${orderId}/review`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to submit review");
        }
        return response.json();
      } else {
        // No photos, use regular JSON request
        const response = await apiRequest("POST", `/api/orders/${orderId}/review`, data);
        return response.json();
      }
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
      onError?.(error);
    },
  });

  const handleStarClick = (rating: number) => {
    form.setValue("rating", rating, { shouldValidate: true });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select only image files",
          variant: "destructive",
        });
        return false;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Images must be less than 5MB",
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    // Limit to 3 photos total
    const remainingSlots = 3 - photos.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (validFiles.length > remainingSlots) {
      toast({
        title: "Maximum photos reached",
        description: "You can only add up to 3 photos",
      });
    }

    // Create preview URLs
    const newPreviewUrls = filesToAdd.map((file) => URL.createObjectURL(file));

    setPhotos((prev) => [...prev, ...filesToAdd]);
    setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(photoPreviewUrls[index]);

    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: ReviewFormData) => {
    submitReviewMutation.mutate(data);
  };

  // Success State
  if (isSubmitted) {
    return (
      <Card className={cn("border-green-200 bg-green-50", className)} data-testid="review-success">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            Thank You for Your Review!
          </h3>
          <p className="text-green-600 mb-4">
            Your feedback helps us improve our service and helps others make informed decisions.
          </p>
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="review-form">
      <CardHeader className={isDialog ? "pb-2" : undefined}>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#FF6B35]" />
          Rate Your Experience
        </CardTitle>
        {restaurantName && (
          <CardDescription>
            Share your feedback about your order from {restaurantName}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={isDialog ? "pt-2" : undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Star Rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div
                        className="flex items-center gap-1"
                        data-testid="star-rating"
                        onMouseLeave={() => setHoveredRating(0)}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={cn(
                              "p-1 transition-all duration-150 transform hover:scale-110",
                              "focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 rounded"
                            )}
                            onMouseEnter={() => setHoveredRating(star)}
                            onClick={() => handleStarClick(star)}
                            data-testid={`star-${star}`}
                          >
                            <Star
                              className={cn(
                                "w-10 h-10 transition-colors",
                                star <= displayRating
                                  ? "fill-[#FFD23F] text-[#FFD23F]"
                                  : "text-gray-300"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                      {displayRating > 0 && (
                        <p
                          className={cn(
                            "text-sm font-medium transition-colors",
                            RATING_COLORS[displayRating]
                          )}
                          data-testid="rating-label"
                        >
                          {RATING_LABELS[displayRating]}
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Review Text */}
            <FormField
              control={form.control}
              name="reviewText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your experience... What did you love? What could be improved?"
                      className="min-h-[120px] resize-none"
                      {...field}
                      data-testid="review-text-input"
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Minimum 10 characters</span>
                    <span>{field.value?.length || 0}/1000</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Add Photos (Optional)</Label>
              <div className="flex flex-wrap gap-3">
                {/* Photo Previews */}
                {photoPreviewUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative group"
                    data-testid={`photo-preview-${index}`}
                  >
                    <img
                      src={url}
                      alt={`Review photo ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePhoto(index)}
                      data-testid={`remove-photo-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add Photo Button */}
                {photos.length < 3 && (
                  <button
                    type="button"
                    className={cn(
                      "w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg",
                      "flex flex-col items-center justify-center gap-1",
                      "text-gray-400 hover:border-[#FF6B35] hover:text-[#FF6B35]",
                      "transition-colors cursor-pointer"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="add-photo-button"
                  >
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">Add</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                  data-testid="photo-input"
                />
              </div>
              <p className="text-xs text-gray-500">
                Add up to 3 photos of your order (max 5MB each)
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  disabled={submitReviewMutation.isPending}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className={cn(
                  "bg-[#FF6B35] hover:bg-[#FF6B35]/90",
                  onCancel ? "flex-1" : "w-full"
                )}
                disabled={submitReviewMutation.isPending || currentRating === 0}
                data-testid="submit-review-button"
              >
                {submitReviewMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Review
                  </>
                )}
              </Button>
            </div>

            {/* Error Message */}
            {submitReviewMutation.isError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">
                  {submitReviewMutation.error?.message || "Failed to submit review. Please try again."}
                </span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Named export for easy importing
export { ReviewForm };
