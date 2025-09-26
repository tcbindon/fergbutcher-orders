import React from 'react';
import { Users, ShoppingCart, Calendar, TrendingUp, CheckCircle, Clock, Package, Gift, Building } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import OrderDetail from './OrderDetail';
import OrderForm from './OrderForm';
import ChristmasOrderForm from './ChristmasOrderForm';
import { Order } from '../types';

const Dashboard: React.FC = () => {
  const { customers } = useCustomers();
  const { orders, updateOrder, deleteOrder, addOrder, getDuplicateOrderData } = useOrders();
  const { addCustomer } = useCustomers();

  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [duplicatingOrder, setDuplicatingOrder] = React.useState<any>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calculate today's collections
  const today = new Date().toISOString().split('T')[0];
  const todaysCollections = orders.filter(order => 
    order.collectionDate === today && order.status !== 'cancelled'
  ).length;

  // Calculate this week's orders
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const thisWeeksOrders = orders.filter(order => {
    const collectionDate = new Date(order.collectionDate);
    return collectionDate >= startOfWeek && collectionDate <= endOfWeek && order.status !== 'cancelled';
  });

  // Calculate active orders (pending + confirmed)
  const activeOrders = orders.filter(order => 
    order.status === 'pending' || order.status === 'confirmed'
  ).length;

  // Calculate pending orders from active orders
  const pendingOrders = orders.filter(order => order.status === 'pending').length;

  // Calculate pending orders from today's collections
  const todaysPendingOrders = orders.filter(order => 
    order.collectionDate === today && order.status === 'pending'
  ).length;

  // Mock revenue calculation
  const thisWeeksRevenue = 2340;

  // Mock percentage changes
  const customerGrowth = 12;
  const revenueGrowth = 18;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'pending':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your orders today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Customers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm font-medium text-green-600">+{customerGrowth}%</span>
                <span className="text-sm text-gray-500 ml-2">from last week</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-3xl font-bold text-gray-900">{activeOrders}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm font-medium text-gray-600">{pendingOrders} pending</span>
                <span className="text-sm text-gray-500 ml-2">from last week</span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Collections</p>
              <p className="text-3xl font-bold text-gray-900">{todaysCollections}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm font-medium text-gray-600">{todaysPendingOrders} pending</span>
                <span className="text-sm text-gray-500 ml-2">from last week</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* This Week's Revenue */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week's Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${thisWeeksRevenue.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm font-medium text-green-600">+{revenueGrowth}%</span>
                <span className="text-sm text-gray-500 ml-2">from last week</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* This Week's Orders */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">This Week's Orders</h3>
        </div>
        <div className="p-6">
          {thisWeeksOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders scheduled for this week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {thisWeeksOrders.slice(0, 10).map((order) => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setViewingOrder(order)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                          </p>
                          {order.orderType === 'christmas' && (
                            <Gift className="h-4 w-4 text-orange-500" />
                          )}
                          {customer?.company && (
                            <div className="flex items-center space-x-1">
                              <Building className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{customer.company}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {order.items.map(item => 
                            `${item.description} (${item.quantity} ${item.unit})`
                          ).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(order.collectionDate)}
                        </p>
                        {order.collectionTime && (
                          <p className="text-xs text-gray-500">{order.collectionTime}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {thisWeeksOrders.length > 10 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    And {thisWeeksOrders.length - 10} more orders...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
              <button
                onClick={() => setViewingOrder(null)}
                className="text-gray-400 hover:text-gray-600"
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
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Order</h3>
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
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Delete Order</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">
                    Are you sure you want to delete this order?
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    This action cannot be undone. All order data will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingOrder(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Duplicate Order</h3>
              <p className="text-gray-600 text-sm">Review and modify the order details before creating</p>
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
    </div>
  );
};

export default Dashboard;