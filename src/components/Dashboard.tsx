import React from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import { useStaffNotes } from '../hooks/useStaffNotes';
import backupService from '../services/backupService';
import OrderDetail from './OrderDetail';
import OrderForm from './OrderForm';
import ChristmasOrderForm from './ChristmasOrderForm';
import { 
  Users, 
  ShoppingCart, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Gift,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Order } from '../types';

const Dashboard: React.FC = () => {
  const { customers, addCustomer } = useCustomers();
  const { orders, getOrderStats, updateOrder, deleteOrder, getDuplicateOrderData, addOrder } = useOrders();
  const { getNotesForOrder } = useStaffNotes();
  const orderStats = getOrderStats();

  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);
  const [duplicatingOrder, setDuplicatingOrder] = React.useState<any>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calculate time since last backup
  const getTimeSinceLastBackup = () => {
    const backups = backupService.getBackupList();
    if (backups.length === 0) {
      return { text: 'No backups', type: 'warning' as const };
    }

    const lastBackup = new Date(backups[0].timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastBackup.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let text: string;
    let type: 'positive' | 'neutral' | 'warning';

    if (diffDays > 0) {
      text = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      type = diffDays > 2 ? 'warning' : 'neutral';
    } else if (diffHours > 0) {
      text = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      type = diffHours > 12 ? 'warning' : 'positive';
    } else if (diffMinutes > 0) {
      text = diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
      type = 'positive';
    } else {
      text = 'Just now';
      type = 'positive';
    }

    return { text, type };
  };

  const backupInfo = getTimeSinceLastBackup();

  // Mock data for demonstration
  const stats = [
    {
      title: 'Total Customers',
      value: customers.length.toLocaleString('en-NZ'),
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'fergbutcher-green'
    },
    {
      title: 'Active Orders',
      value: (orderStats.pending + orderStats.confirmed).toLocaleString('en-NZ'),
      change: `${orderStats.pending} pending`,
      changeType: 'positive' as const,
      icon: ShoppingCart,
      color: 'fergbutcher-brown'
    },
    {
      title: 'Today\'s Collections',
      value: orderStats.todaysTotal.toLocaleString('en-NZ'),
      change: `${orderStats.todaysPending} pending`,
      changeType: 'neutral' as const,
      icon: Calendar,
      color: 'fergbutcher-yellow'
    },
    {
      title: 'Last Backup',
      value: backupInfo.text,
      change: 'Auto backup at 8:30 PM',
      changeType: backupInfo.type,
      icon: Clock,
      color: 'fergbutcher-black'
    }
  ];

  // Get this week's orders, sorted by collection date then status
  const getThisWeeksOrders = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
    
    const startDateString = startOfWeek.toISOString().split('T')[0];
    const endDateString = endOfWeek.toISOString().split('T')[0];
    
    const statusPriority = { 'confirmed': 1, 'pending': 2, 'collected': 3, 'cancelled': 4 };
    
    return orders
      .filter(order => order.collectionDate >= startDateString && order.collectionDate <= endDateString)
      .filter(order => order.collectionDate >= todayString) // Only show current and future orders
      .sort((a, b) => {
        // First sort by collection date (earliest first)
        const dateComparison = new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        // Then sort by status priority
        return statusPriority[a.status] - statusPriority[b.status];
      })
      .slice(0, 5) // Show only first 5
      .map(order => {
        const customer = customers.find(c => c.id === order.customerId);
        return {
          id: order.id,
          customer: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer',
          items: order.items.map(item => `${item.description} (${item.quantity.toLocaleString('en-NZ')} ${item.unit})`).join(', '),
          collection: order.collectionDate,
          status: order.status,
          fullOrder: order
        };
      });
  };

  const thisWeeksOrders = getThisWeeksOrders();

  const handleUpdateOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingOrder) return;
    
    setIsSubmitting(true);
    try {
      const success = updateOrder(editingOrder.id, orderData);
      if (success) {
        setEditingOrder(null);
        // Update viewing order if it's the same one
        if (viewingOrder?.id === editingOrder.id) {
          setViewingOrder({ ...editingOrder, ...orderData, updatedAt: new Date().toISOString() });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = () => {
    if (!deletingOrder) return;
    
    const success = deleteOrder(deletingOrder.id);
    if (success) {
      setDeletingOrder(null);
      // Close detail view if we're viewing the deleted order
      if (viewingOrder?.id === deletingOrder.id) {
        setViewingOrder(null);
      }
    }
  };

  const handleDuplicateOrder = (orderId: string) => {
    const duplicateData = getDuplicateOrderData(orderId);
    if (duplicateData) {
      setDuplicatingOrder(duplicateData);
      setViewingOrder(null); // Close detail view
    } else {
      alert('Failed to prepare duplicate order. Please try again.');
    }
  };

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    const success = updateOrder(orderId, { status: newStatus });
    if (success && viewingOrder?.id === orderId) {
      setViewingOrder(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-fergbutcher-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-fergbutcher-yellow-500" />;
      case 'collected':
        return <Package className="h-4 w-4 text-fergbutcher-brown-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-fergbutcher-black-500" />;
      default:
        return <Clock className="h-4 w-4 text-fergbutcher-brown-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-fergbutcher-green-100 text-fergbutcher-green-800';
      case 'pending':
        return 'bg-fergbutcher-yellow-100 text-fergbutcher-yellow-800';
      case 'collected':
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800';
      case 'cancelled':
        return 'bg-fergbutcher-black-100 text-fergbutcher-black-800';
      default:
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fergbutcher-black-900">Dashboard</h1>
        <p className="text-fergbutcher-brown-600">Welcome back! Here's what's happening with your orders today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-fergbutcher-brown-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-fergbutcher-black-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-fergbutcher-green-600' : 
                  stat.changeType === 'negative' ? 'text-fergbutcher-black-600' : 'text-fergbutcher-brown-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-fergbutcher-brown-500 ml-2">from last week</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* This Week's Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
          <h2 className="text-lg font-semibold text-fergbutcher-black-900">This Week's Orders</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {thisWeeksOrders.length > 0 ? thisWeeksOrders.map((order) => (
              <div 
                key={order.id} 
                className="flex items-center justify-between p-4 bg-fergbutcher-green-50 rounded-lg cursor-pointer hover:bg-fergbutcher-green-100 transition-colors"
                onClick={() => setViewingOrder(order.fullOrder)}
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(order.status)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-fergbutcher-black-900">{order.customer}</p>
                      {order.fullOrder.orderType === 'christmas' && (
                        <Gift className="h-4 w-4 text-fergbutcher-green-600" />
                      )}
                      {order.fullOrder.isRecurring && (
                        <RefreshCw className="h-4 w-4 text-fergbutcher-blue-600" />
                      )}
                      {order.fullOrder.isRecurring && (
                        <RefreshCw className="h-4 w-4 text-fergbutcher-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-fergbutcher-brown-600">{order.items}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-fergbutcher-black-900">
                      {new Date(order.collection).toLocaleDateString('en-NZ')}
                    </p>
                    <div className="relative">
                      <select
                        value={order.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(order.fullOrder.id, e.target.value as Order['status']);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`appearance-none pr-8 pl-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${getStatusColor(order.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="collected">Collected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-fergbutcher-brown-300 mx-auto mb-4" />
                <p className="text-fergbutcher-brown-500">No orders scheduled for this week</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Order Details</h3>
              <button
                onClick={() => setViewingOrder(null)}
                className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <OrderDetail
                order={viewingOrder}
                customer={customers.find(c => c.id === viewingOrder.customerId)}
                onEdit={() => {
                  setEditingOrder(viewingOrder);
                  setViewingOrder(null);
                }}
                onDelete={() => {
                  setDeletingOrder(viewingOrder);
                  setViewingOrder(null);
                }}
                onDuplicate={() => handleDuplicateOrder(viewingOrder.id)}
                onStatusChange={(status) => handleStatusChange(viewingOrder.id, status)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Edit Order</h3>
            </div>
            <div className="p-6">
              {editingOrder.orderType === 'christmas' ? (
                <ChristmasOrderForm
                  order={editingOrder}
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={handleUpdateOrder}
                  onCancel={() => setEditingOrder(null)}
                  isLoading={isSubmitting}
                />
              ) : (
                <OrderForm
                  order={editingOrder}
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={handleUpdateOrder}
                  onCancel={() => setEditingOrder(null)}
                  isLoading={isSubmitting}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Delete Order</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-fergbutcher-black-900 font-medium">
                    Are you sure you want to delete this order?
                  </p>
                  <p className="text-fergbutcher-brown-600 text-sm mt-1">
                    This action cannot be undone. All order data will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingOrder(null)}
                  className="px-4 py-2 text-fergbutcher-brown-700 bg-fergbutcher-brown-100 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrder}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Order Modal */}
      {duplicatingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Duplicate Order</h3>
              <p className="text-fergbutcher-brown-600 text-sm">Review and modify the order details before creating</p>
            </div>
            <div className="p-6">
              {duplicatingOrder.orderType === 'christmas' ? (
                <ChristmasOrderForm
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={(orderData) => {
                    const newOrder = addOrder(orderData);
                    if (newOrder) {
                      setDuplicatingOrder(null);
                      alert(`Christmas order duplicated successfully! New order #${newOrder.id} created.`);
                    }
                  }}
                  onCancel={() => setDuplicatingOrder(null)}
                  isLoading={isSubmitting}
                />
              ) : (
                <OrderForm
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={(orderData) => {
                    const newOrder = addOrder(orderData);
                    if (newOrder) {
                      setDuplicatingOrder(null);
                      alert(`Order duplicated successfully! New order #${newOrder.id} created.`);
                    }
                  }}
                  onCancel={() => setDuplicatingOrder(null)}
                  isLoading={isSubmitting}
                  initialData={duplicatingOrder}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.hash = '#orders'}
              className="w-full bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors"
            >
              Create New Order
            </button>
            <button 
              onClick={() => window.location.hash = '#customers'}
              className="w-full bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
            >
              Add Customer
            </button>
            <button 
              onClick={() => window.location.hash = '#calendar'}
              className="w-full bg-fergbutcher-yellow-100 text-fergbutcher-yellow-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-yellow-200 transition-colors"
            >
              View Calendar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Today's Collections</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-brown-600">Confirmed</span>
              <span className="font-medium text-fergbutcher-green-600">{orderStats.todaysConfirmed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-brown-600">Pending</span>
              <span className="font-medium text-fergbutcher-yellow-600">{orderStats.todaysPending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-brown-600">Total</span>
              <span className="font-bold text-fergbutcher-black-900">{orderStats.todaysTotal}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-fergbutcher-green-500 rounded-full"></div>
              <span className="text-sm text-fergbutcher-brown-600">Google Sheets Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-fergbutcher-green-500 rounded-full"></div>
              <span className="text-sm text-fergbutcher-brown-600">Email Service Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-fergbutcher-brown-500 rounded-full"></div>
              <span className="text-sm text-fergbutcher-brown-600">Last Backup: 2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;