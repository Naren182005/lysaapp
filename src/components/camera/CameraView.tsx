
import React, { useRef } from 'react';
import { CameraOff } from "lucide-react";

interface CameraViewProps {
  isActive: boolean;
  isCaptured: boolean;
  capturedImageUrl: string;
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const CameraView: React.FC<CameraViewProps> = ({ 
  isActive, 
  isCaptured, 
  capturedImageUrl, 
  cameraError,
  videoRef 
}) => {
  return (
    <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden shadow-inner">
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
        />
      ) : isCaptured ? (
        <img 
          src={capturedImageUrl} 
          alt="Captured image" 
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full bg-app-blue-900 text-white p-6">
          <CameraOff size={48} className="opacity-50 mb-4" />
          {cameraError ? (
            <p className="text-center text-sm opacity-80">{cameraError}</p>
          ) : (
            <p className="text-center text-sm opacity-80">Click "Start Camera" to begin scanning</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CameraView;
