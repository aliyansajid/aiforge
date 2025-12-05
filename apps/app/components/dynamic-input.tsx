"use client";

import { useState } from "react";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/src/components/textarea";
import { Input } from "@repo/ui/components/input";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { AlertCircle, Upload, Image as ImageIcon } from "lucide-react";

interface DynamicInputProps {
  inputType: string;
  value: string;
  onChange: (value: string) => void;
  fileData?: File | null;
  onFileChange?: (file: File | null) => void;
}

export function DynamicInput({
  inputType,
  value,
  onChange,
  fileData,
  onFileChange,
}: DynamicInputProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onFileChange?.(file);

    // Create preview for images
    if (inputType === "IMAGE" && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        onChange(reader.result as string); // Store base64 for API call
      };
      reader.readAsDataURL(file);
    } else if (
      inputType === "AUDIO" ||
      inputType === "VIDEO" ||
      inputType === "FILE"
    ) {
      // For other files, just convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderInput = () => {
    switch (inputType) {
      case "JSON":
        return (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Input must be a 2D array in JSON format. For single prediction,
                use{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  [[value1, value2, ...]]
                </code>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="input">Input Data (JSON Array)</Label>
              <Textarea
                id="input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="[[1.0, 2.0, 3.0, ...]]"
                className="min-h-[120px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Each row represents a sample, each column a feature
              </p>
            </div>
          </>
        );

      case "IMAGE":
        return (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload an image file (PNG, JPG, JPEG). It will be converted to
                base64 automatically.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="image-input">Image Input</Label>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {preview && (
                  <div className="border rounded-md p-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-w-full max-h-[200px] object-contain mx-auto"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Image will be sent as base64 encoded data
              </p>
            </div>
          </>
        );

      case "TEXT":
        return (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Enter plain text input for your model (e.g., for text
                classification, sentiment analysis)
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="text-input">Text Input</Label>
              <Textarea
                id="text-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter your text here..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Will be sent as {"{"}"text": "your input"{"}"}
              </p>
            </div>
          </>
        );

      case "AUDIO":
        return (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload an audio file (MP3, WAV, etc.). It will be converted to
                base64.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="audio-input">Audio Input</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="audio-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {fileData && (
                <p className="text-sm text-muted-foreground">
                  Selected: {fileData.name} ({(fileData.size / 1024).toFixed(2)}{" "}
                  KB)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Audio will be sent as base64 encoded data
              </p>
            </div>
          </>
        );

      case "VIDEO":
        return (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload a video file (MP4, AVI, etc.). It will be converted to
                base64.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="video-input">Video Input</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="video-input"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {fileData && (
                <p className="text-sm text-muted-foreground">
                  Selected: {fileData.name} ({(fileData.size / 1024).toFixed(2)}{" "}
                  KB)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Video will be sent as base64 encoded data
              </p>
            </div>
          </>
        );

      case "FILE":
        return (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload any file type. It will be converted to base64 for
                transmission.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="file-input">File Input</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {fileData && (
                <p className="text-sm text-muted-foreground">
                  Selected: {fileData.name} ({(fileData.size / 1024).toFixed(2)}{" "}
                  KB)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                File will be sent as base64 encoded data
              </p>
            </div>
          </>
        );

      default:
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unknown input type: {inputType}. Please contact support.
            </AlertDescription>
          </Alert>
        );
    }
  };

  return <div className="space-y-6">{renderInput()}</div>;
}
