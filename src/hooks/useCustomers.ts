// src/hooks/useCustomers.ts
// ============================================================
// DROP-IN REPLACEMENT for the original useCustomers.ts
// Identical public API — components need zero changes.
// Data now lives in MySQL via the SiteGround PHP API.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types';
import { useGoogleSheets } from './useGoogleSheets';
import { useUndo } from './useUndo';
import errorLogger from '../services/errorLogger';
import { customersApi } from './useApi';

const sortByFirstName = (arr: Customer[]) =>
  [...arr].sort((a, b) => a.firstName.localeCompare(b.firstName));

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, syncCustomers } = useGoogleSheets();
  const { addUndoAction } = useUndo();

  // ── Load all customers from DB on mount ──────────────────
  useEffect(() => {
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
  }, []);

  // ── addCustomer ───────────────────────────────────────────
  const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
    const maxNum = customers.reduce((m, c) => {
      const n = parseInt(c.id);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const newCustomer: Customer = {
      ...customerData,
      id: (maxNum + 1).toString(),
      createdAt: new Date().toISOString(),
    };

    const previousCustomers = [...customers];
    setCustomers(prev => sortByFirstName([...prev, newCustomer]));

    try {
      await customersApi.save(newCustomer);

      if (isConnected) {
        syncCustomers(sortByFirstName([...customers, newCustomer]));
      }

      addUndoAction({
        id: `add-customer-${newCustomer.id}`,
        description: `Added customer ${newCustomer.firstName} ${newCustomer.lastName}`,
        undo: () => {
          setCustomers(previousCustomers);
          customersApi.delete(newCustomer.id).catch(console.error);
          errorLogger.info(`Undid adding customer: ${newCustomer.firstName} ${newCustomer.lastName}`);
        }
      });

      errorLogger.info(`Customer added: ${newCustomer.firstName} ${newCustomer.lastName}`);
      return newCustomer;
    } catch (err) {
      console.error('Failed to save customer to DB:', err);
      errorLogger.error('Failed to add customer', err);
      setError('Failed to save customer. Please try again.');
      setCustomers(previousCustomers);
      return null;
    }
  }, [customers, isConnected, syncCustomers, addUndoAction]);

  // ── updateCustomer ────────────────────────────────────────
  const updateCustomer = useCallback((id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    try {
      const previousCustomers = [...customers];
      const updated = customers.map(c => c.id === id ? { ...c, ...updates } : c);
      setCustomers(sortByFirstName(updated));

      customersApi.update(id, updates)
        .then(() => {
          if (isConnected) syncCustomers(sortByFirstName(updated));
        })
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
  }, [customers, isConnected, syncCustomers]);

  // ── deleteCustomer ────────────────────────────────────────
  const deleteCustomer = useCallback((id: string) => {
    try {
      const toDelete = customers.find(c => c.id === id);
      if (!toDelete) return false;

      const previousCustomers = [...customers];
      const remaining = sortByFirstName(customers.filter(c => c.id !== id));
      setCustomers(remaining);

      customersApi.delete(id)
        .then(() => {
          if (isConnected) syncCustomers(remaining);
        })
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
  }, [customers, isConnected, syncCustomers, addUndoAction]);

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
    addCustomer,
    updateCustomer,
    deleteCustomer,
    setAllCustomers,
    getCustomerById,
    searchCustomers,
  };
};
