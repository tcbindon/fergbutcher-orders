import { useState, useEffect, useRef, useCallback } from 'react';
import { Customer, Order, ChristmasProduct } from '../types';

const HOURLY_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const LAST_SYNC_KEY = 'fergbutcher_last_sheets_sync';

export const useGoogleSheets = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const pendingSyncRef = useRef<{ customers: Customer[]; orders: Order[] } | null>(null);
  const hourlyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check connection status on mount and load last sync time
  useEffect(() => {
    const hasConfig = !!(
      import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID &&
      import.meta.env.VITE_GOOGLE_SHEETS_SERVICE_EMAIL &&
      import.meta.env.VITE_GOOGLE_SHEETS_SERVICE_KEY
    );
    setIsConnected(hasConfig);

    const stored = localStorage.getItem(LAST_SYNC_KEY);
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d.getTime())) setLastSync(d);
    }
  }, []);

  const syncAll = useCallback(async (customers: Customer[], orders: Order[]): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers, orders, type: 'all' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const now = new Date();
      setLastSync(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const syncCustomers = useCallback(async (customers: Customer[]): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers, orders: [], type: 'customers' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Customer sync failed');
      }
      const now = new Date();
      setLastSync(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Customer sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const syncOrders = useCallback(async (orders: Order[], customers: Customer[]): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers, orders, type: 'orders' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Orders sync failed');
      }
      const now = new Date();
      setLastSync(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Orders sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const fetchChristmasProducts = useCallback(async (): Promise<ChristmasProduct[]> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return [];
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'christmas-products' }),
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
  }, [isConnected]);

  const syncChristmasOrders = useCallback(async (orders: Order[], customers: Customer[]): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Google Sheets');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers, orders, type: 'christmas-orders' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Christmas orders sync failed');
      }
      const now = new Date();
      setLastSync(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Christmas orders sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const connect = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/sync-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: [], orders: [], type: 'test' }),
      });
      if (!response.ok) throw new Error('Failed to connect to Google Sheets service');
      setIsConnected(true);
      const now = new Date();
      setLastSync(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
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
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setLastSync(null);
    setError(null);
    localStorage.removeItem(LAST_SYNC_KEY);
    if (hourlyTimerRef.current) {
      clearInterval(hourlyTimerRef.current);
      hourlyTimerRef.current = null;
    }
  }, []);

  /**
   * Start an hourly auto-sync timer. The caller passes a getter for the
   * current customers/orders so the timer always syncs fresh data.
   * Returns a cleanup function.
   */
  const startHourlySync = useCallback((getData: () => { customers: Customer[]; orders: Order[] }) => {
    if (hourlyTimerRef.current) clearInterval(hourlyTimerRef.current);
    hourlyTimerRef.current = setInterval(() => {
      const { customers, orders } = getData();
      syncAll(customers, orders).catch(err => console.error('Hourly sync failed:', err));
    }, HOURLY_SYNC_INTERVAL_MS);
    return () => {
      if (hourlyTimerRef.current) {
        clearInterval(hourlyTimerRef.current);
        hourlyTimerRef.current = null;
      }
    };
  }, [syncAll]);

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
    disconnect,
    startHourlySync,
  };
};
