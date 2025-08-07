import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ViewModeContextType {
  selectedSoldierId: string;
  setSelectedSoldierId: (id: string) => void;
  isViewModeActive: boolean;
  resetViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const useViewMode = (): ViewModeContextType => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};

interface ViewModeProviderProps {
  children: ReactNode;
}

export const ViewModeProvider: React.FC<ViewModeProviderProps> = ({ children }) => {
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>('');

  const isViewModeActive = selectedSoldierId !== '';

  const resetViewMode = () => {
    setSelectedSoldierId('');
  };

  const value: ViewModeContextType = {
    selectedSoldierId,
    setSelectedSoldierId,
    isViewModeActive,
    resetViewMode
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}; 