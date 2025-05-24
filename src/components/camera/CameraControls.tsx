
import React from 'react';
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraControlsProps {
  isActive: boolean;
  isCaptured: boolean;
  isProcessing: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onCaptureImage: () => void;
  onRetakePhoto: () => void;
}

const CameraControls: React.FC<CameraControlsProps> = ({
  isActive,
  isCaptured,
  isProcessing,
  onStartCamera,
  onStopCamera,
  onCaptureImage,
  onRetakePhoto
}) => {
  return (
    <div className="flex gap-2 mt-4 justify-center">
      {isActive ? (
        <Button 
          onClick={onCaptureImage} 
          className="bg-app-teal-500 hover:bg-app-teal-600 transition-all shadow-md focus:ring-2 focus:ring-app-teal-300 focus:ring-offset-2"
          aria-label="Capture image"
        >
          <Camera className="mr-2 h-4 w-4" />
          Capture
        </Button>
      ) : isCaptured ? (
        <Button 
          onClick={onRetakePhoto}
          variant="outline"
          disabled={isProcessing}
          className="border-app-teal-300 hover:bg-app-teal-50 focus:ring-2 focus:ring-app-teal-300 focus:ring-offset-2"
          aria-label="Retake photo"
        >
          <Camera className="mr-2 h-4 w-4" />
          Retake
        </Button>
      ) : (
        <Button 
          onClick={onStartCamera} 
          className="bg-app-blue-500 hover:bg-app-blue-600 transition-all shadow-md focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2"
          aria-label="Start camera"
        >
          <Camera className="mr-2 h-4 w-4" />
          Start Camera
        </Button>
      )}
      
      {isActive && (
        <Button 
          onClick={onStopCamera} 
          variant="outline"
          className="border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2"
          aria-label="Cancel camera"
        >
          <CameraOff className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      )}
    </div>
  );
};

export default CameraControls;
