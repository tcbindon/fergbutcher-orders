import { useState, useEffect } from 'react';
import { Customer, Order, ChristmasProduct } from '../types';

export const useGoogleSheets = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Check connection status on mount
  useEffect(() => {
    // Check if environment variables are configured
    const hasConfig = !!(
      import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID &&
      import.meta.env.VITE_GOOGLE_SHEETS_SERVICE_EMAIL &&
      import.meta.env.VITE_GOOGLE_SHEETS_SERVICE_KEY
    );
    setIsConnected(hasConfig);
  }, []);

  const connect = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Test the Netlify function endpoint
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customers: [],
          orders: [],
          type: 'test'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Google Sheets service');
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
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customers,
          orders,
          type: 'all'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
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
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customers,
          orders: [],
          type: 'customers'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Customer sync failed');
      }

      setLastSync(new Date());
      return true;
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
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customers,
          orders,
          type: 'orders'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Orders sync failed');
      }

      setLastSync(new Date());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Orders sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChristmasProducts = async (): Promise<ChristmasProduct[]> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'christmas-products'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Christmas products');
      }

      const data = await response.json();
      return data.products || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Christmas products';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const syncChristmasOrders = async (orders: Order[], customers: Customer[]): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return false;
    }

    console.log(`Attempting to sync ${orders.length} Christmas orders`);
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customers,
          orders,
          type: 'christmas-orders'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Christmas orders sync failed:', errorData);
        throw new Error(errorData.error || 'Christmas orders sync failed');
      }

      const result = await response.json();
      console.log('Christmas orders sync successful:', result);
      setLastSync(new Date());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Christmas orders sync failed';
      console.error('Christmas orders sync error:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
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
    fetchChristmasProducts,
    syncChristmasOrders,
    disconnect
  };
};