// src/hooks/useOrders.ts
// ============================================================
// DROP-IN REPLACEMENT for the original useOrders.ts
// Identical public API — components need zero changes.
// Data now lives in MySQL via the SiteGround PHP API.
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Order, Customer, EmailTemplate } from '../types';

import { useUndo } from './useUndo';
import errorLogger from '../services/errorLogger';
import { ordersApi } from './useApi';
import { emailSettings, emailLog, sendTemplateEmail } from '../services/emailService';

const parseDateLocal = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatDateLocal = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

function getTemplateFromStorage(templateId: string): EmailTemplate | null {
  try {
    const saved = localStorage.getItem('fergbutcher_email_templates');
    if (saved) {
      const templates: EmailTemplate[] = JSON.parse(saved);
      return templates.find(t => t.id === templateId) || null;
    }
  } catch { /* ignore */ }
  return null;
}

async function autoSendOrderEmail(
  order: Order,
  customer: Customer | undefined,
  templateId: 'order-received' | 'order-confirmed',
  sentBy: string
) {
  console.log('[autoSendOrderEmail] Called for order:', order.id, 'template:', templateId);
  if (!customer || !customer.email) {
    console.warn('[autoSendOrderEmail] Skipping — no customer or no email. Customer:', customer?.id, 'email:', customer?.email);
    return;
  }
  try {
    const settings = await emailSettings.get();
    console.log('[autoSendOrderEmail] Settings loaded:', settings);
    if (!settings || !settings.automationEnabled) {
      console.warn('[autoSendOrderEmail] Skipping — automation not enabled');
      return;
    }
    if (templateId === 'order-received' && !settings.templateOrderReceived) {
      console.warn('[autoSendOrderEmail] Skipping — templateOrderReceived disabled');
      return;
    }
    if (templateId === 'order-confirmed' && !settings.templateOrderConfirmed) {
      console.warn('[autoSendOrderEmail] Skipping — templateOrderConfirmed disabled');
      return;
    }
    const already = await emailLog.wasSent(order.id, templateId);
    if (already) {
      console.warn('[autoSendOrderEmail] Skipping — already sent for this order/template');
      return;
    }
    const template = getTemplateFromStorage(templateId);
    if (!template) {
      console.warn('[autoSendOrderEmail] Skipping — template not found in localStorage:', templateId);
      return;
    }
    console.log('[autoSendOrderEmail] Sending email to:', customer.email, 'template:', templateId);
    const result = await sendTemplateEmail(template, order, customer, sentBy);
    console.log('[autoSendOrderEmail] Send result:', result);
    if (!result.success) {
      console.warn(`Auto ${templateId} email failed:`, result.error);
    }
  } catch (err) {
    console.error(`Auto ${templateId} email error:`, err);
  }
}

export const useOrders = (opts: { skipInitialFetch?: boolean } = {}) => {
  const { skipInitialFetch = false } = opts;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);
  const { addUndoAction } = useUndo();

  // Always-current snapshot of orders so mutation callbacks never close
  // over a stale array. This is the root fix for the "change reverts"
  // bug: every function below reads from ordersRef.current instead of
  // the captured `orders` variable.
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  // ── Load all orders from DB on mount ─────────────────────
  useEffect(() => {
    if (skipInitialFetch) return;
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
  }, [skipInitialFetch]);

  // Hydrate from a combined fetch (avoids a separate round trip)
  const hydrate = useCallback((data: Order[]) => {
    setOrders(data);
    setLoading(false);
    setError(null);
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

  // Per-change Google Sheets sync is disabled — sync runs hourly or manually.
  const triggerSync = useCallback((_allOrders: Order[], _customers: Customer[]) => {}, []);

  // ── addOrder ──────────────────────────────────────────────
  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, customers: Customer[] = []): Promise<Order | null> => {
    try {
      const currentOrders = ordersRef.current;

      if (orderData.isRecurring && orderData.recurrencePattern && orderData.recurrenceEndDate) {
        // ── Recurring series ──────────────────────────────
        const parentOrderId = uuidv4();
        const newOrders: Order[] = [];
        const intervalDays = orderData.recurrencePattern === 'weekly' ? 7 : 14;
        let currentDate = parseDateLocal(orderData.collectionDate!);
        const endDate   = parseDateLocal(orderData.recurrenceEndDate);
        let count = 0;

        while (currentDate <= endDate && count < 52) {
          const newOrder: Order = {
            ...orderData,
            id: getNextOrderId(currentOrders, newOrders),
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

        // Optimistic update
        setOrders(prev => [...newOrders, ...prev]);

        try {
          await ordersApi.saveAll(newOrders);
        } catch (err) {
          console.error('Failed to save recurring orders to DB:', err);
          setError((err as Error).message || 'Failed to save orders. Please try again.');
          setOrders(prev => prev.filter(o => !newOrders.some(n => n.id === o.id)));
          return null;
        }

        triggerSync(ordersRef.current, customers);

        addUndoAction({
          id: `add-recurring-orders-${parentOrderId}`,
          description: `Created ${newOrders.length} recurring orders (${orderData.recurrencePattern})`,
          undo: () => {
            setOrders(prev => prev.filter(o => !newOrders.some(n => n.id === o.id)));
            newOrders.forEach(o => ordersApi.delete(o.id).catch(console.error));
            errorLogger.info(`Undid creating ${newOrders.length} recurring orders`);
          }
        });

        errorLogger.info(`Created ${newOrders.length} recurring orders`);

        // Auto-send a single email for the recurring series (first occurrence only)
        const recurringCustomer = customers.find(c => c.id === orderData.customerId);
        const tplId = orderData.status === 'confirmed' ? 'order-confirmed' : orderData.status === 'pending' ? 'order-received' : null;
        if (tplId && newOrders.length > 0) {
          autoSendOrderEmail(newOrders[0], recurringCustomer, tplId, 'Automation');
        }

        return newOrders[0];

      } else {
        // ── Single order ──────────────────────────────────
        const newOrder: Order = {
          ...orderData,
          id: getNextOrderId(currentOrders),
          orderType: orderData.orderType || 'standard',
          isRecurring: false,
          recurrencePattern: null,
          recurrenceEndDate: null,
          parentOrderId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Optimistic update
        setOrders(prev => [newOrder, ...prev]);

        try {
          const saved = await ordersApi.save(newOrder);
          console.log('[addOrder] Save returned success. Saved order:', saved);

          // Verify the order was actually persisted by fetching it back
          try {
            const verified = await ordersApi.getOne(newOrder.id);
            console.log('[addOrder] Post-save verification: order found in DB:', !!verified, 'ID:', verified?.id);
          } catch (verifyErr) {
            console.error('[addOrder] Post-save verification FAILED — order NOT found in DB after save:', verifyErr);
          }
        } catch (err) {
          console.error('Failed to save order to DB:', err);
          setError((err as Error).message || 'Failed to save order. Please try again.');
          setOrders(prev => prev.filter(o => o.id !== newOrder.id));
          return null;
        }

        triggerSync(ordersRef.current, customers);

        addUndoAction({
          id: `add-order-${newOrder.id}`,
          description: `Created order #${newOrder.id}`,
          undo: () => {
            setOrders(prev => prev.filter(o => o.id !== newOrder.id));
            ordersApi.delete(newOrder.id).catch(console.error);
            errorLogger.info(`Undid creating order #${newOrder.id}`);
          }
        });

        errorLogger.info(`Order created: #${newOrder.id}`);

        // Auto-send email on creation
        const newCustomer = customers.find(c => c.id === newOrder.customerId);
        if (newOrder.status === 'confirmed') {
          autoSendOrderEmail(newOrder, newCustomer, 'order-confirmed', 'Automation');
        } else if (newOrder.status === 'pending') {
          autoSendOrderEmail(newOrder, newCustomer, 'order-received', 'Automation');
        }

        return newOrder;
      }
    } catch (err) {
      console.error('Error adding order:', err);
      errorLogger.error('Failed to add order', err);
      setError('Failed to add order');
      return null;
    }
  }, [addUndoAction, triggerSync]);

  // ── updateOrder ───────────────────────────────────────────
  const updateOrder = useCallback((id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>, customers: Customer[] = []) => {
    try {
      const updatedAt = new Date().toISOString();
      const currentOrders = ordersRef.current;
      const previousOrder = currentOrders.find(o => o.id === id);
      if (!previousOrder) return false;

      // Optimistic update — functional so we never overwrite concurrent changes
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates, updatedAt } : o));

      // Auto-send confirmation email on status change to 'confirmed'
      if (updates.status === 'confirmed' && previousOrder.status !== 'confirmed') {
        const customer = customers.find(c => c.id === previousOrder.customerId);
        autoSendOrderEmail({ ...previousOrder, ...updates, updatedAt } as Order, customer, 'order-confirmed', 'Automation');
      }

      ordersApi.update(id, { ...updates, updatedAt })
        .then(() => triggerSync(ordersRef.current, customers))
        .catch(err => {
          console.error('Failed to update order in DB:', err);
          // Revert only the affected order, preserving any concurrent changes
          setOrders(prev => prev.map(o => o.id === id ? previousOrder : o));
          setError('Failed to update order. Please try again.');
        });

      return true;
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order');
      return false;
    }
  }, [triggerSync]);

  // ── bulkUpdateStatus ──────────────────────────────────────
  // Updates status on multiple orders atomically (single setOrders call).
  const bulkUpdateStatus = useCallback((ids: string[], status: Order['status'], customers: Customer[] = []) => {
    try {
      const updatedAt = new Date().toISOString();
      const idSet = new Set(ids);
      const currentOrders = ordersRef.current;
      const previousOrders = currentOrders.filter(o => idSet.has(o.id));

      setOrders(prev => prev.map(o =>
        idSet.has(o.id) ? { ...o, status, updatedAt } : o
      ));
      Promise.all(ids.map(id => ordersApi.update(id, { status, updatedAt })))
        .then(() => triggerSync(ordersRef.current, customers))
        .catch(err => {
          console.error('Failed to bulk update orders:', err);
          // Revert only the affected orders
          const prevMap = new Map(previousOrders.map(o => [o.id, o]));
          setOrders(prev => prev.map(o => {
            const prevOrder = prevMap.get(o.id);
            return prevOrder ? prevOrder : o;
          }));
          setError('Failed to update orders. Please try again.');
        });
      return true;
    } catch (err) {
      console.error('Error bulk updating orders:', err);
      setError('Failed to update orders');
      return false;
    }
  }, [triggerSync]);

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
      const currentOrders = ordersRef.current;

      const isBeingConvertedToRecurring =
        !originalOrder.isRecurring &&
        updates.isRecurring === true &&
        updates.recurrencePattern &&
        updates.recurrenceEndDate &&
        originalOrder.collectionDate;

      if (isBeingConvertedToRecurring) {
        const parentId = uuidv4();
        const intervalDays = updates.recurrencePattern === 'weekly' ? 7 : 14;
        const endDate = parseDateLocal(updates.recurrenceEndDate!);
        const generatedOrders: Order[] = [];
        let currentDate = parseDateLocal(originalOrder.collectionDate);
        currentDate.setDate(currentDate.getDate() + intervalDays);

        while (currentDate <= endDate && generatedOrders.length < 52) {
          generatedOrders.push({
            ...originalOrder,
            ...updates,
            id: getNextOrderId(currentOrders, generatedOrders),
            collectionDate: formatDateLocal(currentDate),
            isRecurring: true,
            recurrencePattern: updates.recurrencePattern,
            recurrenceEndDate: updates.recurrenceEndDate,
            parentOrderId: parentId,
            createdAt: updatedAt,
            updatedAt,
          });
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + intervalDays);
        }

        const firstOrder = {
          ...originalOrder,
          ...updates,
          isRecurring: true,
          recurrencePattern: updates.recurrencePattern,
          recurrenceEndDate: updates.recurrenceEndDate,
          parentOrderId: parentId,
          updatedAt,
        };

        setOrders(prev => [firstOrder, ...generatedOrders, ...prev.filter(o => o.id !== originalOrder.id)]);

        Promise.all([
          ordersApi.update(originalOrder.id, {
            ...updates,
            isRecurring: true,
            recurrencePattern: updates.recurrencePattern,
            recurrenceEndDate: updates.recurrenceEndDate,
            parentOrderId: parentId,
            updatedAt,
          }),
          generatedOrders.length > 0 ? ordersApi.saveAll(generatedOrders) : Promise.resolve(),
        ])
          .then(() => triggerSync(ordersRef.current, customers))
          .catch(err => {
            console.error('Failed to create recurring series:', err);
            // Revert: remove generated orders, restore original
            const generatedIds = new Set(generatedOrders.map(o => o.id));
            setOrders(prev => [
              originalOrder,
              ...prev.filter(o => o.id !== originalOrder.id && !generatedIds.has(o.id)),
            ]);
            setError('Failed to create recurring orders. Please try again.');
          });

        return true;
      }

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

        const seriesOrders = currentOrders.filter(o => o.parentOrderId === parentId);
        const toKeep       = seriesOrders.filter(o => o.collectionDate <= newEndDate);
        const toDelete     = seriesOrders.filter(o => o.collectionDate > newEndDate);

        // Generate missing occurrences beyond the last kept date up to the new end
        const sorted = [...toKeep].sort((a, b) => (a.collectionDate ?? '').localeCompare(b.collectionDate ?? ''));
        const generatedOrders: Order[] = [];
        if (sorted.length > 0) {
          let cur = parseDateLocal(sorted[sorted.length - 1].collectionDate);
          cur.setDate(cur.getDate() + intervalDays);
          while (cur <= newEndParsed && generatedOrders.length < 52) {
            const dateStr = formatDateLocal(cur);
            generatedOrders.push({
              ...originalOrder,
              id: getNextOrderId([...currentOrders, ...generatedOrders]),
              collectionDate: dateStr,
              recurrenceEndDate: newEndDate,
              status: updates.status || originalOrder.status || 'pending',
              createdAt: updatedAt,
              updatedAt,
            });
            cur = new Date(cur);
            cur.setDate(cur.getDate() + intervalDays);
          }
        }

        const deleteIds = new Set(toDelete.map(o => o.id));

        // Preserve parentOrderId — never let it get wiped by form updates
        const safeUpdates = { ...updates, parentOrderId: parentId };

        // Capture previous state of affected orders for rollback
        const affectedIds = new Set([
          ...deleteIds,
          ...toKeep.map(o => o.id),
        ]);
        const previousAffected = currentOrders.filter(o => affectedIds.has(o.id));

        setOrders(prev => [
          ...generatedOrders,
          ...prev
            .filter(o => !deleteIds.has(o.id))
            .map(o => {
              if (o.parentOrderId !== parentId) return o;
              const base = { ...o, recurrenceEndDate: newEndDate, updatedAt };
              return o.id === id ? { ...base, ...safeUpdates } : base;
            }),
        ]);

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
          .then(() => triggerSync(ordersRef.current, customers))
          .catch(err => {
            console.error('Failed to sync recurring series:', err);
            setError('Failed to update recurring series. Please try again.');
            // Revert: remove generated orders, restore previous state of affected orders
            const generatedIds = new Set(generatedOrders.map(o => o.id));
            const prevMap = new Map(previousAffected.map(o => [o.id, o]));
            setOrders(prev => [
              ...previousAffected,
              ...prev.filter(o => !generatedIds.has(o.id) && !affectedIds.has(o.id)),
            ]);
          });

        return true;
      }

      // No series change needed — plain single-order update
      const safeUpdates = updates.isRecurring === false
        ? { ...updates, recurrencePattern: null, recurrenceEndDate: null, parentOrderId: null }
        : updates;
      return updateOrder(id, safeUpdates as Partial<Omit<Order, 'id' | 'createdAt'>>, customers);
    } catch (err) {
      console.error('[updateOrderAndSeries] CAUGHT ERROR:', err);
      setError('Failed to update order');
      return false;
    }
  }, [updateOrder, triggerSync]);

  // ── updateOrderAndFuture ──────────────────────────────────
  // Applies updates to a single order, or to that order plus all future
  // orders in the same recurring series (collectionDate >= anchor's date).
  // Each future order keeps its own collectionDate/collectionTime; only the
  // edited fields are copied across. Used by the edit form scope selector
  // and the status-change scope popup.
  const updateOrderAndFuture = useCallback((
    anchorOrder: Order,
    updates: Partial<Omit<Order, 'id' | 'createdAt'>>,
    applyToFuture: boolean,
    customers: Customer[] = []
  ) => {
    try {
      if (!applyToFuture || !anchorOrder.parentOrderId) {
        const safeUpdates = updates.isRecurring === false
          ? { ...updates, recurrencePattern: null, recurrenceEndDate: null, parentOrderId: null }
          : updates;
        return updateOrder(anchorOrder.id, safeUpdates, customers);
      }

      const updatedAt = new Date().toISOString();
      const currentOrders = ordersRef.current;

      if (updates.isRecurring === false) {
        const targetOrders = currentOrders.filter(o =>
          o.parentOrderId === anchorOrder.parentOrderId &&
          o.collectionDate >= (anchorOrder.collectionDate || '')
        );
        const targetIds = new Set(targetOrders.map(o => o.id));
        const targetOrdersSnapshot = targetOrders;

        setOrders(prev => prev.filter(o => !targetIds.has(o.id)));

        Promise.all(targetOrders.map(o => ordersApi.delete(o.id)))
          .then(() => triggerSync(ordersRef.current, customers))
          .catch(err => {
            console.error('Failed to delete future recurring orders:', err);
            // Restore deleted orders
            setOrders(prev => [...prev, ...targetOrdersSnapshot]);
            setError('Failed to delete recurring orders. Please try again.');
          });
        return true;
      }
      const parentId = anchorOrder.parentOrderId;
      const anchorDate = anchorOrder.collectionDate || '';

      // Fields that should NOT be copied across future orders
      const { collectionDate, collectionTime, ...sharedUpdates } = updates;

      const targetIds = new Set(
        currentOrders
          .filter(o => o.parentOrderId === parentId && o.collectionDate >= anchorDate)
          .map(o => o.id)
      );

      // Always include the anchor even if date comparison missed it
      targetIds.add(anchorOrder.id);

      // Capture previous state of affected orders for rollback
      const previousAffected = currentOrders.filter(o => targetIds.has(o.id));

      setOrders(prev => prev.map(o =>
        targetIds.has(o.id) ? { ...o, ...sharedUpdates, updatedAt } : o
      ));

      // Auto-send a single confirmation email for the series (anchor order only)
      if (sharedUpdates.status === 'confirmed') {
        const customer = customers.find(c => c.id === anchorOrder.customerId);
        const prev = currentOrders.find(o => o.id === anchorOrder.id);
        if (prev && prev.status !== 'confirmed') {
          autoSendOrderEmail({ ...prev, ...sharedUpdates, updatedAt } as Order, customer, 'order-confirmed', 'Automation');
        }
      }

      const ids = Array.from(targetIds);
      Promise.all(ids.map(id => ordersApi.update(id, { ...sharedUpdates, updatedAt })))
        .then(() => triggerSync(ordersRef.current, customers))
        .catch(err => {
          console.error('Failed to update future recurring orders:', err);
          // Revert only the affected orders
          const prevMap = new Map(previousAffected.map(o => [o.id, o]));
          setOrders(prev => prev.map(o => {
            const prevOrder = prevMap.get(o.id);
            return prevOrder ? prevOrder : o;
          }));
          setError('Failed to update recurring orders. Please try again.');
        });

      return true;
    } catch (err) {
      console.error('Error in updateOrderAndFuture:', err);
      setError('Failed to update order');
      return false;
    }
  }, [updateOrder, triggerSync]);

  // ── deleteOrder ───────────────────────────────────────────
  const deleteOrder = useCallback((id: string, customers: Customer[] = []) => {
    try {
      const currentOrders = ordersRef.current;
      const orderToDelete = currentOrders.find(o => o.id === id);
      if (!orderToDelete) return false;

      setOrders(prev => prev.filter(o => o.id !== id));

      ordersApi.delete(id)
        .then(() => triggerSync(ordersRef.current, customers))
        .catch(err => {
          console.error('Failed to delete order from DB:', err);
          setError('Failed to delete order. Please try again.');
          // Restore the deleted order
          setOrders(prev => {
            if (prev.some(o => o.id === id)) return prev;
            return [...prev, orderToDelete];
          });
        });

      addUndoAction({
        id: `delete-order-${id}`,
        description: `Deleted order #${id}`,
        undo: () => {
          setOrders(prev => {
            if (prev.some(o => o.id === id)) return prev;
            return [...prev, orderToDelete];
          });
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
  }, [addUndoAction, triggerSync]);

  // ── deleteRecurringSeries ─────────────────────────────────
  // Deletes the given order and all other orders in the same
  // recurring series with a collectionDate >= the given order's
  // collectionDate (i.e. "this and all future occurrences").
  const deleteRecurringSeries = useCallback((id: string, customers: Customer[] = []) => {
    try {
      const currentOrders = ordersRef.current;
      const anchor = currentOrders.find(o => o.id === id);
      if (!anchor) return { success: false, count: 0 };
      if (!anchor.parentOrderId) {
        // Not part of a series — fall back to single delete
        const ok = deleteOrder(id, customers);
        return { success: ok, count: ok ? 1 : 0 };
      }

      const toDelete = currentOrders.filter(
        o =>
          o.parentOrderId === anchor.parentOrderId &&
          o.collectionDate >= anchor.collectionDate
      );

      if (toDelete.length === 0) return { success: false, count: 0 };

      const deleteIds = new Set(toDelete.map(o => o.id));
      const toDeleteSnapshot = toDelete;

      setOrders(prev => prev.filter(o => !deleteIds.has(o.id)));

      Promise.all(toDelete.map(o => ordersApi.delete(o.id)))
        .then(() => triggerSync(ordersRef.current, customers))
        .catch(err => {
          console.error('Failed to delete recurring series from DB:', err);
          setError('Failed to delete recurring orders. Please try again.');
          // Restore deleted orders
          setOrders(prev => [...prev, ...toDeleteSnapshot]);
        });

      addUndoAction({
        id: `delete-recurring-${anchor.parentOrderId}-${anchor.collectionDate}`,
        description: `Deleted ${toDelete.length} recurring order${toDelete.length !== 1 ? 's' : ''}`,
        undo: () => {
          setOrders(prev => [...prev, ...toDeleteSnapshot]);
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
  }, [addUndoAction, deleteOrder, triggerSync]);

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

  const syncOrdersToSheets = async (_customers: Customer[]) => {
    // Per-change sync disabled — use the manual Sync Now button or hourly auto-sync.
    return false;
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
    clearError: () => setError(null),
    hydrate,
    addOrder,
    updateOrder,
    bulkUpdateStatus,
    updateOrderAndSeries,
    updateOrderAndFuture,
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
