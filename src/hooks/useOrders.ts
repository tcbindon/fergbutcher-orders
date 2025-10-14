import { useState, useEffect } from 'react';
import { Order, OrderItem, Customer, StaffNote } from '../types';
import { useGoogleSheets } from './useGoogleSheets';
import { useUndo } from './useUndo';
import errorLogger from '../services/errorLogger';
import { v4 as uuidv4 } from 'uuid';

// Mock initial data
const initialOrders: Order[] = [
  {
    id: '1',
    customerId: '1',
    orderType: 'standard',
    items: [
      { id: '1', description: 'Beef Wellington - medium rare, 2cm thick', quantity: 2, unit: 'kg' },
      { id: '2', description: 'French-trimmed Lamb Rack - frenched, cap off', quantity: 1.5, unit: 'kg' }
    ],
    collectionDate: '2025-01-15',
    collectionTime: '14:00',
    status: 'confirmed',
    createdAt: '2025-01-10T10:30:00Z',
    updatedAt: '2025-01-10T10:30:00Z'
  },
  {
    id: '2',
    customerId: '2',
    orderType: 'standard',
    items: [
      { id: '3', description: 'Pork Belly - skin on, scored for crackling', quantity: 1.5, unit: 'kg' },
      { id: '4', description: 'Free-range Chicken Thighs - bone in, skin on', quantity: 8, unit: 'pieces' }
    ],
    collectionDate: '2025-01-16',
    additionalNotes: 'Please trim excess fat from pork belly',
    status: 'pending',
    createdAt: '2025-01-11T09:15:00Z',
    updatedAt: '2025-01-11T09:15:00Z'
  },
  {
    id: '3',
    customerId: '3',
    orderType: 'standard',
    items: [
      { id: '5', description: 'Ribeye Steak - 2cm thick, well-marbled', quantity: 4, unit: 'steaks' },
      { id: '6', description: 'Cumberland Sausages - traditional recipe', quantity: 1, unit: 'kg' }
    ],
    collectionDate: '2025-01-14',
    collectionTime: '16:30',
    status: 'collected',
    createdAt: '2025-01-09T11:45:00Z',
    updatedAt: '2025-01-14T16:30:00Z'
  }
];

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, syncOrders } = useGoogleSheets();
  const { syncChristmasOrders } = useGoogleSheets();
  const { addUndoAction } = useUndo();

  // Load orders from localStorage on mount
  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem('fergbutcher_orders');
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      } else {
        // Use initial data if no saved data exists
        setOrders(initialOrders);
        localStorage.setItem('fergbutcher_orders', JSON.stringify(initialOrders));
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders');
      setOrders(initialOrders);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save orders to localStorage whenever orders change
  useEffect(() => {
    if (!loading && orders.length > 0) {
      try {
        localStorage.setItem('fergbutcher_orders', JSON.stringify(orders));
      } catch (err) {
        console.error('Error saving orders:', err);
        setError('Failed to save orders');
      }
    }
  }, [orders, loading]);

  const addOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (orderData.isRecurring && orderData.recurrencePattern && orderData.recurrenceEndDate) {
        // Handle recurring order creation
        const parentOrderId = uuidv4();
        const recurringOrders: Order[] = [];
        
        // Calculate all collection dates
        const startDate = new Date(orderData.collectionDate);
        const endDate = new Date(orderData.recurrenceEndDate);
        const interval = orderData.recurrencePattern === 'weekly' ? 7 : 14;
        
        let currentDate = new Date(startDate);
        let orderCounter = 1;
        
        while (currentDate <= endDate) {
          // Generate sequential order number
          const allOrders = [...orders, ...initialOrders, ...recurringOrders];
          const maxOrderNumber = allOrders.reduce((max, order) => {
            const orderNum = parseInt(order.id);
            return isNaN(orderNum) ? max : Math.max(max, orderNum);
          }, 0);
          const newOrderId = (maxOrderNumber + 1).toString();
          
          const recurringOrder: Order = {
            ...orderData,
            id: newOrderId,
            collectionDate: currentDate.toISOString().split('T')[0],
            orderType: orderData.orderType || 'standard',
            isRecurring: true,
            parentOrderId: parentOrderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          recurringOrders.push(recurringOrder);
          
          // Move to next occurrence
          currentDate.setDate(currentDate.getDate() + interval);
          orderCounter++;
        }
        
        const previousOrders = [...orders];
        setOrders(prev => [...recurringOrders, ...prev]);
        setError(null);
        
        // Add undo action for the entire recurring series
        addUndoAction({
          id: `add-recurring-orders-${parentOrderId}`,
          description: `Created ${recurringOrders.length} recurring orders (${orderData.recurrencePattern})`,
          undo: () => {
            setOrders(previousOrders);
            errorLogger.info(`Undid creating ${recurringOrders.length} recurring orders`);
          }
        });
        
        errorLogger.info(`Created ${recurringOrders.length} recurring orders with pattern: ${orderData.recurrencePattern}`);
        return recurringOrders[0]; // Return the first order in the series
      } else {
        // Handle single order creation
        const allOrders = [...orders, ...initialOrders];
        const maxOrderNumber = allOrders.reduce((max, order) => {
          const orderNum = parseInt(order.id);
          return isNaN(orderNum) ? max : Math.max(max, orderNum);
        }, 0);
        const newOrderId = (maxOrderNumber + 1).toString();
        
        const newOrder: Order = {
          ...orderData,
          id: newOrderId,
          orderType: orderData.orderType || 'standard',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const previousOrders = [...orders];
        setOrders(prev => [newOrder, ...prev]);
        setError(null);
        
        // Add undo action
        addUndoAction({
          id: `add-order-${newOrder.id}`,
          description: `Created order #${newOrder.id}`,
          undo: () => {
            setOrders(previousOrders);
            errorLogger.info(`Undid creating order #${newOrder.id}`);
          }
        });
        
        errorLogger.info(`Order created: #${newOrder.id}`);
        return newOrder;
      }
    } catch (err) {
      console.error('Error adding order:', err);
      errorLogger.error('Failed to add order', err);
      setError('Failed to add order');
      return null;
    }
  };

  const updateOrder = (id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>) => {
    try {
      setOrders(prev => 
        prev.map(order => 
          order.id === id 
            ? { ...order, ...updates, updatedAt: new Date().toISOString() }
            : order
        )
      );
      setError(null);
      
      // Note: Actual sync will be handled by components that have access to customers
      
      return true;
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order');
      return false;
    }
  };

  const deleteOrder = (id: string) => {
    try {
      const orderToDelete = orders.find(o => o.id === id);
      if (!orderToDelete) return false;
      
      const previousOrders = [...orders];
      setOrders(prev => prev.filter(order => order.id !== id));
      setError(null);
      
      // Add undo action
      addUndoAction({
        id: `delete-order-${id}`,
        description: `Deleted order #${id}`,
        undo: () => {
          setOrders(previousOrders);
          errorLogger.info(`Undid deleting order #${id}`);
        }
      });
      
      // Note: Actual sync will be handled by components that have access to customers
      
      errorLogger.info(`Order deleted: #${id}`);
      return true;
    } catch (err) {
      console.error('Error deleting order:', err);
      errorLogger.error('Failed to delete order', err);
      setError('Failed to delete order');
      return false;
    }
  };

  const getOrderById = (id: string) => {
    return orders.find(order => order.id === id);
  };

  const getOrdersByCustomerId = (customerId: string) => {
    return orders.filter(order => order.customerId === customerId);
  };

  const getOrdersByStatus = (status: Order['status']) => {
    return orders.filter(order => order.status === status);
  };

  const getOrdersByDateRange = (startDate: string, endDate: string) => {
    return orders.filter(order => 
      order.collectionDate >= startDate && order.collectionDate <= endDate
    );
  };

  const searchOrders = (searchTerm: string, customers: Customer[]) => {
    if (!searchTerm.trim()) return orders;
    
    const today = new Date().toISOString().split('T')[0];
    const term = searchTerm.toLowerCase();
    return orders
      .filter(order => order.collectionDate >= today) // Only show current and future orders in search
      .filter(order => {
      const customer = customers.find(c => c.id === order.customerId);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}`.toLowerCase() : '';
      
      return customerName.includes(term) ||
        order.items.some(item => item.description.toLowerCase().includes(term)) ||
        order.additionalNotes?.toLowerCase().includes(term);
      });
  };

  const getOrderStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentOrders = orders.filter(o => o.collectionDate >= today);
    
    const total = currentOrders.length;
    const pending = currentOrders.filter(o => o.status === 'pending').length;
    const confirmed = currentOrders.filter(o => o.status === 'confirmed').length;
    const collected = currentOrders.filter(o => o.status === 'collected').length;
    const cancelled = currentOrders.filter(o => o.status === 'cancelled').length;

    // Today's collections
    const todaysOrders = currentOrders.filter(o => o.collectionDate === today);
    const todaysConfirmed = todaysOrders.filter(o => o.status === 'confirmed').length;
    const todaysPending = todaysOrders.filter(o => o.status === 'pending').length;

    return {
      total,
      pending,
      confirmed,
      collected,
      cancelled,
      todaysTotal: todaysOrders.length,
      todaysConfirmed,
      todaysPending
    };
  };

  return {
    orders,
    loading,
    error,
    addOrder,
    updateOrder,
    deleteOrder,
    getDuplicateOrderData: (orderId: string) => {
      try {
        const originalOrder = orders.find(o => o.id === orderId);
        if (!originalOrder) return null;
        
        // Return order data for pre-populating the form
        return {
          customerId: originalOrder.customerId,
          items: originalOrder.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit
          })),
          collectionDate: new Date().toISOString().split('T')[0], // Default to today
          collectionTime: originalOrder.collectionTime || '',
          additionalNotes: originalOrder.additionalNotes || '',
          status: 'pending' as Order['status']
        };
      } catch (err) {
        console.error('Error preparing duplicate order data:', err);
        errorLogger.error('Failed to prepare duplicate order data', err);
        setError('Failed to prepare duplicate order data');
        return null;
      }
    },
    getOrderById,
    getOrdersByCustomerId,
    getOrdersByStatus,
    getOrdersByDateRange,
    searchOrders,
    getOrderStats,
    // Helper function to sync orders to Google Sheets
    syncOrdersToSheets: async (customers: Customer[]) => {
      if (!isConnected) return false;
      
      try {
        // Separate standard and Christmas orders
        const standardOrders = orders.filter(order => order.orderType !== 'christmas');
        const christmasOrders = orders.filter(order => order.orderType === 'christmas');
        
        // Sync standard orders
        if (standardOrders.length > 0) {
          await syncOrders(standardOrders, customers);
        }
        
        // Sync Christmas orders
        if (christmasOrders.length > 0) {
          await syncChristmasOrders(christmasOrders, customers);
        }
        
        return true;
      } catch (error) {
        console.error('Error syncing orders to sheets:', error);
        return false;
      }
    }
  };
};