
import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, ScanText, Upload, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/accessible-toast";
import { extractTextFromImage } from "@/utils/evaluationService";
import { Input } from "@/components/ui/input";
import { useIsMobile } from '@/hooks/use-mobile';
import { handleAsyncError, withErrorHandling } from '@/utils/errorHandling';
import ErrorBoundary from '@/components/ErrorBoundary';

interface ScanCameraProps {
  onCapture: (text: string, imageUrl: string) => void;
}

const ScanCamera: React.FC<ScanCameraProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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

    if (!mediaStream) return;

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          handleAsyncError(
            videoRef.current.play(),
            (err) => {
              console.error("Error playing video:", err);
              toast.error("Failed to start camera stream");
              setCameraError("Failed to start camera stream");
              setShowFileUpload(true);
            }
          );
        }
      };
    }

    setStream(mediaStream);
    setIsActive(true);
    toast.success("Camera started");
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
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

    // Process the image with OCR
    setIsProcessing(true);

    const [extractedText, error] = await handleAsyncError(
      extractTextFromImage(imageUrl),
      (err) => {
        console.error("Error processing image:", err);

        // Check if this is a list content error
        const errorMsg = err.toString().toLowerCase();
        if (errorMsg.includes("list content")) {
          toast.error("Error processing list content", {
            description: "Could not extract text from the list. Try using the manual entry option instead."
          });
        } else {
          toast.error("Error processing image", {
            description: "Could not extract text from the image. Please try again with a clearer image."
          });
        }
      }
    );

    if (extractedText) {
      // Check if the extracted text is very short (likely a simple list)
      // In this case, we'll still consider it a success even if it's just a few characters
      const isShortList = extractedText.trim().length < 50 &&
                         (extractedText.includes("1") || extractedText.includes("A") ||
                          extractedText.includes("2") || extractedText.includes("B"));

      if (isShortList) {
        console.log("Detected short list content:", extractedText);
      }

      onCapture(extractedText, imageUrl);
      toast.success("Answer sheet scanned successfully!");
    } else if (error && error.toString().toLowerCase().includes("list content")) {
      // For list content errors, try to extract something from the image anyway
      try {
        // Create a simple representation of what might be in the image
        const simpleExtraction = "Could not fully extract list content. Please edit as needed.";
        onCapture(simpleExtraction, imageUrl);
        toast.success("Basic content detected. Please review and edit as needed.");
      } catch (fallbackError) {
        console.error("Error with fallback handling:", fallbackError);
      }
    }

    setIsProcessing(false);

    // Stop the camera after capture
    stopCamera();
  };

  const retakePhoto = () => {
    setIsCaptured(false);
    setCapturedImageUrl('');
    setShowFileUpload(false);
    startCamera();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validTypes = [...validImageTypes, ...validDocTypes];

    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please select a valid file (JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX)"
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Please select an image smaller than 10MB"
      });
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      toast.error("Error reading file", {
        description: "There was a problem reading the selected file"
      });
    };

    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) {
        toast.error("Failed to load image");
        return;
      }

      setCapturedImageUrl(imageUrl);
      setIsCaptured(true);

      // Process the image with OCR
      setIsProcessing(true);

      const [extractedText, error] = await handleAsyncError(
        extractTextFromImage(imageUrl),
        (err) => {
          console.error("Error processing image:", err);

          // Check if this is a list content error
          const errorMsg = err.toString().toLowerCase();
          if (errorMsg.includes("list content")) {
            toast.error("Error processing list content", {
              description: "Could not extract text from the list. Try using the manual entry option instead."
            });
          } else {
            toast.error("Error processing image", {
              description: "Could not extract text from the image. Please try again with a clearer image."
            });
          }
        }
      );

      if (extractedText) {
        // Check if the extracted text is very short (likely a simple list)
        // In this case, we'll still consider it a success even if it's just a few characters
        const isShortList = extractedText.trim().length < 50 &&
                           (extractedText.includes("1") || extractedText.includes("A") ||
                            extractedText.includes("2") || extractedText.includes("B"));

        if (isShortList) {
          console.log("Detected short list content:", extractedText);
        }

        onCapture(extractedText, imageUrl);
        toast.success("Answer sheet processed successfully!");
      } else if (error && error.toString().toLowerCase().includes("list content")) {
        // For list content errors, try to extract something from the image anyway
        try {
          // Create a simple representation of what might be in the image
          const simpleExtraction = "Could not fully extract list content. Please edit as needed.";
          onCapture(simpleExtraction, imageUrl);
          toast.success("Basic content detected. Please review and edit as needed.");
        } catch (fallbackError) {
          console.error("Error with fallback handling:", fallbackError);
        }
      }

      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleUploadMethod = () => {
    if (isActive) {
      stopCamera();
    }
    setShowFileUpload(!showFileUpload);
  };

  // Auto-start camera on mobile devices if possible
  useEffect(() => {
    if (isMobile && !isActive && !isCaptured && !showFileUpload && !cameraError) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  return (
    <Card className="overflow-hidden shadow-lg border-app-teal-100">
      <div className={`${isMobile ? 'p-3' : 'p-4'} bg-app-blue-50`}>
        <div className="flex items-center gap-2 mb-2">
          <ScanText className="h-5 w-5 text-app-teal-600" />
          <h2 className="font-semibold text-app-blue-900">Scan Answer Sheet</h2>
        </div>
        <p className={`text-sm text-muted-foreground ${isMobile ? 'mb-2' : 'mb-4'}`}>
          Position the answer sheet within the frame and capture a clear image
        </p>

        <div className={`relative ${isMobile ? 'aspect-[1/1]' : 'aspect-[4/3]'} bg-black rounded-lg overflow-hidden shadow-inner`}>
          {isActive && !isCaptured && (
            <>
              <div className="scan-line animate-scan"></div>
              <div className="scan-overlay"></div>
            </>
          )}

          {isActive && !isCaptured ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover camera-cutout"
              aria-label="Camera preview for scanning answer sheet"
            />
          ) : isCaptured ? (
            <img
              src={capturedImageUrl}
              alt="Captured answer sheet"
              className="w-full h-full object-contain"
              aria-live="polite"
            />
          ) : showFileUpload ? (
            <div className="flex flex-col items-center justify-center h-full bg-app-blue-50 p-6">
              <Upload size={isMobile ? 36 : 48} className="text-app-teal-500 mb-4" />
              <h3 className="text-center font-medium text-app-blue-900 mb-2">
                Upload Answer Sheet
              </h3>
              <p className="text-center text-sm text-muted-foreground mb-6 max-w-xs">
                Select an image, PDF, or Word document of the student's answer sheet from your device
              </p>
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <Button
                  onClick={triggerFileInput}
                  className="bg-app-teal-500 hover:bg-app-teal-600 w-full py-6 text-base"
                  size="lg"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, GIF, PDF, DOC, DOCX
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                capture={isMobile ? "environment" : undefined}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-app-blue-900 text-white p-6">
              <CameraOff size={isMobile ? 36 : 48} className="opacity-50 mb-4" />
              {cameraError ? (
                <>
                  <p className="text-center text-sm opacity-80 mb-2">{cameraError}</p>
                  <div className="flex items-center justify-center bg-yellow-600/30 p-3 rounded-md mt-2 mb-4 max-w-xs mx-auto">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                    <p className="text-sm text-yellow-300">
                      Click the "Upload File" button below to use an image, PDF, or Word document from your device instead
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-sm opacity-80 mb-4">Click "Start Camera" to begin scanning</p>
                  <p className="text-center text-xs opacity-60 mb-2">Or use "Upload File" if camera is unavailable</p>
                </>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        </div>

        <div className={`flex ${isMobile ? 'flex-col' : 'flex-wrap'} gap-2 mt-4 ${isMobile ? 'px-2' : 'justify-center'}`}>
          {isActive ? (
            <>
              <Button
                onClick={captureImage}
                className={`bg-app-teal-500 hover:bg-app-teal-600 transition-all shadow-md focus:ring-2 focus:ring-app-teal-300 focus:ring-offset-2 ${isMobile ? 'w-full py-6 text-lg' : ''}`}
                aria-label="Capture image"
              >
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
                aria-label="Cancel camera"
              >
                <CameraOff className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : isCaptured ? (
            <Button
              onClick={retakePhoto}
              variant="outline"
              disabled={isProcessing}
              className={`border-app-teal-300 hover:bg-app-teal-50 focus:ring-2 focus:ring-app-teal-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
              aria-label="Retake photo"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          ) : showFileUpload ? (
            <Button
              onClick={toggleUploadMethod}
              variant="outline"
              className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
              aria-label="Use camera"
            >
              <Camera className="mr-2 h-4 w-4" />
              Try Camera Instead
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleUploadMethod}
                className={`bg-app-teal-500 hover:bg-app-teal-600 transition-all shadow-md focus:ring-2 focus:ring-app-teal-300 focus:ring-offset-2 ${isMobile ? 'w-full py-6 text-lg' : ''}`}
                aria-label="Upload file"
                size={isMobile ? "default" : "lg"}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload File
              </Button>
              <Button
                onClick={startCamera}
                variant="outline"
                className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full py-6 text-lg' : ''}`}
                aria-label="Start camera"
              >
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </Button>
            </>
          )}
        </div>

        {/* Mobile-specific help text */}
        {isMobile && isActive && !isCaptured && (
          <div className="mt-4 p-2 bg-app-blue-100 rounded-md">
            <p className="text-xs text-center text-app-blue-800">
              Hold your device steady and ensure the answer sheet is clearly visible
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

// Wrap the component with ErrorBoundary
const ScanCameraWithErrorBoundary: React.FC<ScanCameraProps> = (props) => (
  <ErrorBoundary
    fallback={
      <Card className="overflow-hidden shadow-lg border-app-teal-100">
        <div className="p-6 bg-app-blue-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-app-blue-900">Camera Error</h2>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
            <p className="text-red-800 mb-2">
              There was a problem with the camera component. Please try again or use the file upload option.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>
        </div>
      </Card>
    }
  >
    <ScanCamera {...props} />
  </ErrorBoundary>
);

export default ScanCameraWithErrorBoundary;
