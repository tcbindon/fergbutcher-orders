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

const parseDateLocal = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatDateLocal = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

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

  // ── Sync helper ───────────────────────────────────────────
  const triggerSync = useCallback((allOrders: Order[], customers: Customer[]) => {
    if (!isConnected) return;
    const standardOrders  = allOrders.filter(o => o.orderType !== 'christmas');
    const christmasOrders = allOrders.filter(o => o.orderType === 'christmas');
    if (standardOrders.length > 0)  syncOrders(standardOrders, customers).catch(console.error);
    if (christmasOrders.length > 0) syncChristmasOrders(christmasOrders, customers).catch(console.error);
  }, [isConnected, syncOrders, syncChristmasOrders]);

  // ── addOrder ──────────────────────────────────────────────
  const addOrder = useCallback((orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, customers: Customer[] = []) => {
    try {
      if (orderData.isRecurring && orderData.recurrencePattern && orderData.recurrenceEndDate) {
        // ── Recurring series ──────────────────────────────
        const parentOrderId = uuidv4();
        const newOrders: Order[] = [];
        const intervalDays = orderData.recurrencePattern === 'weekly' ? 7 : 14;
        let currentDate = parseDateLocal(orderData.collectionDate);
        const endDate   = parseDateLocal(orderData.recurrenceEndDate);
        let count = 0;

        while (currentDate <= endDate && count < 52) {
          const newOrder: Order = {
            ...orderData,
            id: getNextOrderId(orders, newOrders),
            collectionDate: formatDateLocal(currentDate),
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
        const allOrders = [...newOrders, ...orders];

        // Optimistic update
        setOrders(prev => [...newOrders, ...prev]);

        // Persist to DB (fire and forget with error handling)
        ordersApi.saveAll(newOrders)
          .then(() => triggerSync(allOrders, customers))
          .catch(err => {
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
        const allOrders = [newOrder, ...orders];

        // Optimistic update
        setOrders(prev => [newOrder, ...prev]);

        // Persist to DB
        ordersApi.save(newOrder)
          .then(() => triggerSync(allOrders, customers))
          .catch(err => {
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
  }, [orders, addUndoAction, triggerSync]);

  // ── updateOrder ───────────────────────────────────────────
  const updateOrder = useCallback((id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>, customers: Customer[] = []) => {
    try {
      const updatedAt = new Date().toISOString();
      const updatedOrders = orders.map(o => o.id === id ? { ...o, ...updates, updatedAt } : o);
      setOrders(updatedOrders);

      ordersApi.update(id, { ...updates, updatedAt })
        .then(() => triggerSync(updatedOrders, customers))
        .catch(err => {
          console.error('Failed to update order in DB:', err);
          setError('Failed to update order. Please try again.');
        });

      return true;
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order');
      return false;
    }
  }, [orders, triggerSync]);

  // ── updateOrderAndSeries ──────────────────────────────────
  // Use this instead of updateOrder when editing a recurring order from
  // a component. Takes the original order snapshot (editingOrder from
  // component state) so detection is reliable regardless of DB field
  // formats. Handles series reconciliation + single-order update atomically.
  const updateOrderAndSeries = useCallback((
    originalOrder: Order,
    updates: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
    customers: Customer[] = []
  ) => {
    try {
      const id = originalOrder.id;
      const updatedAt = new Date().toISOString();

      const needsSeriesSync =
        originalOrder.isRecurring &&
        originalOrder.parentOrderId &&
        originalOrder.recurrencePattern &&
        updates.recurrenceEndDate &&
        updates.recurrenceEndDate !== originalOrder.recurrenceEndDate;

      if (needsSeriesSync) {
        const parentId      = originalOrder.parentOrderId!;
        const intervalDays  = originalOrder.recurrencePattern === 'weekly' ? 7 : 14;
        const newEndDate    = updates.recurrenceEndDate!;
        const newEndParsed  = parseDateLocal(newEndDate);

        const seriesOrders = orders.filter(o => o.parentOrderId === parentId);
        const toKeep       = seriesOrders.filter(o => o.collectionDate <= newEndDate);
        const toDelete     = seriesOrders.filter(o => o.collectionDate > newEndDate);

        // Generate missing occurrences beyond the last kept date up to the new end
        const sorted = [...toKeep].sort((a, b) => a.collectionDate.localeCompare(b.collectionDate));
        const generatedOrders: Order[] = [];
        if (sorted.length > 0) {
          let cur = parseDateLocal(sorted[sorted.length - 1].collectionDate);
          cur.setDate(cur.getDate() + intervalDays);
          while (cur <= newEndParsed && generatedOrders.length < 52) {
            const dateStr = formatDateLocal(cur);
            generatedOrders.push({
              ...originalOrder,
              id: getNextOrderId([...orders, ...generatedOrders]),
              collectionDate: dateStr,
              recurrenceEndDate: newEndDate,
              status: 'pending',
              createdAt: updatedAt,
              updatedAt,
            });
            cur = new Date(cur);
            cur.setDate(cur.getDate() + intervalDays);
          }
        }

        const deleteIds = new Set(toDelete.map(o => o.id));
        const previousOrders = [...orders];

        // Preserve parentOrderId — never let it get wiped by form updates
        const safeUpdates = { ...updates, parentOrderId };

        const nextOrders = [
          ...generatedOrders,
          ...orders
            .filter(o => !deleteIds.has(o.id))
            .map(o => {
              if (o.parentOrderId !== parentId) return o;
              const base = { ...o, recurrenceEndDate: newEndDate, updatedAt };
              return o.id === id ? { ...base, ...safeUpdates } : base;
            }),
        ];

        setOrders(nextOrders);

        const dbOps: Promise<any>[] = [];
        toDelete.forEach(o => dbOps.push(ordersApi.delete(o.id)));
        toKeep.forEach(o => {
          const patch = o.id === id
            ? { ...safeUpdates, recurrenceEndDate: newEndDate, updatedAt }
            : { recurrenceEndDate: newEndDate, updatedAt };
          dbOps.push(ordersApi.update(o.id, patch));
        });
        if (generatedOrders.length > 0) dbOps.push(ordersApi.saveAll(generatedOrders));

        Promise.all(dbOps)
          .then(() => triggerSync(nextOrders, customers))
          .catch(err => {
            console.error('Failed to sync recurring series:', err);
            setError('Failed to update recurring series. Please try again.');
            setOrders(previousOrders);
          });

        return true;
      }

      // No series change needed — plain single-order update
      return updateOrder(id, updates as Partial<Omit<Order, 'id' | 'createdAt'>>, customers);
    } catch (err) {
      console.error('Error updating order and series:', err);
      setError('Failed to update order');
      return false;
    }
  }, [orders, updateOrder, triggerSync]);

  // ── deleteOrder ───────────────────────────────────────────
  const deleteOrder = useCallback((id: string, customers: Customer[] = []) => {
    try {
      const orderToDelete = orders.find(o => o.id === id);
      if (!orderToDelete) return false;

      const previousOrders = [...orders];
      const remaining = orders.filter(o => o.id !== id);
      setOrders(remaining);

      ordersApi.delete(id)
        .then(() => triggerSync(remaining, customers))
        .catch(err => {
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
  }, [orders, addUndoAction, triggerSync]);

  // ── deleteRecurringSeries ─────────────────────────────────
  // Deletes the given order and all other orders in the same
  // recurring series with a collectionDate >= the given order's
  // collectionDate (i.e. "this and all future occurrences").
  const deleteRecurringSeries = useCallback((id: string, customers: Customer[] = []) => {
    try {
      const anchor = orders.find(o => o.id === id);
      if (!anchor) return { success: false, count: 0 };
      if (!anchor.parentOrderId) {
        // Not part of a series — fall back to single delete
        const ok = deleteOrder(id, customers);
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
      const remaining = orders.filter(o => !deleteIds.has(o.id));
      setOrders(remaining);

      Promise.all(toDelete.map(o => ordersApi.delete(o.id)))
        .then(() => triggerSync(remaining, customers))
        .catch(err => {
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
  }, [orders, addUndoAction, deleteOrder, triggerSync]);

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
    const term = searchTerm.toLowerCase();
    const normalised = term.replace(/\s/g, '');
    return orders.filter(o => {
      const customer = customers.find(c => c.id === o.customerId);
      const name = customer ? `${customer.firstName} ${customer.lastName}`.toLowerCase() : '';
      const phone = customer?.phone ? customer.phone.replace(/\s/g, '') : '';
      return name.includes(term) ||
        phone.includes(normalised) ||
        (customer?.email && customer.email.toLowerCase().includes(term)) ||
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
    updateOrderAndSeries,
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
