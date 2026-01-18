import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  RefreshCw,
  Check,
  X,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  DoorOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DELIVERY_TYPES, type DeliveryType } from "@shared/schema";

interface DeliveryProofCaptureProps {
  orderId: string;
  deliveryType: DeliveryType;
  contactlessInstructions?: string | null;
  onPhotoUploaded: (photoUrl: string) => void;
  onSkip?: () => void;
  isRequired?: boolean;
  className?: string;
}

export default function DeliveryProofCapture({
  orderId,
  deliveryType,
  contactlessInstructions,
  onPhotoUploaded,
  onSkip,
  isRequired = false,
  className = "",
}: DeliveryProofCaptureProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  // Determine if photo is required based on delivery type
  const photoRequired = isRequired || deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR;

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orderId", orderId);
      formData.append("photoType", "delivery_proof");
      formData.append("timestamp", new Date().toISOString());

      const response = await apiRequest("POST", "/api/delivery-proof/upload", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Photo Uploaded",
        description: "Delivery proof photo has been saved successfully.",
      });
      onPhotoUploaded(data.photoUrl);
      resetCapture();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (error) {
      console.error("Camera access error:", error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access or use the file upload option.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob and create file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `delivery-proof-${orderId}-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setCapturedFile(file);
          setPreviewUrl(canvas.toDataURL("image/jpeg"));
          stopCamera();
        }
      },
      "image/jpeg",
      0.85
    );
  }, [orderId, stopCamera]);

  // Handle file selection from input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCapturedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Reset capture state
  const resetCapture = () => {
    setPreviewUrl(null);
    setCapturedFile(null);
    stopCamera();
  };

  // Confirm and upload photo
  const confirmUpload = () => {
    if (capturedFile) {
      uploadPhotoMutation.mutate(capturedFile);
    }
  };

  return (
    <Card className={`border-2 ${photoRequired ? "border-blue-200" : "border-gray-200"} ${className}`} data-testid="delivery-proof-capture">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            <span>Delivery Proof Photo</span>
          </div>
          {photoRequired && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Required
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contactless Instructions Alert */}
        {deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR && (
          <Alert className="border-blue-200 bg-blue-50">
            <DoorOpen className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              <strong>Leave at Door</strong>
              {contactlessInstructions && (
                <span className="block mt-1">
                  Instructions: {contactlessInstructions}
                </span>
              )}
              <span className="block mt-1 text-blue-600">
                Take a clear photo showing where you left the order.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Hidden canvas for camera capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera View or Preview */}
        {isCameraActive ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-white/30 rounded-lg pointer-events-none" />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={capturePhoto}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="capture-photo-button"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button
                variant="outline"
                onClick={stopCamera}
                data-testid="cancel-camera-button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden aspect-[4/3]">
              <img
                src={previewUrl}
                alt="Delivery proof preview"
                className="w-full h-full object-cover"
                data-testid="photo-preview"
              />
              {uploadPhotoMutation.isPending && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={confirmUpload}
                disabled={uploadPhotoMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="confirm-upload-button"
              >
                {uploadPhotoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm & Upload
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resetCapture}
                disabled={uploadPhotoMutation.isPending}
                data-testid="retake-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
              <Camera className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                Take a photo of the delivery location
              </p>
              <p className="text-xs text-gray-500">
                Show clearly where the order was left
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={startCamera}
                className="bg-primary hover:bg-primary/90"
                data-testid="open-camera-button"
              >
                <Camera className="h-4 w-4 mr-2" />
                Open Camera
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="upload-file-button"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          </div>
        )}

        {/* Warning for required photo */}
        {photoRequired && !previewUrl && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 text-sm">
              Photo proof is required for contactless deliveries. Please take a clear photo before completing the delivery.
            </AlertDescription>
          </Alert>
        )}

        {/* Skip option for non-required photos */}
        {!photoRequired && onSkip && !previewUrl && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="w-full text-muted-foreground"
            data-testid="skip-photo-button"
          >
            Skip photo (not required)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Compact photo display for order details
export function DeliveryProofDisplay({
  photoUrl,
  timestamp,
  className = "",
}: {
  photoUrl: string;
  timestamp?: string;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`space-y-2 ${className}`} data-testid="delivery-proof-display">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Camera className="h-4 w-4" />
        <span>Delivery Proof Photo</span>
        {timestamp && (
          <span className="text-xs text-muted-foreground/70 ml-auto">
            {new Date(timestamp).toLocaleString()}
          </span>
        )}
      </div>
      <div
        className={`relative rounded-lg overflow-hidden border cursor-pointer ${
          isExpanded ? "aspect-auto" : "aspect-video"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <img
          src={photoUrl}
          alt="Delivery proof"
          className={`w-full ${isExpanded ? "h-auto" : "h-48 object-cover"}`}
        />
        {!isExpanded && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Tap to expand
          </div>
        )}
      </div>
    </div>
  );
}
