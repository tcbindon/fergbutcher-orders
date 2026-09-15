import React, { createContext, useContext, useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useStaffNotes } from '../hooks/useStaffNotes';
import { combinedApi } from '../hooks/useApi';

type OrdersHook = ReturnType<typeof useOrders>;
type CustomersHook = ReturnType<typeof useCustomers>;
type StaffNotesHook = ReturnType<typeof useStaffNotes>;

interface AppDataContextValue
  extends Omit<OrdersHook, 'loading' | 'error' | 'clearError' | 'hydrate'>,
          Omit<CustomersHook, 'loading' | 'error' | 'hydrate'>,
          Omit<StaffNotesHook, 'loading' | 'error' | 'hydrate'> {
  ordersLoading: boolean;
  ordersError: string | null;
  clearOrdersError: () => void;
  customersLoading: boolean;
  customersError: string | null;
  staffNotesLoading: boolean;
  staffNotesError: string | null;
  loading: boolean;
  error: string | null;
  lastRefresh: string | null;
  refreshError: string | null;
  refreshData: () => Promise<boolean>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pass skipInitialFetch so each hook skips its own mount-time request;
  // we perform a single combined fetch below.
  const orders = useOrders({ skipInitialFetch: true });
  const customers = useCustomers({ skipInitialFetch: true });
  const staffNotes = useStaffNotes();
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const refreshData = useCallback(async (): Promise<boolean> => {
    try {
      const data = await combinedApi.getAll();
      console.log('[AppData] Refresh results — orders:', data.orders.length, 'customers:', data.customers.length, 'staffNotes:', data.staffNotes.length);
      customers.hydrate(data.customers);
      orders.hydrate(data.orders);
      staffNotes.hydrate(data.staffNotes);
      hasLoadedOnce.current = true;
      setLastRefresh(new Date().toISOString());
      setRefreshError(null);
      return true;
    } catch (err) {
      console.error('Combined data refresh failed:', err);
      if (!hasLoadedOnce.current) {
        customers.hydrate([]);
        orders.hydrate([]);
        staffNotes.hydrate([]);
      }
      setRefreshError('Could not refresh from the server. The current data is being kept.');
      return false;
    }
  }, [customers.hydrate, orders.hydrate, staffNotes.hydrate]);

  useEffect(() => {
    void refreshData();
    const refreshTimer = window.setInterval(() => { void refreshData(); }, 120000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshData]);

  const value: AppDataContextValue = useMemo(() => ({
    // Orders
    orders: orders.orders,
    addOrder: orders.addOrder,
    updateOrder: orders.updateOrder,
    bulkUpdateStatus: orders.bulkUpdateStatus,
    updateOrderAndSeries: orders.updateOrderAndSeries,
    updateOrderAndFuture: orders.updateOrderAndFuture,
    deleteOrder: orders.deleteOrder,
    deleteRecurringSeries: orders.deleteRecurringSeries,
    setAllOrders: orders.setAllOrders,
    getDuplicateOrderData: orders.getDuplicateOrderData,
    getOrderById: orders.getOrderById,
    getOrdersByCustomerId: orders.getOrdersByCustomerId,
    getOrdersByStatus: orders.getOrdersByStatus,
    getOrdersByDateRange: orders.getOrdersByDateRange,
    searchOrders: orders.searchOrders,
    getOrderStats: orders.getOrderStats,
    syncOrdersToSheets: orders.syncOrdersToSheets,

    // Customers
    customers: customers.customers,
    addCustomer: customers.addCustomer,
    updateCustomer: customers.updateCustomer,
    deleteCustomer: customers.deleteCustomer,
    setAllCustomers: customers.setAllCustomers,
    getCustomerById: customers.getCustomerById,
    searchCustomers: customers.searchCustomers,

    // Staff notes
    staffNotes: staffNotes.staffNotes,
    addStaffNote: staffNotes.addStaffNote,
    deleteStaffNote: staffNotes.deleteStaffNote,
    setAllStaffNotes: staffNotes.setAllStaffNotes,
    getNotesForOrder: staffNotes.getNotesForOrder,
    loadStaffNotes: staffNotes.loadStaffNotes,

    // Per-hook loading/error
    ordersLoading: orders.loading,
    ordersError: orders.error,
    clearOrdersError: orders.clearError,
    customersLoading: customers.loading,
    customersError: customers.error,
    staffNotesLoading: staffNotes.loading,
    staffNotesError: staffNotes.error,

    // Combined convenience fields
    loading: orders.loading || customers.loading || staffNotes.loading,
    error: orders.error || customers.error || staffNotes.error,
    lastRefresh,
    refreshError,
    refreshData,
  }), [orders, customers, staffNotes, orders.loading, customers.loading, staffNotes.loading, orders.error, customers.error, staffNotes.error, lastRefresh, refreshError, refreshData]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = (): AppDataContextValue => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
};
