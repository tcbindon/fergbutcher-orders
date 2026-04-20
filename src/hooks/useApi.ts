// src/hooks/useApi.ts
// ============================================================
// Central API client — replaces all localStorage reads/writes.
// All data is now stored in MySQL on SiteGround.
// ============================================================

const API_BASE = 'https://orders.fergbutcher.com/api';
const API_KEY  = 'fbb2c428b0ed4fc89a4ee4a5a439ecc62';   // ← must match config.php API_SECRET

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + path, { ...options, headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data as T;
}

// ── Types (imported from ../types) ───────────────────────────
import type { Customer, Order, StaffNote } from '../types';

// ── CUSTOMERS ────────────────────────────────────────────────
export const customersApi = {
  getAll: (): Promise<Customer[]> =>
    request('/customers.php'),

  getOne: (id: string): Promise<Customer> =>
    request(`/customers.php?id=${id}`),

  save: (customer: Customer): Promise<Customer> =>
    request('/customers.php', { method: 'POST', body: JSON.stringify(customer) }),

  update: (id: string, updates: Partial<Customer>): Promise<Customer> =>
    request(`/customers.php?id=${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (id: string): Promise<{ id: string }> =>
    request(`/customers.php?id=${id}`, { method: 'DELETE' }),

  saveAll: async (customers: Customer[]): Promise<Customer[]> => {
    // Used for bulk migration — saves each customer individually
    const results: Customer[] = [];
    for (const c of customers) {
      const saved = await customersApi.save(c);
      results.push(saved);
    }
    return results;
  },
};

// ── ORDERS ───────────────────────────────────────────────────
export const ordersApi = {
  getAll: (filters: { status?: string; type?: string; from?: string; to?: string } = {}): Promise<Order[]> => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null)) as Record<string, string>
    ).toString();
    return request('/orders.php' + (params ? '?' + params : ''));
  },

  getOne: (id: string): Promise<Order> =>
    request(`/orders.php?id=${id}`),

  save: (order: Order): Promise<Order> =>
    request('/orders.php', { method: 'POST', body: JSON.stringify(order) }),

  update: (id: string, updates: Partial<Order>): Promise<Order> =>
    request(`/orders.php?id=${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (id: string): Promise<{ id: string }> =>
    request(`/orders.php?id=${id}`, { method: 'DELETE' }),

  saveAll: async (orders: Order[]): Promise<Order[]> => {
    const results: Order[] = [];
    for (const o of orders) {
      const saved = await ordersApi.save(o);
      results.push(saved);
    }
    return results;
  },
};

// ── STAFF NOTES ──────────────────────────────────────────────
export const staffNotesApi = {
  getAll: (): Promise<StaffNote[]> =>
    request('/staff-notes.php'),

  getForOrder: (orderId: string): Promise<StaffNote[]> =>
    request(`/staff-notes.php?orderId=${orderId}`),

  save: (note: StaffNote): Promise<StaffNote> =>
    request('/staff-notes.php', { method: 'POST', body: JSON.stringify(note) }),

  delete: (id: string): Promise<{ id: string }> =>
    request(`/staff-notes.php?id=${id}`, { method: 'DELETE' }),

  saveAll: async (notes: StaffNote[]): Promise<StaffNote[]> => {
    const results: StaffNote[] = [];
    for (const n of notes) {
      const saved = await staffNotesApi.save(n);
      results.push(saved);
    }
    return results;
  },
};
