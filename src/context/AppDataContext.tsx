import React, { createContext, useContext } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';

type OrdersHook = ReturnType<typeof useOrders>;
type CustomersHook = ReturnType<typeof useCustomers>;

// Merge both hooks, disambiguating the shared fields that each hook exposes.
// Components that previously called useOrders() get ordersLoading / ordersError.
// Components that called useCustomers() get customersLoading / customersError.
// The bare `loading` / `error` fields resolve to the combined state so components
// that only check one still behave correctly.
interface AppDataContextValue extends Omit<OrdersHook, 'loading' | 'error' | 'clearError'>, Omit<CustomersHook, 'loading' | 'error'> {
  // Per-hook loading/error for components that need to distinguish them
  ordersLoading: boolean;
  ordersError: string | null;
  clearOrdersError: () => void;
  customersLoading: boolean;
  customersError: string | null;
  // Combined — used by components that only call one hook (TodayChecklist, CalendarView etc.)
  loading: boolean;
  error: string | null;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const orders = useOrders();
  const customers = useCustomers();

  const value: AppDataContextValue = {
    // Spread all orders methods/data (excluding ambiguous fields)
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

    // Spread all customers methods/data (excluding ambiguous fields)
    customers: customers.customers,
    addCustomer: customers.addCustomer,
    updateCustomer: customers.updateCustomer,
    deleteCustomer: customers.deleteCustomer,
    setAllCustomers: customers.setAllCustomers,
    getCustomerById: customers.getCustomerById,
    searchCustomers: customers.searchCustomers,

    // Disambiguated per-hook fields
    ordersLoading: orders.loading,
    ordersError: orders.error,
    clearOrdersError: orders.clearError,
    customersLoading: customers.loading,
    customersError: customers.error,

    // Combined convenience fields for components that only care about one
    loading: orders.loading || customers.loading,
    error: orders.error || customers.error,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = (): AppDataContextValue => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
};
