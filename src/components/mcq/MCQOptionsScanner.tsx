import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, ScanText, FileText, Upload, RefreshCw, AlertTriangle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/accessible-toast";
import { extractTextFromImage } from "@/utils/evaluationService";
import { Input } from "@/components/ui/input";
import { useIsMobile } from '@/hooks/use-mobile';
import { handleAsyncError } from '@/utils/errorHandling';

/**
 * MCQOptionsScanner component for scanning MCQ options from images
 */
export function MCQOptionsScanner({
  onScanComplete,
  onCancel
}: {
  onScanComplete: (text: string) => void;
  onCancel: () => void;
}) {
  const [isActive, setIsActive] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Start the camera when the component mounts
  useEffect(() => {
    startCamera();
    return () => {
      // Clean up by stopping the camera when the component unmounts
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Camera access is not supported in this browser");
      setCameraError("Camera access is not supported in this browser");
      setShowFileUpload(true);
      return;
    }

    const [mediaStream, error] = await handleAsyncError(
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      }),
      (err) => {
        console.error("Error accessing camera:", err);
        toast.error("Failed to access camera. Please check camera permissions.");
        setCameraError("Failed to access camera. Please ensure you've granted camera permissions.");
        setShowFileUpload(true);
      }
    );

    if (error || !mediaStream) {
      return;
    }

    // Set the video source to the media stream
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      setIsActive(true);
    }
  };

  const stopCamera = () => {
    // Stop all video streams
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera not initialized properly");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error("Could not initialize canvas context");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to image URL
    const imageUrl = canvas.toDataURL('image/png');
    setCapturedImageUrl(imageUrl);
    setIsCaptured(true);

    // Process the image with OCR - specify this is MCQ options
    setIsProcessing(true);

    const [extractedText, error] = await handleAsyncError(
      extractTextFromImage(imageUrl, false, false, true), // true indicates these are MCQ options
      (err) => {
        console.error("Error processing image:", err);
        toast.error("Error processing image", {
          description: "Could not extract text from the MCQ options. Please try again with a clearer image."
        });
      }
    );

    setIsProcessing(false);

    if (error || !extractedText) {
      return;
    }

    // Pass the extracted text to the parent component
    onScanComplete(extractedText);
  };

  const retakePhoto = () => {
    setCapturedImageUrl(null);
    setIsCaptured(false);
    startCamera();
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Read the file as a data URL
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) {
        toast.error("Failed to load image");
        return;
      }

      setCapturedImageUrl(imageUrl);
      setIsCaptured(true);

      // Process the image with OCR - specify this is MCQ options
      setIsProcessing(true);

      const [extractedText, error] = await handleAsyncError(
        extractTextFromImage(imageUrl, false, false, true), // true indicates these are MCQ options
        (err) => {
          console.error("Error processing image:", err);
          toast.error("Error processing image", {
            description: "Could not extract text from the MCQ options. Please try again with a clearer image."
          });
        }
      );

      setIsProcessing(false);

      if (error || !extractedText) {
        return;
      }

      // Pass the extracted text to the parent component
      onScanComplete(extractedText);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <Card className="relative w-full aspect-[4/3] overflow-hidden mb-4 bg-gray-100">
        <canvas ref={canvasRef} className="hidden" />
        
        {isActive && !isCaptured ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover camera-cutout"
            aria-label="Camera preview for scanning MCQ options"
          />
        ) : isCaptured ? (
          <img
            src={capturedImageUrl}
            alt="Captured MCQ options"
            className="w-full h-full object-contain"
            aria-live="polite"
          />
        ) : showFileUpload ? (
          <div className="flex flex-col items-center justify-center h-full bg-app-blue-50 p-6">
            <Upload size={isMobile ? 36 : 48} className="text-app-blue-500 mb-4" />
            <h3 className="text-center font-medium text-app-blue-900 mb-2">
              Upload MCQ Options
            </h3>
            <p className="text-center text-sm text-muted-foreground mb-6 max-w-xs">
              Select an image of the MCQ options from your device
            </p>
            <Button onClick={handleFileUpload} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Choose File
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : cameraError ? (
          <div className="flex flex-col items-center justify-center h-full bg-red-50 p-6">
            <AlertTriangle size={isMobile ? 36 : 48} className="text-red-500 mb-4" />
            <h3 className="text-center font-medium text-red-900 mb-2">
              Camera Error
            </h3>
            <p className="text-center text-sm text-muted-foreground mb-6 max-w-xs">
              {cameraError}
            </p>
            <Button onClick={handleFileUpload} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Upload Image Instead
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : null}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex flex-col items-center text-white">
              <RefreshCw className="animate-spin h-8 w-8 mb-2" />
              <p>Processing image...</p>
            </div>
          </div>
        )}
      </Card>

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-wrap'} gap-2 mt-4 ${isMobile ? 'px-2' : 'justify-center'}`}>
        {isActive ? (
          <>
            <Button
              onClick={captureImage}
              className={`bg-app-blue-500 hover:bg-app-blue-600 transition-all shadow-md focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full py-6 text-lg' : ''}`}
              aria-label="Capture image"
            >
              <Camera className="mr-2 h-4 w-4" />
              Capture
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
              aria-label="Cancel camera"
            >
              <CameraOff className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </>
        ) : isCaptured ? (
          <>
            <Button
              onClick={retakePhoto}
              variant="outline"
              className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
              aria-label="Retake photo"
            >
              <Camera className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
              aria-label="Cancel"
            >
              <CameraOff className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleFileUpload}
              variant="outline"
              className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
              aria-label="Upload image"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
              aria-label="Cancel"
            >
              <CameraOff className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
