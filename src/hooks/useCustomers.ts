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

  const deletedIdsRef = useRef<Set<string>>(new Set());

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

  const hydrate = useCallback((data: Customer[]) => {
    const serverIds = new Set(data.map(customer => customer.id));
    const pendingCustomers = pendingWriteQueue.list('customer')
      .map(item => item.payload)
      .filter(customer => !serverIds.has(customer.id));
    const filtered = data.filter(customer => !deletedIdsRef.current.has(customer.id));
    setCustomers(sortByFirstName([...filtered, ...pendingCustomers]));
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
          const replacement = { ...item.payload, id: crypto.randomUUID() };
          await customersApi.save(replacement);
          pendingWriteQueue.remove('customer', item.id);
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

  const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
    const newCustomer: Customer = {
      ...customerData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const previousCustomers = [...customersRef.current];
    setCustomers(prev => sortByFirstName([...prev, newCustomer]));

    try {
      const serverCustomer = await customersApi.save(newCustomer);
      const savedCustomer = serverCustomer && serverCustomer.id ? serverCustomer : newCustomer;

      pendingWriteQueue.remove('customer', savedCustomer.id);

      addUndoAction({
        id: `add-customer-${savedCustomer.id}`,
        description: `Added customer ${savedCustomer.firstName} ${savedCustomer.lastName}`,
        undo: () => {
          setCustomers(previousCustomers);
          customersApi.delete(savedCustomer.id).catch(console.error);
        }
      });

      errorLogger.info(`Customer added: ${savedCustomer.firstName} ${savedCustomer.lastName}`);
      return savedCustomer;
    } catch (err) {
      console.error('Failed to save customer to DB:', err);
      pendingWriteQueue.upsert({ kind: 'customer', id: newCustomer.id, payload: newCustomer, queuedAt: new Date().toISOString() });
      errorLogger.error('Failed to add customer', err);
      setError('Customer could not be saved to the server. It will be retried automatically.');
      return newCustomer;
    }
  }, [addUndoAction]);

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

  const deleteCustomer = useCallback((id: string) => {
    try {
      const toDelete = customers.find(c => c.id === id);
      if (!toDelete) return false;

      deletedIdsRef.current.add(id);
      pendingWriteQueue.remove('customer', id);

      const previousCustomers = [...customers];
      const remaining = sortByFirstName(customers.filter(c => c.id !== id));
      setCustomers(remaining);

      customersApi.delete(id)
        .then(() => {
          deletedIdsRef.current.delete(id);
        })
        .catch(err => {
          console.error('Failed to delete customer from DB:', err);
          deletedIdsRef.current.delete(id);
          setError('Failed to delete customer. Please try again.');
          setCustomers(previousCustomers);
        });

      addUndoAction({
        id: `delete-customer-${id}`,
        description: `Deleted customer ${toDelete.firstName} ${toDelete.lastName}`,
        undo: () => {
          deletedIdsRef.current.delete(id);
          setCustomers(previousCustomers);
          customersApi.save(toDelete).catch(console.error);
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
