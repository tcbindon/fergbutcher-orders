import { useState, useEffect } from 'react';
import { Customer } from '../types';
import { useGoogleSheets } from './useGoogleSheets';
import { useUndo } from './useUndo';
import errorLogger from '../services/errorLogger';

// Mock initial data
const initialCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+64 21 123 4567',
    company: 'Johnson & Co',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    firstName: 'Mike',
    lastName: 'Chen',
    email: 'mike.chen@email.com',
    phone: '+64 27 456 7890',
    createdAt: '2024-01-10T14:20:00Z'
  },
  {
    id: '3',
    firstName: 'Emma',
    lastName: 'Wilson',
    email: 'emma.wilson@email.com',
    company: 'Wilson Enterprises',
    createdAt: '2024-01-08T09:15:00Z'
  },
  {
    id: '4',
    firstName: 'James',
    lastName: 'Thompson',
    email: 'james.thompson@email.com',
    phone: '+64 21 987 6543',
    company: 'Thompson Holdings',
    createdAt: '2024-01-05T16:45:00Z'
  },
  {
    id: '5',
    firstName: 'Lisa',
    lastName: 'Brown',
    email: 'lisa.brown@email.com',
    phone: '+64 22 555 1234',
    createdAt: '2024-01-03T11:20:00Z'
  }
];

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, syncCustomers } = useGoogleSheets();
  const { addUndoAction } = useUndo();

  // Load customers from localStorage on mount
  useEffect(() => {
    try {
      const savedCustomers = localStorage.getItem('fergbutcher_customers');
      if (savedCustomers) {
        const loadedCustomers = JSON.parse(savedCustomers);
        // Sort customers alphabetically by first name
        const sortedCustomers = loadedCustomers.sort((a: Customer, b: Customer) => 
          a.firstName.localeCompare(b.firstName)
        );
        setCustomers(sortedCustomers);
      } else {
        // Use initial data if no saved data exists
        const sortedInitialCustomers = initialCustomers.sort((a, b) => 
          a.firstName.localeCompare(b.firstName)
        );
        setCustomers(sortedInitialCustomers);
        localStorage.setItem('fergbutcher_customers', JSON.stringify(sortedInitialCustomers));
      }
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Failed to load customers');
      const sortedInitialCustomers = initialCustomers.sort((a, b) => 
        a.firstName.localeCompare(b.firstName)
      );
      setCustomers(sortedInitialCustomers);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save customers to localStorage whenever customers change
  useEffect(() => {
    if (!loading && customers.length > 0) {
      try {
        localStorage.setItem('fergbutcher_customers', JSON.stringify(customers));
      } catch (err) {
        console.error('Error saving customers:', err);
        setError('Failed to save customers');
      }
    }
  }, [customers, loading]);

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      const newCustomer: Customer = {
        ...customerData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      const previousCustomers = [...customers];
      setCustomers(prev => [...prev, newCustomer].sort((a, b) => 
        a.firstName.localeCompare(b.firstName)
      ));
      setError(null);
      
      // Add undo action
      addUndoAction({
        id: `add-customer-${newCustomer.id}`,
        description: `Added customer ${newCustomer.firstName} ${newCustomer.lastName}`,
        undo: () => {
          setCustomers(previousCustomers);
          errorLogger.info(`Undid adding customer: ${newCustomer.firstName} ${newCustomer.lastName}`);
        }
      });
      
      // Auto-sync to Google Sheets if connected
      if (isConnected) {
        const sortedCustomers = [...customers, newCustomer].sort((a, b) => 
          a.firstName.localeCompare(b.firstName)
        );
        syncCustomers(sortedCustomers);
      }
      
      errorLogger.info(`Customer added: ${newCustomer.firstName} ${newCustomer.lastName}`);
      return newCustomer;
    } catch (err) {
      console.error('Error adding customer:', err);
      errorLogger.error('Failed to add customer', err);
      setError('Failed to add customer');
      return null;
    }
  };

  const updateCustomer = (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    try {
      const updatedCustomers = customers.map(customer => 
        customer.id === id 
          ? { ...customer, ...updates }
          : customer
      );
      
      setCustomers(updatedCustomers.sort((a, b) => 
        a.firstName.localeCompare(b.firstName)
      ));
      setError(null);
      
      // Auto-sync to Google Sheets if connected
      if (isConnected) {
        syncCustomers(updatedCustomers.sort((a, b) => 
          a.firstName.localeCompare(b.firstName)
        ));
      }
      
      return true;
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Failed to update customer');
      return false;
    }
  };

  const deleteCustomer = (id: string) => {
    try {
      const customerToDelete = customers.find(c => c.id === id);
      if (!customerToDelete) return false;
      
      const previousCustomers = [...customers];
      const remainingCustomers = customers.filter(customer => customer.id !== id);
      setCustomers(remainingCustomers.sort((a, b) => 
        a.firstName.localeCompare(b.firstName)
      ));
      setError(null);
      
      // Add undo action
      addUndoAction({
        id: `delete-customer-${id}`,
        description: `Deleted customer ${customerToDelete.firstName} ${customerToDelete.lastName}`,
        undo: () => {
          setCustomers(previousCustomers);
          errorLogger.info(`Undid deleting customer: ${customerToDelete.firstName} ${customerToDelete.lastName}`);
        }
      });
      
      // Auto-sync to Google Sheets if connected
      if (isConnected) {
        syncCustomers(remainingCustomers.sort((a, b) => 
          a.firstName.localeCompare(b.firstName)
        ));
      }
      
      errorLogger.info(`Customer deleted: ${customerToDelete.firstName} ${customerToDelete.lastName}`);
      return true;
    } catch (err) {
      console.error('Error deleting customer:', err);
      errorLogger.error('Failed to delete customer', err);
      setError('Failed to delete customer');
      return false;
    }
  };

  const getCustomerById = (id: string) => {
    return customers.find(customer => customer.id === id);
  };

  const searchCustomers = (searchTerm: string) => {
    if (!searchTerm.trim()) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers
      .filter(customer =>
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer.company?.toLowerCase().includes(term) ||
      customer.phone?.includes(term)
    )
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  };

  return {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    searchCustomers
  };
};