import React, { createContext, useContext, useMemo } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useStaffNotes } from '../hooks/useStaffNotes';

type OrdersHook = ReturnType<typeof useOrders>;
type CustomersHook = ReturnType<typeof useCustomers>;
type StaffNotesHook = ReturnType<typeof useStaffNotes>;

interface AppDataContextValue
  extends Omit<OrdersHook, 'loading' | 'error' | 'clearError'>,
          Omit<CustomersHook, 'loading' | 'error'>,
          Omit<StaffNotesHook, 'loading' | 'error'> {
  ordersLoading: boolean;
  ordersError: string | null;
  clearOrdersError: () => void;
  customersLoading: boolean;
  customersError: string | null;
  staffNotesLoading: boolean;
  staffNotesError: string | null;
  loading: boolean;
  error: string | null;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const orders = useOrders();
  const customers = useCustomers();
  const staffNotes = useStaffNotes();

  const value: AppDataContextValue = useMemo(() => ({
    // Orders
    orders: orders.orders,
    addOrder: orders.addOrder,
    updateOrder: orders.updateOrder,
    bulkUpdateStatus: orders.bulkUpdateStatus,
    updateOrderAndSeries: orders.updateOrderAndSeries,
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
  }), [orders, customers, staffNotes, orders.loading, customers.loading, staffNotes.loading, orders.error, customers.error, staffNotes.error]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = (): AppDataContextValue => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
};
