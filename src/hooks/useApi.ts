// src/hooks/useApi.ts
// ============================================================
// Calls the Netlify proxy function — no CORS issues.
// Cache-busting added to all GET requests.
// ============================================================

const API_BASE = '/.netlify/functions/api';

const headers = {
  'Content-Type': 'application/json',
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Add cache-buster to GET requests to prevent stale responses
  const isGet = !options.method || options.method === 'GET';
  const separator = path.includes('?') ? '&' : '?';
  const url = isGet ? `${API_BASE}${path}${separator}_=${Date.now()}` : `${API_BASE}${path}`;

  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data as T;
}

import type { Customer, Order, StaffNote } from '../types';

// ── CUSTOMERS ────────────────────────────────────────────────
export const customersApi = {
  getAll: (): Promise<Customer[]> =>
    request('/customers'),

  getOne: (id: string): Promise<Customer> =>
    request(`/customers?id=${id}`),

  save: (customer: Customer): Promise<Customer> =>
    request('/customers', { method: 'POST', body: JSON.stringify(customer) }),

  update: (id: string, updates: Partial<Customer>): Promise<Customer> =>
    request(`/customers?id=${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (id: string): Promise<{ id: string }> =>
    request(`/customers?id=${id}`, { method: 'DELETE' }),

  saveAll: async (customers: Customer[]): Promise<Customer[]> => {
    const results: Customer[] = [];
    for (const c of customers) results.push(await customersApi.save(c));
    return results;
  },
};

// ── ORDERS ───────────────────────────────────────────────────
// Normalise collectionDate: send null explicitly when empty so PHP backend
// receives a consistent JSON key and binds SQL NULL correctly.
const stripEmptyDate = <T extends { collectionDate?: string | null }>(obj: T): Omit<T, 'collectionDate'> & { collectionDate: string | null } => {
  const { collectionDate, ...rest } = obj as any;
  return { ...rest, collectionDate: collectionDate || null };
};

export const ordersApi = {
  getAll: (filters: { status?: string; type?: string; from?: string; to?: string } = {}): Promise<Order[]> => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null)) as Record<string, string>
    ).toString();
    return request('/orders' + (params ? '?' + params : ''));
  },

  getOne: (id: string): Promise<Order> =>
    request(`/orders?id=${id}`),

  save: (order: Order): Promise<Order> =>
    request('/orders', { method: 'POST', body: JSON.stringify(stripEmptyDate(order)) }),

  update: (id: string, updates: Partial<Order>): Promise<Order> =>
    request(`/orders?id=${id}`, { method: 'PUT', body: JSON.stringify(stripEmptyDate(updates)) }),

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
