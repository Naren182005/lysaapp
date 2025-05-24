import React, { createContext, useContext, useState, useEffect } from 'react';

interface OnlineModeContextType {
  isOnlineMode: boolean;
  setIsOnlineMode: (isOnline: boolean) => void;
  toggleOnlineMode: () => void;
}

const OnlineModeContext = createContext<OnlineModeContextType | undefined>(undefined);

export const useOnlineMode = () => {
  const context = useContext(OnlineModeContext);
  if (context === undefined) {
    throw new Error('useOnlineMode must be used within an OnlineModeProvider');
  }
  return context;
};

export const OnlineModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(() => {
    // Initialize from localStorage or default to true (online)
    const savedMode = localStorage.getItem('isOnlineMode');
    return savedMode !== null ? savedMode === 'true' : true;
  });

  // Save to localStorage whenever the mode changes
  useEffect(() => {
    localStorage.setItem('isOnlineMode', isOnlineMode.toString());
  }, [isOnlineMode]);

  const toggleOnlineMode = () => {
    setIsOnlineMode(prev => !prev);
  };

  return (
    <OnlineModeContext.Provider value={{ isOnlineMode, setIsOnlineMode, toggleOnlineMode }}>
      {children}
    </OnlineModeContext.Provider>
  );
};

export default OnlineModeProvider;
