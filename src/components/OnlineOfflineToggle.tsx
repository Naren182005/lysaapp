import React from 'react';
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/accessible-toast";

interface OnlineOfflineToggleProps {
  isOnline: boolean;
  onToggle: () => void;
}

const OnlineOfflineToggle: React.FC<OnlineOfflineToggleProps> = ({
  isOnline,
  onToggle
}) => {
  const isMobile = useIsMobile();

  const handleToggle = () => {
    onToggle();
    toast.success(`Switched to ${isOnline ? 'offline' : 'online'} mode`, {
      description: isOnline
        ? "Using local processing without internet connection"
        : "Using cloud services for better accuracy"
    });
  };

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="flex items-center justify-center gap-3 bg-slate-50 px-5 py-3 rounded-lg shadow-sm border border-slate-200 w-auto mx-auto">
        <Label
          htmlFor="online-mode"
          className={`text-sm font-medium ${isOnline ? 'text-app-blue-600' : 'text-muted-foreground'}`}
        >
          <div className="flex items-center gap-1.5">
            <Wifi size={16} />
            <span>Online</span>
          </div>
        </Label>

        <Switch
          id="online-mode"
          checked={isOnline}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-app-blue-600 data-[state=unchecked]:bg-slate-400"
        />

        <Label
          htmlFor="online-mode"
          className={`text-sm font-medium ${!isOnline ? 'text-app-blue-600' : 'text-muted-foreground'}`}
        >
          <div className="flex items-center gap-1.5">
            <WifiOff size={16} />
            <span>Offline</span>
          </div>
        </Label>
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-2">
        {isOnline
          ? "Online mode: Using cloud services for better accuracy"
          : "Offline mode: Using local processing without internet connection"}
      </p>
    </div>
  );
};

export default OnlineOfflineToggle;
