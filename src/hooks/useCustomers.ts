// src/hooks/useCustomers.ts
// ============================================================
// DROP-IN REPLACEMENT for the original useCustomers.ts
// Identical public API — components need zero changes.
// Data now lives in MySQL via the SiteGround PHP API.
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { Customer } from '../types';

import { useUndo } from './useUndo';
import errorLogger from '../services/errorLogger';
import { customersApi } from './useApi';
import { pendingWriteQueue } from '../services/pendingWriteQueue';

const sortByFirstName = (arr: Customer[]) =>
  [...arr].sort((a, b) => a.firstName.localeCompare(b.firstName));

export const useCustomers = (opts: { skipInitialFetch?: boolean } = {}) => {
  const { skipInitialFetch = false } = opts;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);
  const { addUndoAction } = useUndo();
  const customersRef = useRef(customers);
  customersRef.current = customers;

  // ── Load all customers from DB on mount ──────────────────
  useEffect(() => {
    if (skipInitialFetch) return;
    let cancelled = false;
    setLoading(true);
    customersApi.getAll()
      .then(data => { if (!cancelled) { setCustomers(sortByFirstName(data)); setError(null); } })
      .catch(err => {
        if (!cancelled) {
          console.error('Error loading customers:', err);
          errorLogger.error('Failed to load customers', err);
          setError('Failed to load customers. Please check your connection.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [skipInitialFetch]);

  // Hydrate from a combined fetch (avoids a separate round trip)
  const hydrate = useCallback((data: Customer[]) => {
    const serverIds = new Set(data.map(customer => customer.id));
    const pendingCustomers = pendingWriteQueue.list('customer')
      .map(item => item.payload)
      .filter(customer => !serverIds.has(customer.id));
    // Diagnostic: log any customer IDs that are in pendingWriteQueue but NOT on the server
    const pendingIds = pendingWriteQueue.list('customer').map(item => item.id);
    const missingFromServer = pendingIds.filter(id => !serverIds.has(id));
    if (missingFromServer.length > 0) {
      console.warn('[hydrate customers] Pending customer IDs NOT found on server:', missingFromServer);
    }
    console.log('[hydrate customers] Server returned', data.length, 'customers. IDs:', data.map(c => c.id).join(','));
    setCustomers(sortByFirstName([...data, ...pendingCustomers]));
    setLoading(false);
    setError(null);
  }, []);

  const retryPendingCustomers = useCallback(async () => {
    for (const item of pendingWriteQueue.list('customer')) {
      try {
        let existing: Customer | null = null;
        try {
          existing = await customersApi.getOne(item.id);
        } catch {
          existing = null;
        }

        if (existing && existing.createdAt === item.payload.createdAt) {
          pendingWriteQueue.remove('customer', item.id);
          continue;
        }

        if (existing) {
          const serverCustomers = await customersApi.getAll();
          const maxId = serverCustomers.reduce((max, customer) => {
            const id = parseInt(customer.id);
            return isNaN(id) ? max : Math.max(max, id);
          }, 0);
          const replacement = { ...item.payload, id: String(maxId + 1) };
          await customersApi.save(replacement);
          pendingWriteQueue.remove('customer', item.id);
          pendingWriteQueue.upsert({ kind: 'customer', id: replacement.id, payload: replacement, queuedAt: item.queuedAt });
          pendingWriteQueue.remove('customer', replacement.id);
          customersRef.current = customersRef.current.map(customer => customer.id === item.id ? replacement : customer);
          setCustomers(current => sortByFirstName(current.map(customer => customer.id === item.id ? replacement : customer)));
          continue;
        }

        await customersApi.save(item.payload);
        pendingWriteQueue.remove('customer', item.id);
      } catch (err) {
        console.warn('Pending customer save will be retried later:', err);
      }
    }
  }, []);

  useEffect(() => {
    const retry = () => {
      if (navigator.onLine) void retryPendingCustomers();
    };
    retry();
    window.addEventListener('online', retry);
    const retryTimer = window.setInterval(retry, 30000);
    return () => {
      window.removeEventListener('online', retry);
      window.clearInterval(retryTimer);
    };
  }, [retryPendingCustomers]);

  // ── addCustomer ───────────────────────────────────────────
  const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
    // Fetch the true max ID from the server (same pattern as addOrder)
    // to avoid collisions when the local list is stale.
    let serverMaxId = 0;
    try {
      const serverCustomers = await customersApi.getAll();
      serverMaxId = serverCustomers.reduce((m, c) => {
        const n = parseInt(c.id);
        return isNaN(n) ? m : Math.max(m, n);
      }, 0);
    } catch (err) {
      console.warn('Could not fetch the latest customer number:', err);
    }

    const localMaxId = customersRef.current.reduce((m, c) => {
      const n = parseInt(c.id);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const maxNum = Math.max(serverMaxId, localMaxId);
    const newCustomer: Customer = {
      ...customerData,
      id: (maxNum + 1).toString(),
      createdAt: new Date().toISOString(),
    };

    const previousCustomers = [...customersRef.current];
    setCustomers(prev => sortByFirstName([...prev, newCustomer]));

    let savedCustomer: Customer = newCustomer;
    try {
      console.log('[addCustomer] Saving customer with client ID:', newCustomer.id, 'name:', newCustomer.firstName, newCustomer.lastName);
      const serverCustomer = await customersApi.save(newCustomer);
      console.log('[addCustomer] Server save response:', JSON.stringify(serverCustomer));
      if (serverCustomer && serverCustomer.id) {
        const serverId = String(serverCustomer.id);
        if (serverId !== newCustomer.id) {
          console.warn('[addCustomer] !!! Server returned DIFFERENT ID:', serverId, 'vs client:', newCustomer.id, '— updating local customer');
          savedCustomer = { ...newCustomer, ...serverCustomer, id: serverId };
          setCustomers(prev => sortByFirstName(
            prev.map(c => c.id === newCustomer.id ? savedCustomer : c)
          ));
        }
      } else {
        console.warn('[addCustomer] !!! Server save response has no ID — keeping client ID:', newCustomer.id);
      }

      // Verify the customer was actually persisted by fetching it back
      try {
        const verified = await customersApi.getOne(savedCustomer.id);
        console.log('[addCustomer] Post-save verification: fetched back:', JSON.stringify(verified));
        if (!verified || !verified.id) {
          throw new Error('Customer not found in DB after save');
        }
        console.log('[addCustomer] Verification OK — customer ID', verified.id, 'exists in DB');
      } catch (verifyErr) {
        console.error('[addCustomer] !!! Post-save verification FAILED — customer NOT found in DB after save:', verifyErr);
        pendingWriteQueue.upsert({ kind: 'customer', id: savedCustomer.id, payload: savedCustomer, queuedAt: new Date().toISOString() });
        setError('Customer could not be verified on the server. It will be retried automatically, but may not appear after a page refresh.');
        return savedCustomer;
      }

      pendingWriteQueue.remove('customer', savedCustomer.id);

      addUndoAction({
        id: `add-customer-${savedCustomer.id}`,
        description: `Added customer ${savedCustomer.firstName} ${savedCustomer.lastName}`,
        undo: () => {
          setCustomers(previousCustomers);
          customersApi.delete(savedCustomer.id).catch(console.error);
          errorLogger.info(`Undid adding customer: ${savedCustomer.firstName} ${savedCustomer.lastName}`);
        }
      });

      errorLogger.info(`Customer added: ${savedCustomer.firstName} ${savedCustomer.lastName}`);
      return savedCustomer;
    } catch (err) {
      console.error('Failed to save customer to DB:', err);
      pendingWriteQueue.upsert({ kind: 'customer', id: newCustomer.id, payload: newCustomer, queuedAt: new Date().toISOString() });
      errorLogger.error('Failed to add customer', err);
      setError('Customer could not be saved to the server. It will be retried automatically, but may not appear after a page refresh.');
      return newCustomer;
    }
  }, [addUndoAction]);

  // ── updateCustomer ────────────────────────────────────────
  const updateCustomer = useCallback((id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    try {
      const previousCustomers = [...customers];
      const updated = customers.map(c => c.id === id ? { ...c, ...updates } : c);
      setCustomers(sortByFirstName(updated));

      customersApi.update(id, updates)
        .then(() => {})
        .catch(err => {
          console.error('Failed to update customer in DB:', err);
          setCustomers(previousCustomers);
          setError('Failed to update customer. Please try again.');
        });

      return true;
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Failed to update customer');
      return false;
    }
  }, [customers]);

  // ── deleteCustomer ────────────────────────────────────────
  const deleteCustomer = useCallback((id: string) => {
    try {
      const toDelete = customers.find(c => c.id === id);
      if (!toDelete) return false;

      const previousCustomers = [...customers];
      const remaining = sortByFirstName(customers.filter(c => c.id !== id));
      setCustomers(remaining);

      customersApi.delete(id)
        .then(() => {})
        .catch(err => {
          console.error('Failed to delete customer from DB:', err);
          setError('Failed to delete customer. Please try again.');
          setCustomers(previousCustomers); // rollback
        });

      addUndoAction({
        id: `delete-customer-${id}`,
        description: `Deleted customer ${toDelete.firstName} ${toDelete.lastName}`,
        undo: () => {
          setCustomers(previousCustomers);
          customersApi.save(toDelete).catch(console.error);
          errorLogger.info(`Undid deleting customer: ${toDelete.firstName} ${toDelete.lastName}`);
        }
      });

      errorLogger.info(`Customer deleted: ${toDelete.firstName} ${toDelete.lastName}`);
      return true;
    } catch (err) {
      console.error('Error deleting customer:', err);
      errorLogger.error('Failed to delete customer', err);
      setError('Failed to delete customer');
      return false;
    }
  }, [customers, addUndoAction]);

  // ── Read helpers ──────────────────────────────────────────
  const getCustomerById = (id: string) => customers.find(c => c.id === id);

  const searchCustomers = (searchTerm: string) => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return sortByFirstName(
      customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        c.company?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
      )
    );
  };

  // setAllCustomers — used by Settings restore from backup
  const setAllCustomers = async (newCustomers: Customer[]) => {
    try {
      await customersApi.saveAll(newCustomers);
      setCustomers(sortByFirstName(newCustomers));
      setError(null);
      errorLogger.info(`Restored ${newCustomers.length} customers from backup`);
      return true;
    } catch (err) {
      console.error('Error restoring customers:', err);
      errorLogger.error('Failed to restore customers', err);
      setError('Failed to restore customers');
      return false;
    }
  };

  return {
    customers,
    loading,
    error,
    hydrate,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    setAllCustomers,
    getCustomerById,
    searchCustomers,
  };
};
