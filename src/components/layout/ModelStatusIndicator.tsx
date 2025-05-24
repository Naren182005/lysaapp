import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnlineMode } from '@/contexts/OnlineModeContext';
import { checkInternetConnectivity } from '@/utils/onlineOfflineMode';

/**
 * Component to display the online/offline mode status
 */
const ModelStatusIndicator: React.FC = () => {
  const { isOnlineMode, toggleOnlineMode } = useOnlineMode();
  const [internetStatus, setInternetStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    // Check internet connectivity
    const checkConnectivity = async () => {
      try {
        const isConnected = await checkInternetConnectivity();
        setInternetStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Error checking internet connectivity:', error);
        setInternetStatus('disconnected');
      }
    };

    // Check immediately
    checkConnectivity();

    // Set up periodic checking
    const intervalId = setInterval(checkConnectivity, 30000); // Check every 30 seconds

    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Render based on status
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Badge
                variant="outline"
                onClick={toggleOnlineMode}
                className={`flex items-center gap-1 cursor-pointer ${
                  isOnlineMode
                    ? internetStatus === 'connected'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {isOnlineMode ? (
                  internetStatus === 'connected' ? (
                    <>
                      <Wifi className="h-3 w-3" />
                      <span className="text-xs">Online Test</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-3 w-3 animate-pulse" />
                      <span className="text-xs">Limited Connectivity</span>
                    </>
                  )
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span className="text-xs">Offline Test</span>
                  </>
                )}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isOnlineMode ? (
              internetStatus === 'connected' ? (
                <p>Online test: Using cloud services for better accuracy</p>
              ) : (
                <p>Limited connectivity: Some online features may not work</p>
              )
            ) : (
              <p>Offline test: Using local processing without internet connection</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Click to toggle test mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ModelStatusIndicator;
