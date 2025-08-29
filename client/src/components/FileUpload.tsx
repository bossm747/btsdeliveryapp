import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FileUploadProps {
  onUploadComplete?: (filePath: string) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  uploadType: 'restaurant' | 'user' | 'general';
  entityId?: string;
  className?: string;
}

export default function FileUpload({
  onUploadComplete,
  acceptedTypes = 'image/*',
  maxSize = 5,
  uploadType,
  entityId,
  className = ''
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: `File size must be less than ${maxSize}MB`,
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    if (!file.type.match(acceptedTypes.replace('*', '.*'))) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a valid file type',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Get upload URL
      const uploadResponse = await apiRequest('POST', '/api/objects/upload');
      const { uploadURL } = await uploadResponse.json();

      // Upload file to object storage
      const uploadResult = await fetch(uploadURL, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload file');
      }

      // Get the uploaded file path
      const filePath = new URL(uploadURL).pathname;

      // Notify parent component
      onUploadComplete?.(filePath);

      toast({
        title: 'Upload successful',
        description: 'File uploaded successfully',
      });

      // Reset form
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={`w-full ${className}`} data-testid="card-file-upload">
      <CardContent className="p-6">
        <div className="space-y-4">
          {!selectedFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <FileImage className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm font-medium text-[#FF6B35] hover:text-[#FF6B35]/80">
                    Click to upload
                  </span>
                  <Input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedTypes}
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {acceptedTypes.includes('image') ? 'PNG, JPG, GIF' : 'Various file types'} up to {maxSize}MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4" data-testid="selected-file-preview">
              {preview && (
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    data-testid="img-file-preview"
                  />
                  <button
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    data-testid="button-remove-file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileImage className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900" data-testid="text-file-name">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500" data-testid="text-file-size">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleRemoveFile}
                  variant="ghost"
                  size="sm"
                  data-testid="button-remove-selected"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                  data-testid="button-upload-file"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRemoveFile}
                  variant="outline"
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}