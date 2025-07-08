import React, { createContext, useState, useContext, useEffect } from 'react';

type AppStateContextType = {
  isDeployModalOpen: boolean;
  toggleDeployModal: () => void;
  setIsDeployModalOpen: (isDeployModalOpen: boolean) => void;
  isShareAgentModalOpen: boolean;
  toggleShareAgentModal: () => void;
  setIsShareAgentModalOpen: (isShareAgentModalOpen: boolean) => void;
};

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Set up global shared state
declare global {
  interface Window {
    handleDeployModalOpen: (value: boolean) => void;
    handleShareAgentModalOpen: (value: boolean) => void;
    __SHARED_APP_STATE__: {
      isDeployModalOpen: boolean;
      isShareAgentModalOpen: boolean;
    };
  }
}

// Initialize shared state if it doesn't exist
if (!window.__SHARED_APP_STATE__) {
  window.__SHARED_APP_STATE__ = {
    isDeployModalOpen: false,
    isShareAgentModalOpen: false
  };
}

// Custom event name for state changes
const APP_STATE_CHANGED = 'APP_STATE_CHANGED';

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from shared global state
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(window.__SHARED_APP_STATE__.isDeployModalOpen);
  const [isShareAgentModalOpen, setIsShareAgentModalOpen] = useState(window.__SHARED_APP_STATE__.isShareAgentModalOpen);

  // Generic state update function
  const updateState = (stateKey: 'isDeployModalOpen' | 'isShareAgentModalOpen', value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    window.__SHARED_APP_STATE__[stateKey] = value;
    setter(value);
    window.dispatchEvent(new CustomEvent(APP_STATE_CHANGED));
  };

  // Sync local state with global state when it changes elsewhere
  useEffect(() => {
    const syncState = () => {
      const { isDeployModalOpen: globalDeployOpen, isShareAgentModalOpen: globalShareOpen } = window.__SHARED_APP_STATE__;
      
      if (globalDeployOpen !== isDeployModalOpen) {
        setIsDeployModalOpen(globalDeployOpen);
      }
      
      if (globalShareOpen !== isShareAgentModalOpen) {
        setIsShareAgentModalOpen(globalShareOpen);
      }
    };

    window.addEventListener(APP_STATE_CHANGED, syncState);
    return () => window.removeEventListener(APP_STATE_CHANGED, syncState);
  }, [isDeployModalOpen, isShareAgentModalOpen]);

  // Set up global handlers for non-React code
  useEffect(() => {
    window.handleDeployModalOpen = (value) => {
      updateState('isDeployModalOpen', value, setIsDeployModalOpen);
    };
    
    window.handleShareAgentModalOpen = (value) => {
      updateState('isShareAgentModalOpen', value, setIsShareAgentModalOpen);
    };
  }, []);

  // Create context value object
  const contextValue: AppStateContextType = {
    isDeployModalOpen,
    setIsDeployModalOpen: (value) => updateState('isDeployModalOpen', value, setIsDeployModalOpen),
    toggleDeployModal: () => updateState('isDeployModalOpen', !isDeployModalOpen, setIsDeployModalOpen),
    isShareAgentModalOpen,
    setIsShareAgentModalOpen: (value) => updateState('isShareAgentModalOpen', value, setIsShareAgentModalOpen),
    toggleShareAgentModal: () => updateState('isShareAgentModalOpen', !isShareAgentModalOpen, setIsShareAgentModalOpen),
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within a AppStateProvider');
  }
  return context;
};
