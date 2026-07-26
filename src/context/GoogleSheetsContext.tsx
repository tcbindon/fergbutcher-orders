import React, { createContext, useContext } from 'react';
import { useGoogleSheets } from '../hooks/useGoogleSheets';

type GoogleSheetsHook = ReturnType<typeof useGoogleSheets>;

const GoogleSheetsContext = createContext<GoogleSheetsHook | null>(null);

export const GoogleSheetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sheets = useGoogleSheets();
  return (
    <GoogleSheetsContext.Provider value={sheets}>
      {children}
    </GoogleSheetsContext.Provider>
  );
};

export const useGoogleSheetsContext = (): GoogleSheetsHook => {
  const ctx = useContext(GoogleSheetsContext);
  if (!ctx) throw new Error('useGoogleSheetsContext must be used inside GoogleSheetsProvider');
  return ctx;
};
