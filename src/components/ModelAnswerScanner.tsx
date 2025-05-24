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

interface ModelAnswerScannerProps {
  onCapture: (text: string, imageUrl: string) => void;
  onCancel: () => void;
}

const ModelAnswerScanner: React.FC<ModelAnswerScannerProps> = ({
  onCapture,
  onCancel
}) => {
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Start camera when component mounts
    startCamera();

    // Clean up when component unmounts
    return () => {
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
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to image URL
    const imageUrl = canvas.toDataURL('image/png');
    setCapturedImageUrl(imageUrl);
    setIsCaptured(true);

    // Process the image with OCR - specify this is a model answer
    setIsProcessing(true);

    // Create custom parameters to indicate this is a model answer
    const isModelAnswer = true;
    const isQuestionPaper = false;

    const [extractedText, error] = await handleAsyncError(
      extractTextFromImage(imageUrl, isQuestionPaper, isModelAnswer), // Specify this is a model answer
      (err) => {
        console.error("Error processing image:", err);

        // Check if this is a list content error
        const errorMsg = err.toString().toLowerCase();
        if (errorMsg.includes("list content")) {
          toast.error("Error processing list content", {
            description: "Could not extract text from the list. Using a template instead."
          });
        } else {
          toast.error("Error processing image", {
            description: "Could not extract text from the model answer. Please try again with a clearer image."
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

      // Even if there's an error message in the extracted text, we'll pass it to the parent component
      // so the user can see what went wrong and edit it manually
      console.log("Model answer extracted text:", extractedText);
      onCapture(extractedText, imageUrl);
      toast.success("Model answer scanned successfully!");
    } else if (error && error.toString().toLowerCase().includes("list content")) {
      // For list content errors, try to extract something from the image anyway
      try {
        // For simple lists like "1 A, 2 B, 3 C, 4 D", provide a template
        const simpleExtraction = "1. A\n2. B\n3. C\n4. D";
        console.log("Using template for simple list:", simpleExtraction);
        onCapture(simpleExtraction, imageUrl);
        toast.success("Basic list detected. Please review and edit as needed.");
      } catch (fallbackError) {
        console.error("Error with fallback handling:", fallbackError);
        // If the fallback fails, show a generic error
        toast.error("Failed to extract text from image", {
          description: "Please try again with a clearer image or enter the model answer manually."
        });
      }
    } else {
      // If no text was extracted at all, show an error
      toast.error("Failed to extract text from image", {
        description: "Please try again with a clearer image or enter the model answer manually."
      });
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

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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

      // Create custom parameters to indicate this is a model answer
      const isModelAnswer = true;
      const isQuestionPaper = false;

      const [extractedText, error] = await handleAsyncError(
        extractTextFromImage(imageUrl, isQuestionPaper, isModelAnswer), // Specify this is a model answer
        (err) => {
          console.error("Error processing image:", err);
          toast.error("Error processing image", {
            description: "Could not extract text from the image. Please try again with a clearer image."
          });
        }
      );

      if (extractedText) {
        // Even if there's an error message in the extracted text, we'll pass it to the parent component
        // so the user can see what went wrong and edit it manually
        console.log("Model answer extracted text from file:", extractedText);
        onCapture(extractedText, imageUrl);
        toast.success("Model answer processed successfully!");
      } else {
        // If no text was extracted at all, show an error
        toast.error("Failed to extract text from image", {
          description: "Please try again with a clearer image or enter the model answer manually."
        });
      }

      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <Card className="overflow-hidden shadow-lg border-app-blue-100">
      <div className={`${isMobile ? 'p-3' : 'p-4'} bg-app-blue-50`}>
        <div className="flex items-center gap-2 mb-2">
          <ScanText className="h-5 w-5 text-app-blue-600" />
          <h2 className="font-semibold text-app-blue-900">Scan Model Answer</h2>
        </div>
        <p className={`text-sm text-muted-foreground ${isMobile ? 'mb-2' : 'mb-4'}`}>
          Position the model answer within the frame and capture a clear image
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
              aria-label="Camera preview for scanning model answer"
            />
          ) : isCaptured ? (
            <img
              src={capturedImageUrl}
              alt="Captured model answer"
              className="w-full h-full object-contain"
              aria-live="polite"
            />
          ) : showFileUpload ? (
            <div className="flex flex-col items-center justify-center h-full bg-app-blue-50 p-6">
              <Upload size={isMobile ? 36 : 48} className="text-app-blue-500 mb-4" />
              <h3 className="text-center font-medium text-app-blue-900 mb-2">
                Upload Model Answer
              </h3>
              <p className="text-center text-sm text-muted-foreground mb-6 max-w-xs">
                Select an image, PDF, or Word document of the model answer from your device
              </p>
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <Button
                  onClick={triggerFileInput}
                  className="bg-app-blue-500 hover:bg-app-blue-600 w-full py-6 text-base"
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
                  <Button
                    onClick={triggerFileInput}
                    variant="outline"
                    className="border-white/30 hover:bg-white/10 text-white"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File Instead
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-center text-sm opacity-80 mb-2">Camera not active</p>
                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="border-white/30 hover:bg-white/10 text-white"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

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
            <Button
              onClick={retakePhoto}
              variant="outline"
              className={`border-app-blue-300 hover:bg-app-blue-50 ${isMobile ? 'w-full' : ''}`}
              aria-label="Retake photo"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retake
            </Button>
          ) : (
            <>
              {!showFileUpload && (
                <Button
                  onClick={startCamera}
                  className={`bg-app-blue-500 hover:bg-app-blue-600 transition-all shadow-md ${isMobile ? 'w-full py-6 text-lg' : ''}`}
                  aria-label="Start camera"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera
                </Button>
              )}
              <Button
                onClick={onCancel}
                variant="outline"
                className={`border-app-blue-300 hover:bg-app-blue-50 ${isMobile ? 'w-full' : ''}`}
                aria-label="Cancel"
              >
                Cancel
              </Button>
            </>
          )}
        </div>

        {isProcessing && (
          <div className="mt-4 p-3 bg-app-blue-50 border border-app-blue-200 rounded-md flex items-center">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-app-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-sm text-app-blue-800">Processing image, please wait...</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ModelAnswerScanner;
