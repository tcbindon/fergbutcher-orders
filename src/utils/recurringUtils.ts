import { Order } from '../types';

/**
 * Collapse pending recurring series so only the soonest upcoming pending
 * order in each series appears in the list. Non-pending orders and
 * non-recurring orders are always shown individually.
 *
 * Returns a new array (order preserved).
 */
export function collapsePendingRecurring(orders: Order[]): Order[] {
  const pendingSeriesParents = new Map<string, Order>();

  for (const o of orders) {
    if (o.status === 'pending' && o.parentOrderId) {
      const existing = pendingSeriesParents.get(o.parentOrderId);
      if (!existing || (o.collectionDate || '') < (existing.collectionDate || '')) {
        pendingSeriesParents.set(o.parentOrderId, o);
      }
    }
  }

  const hiddenIds = new Set<string>();
  for (const o of orders) {
    if (o.status === 'pending' && o.parentOrderId) {
      const rep = pendingSeriesParents.get(o.parentOrderId);
      if (rep && rep.id !== o.id) {
        hiddenIds.add(o.id);
      }
    }
  }

  return orders.filter(o => !hiddenIds.has(o.id));
}

/**
 * Count how many pending orders in a series are at or after the given
 * representative order's date (inclusive). Used to show "N upcoming" badges.
 */
export function countPendingInSeries(orders: Order[], order: Order): number {
  if (!order.parentOrderId) return 1;
  return orders.filter(
    o => o.parentOrderId === order.parentOrderId &&
         o.status === 'pending' &&
         (o.collectionDate || '') >= (order.collectionDate || '')
  ).length;
}

export interface RecurringEditDecision {
  needsScopePrompt: boolean;
  seriesCount: number;
}

export function getRecurringEditDecision(
  editingOrder: Order,
  orderData: { isRecurring?: boolean },
  allOrders: Order[],
): RecurringEditDecision {
  const isRecurringSeriesEdit = !!(editingOrder.isRecurring && editingOrder.parentOrderId);
  const isNewRecurringSeries = !editingOrder.isRecurring && !!orderData.isRecurring;
  if (!isRecurringSeriesEdit && !isNewRecurringSeries) {
    return { needsScopePrompt: false, seriesCount: 0 };
  }
  const seriesCount = isRecurringSeriesEdit
    ? allOrders.filter(
        o => o.parentOrderId === editingOrder.parentOrderId &&
             (o.collectionDate || '') >= (editingOrder.collectionDate || '')
      ).length
    : 1;
  return { needsScopePrompt: true, seriesCount };
}
