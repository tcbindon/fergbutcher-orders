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
  console.log(`[API ${options.method || 'GET'}] ${path} → status:`, res.status, 'success:', json.success, 'data length:', Array.isArray(json.data) ? json.data.length : typeof json.data);
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data as T;
}

import type { Customer, Order, StaffNote } from '../types';

// ── COMBINED FETCH (single round trip) ──────────────────────
export const combinedApi = {
  getAll: async (): Promise<{ customers: Customer[]; orders: Order[]; staffNotes: StaffNote[] }> => {
    const data = await request<{ customers: Customer[]; orders: Order[]; staffNotes: StaffNote[] }>('/all');
    const customers = normalizeCustomerIds(data.customers || []);
    const orders = normalizeOrderIds(data.orders || []);
    const knownCustomerIds = new Set(customers.map(customer => customer.id));
    const referencedCustomerIds = [...new Set(
      orders.map(order => order.customerId).filter(customerId => !knownCustomerIds.has(customerId))
    )];

    if (referencedCustomerIds.length > 0) {
      const referencedCustomers = await Promise.all(
        referencedCustomerIds.map(async customerId => {
          try {
            return await customersApi.getOne(customerId);
          } catch (error) {
            console.warn('[combinedApi] Could not load customer referenced by an order:', customerId, error);
            return null;
          }
        })
      );
      customers.push(...referencedCustomers.filter((customer): customer is Customer => customer !== null));
    }

    return {
      customers,
      orders,
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
const RECENT_CUSTOMER_IDS_KEY = 'fergbutcher_recent_customer_ids';

const getRecentCustomerIds = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_CUSTOMER_IDS_KEY);
    const ids: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const rememberCustomerId = (id: string): void => {
  const ids = new Set(getRecentCustomerIds());
  ids.add(id);
  localStorage.setItem(RECENT_CUSTOMER_IDS_KEY, JSON.stringify([...ids]));
};

const forgetCustomerId = (id: string): void => {
  localStorage.setItem(
    RECENT_CUSTOMER_IDS_KEY,
    JSON.stringify(getRecentCustomerIds().filter(savedId => savedId !== id))
  );
};

export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    const customers = normalizeCustomerIds(await request<Customer[]>('/customers'));
    const knownIds = new Set(customers.map(customer => customer.id));
    const recentIds = getRecentCustomerIds().filter(id => !knownIds.has(id));

    if (recentIds.length > 0) {
      const recentCustomers = await Promise.all(
        recentIds.map(async id => {
          try {
            return await customersApi.getOne(id);
          } catch {
            forgetCustomerId(id);
            return null;
          }
        })
      );
      customers.push(...recentCustomers.filter((customer): customer is Customer => customer !== null));
    }

    return customers;
  },

  getOne: async (id: string): Promise<Customer> => {
    const data = await request<Customer>(`/customers?id=${id}`);
    return normalizeCustomerId(data);
  },

  save: async (customer: Customer): Promise<Customer> => {
    const data = normalizeCustomerId(await request<Customer>('/customers', { method: 'POST', body: JSON.stringify(customer) }));
    rememberCustomerId(data.id);
    return data;
  },

  update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    const data = await request<Customer>(`/customers?id=${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    return normalizeCustomerId(data);
  },

  delete: async (id: string): Promise<{ id: string }> => {
    const result = await request<{ id: string }>(`/customers?id=${id}`, { method: 'DELETE' });
    forgetCustomerId(id);
    return result;
  },

  saveAll: async (customers: Customer[]): Promise<Customer[]> => {
    const results: Customer[] = [];
    for (const c of customers) results.push(await customersApi.save(c));
    return results;
  },
};

// ── ORDERS ───────────────────────────────────────────────────
const normalizeOrderId = (o: Order): Order => ({ ...decodeOrderDate(o), id: String(o.id), customerId: String(o.customerId) });
const normalizeOrderIds = (os: Order[]): Order[] => os.map(normalizeOrderId);

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
    const data = await request<Order>('/orders', { method: 'POST', body: JSON.stringify(encodeDateForApi(order)) });
    return normalizeOrderId(data);
  },

  update: async (id: string, updates: Partial<Order>): Promise<Order> => {
    const data = await request<Order>(`/orders?id=${id}`, { method: 'PUT', body: JSON.stringify(encodeDateForApi(updates as Order)) });
    return normalizeOrderId(data);
  },

  delete: (id: string): Promise<{ id: string }> =>
    request(`/orders?id=${id}`, { method: 'DELETE' }),

  saveAll: async (orders: Order[]): Promise<Order[]> => {
    const results: Order[] = [];
    for (const o of orders) results.push(await ordersApi.save(o));
    return results;
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
