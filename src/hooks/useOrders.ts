// src/hooks/useOrders.ts
// ============================================================
// DROP-IN REPLACEMENT for the original useOrders.ts
// Identical public API — components need zero changes.
// Data now lives in MySQL via the SiteGround PHP API.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Order, Customer } from '../types';
import { useGoogleSheets } from './useGoogleSheets';
import { useUndo } from './useUndo';
import errorLogger from '../services/errorLogger';
import { ordersApi } from './useApi';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, syncOrders, syncChristmasOrders } = useGoogleSheets();
  const { addUndoAction } = useUndo();

  // ── Load all orders from DB on mount ─────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ordersApi.getAll()
      .then(data => { if (!cancelled) { setOrders(data); setError(null); } })
      .catch(err => {
        if (!cancelled) {
          console.error('Error loading orders:', err);
          errorLogger.error('Failed to load orders', err);
          setError('Failed to load orders. Please check your connection.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Helpers ───────────────────────────────────────────────
  const getNextOrderId = (existingOrders: Order[], extra: Order[] = []): string => {
    const all = [...existingOrders, ...extra];
    const max = all.reduce((m, o) => {
      const n = parseInt(o.id);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return (max + 1).toString();
  };

  // ── addOrder ──────────────────────────────────────────────
  const addOrder = useCallback((orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (orderData.isRecurring && orderData.recurrencePattern && orderData.recurrenceEndDate) {
        // ── Recurring series ──────────────────────────────
        const parentOrderId = uuidv4();
        const newOrders: Order[] = [];
        const intervalDays = orderData.recurrencePattern === 'weekly' ? 7 : 14;
        let currentDate = new Date(orderData.collectionDate);
        const endDate   = new Date(orderData.recurrenceEndDate);
        let count = 0;

        while (currentDate <= endDate && count < 52) {
          const newOrder: Order = {
            ...orderData,
            id: getNextOrderId(orders, newOrders),
            collectionDate: currentDate.toISOString().split('T')[0],
            orderType: orderData.orderType || 'standard',
            isRecurring: true,
            recurrencePattern: orderData.recurrencePattern,
            recurrenceEndDate: orderData.recurrenceEndDate,
            parentOrderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          newOrders.push(newOrder);
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + intervalDays);
          count++;
        }

        const previousOrders = [...orders];

        // Optimistic update
        setOrders(prev => [...newOrders, ...prev]);

        // Persist to DB (fire and forget with error handling)
        ordersApi.saveAll(newOrders).catch(err => {
          console.error('Failed to save recurring orders to DB:', err);
          setError('Failed to save orders. Please try again.');
          setOrders(previousOrders); // rollback
        });

        addUndoAction({
          id: `add-recurring-orders-${parentOrderId}`,
          description: `Created ${newOrders.length} recurring orders (${orderData.recurrencePattern})`,
          undo: () => {
            setOrders(previousOrders);
            // Delete from DB
            newOrders.forEach(o => ordersApi.delete(o.id).catch(console.error));
            errorLogger.info(`Undid creating ${newOrders.length} recurring orders`);
          }
        });

        errorLogger.info(`Created ${newOrders.length} recurring orders`);
        return newOrders[0];

      } else {
        // ── Single order ──────────────────────────────────
        const newOrder: Order = {
          ...orderData,
          id: getNextOrderId(orders),
          orderType: orderData.orderType || 'standard',
          isRecurring: false,
          recurrencePattern: null,
          recurrenceEndDate: null,
          parentOrderId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const previousOrders = [...orders];

        // Optimistic update
        setOrders(prev => [newOrder, ...prev]);

        // Persist to DB
        ordersApi.save(newOrder).catch(err => {
          console.error('Failed to save order to DB:', err);
          setError('Failed to save order. Please try again.');
          setOrders(previousOrders); // rollback
        });

        addUndoAction({
          id: `add-order-${newOrder.id}`,
          description: `Created order #${newOrder.id}`,
          undo: () => {
            setOrders(previousOrders);
            ordersApi.delete(newOrder.id).catch(console.error);
            errorLogger.info(`Undid creating order #${newOrder.id}`);
          }
        });

        errorLogger.info(`Order created: #${newOrder.id}`);
        return newOrder;
      }
    } catch (err) {
      console.error('Error adding order:', err);
      errorLogger.error('Failed to add order', err);
      setError('Failed to add order');
      return null;
    }
  }, [orders, addUndoAction]);

  // ── updateOrder ───────────────────────────────────────────
  const updateOrder = useCallback((id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>) => {
    try {
      const updatedAt = new Date().toISOString();
      setOrders(prev =>
        prev.map(o => o.id === id ? { ...o, ...updates, updatedAt } : o)
      );

      ordersApi.update(id, { ...updates, updatedAt }).catch(err => {
        console.error('Failed to update order in DB:', err);
        setError('Failed to update order. Please try again.');
      });

      return true;
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order');
      return false;
    }
  }, []);

  // ── deleteOrder ───────────────────────────────────────────
  const deleteOrder = useCallback((id: string) => {
    try {
      const orderToDelete = orders.find(o => o.id === id);
      if (!orderToDelete) return false;

      const previousOrders = [...orders];
      setOrders(prev => prev.filter(o => o.id !== id));

      ordersApi.delete(id).catch(err => {
        console.error('Failed to delete order from DB:', err);
        setError('Failed to delete order. Please try again.');
        setOrders(previousOrders); // rollback
      });

      addUndoAction({
        id: `delete-order-${id}`,
        description: `Deleted order #${id}`,
        undo: () => {
          setOrders(previousOrders);
          ordersApi.save(orderToDelete).catch(console.error);
          errorLogger.info(`Undid deleting order #${id}`);
        }
      });

      errorLogger.info(`Order deleted: #${id}`);
      return true;
    } catch (err) {
      console.error('Error deleting order:', err);
      errorLogger.error('Failed to delete order', err);
      setError('Failed to delete order');
      return false;
    }
  }, [orders, addUndoAction]);

  // ── deleteRecurringSeries ─────────────────────────────────
  // Deletes the given order and all other orders in the same
  // recurring series with a collectionDate >= the given order's
  // collectionDate (i.e. "this and all future occurrences").
  const deleteRecurringSeries = useCallback((id: string) => {
    try {
      const anchor = orders.find(o => o.id === id);
      if (!anchor) return { success: false, count: 0 };
      if (!anchor.parentOrderId) {
        // Not part of a series — fall back to single delete
        const ok = deleteOrder(id);
        return { success: ok, count: ok ? 1 : 0 };
      }

      const toDelete = orders.filter(
        o =>
          o.parentOrderId === anchor.parentOrderId &&
          o.collectionDate >= anchor.collectionDate
      );

      if (toDelete.length === 0) return { success: false, count: 0 };

      const previousOrders = [...orders];
      const deleteIds = new Set(toDelete.map(o => o.id));
      setOrders(prev => prev.filter(o => !deleteIds.has(o.id)));

      Promise.all(toDelete.map(o => ordersApi.delete(o.id))).catch(err => {
        console.error('Failed to delete recurring series from DB:', err);
        setError('Failed to delete recurring orders. Please try again.');
        setOrders(previousOrders);
      });

      addUndoAction({
        id: `delete-recurring-${anchor.parentOrderId}-${anchor.collectionDate}`,
        description: `Deleted ${toDelete.length} recurring order${toDelete.length !== 1 ? 's' : ''}`,
        undo: () => {
          setOrders(previousOrders);
          toDelete.forEach(o => ordersApi.save(o).catch(console.error));
          errorLogger.info(`Undid deleting ${toDelete.length} recurring orders`);
        }
      });

      errorLogger.info(`Deleted ${toDelete.length} recurring orders from series ${anchor.parentOrderId}`);
      return { success: true, count: toDelete.length };
    } catch (err) {
      console.error('Error deleting recurring series:', err);
      errorLogger.error('Failed to delete recurring series', err);
      setError('Failed to delete recurring orders');
      return { success: false, count: 0 };
    }
  }, [orders, addUndoAction, deleteOrder]);

  // ── Read helpers (unchanged logic) ───────────────────────
  const getOrderById = (id: string) => orders.find(o => o.id === id);

  const getOrdersByCustomerId = (customerId: string) =>
    orders.filter(o => o.customerId === customerId);

  const getOrdersByStatus = (status: Order['status']) =>
    orders.filter(o => o.status === status);

  const getOrdersByDateRange = (startDate: string, endDate: string) =>
    orders.filter(o => o.collectionDate >= startDate && o.collectionDate <= endDate);

  const searchOrders = (searchTerm: string, customers: Customer[]) => {
    if (!searchTerm.trim()) return orders;
    const today = new Date().toISOString().split('T')[0];
    const term = searchTerm.toLowerCase();
    return orders
      .filter(o => o.collectionDate >= today)
      .filter(o => {
        const customer = customers.find(c => c.id === o.customerId);
        const name = customer ? `${customer.firstName} ${customer.lastName}`.toLowerCase() : '';
        return name.includes(term) ||
          o.items.some(i => i.description.toLowerCase().includes(term)) ||
          o.additionalNotes?.toLowerCase().includes(term);
      });
  };

  const getOrderStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const current = orders.filter(o => o.collectionDate >= today);
    const todaysOrders = current.filter(o => o.collectionDate === today);
    return {
      total:          current.length,
      pending:        current.filter(o => o.status === 'pending').length,
      confirmed:      current.filter(o => o.status === 'confirmed').length,
      collected:      current.filter(o => o.status === 'collected').length,
      cancelled:      current.filter(o => o.status === 'cancelled').length,
      todaysTotal:    todaysOrders.length,
      todaysConfirmed:todaysOrders.filter(o => o.status === 'confirmed').length,
      todaysPending:  todaysOrders.filter(o => o.status === 'pending').length,
    };
  };

  const getDuplicateOrderData = (orderId: string) => {
    const original = orders.find(o => o.id === orderId);
    if (!original) return null;
    return {
      customerId:      original.customerId,
      items:           original.items.map(i => ({ description: i.description, quantity: i.quantity, unit: i.unit })),
      collectionDate:  new Date().toISOString().split('T')[0],
      collectionTime:  original.collectionTime || '',
      additionalNotes: original.additionalNotes || '',
      status:          'pending' as Order['status'],
      orderType:       original.orderType,
    };
  };

  const syncOrdersToSheets = async (customers: Customer[]) => {
    if (!isConnected) return false;
    try {
      const standardOrders  = orders.filter(o => o.orderType !== 'christmas');
      const christmasOrders = orders.filter(o => o.orderType === 'christmas');
      if (standardOrders.length > 0)  await syncOrders(standardOrders, customers);
      if (christmasOrders.length > 0) await syncChristmasOrders(christmasOrders, customers);
      return true;
    } catch (err) {
      console.error('Error syncing to sheets:', err);
      return false;
    }
  };

  // setAllOrders — used by Settings restore from backup
  const setAllOrders = async (newOrders: Order[]) => {
    try {
      await ordersApi.saveAll(newOrders);
      setOrders(newOrders);
      setError(null);
      errorLogger.info(`Restored ${newOrders.length} orders from backup`);
      return true;
    } catch (err) {
      console.error('Error restoring orders:', err);
      errorLogger.error('Failed to restore orders', err);
      setError('Failed to restore orders');
      return false;
    }
  };

  return {
    orders,
    loading,
    error,
    addOrder,
    updateOrder,
    deleteOrder,
    deleteRecurringSeries,
    setAllOrders,
    getDuplicateOrderData,
    getOrderById,
    getOrdersByCustomerId,
    getOrdersByStatus,
    getOrdersByDateRange,
    searchOrders,
    getOrderStats,
    syncOrdersToSheets,
  };
};
