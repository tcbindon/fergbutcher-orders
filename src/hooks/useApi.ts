// src/hooks/useApi.ts
// ============================================================
// Calls the Netlify proxy function — no CORS issues.
// GET requests use default browser caching (no cache-buster).
// ============================================================

const API_BASE = '/.netlify/functions/api';

const headers = {
  'Content-Type': 'application/json',
};

const REQUEST_TIMEOUT_MS = 15000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...headers, 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The server took too long to respond. Check the connection and try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const json = await res.json();
  console.log(`[API ${options.method || 'GET'}] ${path} → status:`, res.status, 'success:', json.success, 'data length:', Array.isArray(json.data) ? json.data.length : typeof json.data, 'response:', json);
  if (!res.ok || !json.success) {
    const detail = json.error || json.message || json.reason || (typeof json.data === 'string' ? json.data : '');
    throw new Error(detail || `The server rejected this request (HTTP ${res.status}).`);
  }
  return json.data as T;
}

import type { Customer, Order, StaffNote } from '../types';
import { getNextNumericId } from '../utils/idUtils';

// ── COMBINED FETCH (single round trip) ──────────────────────
export const combinedApi = {
  getAll: async (): Promise<{ customers: Customer[]; orders: Order[]; staffNotes: StaffNote[] }> => {
    const data = await request<{ customers: Customer[]; orders: Order[]; staffNotes: StaffNote[] }>('/all');
    return {
      customers: normalizeCustomerIds(data.customers || []),
      orders: normalizeOrderIds(data.orders || []),
      staffNotes: data.staffNotes || [],
    };
  },
};

// ── ORDERS – sentinel date ────────────────────────────────────
// The backend DB column is NOT NULL, so we use a sentinel date
// ('1900-01-01') to represent "no collection date set".  When
// loading orders we convert the sentinel back to null so the
// rest of the app treats them as undated.
const SENTINEL_DATE = '1900-01-01';

const encodeDateForApi = <T extends { collectionDate?: string | null }>(
  obj: T
): T => {
  // Partial updates (e.g. status-only) may omit collectionDate entirely;
  // only encode the sentinel when the field is actually present.
  if (!('collectionDate' in obj)) return obj;
  const { collectionDate, ...rest } = obj as any;
  return { ...rest, collectionDate: collectionDate || SENTINEL_DATE };
};

const VALID_STATUSES = new Set(['pending', 'confirmed', 'prepared', 'collected', 'cancelled']);

const normalizeStatus = (order: Order): Order => {
  const s = order.status;
  if (s && VALID_STATUSES.has(s)) return order;
  return { ...order, status: 'pending' };
};

const decodeOrderDate = (order: Order): Order => ({
  ...normalizeStatus(order),
  collectionDate: order.collectionDate === SENTINEL_DATE ? null : order.collectionDate,
});

const decodeOrderDates = (orders: Order[]): Order[] => orders.map(decodeOrderDate);

// ── CUSTOMERS ────────────────────────────────────────────────
const normalizeCustomerId = (c: Customer): Customer => ({ ...c, id: String(c.id) });
const normalizeCustomerIds = (cs: Customer[]): Customer[] => cs.map(normalizeCustomerId);

export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    const data = await request<Customer[]>('/customers');
    return normalizeCustomerIds(data);
  },

  getOne: async (id: string): Promise<Customer> => {
    const data = await request<Customer>(`/customers?id=${id}`);
    return normalizeCustomerId(data);
  },

  save: async (customer: Customer): Promise<Customer> => {
    const data = await request<Customer>('/customers', { method: 'POST', body: JSON.stringify(customer) });
    return normalizeCustomerId(data);
  },

  update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    const data = await request<Customer>(`/customers?id=${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    return normalizeCustomerId(data);
  },

  delete: async (id: string): Promise<{ id: string }> => {
    const result = await request<{ id: string }>(`/customers?id=${id}`, { method: 'DELETE' });
    try {
      await customersApi.getOne(id);
      throw new Error('The server reported success, but the customer still exists.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('still exists')) throw error;
    }
    return result;
  },

  saveAll: async (customers: Customer[]): Promise<Customer[]> => {
    const results: Customer[] = [];
    for (const c of customers) results.push(await customersApi.save(c));
    return results;
  },

  // The server needs a numeric id but doesn't assign one, so read the live
  // list right before sending to avoid reusing a number another device took.
  create: async (customer: Customer): Promise<Customer> => {
    const serverCustomers = await customersApi.getAll();
    return customersApi.save({ ...customer, id: getNextNumericId(serverCustomers) });
  },
};

// ── ORDERS ───────────────────────────────────────────────────
const normalizeOrderId = (o: Order): Order => ({ ...decodeOrderDate(o), id: String(o.id), customerId: String(o.customerId) });
const normalizeOrderIds = (os: Order[]): Order[] => os.map(normalizeOrderId);

const orderItemsKey = (order: Order): string => JSON.stringify(
  order.items.map(item => ({ description: item.description, quantity: item.quantity, unit: item.unit }))
);

// The server may store timestamps in a different format (e.g. "2026-10-08 10:15:49").
const normalizeMoment = (value: string | undefined): string =>
  (value ?? '').replace('T', ' ').replace(/(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/, '').slice(0, 19);

const isSameMoment = (a: string | undefined, b: string | undefined): boolean => {
  if (!a || !b) return false;
  if (normalizeMoment(a) === normalizeMoment(b)) return true;
  const diff = Math.abs(Date.parse(a) - Date.parse(b));
  return Number.isFinite(diff) && diff < 1000;
};

export const findPersistedOrder = (orders: Order[], target: Order): Order | undefined =>
  orders.find(order => isSameMoment(order.createdAt, target.createdAt)) ?? orders.find(order =>
    order.customerId === target.customerId &&
    order.collectionDate === target.collectionDate &&
    (order.collectionTime ?? '') === (target.collectionTime ?? '') &&
    orderItemsKey(order) === orderItemsKey(target)
  );

export const ordersApi = {
  getAll: async (filters: { status?: string; type?: string; from?: string; to?: string } = {}): Promise<Order[]> => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null)) as Record<string, string>
    ).toString();
    const data = await request<Order[]>('/orders' + (params ? '?' + params : ''));
    return normalizeOrderIds(data);
  },

  getOne: async (id: string): Promise<Order> => {
    const data = await request<Order>(`/orders?id=${id}`);
    return normalizeOrderId(data);
  },

  save: async (order: Order): Promise<Order> => {
    const data = await request<Partial<Order> | null>('/orders', {
      method: 'POST',
      body: JSON.stringify(encodeDateForApi(order)),
    });

    let persistedOrder = data?.id
      ? ({ ...order, ...data } as Order)
      : undefined;

    if (!persistedOrder) {
      try {
        const serverOrders = await ordersApi.getAll({ from: '1900-01-01', to: '2100-12-31' });
        persistedOrder = findPersistedOrder(serverOrders, order);
      } catch {
        persistedOrder = undefined;
      }
    }

    // The server accepted the save; resending it would create a duplicate.
    const merged = { ...order, ...persistedOrder };
    if (!merged.status || !VALID_STATUSES.has(merged.status)) {
      merged.status = order.status || 'pending';
    }
    return normalizeOrderId(merged);
  },

  update: async (id: string, order: Order): Promise<Order> => {
    const { customer: _customer, ...payload } = encodeDateForApi({ ...order, id });
    const data = await request<Order>(`/orders?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    // The server's update response may omit fields like status.
    // Merge with the sent data so nothing we just saved is lost.
    const merged = { ...order, ...data };
    if (!merged.status || !VALID_STATUSES.has(merged.status)) {
      merged.status = order.status || 'pending';
    }
    return normalizeOrderId({ ...merged, id: String(data.id ?? id) });
  },

  delete: (id: string): Promise<{ id: string }> =>
    request(`/orders?id=${id}`, { method: 'DELETE' }),

  saveAll: async (orders: Order[]): Promise<Order[]> => {
    const results: Order[] = [];
    for (const o of orders) results.push(await ordersApi.save(o));
    return results;
  },

  createAll: async (orders: Order[]): Promise<Order[]> => {
    const serverOrders = await ordersApi.getAll({ from: '1900-01-01', to: '2100-12-31' });
    const results: Order[] = [];
    for (const o of orders) {
      results.push(await ordersApi.save({ ...o, id: getNextNumericId(serverOrders, results) }));
    }
    return results;
  },

  create: async (order: Order): Promise<Order> => {
    const [created] = await ordersApi.createAll([order]);
    return created;
  },
};

// ── STAFF NOTES ──────────────────────────────────────────────
export const staffNotesApi = {
  getAll: (): Promise<StaffNote[]> =>
    request('/staff-notes'),

  getForOrder: (orderId: string): Promise<StaffNote[]> =>
    request(`/staff-notes?orderId=${orderId}`),

  save: (note: StaffNote): Promise<StaffNote> =>
    request('/staff-notes', { method: 'POST', body: JSON.stringify(note) }),

  delete: (id: string): Promise<{ id: string }> =>
    request(`/staff-notes?id=${id}`, { method: 'DELETE' }),

  saveAll: async (notes: StaffNote[]): Promise<StaffNote[]> => {
    const results: StaffNote[] = [];
    for (const n of notes) results.push(await staffNotesApi.save(n));
    return results;
  },
};
