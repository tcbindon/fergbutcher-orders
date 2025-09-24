import React from 'react';
import { X, Calendar, Clock, User, Package, CheckCircle, AlertTriangle, XCircle, Edit, MessageSquare } from 'lucide-react';
import { Gift } from 'lucide-react';
import { Order, Customer } from '../types';
import OrderDetail from './OrderDetail';

interface DayOrdersModalProps {
  date: Date;
  orders: Order[];
  customers: Customer[];
  onClose: () => void;
  onUpdateOrder?: (id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>) => boolean;
  onDeleteOrder?: (id: string) => boolean;
  onAddCustomer?: (customerData: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
}

const DayOrdersModal: React.FC<DayOrdersModalProps> = ({
  date,
  orders,
  customers,
  onClose,
  onUpdateOrder,
  onDeleteOrder,
  onAddCustomer
}) => {
  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
        return 'bg-fergbutcher-green-100 text-fergbutcher-green-800 border-fergbutcher-green-200';
      case 'pending':
        return 'bg-fergbutcher-yellow-100 text-fergbutcher-yellow-800 border-fergbutcher-yellow-200';
      case 'collected':
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800 border-fergbutcher-brown-200';
      case 'cancelled':
        return 'bg-fergbutcher-black-100 text-fergbutcher-black-800 border-fergbutcher-black-200';
      default:
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800 border-fergbutcher-brown-200';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-NZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = date.toDateString() === new Date().toDateString();

  const handleUpdateOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingOrder || !onUpdateOrder) return;
    
    setIsSubmitting(true);
    try {
      const success = onUpdateOrder(editingOrder.id, orderData);
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
    if (!viewingOrder || !onDeleteOrder) return;
    
    if (window.confirm('Are you sure you want to delete this order?')) {
      const success = onDeleteOrder(viewingOrder.id);
      if (success) {
        setViewingOrder(null);
      }
    }
  };

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    if (!onUpdateOrder) return;
    
    const success = onUpdateOrder(orderId, { status: newStatus });
    if (success && viewingOrder?.id === orderId) {
      setViewingOrder(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
    }
  };

  // If viewing a specific order, show the order detail
  if (viewingOrder) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-fergbutcher-brown-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-fergbutcher-black-900">Order Details</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewingOrder(null)}
                className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
              >
                ← Back to Day View
              </button>
              <button
                onClick={onClose}
                className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-6">
            <OrderDetail
              order={viewingOrder}
              customer={customers.find(c => c.id === viewingOrder.customerId)}
              onEdit={() => setEditingOrder(viewingOrder)}
              onDelete={handleDeleteOrder}
              onStatusChange={(status) => handleStatusChange(viewingOrder.id, status)}
            />
          </div>
        </div>
      </div>
    );
  }

  // If editing an order, show the order form
  if (editingOrder) {
    return (
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
                onAddCustomer={onAddCustomer}
                onSubmit={handleUpdateOrder}
                onCancel={() => setEditingOrder(null)}
                isLoading={isSubmitting}
              />
            ) : (
              <OrderForm
                order={editingOrder}
                customers={customers}
                onAddCustomer={onAddCustomer}
                onSubmit={handleUpdateOrder}
                onCancel={() => setEditingOrder(null)}
                isLoading={isSubmitting}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200 bg-fergbutcher-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isToday ? 'bg-fergbutcher-green-600' : 'bg-fergbutcher-brown-100'}`}>
                <Calendar className={`h-6 w-6 ${isToday ? 'text-white' : 'text-fergbutcher-brown-600'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-fergbutcher-black-900">
                  {formatDate(date)}
                  {isToday && <span className="ml-2 text-sm bg-fergbutcher-green-600 text-white px-2 py-1 rounded-full">Today</span>}
                </h2>
                <p className="text-fergbutcher-brown-600">
                  {orders.length} order{orders.length !== 1 ? 's' : ''} scheduled for collection
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600 hover:bg-fergbutcher-brown-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders
                .sort((a, b) => {
                  // Sort by collection time if available, then by status priority
                  if (a.collectionTime && b.collectionTime) {
                    return a.collectionTime.localeCompare(b.collectionTime);
                  }
                  if (a.collectionTime && !b.collectionTime) return -1;
                  if (!a.collectionTime && b.collectionTime) return 1;
                  
                  const statusPriority = { 'confirmed': 1, 'pending': 2, 'collected': 3, 'cancelled': 4 };
                  return statusPriority[a.status] - statusPriority[b.status];
                })
                .map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div key={order.id} className="bg-white border border-fergbutcher-brown-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                         onClick={() => setViewingOrder(order)}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-fergbutcher-green-100 p-3 rounded-full">
                            {order.orderType === 'christmas' ? (
                              <Gift className="h-6 w-6 text-fergbutcher-green-600" />
                            ) : (
                              <User className="h-6 w-6 text-fergbutcher-green-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold text-fergbutcher-black-900">
                                {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                              </h3>
                              {order.orderType === 'christmas' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-fergbutcher-green-100 to-fergbutcher-yellow-100 text-fergbutcher-green-800 border border-fergbutcher-green-200">
                                  <Gift className="h-3 w-3 mr-1" />
                                  Christmas
                                </span>
                              )}
                            </div>
                            {customer?.phone && (
                              <p className="text-sm text-fergbutcher-brown-600">{customer.phone}</p>
                            )}
                            {customer?.email && (
                              <p className="text-sm text-fergbutcher-brown-600">{customer.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {order.collectionTime && (
                            <div className="flex items-center space-x-1 text-sm text-fergbutcher-brown-600">
                              <Clock className="h-4 w-4" />
                              <span>{order.collectionTime}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingOrder(order);
                            }}
                            className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-green-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
                            title="View Full Order Details"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(order.status)}
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-4">
                        <h4 className="font-medium text-fergbutcher-black-900 mb-2">Order Items:</h4>
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-fergbutcher-green-50 rounded-lg">
                              <span className="text-fergbutcher-black-900">{item.description}</span>
                              <span className="font-semibold text-fergbutcher-black-900">
                                {item.quantity.toLocaleString('en-NZ')} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Additional Notes */}
                      {order.additionalNotes && (
                        <div className="bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-fergbutcher-yellow-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-fergbutcher-yellow-800">Special Instructions:</p>
                              <p className="text-sm text-fergbutcher-yellow-700 mt-1">{order.additionalNotes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-fergbutcher-brown-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-fergbutcher-black-900 mb-2">No Orders Scheduled</h3>
              <p className="text-fergbutcher-brown-600">
                There are no orders scheduled for collection on {formatDate(date)}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {orders.length > 0 && (
          <div className="px-6 py-4 border-t border-fergbutcher-brown-200 bg-fergbutcher-green-50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-fergbutcher-green-500 rounded-full"></div>
                  <span className="text-fergbutcher-brown-600">
                    {orders.filter(o => o.status === 'confirmed').length} Confirmed
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-fergbutcher-yellow-500 rounded-full"></div>
                  <span className="text-fergbutcher-brown-600">
                    {orders.filter(o => o.status === 'pending').length} Pending
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-fergbutcher-brown-500 rounded-full"></div>
                  <span className="text-fergbutcher-brown-600">
                    {orders.filter(o => o.status === 'collected').length} Collected
                  </span>
                </div>
              </div>
              <span className="text-fergbutcher-brown-600">
                Total: {orders.length} order{orders.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayOrdersModal;