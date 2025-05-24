import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, BookOpen } from "lucide-react";
import { toast } from "@/components/ui/accessible-toast";
import { useOnlineMode } from '@/contexts/OnlineModeContext';

const OfflineModeButton: React.FC = () => {
  const { isOnlineMode, toggleOnlineMode } = useOnlineMode();
  const navigate = useNavigate();

  const handleToggle = () => {
    const newMode = !isOnlineMode;
    toggleOnlineMode();
    toast.success(`Switched to ${newMode ? 'online' : 'offline'} mode`, {
      description: newMode
        ? "You can now take MCQ tests online"
        : "You can now evaluate answer sheets manually"
    });
  };

  const handleMCQTest = () => {
    navigate('/mcq-test');
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className={`
          flex items-center gap-1.5
          bg-slate-100 hover:bg-slate-200
          text-slate-700 hover:text-slate-900
          border border-slate-200
          rounded-full
          px-4 py-1.5
          text-sm
          transition-all
          ${!isOnlineMode ? 'bg-slate-200' : ''}
        `}
      >
        {isOnlineMode ? (
          <>
            <Wifi size={14} className="text-green-500" />
            <span>Online Mode</span>
          </>
        ) : (
          <>
            <WifiOff size={14} className="text-slate-500" />
            <span>Offline Mode</span>
          </>
        )}
      </Button>

      {isOnlineMode && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMCQTest}
          className="text-app-blue-700 border-app-blue-200 hover:bg-app-blue-50"
        >
          <BookOpen className="h-4 w-4 mr-1" />
          MCQ Test
        </Button>
      )}
    </div>
  );
};

export default OfflineModeButton;
