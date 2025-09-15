import { useState, useEffect } from 'react';
import { googleSheetsService } from '../services/googleSheets';
import { Customer, Order } from '../types';

export interface GoogleSheetsConfig {
  apiKey: string;
  spreadsheetId: string;
  clientId: string;
  clientSecret: string;
}

export const useGoogleSheets = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Check connection status on mount
  useEffect(() => {
    const status = googleSheetsService.getStatus();
    setIsConnected(status.connected);
    setLastSync(status.lastSync || null);
  }, []);

  const connect = async (config: GoogleSheetsConfig): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await googleSheetsService.initialize(config);
      
      // Try different authentication methods in order of preference
      try {
        await googleSheetsService.authenticate();
      } catch (authError) {
        console.log('Standard OAuth failed, trying direct flow:', authError);
        try {
          // Try direct redirect flow
          await googleSheetsService.authenticateDirect();
          return true; // This won't actually return since we're redirecting
        } catch (directError) {
          console.log('Direct OAuth failed, trying implicit flow:', directError);
          // If direct OAuth fails, try implicit flow
          await googleSheetsService.authenticateImplicit();
        }
      }
      
      const structureCreated = await googleSheetsService.createSheetsStructure();
      if (!structureCreated) {
        throw new Error('Failed to create sheets structure');
      }
      
      setIsConnected(true);
      setLastSync(new Date());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      console.error('Connection error:', err);
      setError(errorMessage);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const syncAll = async (customers: Customer[], orders: Order[]): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const customersSync = await googleSheetsService.syncCustomers(customers);
      if (!customersSync) {
        throw new Error('Failed to sync customers');
      }

      const ordersSync = await googleSheetsService.syncOrders(orders, customers);
      if (!ordersSync) {
        throw new Error('Failed to sync orders');
      }

      const today = new Date().toISOString().split('T')[0];
      const collectionsSync = await googleSheetsService.syncDailyCollections(orders, customers, today);
      if (!collectionsSync) {
        throw new Error('Failed to sync daily collections');
      }

      setLastSync(new Date());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const syncCustomers = async (customers: Customer[]): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await googleSheetsService.syncCustomers(customers);
      if (success) {
        setLastSync(new Date());
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Customer sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const syncOrders = async (orders: Order[], customers: Customer[]): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await googleSheetsService.syncOrders(orders, customers);
      if (success) {
        setLastSync(new Date());
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Orders sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    googleSheetsService.disconnect();
    setIsConnected(false);
    setLastSync(null);
    setError(null);
  };

  return {
    isConnected,
    isLoading,
    error,
    lastSync,
    connect,
    syncAll,
    syncCustomers,
    syncOrders,
    disconnect
  };
};