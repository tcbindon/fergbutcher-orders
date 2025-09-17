import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Eye, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  User,
  AlertTriangle,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useStaffNotes } from '../hooks/useStaffNotes';
import OrderForm from './OrderForm';
import OrderDetail from './OrderDetail';
import { Order } from '../types';

const Orders: React.FC = () => {
  const { 
    orders, 
    loading: ordersLoading, 
    error: ordersError, 
    addOrder, 
    updateOrder, 
    deleteOrder,
    getDuplicateOrderData,
    searchOrders 
  } = useOrders();
  
  const { customers, loading: customersLoading, addCustomer } = useCustomers();
  const { getNotesForOrder } = useStaffNotes();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [duplicatingOrder, setDuplicatingOrder] = useState<any>(null);
  const [showingComments, setShowingComments] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort orders by collection date (earliest first), then by status priority
  const getSortedOrders = (orders: Order[]) => {
    const statusPriority = { 'confirmed': 1, 'pending': 2, 'collected': 3, 'cancelled': 4 };
    
    return orders.sort((a, b) => {
      // First sort by collection date (earliest first)
      const dateComparison = new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Then sort by status priority
      return statusPriority[a.status] - statusPriority[b.status];
    });
  };

  const filteredOrders = getSortedOrders(
    searchOrders(searchTerm, customers).filter(order => 
      statusFilter === 'all' || order.status === statusFilter
    )
  );

  const handleAddOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      const newOrder = addOrder(orderData);
      if (newOrder) {
        setShowCreateModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
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

  if (ordersLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fergbutcher-brown-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-fergbutcher-black-900">Orders</h1>
          <p className="text-fergbutcher-brown-600">Manage all customer orders</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Order</span>
        </button>
      </div>

      {/* Error Message */}
      {ordersError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{ordersError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fergbutcher-brown-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search orders by customer name or items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-fergbutcher-brown-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="collected">Collected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h2 className="text-lg font-semibold text-fergbutcher-black-900">
                All Orders ({filteredOrders.length.toLocaleString('en-NZ')})
              </h2>
            </div>
            <div className="divide-y divide-fergbutcher-brown-200 max-h-96 overflow-y-auto">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div 
                      key={order.id} 
                      className="p-6 hover:bg-fergbutcher-green-50 transition-colors cursor-pointer"
                      onClick={() => setViewingOrder(order)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="bg-fergbutcher-green-100 p-3 rounded-full">
                            <User className="h-6 w-6 text-fergbutcher-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-fergbutcher-black-900">
                                {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                              </h3>
                              <div className="relative">
                                <select
                                  value={order.status}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(order.id, e.target.value as Order['status']);
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
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-4 text-sm text-fergbutcher-brown-600">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(order.collectionDate).toLocaleDateString('en-NZ')}</span>
                                </div>
                              )}
                              )}
                                {order.collectionTime && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{order.collectionTime}</span>
                                  </div>
                                  {/* Comment Indicator */}
                                  {getNotesForOrder(order.id).length > 0 && (
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowingComments(showingComments === order.id ? null : order.id);
                                        }}
                                        className="p-1 text-fergbutcher-green-600 hover:text-fergbutcher-green-700 hover:bg-fergbutcher-green-100 rounded-full transition-colors"
                                        title={`${getNotesForOrder(order.id).length} staff comment${getNotesForOrder(order.id).length !== 1 ? 's' : ''}`}
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                        <span className="absolute -top-1 -right-1 bg-fergbutcher-green-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                          {getNotesForOrder(order.id).length}
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                )}
                              </div>
                              
                              <div className="text-sm text-fergbutcher-brown-700">
                                <strong>Items:</strong> {order.items.map(item => 
                                  `${item.description} (${item.quantity.toLocaleString('en-NZ')} ${item.unit})`
                                ).join(', ')}
                              </div>
                              
                              {order.additionalNotes && (
                                <div className="text-sm text-fergbutcher-brown-600">
                                  <strong>Notes:</strong> {order.additionalNotes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOrder(order);
                            }}
                            className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
                            title="Edit Order"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Quick Comments Preview */}
                      {showingComments === order.id && (
                        <div className="mt-4 p-4 bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-fergbutcher-black-900 flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4 text-fergbutcher-green-600" />
                              <span>Staff Comments ({getNotesForOrder(order.id).length})</span>
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowingComments(null);
                              }}
                              className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {getNotesForOrder(order.id).slice(0, 3).map((note) => (
                              <div key={note.id} className="bg-white border border-fergbutcher-brown-200 rounded p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-fergbutcher-black-900 text-sm">{note.staffName}</span>
                                  <span className="text-xs text-fergbutcher-brown-500">
                                    {new Date(note.timestamp).toLocaleDateString('en-NZ', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="text-fergbutcher-brown-700 text-sm">{note.content}</p>
                              </div>
                            ))}
                            {getNotesForOrder(order.id).length > 3 && (
                              <div className="text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingOrder(order);
                                    setShowingComments(null);
                                  }}
                                  className="text-sm text-fergbutcher-green-600 hover:text-fergbutcher-green-700 font-medium"
                                >
                                  View all {getNotesForOrder(order.id).length} comments →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <Package className="h-12 w-12 text-fergbutcher-brown-300 mx-auto mb-4" />
                  <p className="text-fergbutcher-brown-500">
                    {searchTerm || statusFilter !== 'all' ? 'No orders found matching your criteria.' : 'No orders yet.'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 text-fergbutcher-green-600 hover:text-fergbutcher-green-700 font-medium"
                    >
                      Create your first order
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Order Details Modal */}
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

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Create New Order</h3>
            </div>
            <div className="p-6">
              <OrderForm
                customers={customers}
                onAddCustomer={addCustomer}
                onSubmit={handleAddOrder}
                onCancel={() => setShowCreateModal(false)}
                isLoading={isSubmitting}
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
              <OrderForm
                order={editingOrder}
                customers={customers}
                onAddCustomer={addCustomer}
                onSubmit={handleUpdateOrder}
                onCancel={() => setEditingOrder(null)}
                isLoading={isSubmitting}
              />
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;