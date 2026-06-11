import React from 'react';
import { X, Calendar, Clock, User, Package, AlertTriangle, XCircle, CreditCard as Edit, MessageSquare } from 'lucide-react';
import { Gift } from 'lucide-react';
import { Order, Customer } from '../types';
import OrderDetail from './OrderDetail';
import { getStatusBadge, getStatusIcon, STATUS_DOT } from '../utils/statusColors';

interface DayOrdersModalProps {
  date: Date;
  orders: Order[];
  customers: Customer[];
  onClose: () => void;
  onUpdateOrder?: (id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>) => boolean;
  onDeleteOrder?: (id: string) => boolean;
  onDeleteRecurringSeries?: (id: string) => { success: boolean; count: number };
  onAddCustomer?: (customerData: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  onEdit?: (order: Order) => void;
  onDuplicate?: (orderId: string) => void;
}

const DayOrdersModal: React.FC<DayOrdersModalProps> = ({
  date,
  orders,
  customers,
  onClose,
  onUpdateOrder,
  onDeleteOrder,
  onDeleteRecurringSeries,
  onAddCustomer,
  onEdit,
  onDuplicate
}) => {
  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
        if (viewingOrder?.id === editingOrder.id) {
          setViewingOrder({ ...editingOrder, ...orderData, updatedAt: new Date().toISOString() });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = () => {
    if (!viewingOrder) return;
    setDeletingOrder(viewingOrder);
  };

  const confirmDeleteSingle = () => {
    if (!deletingOrder || !onDeleteOrder) return;
    const success = onDeleteOrder(deletingOrder.id);
    if (success) {
      setDeletingOrder(null);
      if (viewingOrder?.id === deletingOrder.id) setViewingOrder(null);
    }
  };

  const confirmDeleteSeries = () => {
    if (!deletingOrder || !onDeleteRecurringSeries) return;
    const result = onDeleteRecurringSeries(deletingOrder.id);
    if (result.success) {
      setDeletingOrder(null);
      setViewingOrder(null);
    }
  };

  const handleDuplicateOrder = (orderId: string) => {
    if (onDuplicate) {
      onDuplicate(orderId);
      setViewingOrder(null);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    if (!onUpdateOrder) return;

    const success = onUpdateOrder(orderId, { status: newStatus });
    if (success && viewingOrder?.id === orderId) {
      setViewingOrder(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
    }
  };

  const deleteConfirmModal = deletingOrder ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
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
              <p className="text-fergbutcher-green-400 text-sm mt-1">
                This action cannot be undone. All order data will be permanently removed.
              </p>
              {deletingOrder.isRecurring && deletingOrder.parentOrderId && onDeleteRecurringSeries && (
                <p className="text-fergbutcher-gold-700 text-sm mt-2 bg-fergbutcher-gold-50 border border-fergbutcher-gold-300 rounded p-2">
                  This is part of a recurring series. You can choose to delete only this order, or this order together with all future occurrences.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end flex-wrap gap-3">
            <button
              onClick={() => setDeletingOrder(null)}
              className="px-4 py-2 text-fergbutcher-gold-700 bg-fergbutcher-gold-100 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteSingle}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {deletingOrder.isRecurring && deletingOrder.parentOrderId && onDeleteRecurringSeries ? 'Delete This Order Only' : 'Delete Order'}
            </button>
            {deletingOrder.isRecurring && deletingOrder.parentOrderId && onDeleteRecurringSeries && (
              <button
                onClick={confirmDeleteSeries}
                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
              >
                Delete This &amp; All Future
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (viewingOrder) {
    return (
      <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-fergbutcher-black-900">Order Details</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewingOrder(null)}
                className="text-fergbutcher-gold-400 hover:text-fergbutcher-gold-600"
              >
                ← Back to Day View
              </button>
              <button
                onClick={onClose}
                className="text-fergbutcher-gold-400 hover:text-fergbutcher-gold-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-6">
            <OrderDetail
              order={viewingOrder}
              customer={customers.find(c => c.id === viewingOrder.customerId)}
              onEdit={() => {
                if (onEdit) {
                  onEdit(viewingOrder);
                  setViewingOrder(null);
                }
              }}
              onDelete={handleDeleteOrder}
              onDuplicate={() => handleDuplicateOrder(viewingOrder.id)}
              onStatusChange={(status) => handleStatusChange(viewingOrder.id, status)}
            />
          </div>
        </div>
      </div>
      {deleteConfirmModal}
      </>
    );
  }

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300 bg-fergbutcher-gold-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isToday ? 'bg-fergbutcher-green-600' : 'bg-fergbutcher-gold-200'}`}>
                <Calendar className={`h-6 w-6 ${isToday ? 'text-white' : 'text-fergbutcher-gold-700'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-fergbutcher-black-900">
                  {formatDate(date)}
                  {isToday && <span className="ml-2 text-sm bg-fergbutcher-green-600 text-white px-2 py-1 rounded-full">Today</span>}
                </h2>
                <p className="text-fergbutcher-green-400">
                  {orders.length} order{orders.length !== 1 ? 's' : ''} scheduled for collection
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-fergbutcher-gold-400 hover:text-fergbutcher-gold-600 hover:bg-fergbutcher-gold-100 rounded-lg transition-colors"
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
                  if (a.collectionTime && b.collectionTime) {
                    return a.collectionTime.localeCompare(b.collectionTime);
                  }
                  if (a.collectionTime && !b.collectionTime) return -1;
                  if (!a.collectionTime && b.collectionTime) return 1;

                  const statusPriority: Record<string, number> = { 'confirmed': 1, 'prepared': 2, 'pending': 3, 'collected': 4, 'cancelled': 5 };
                  return (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
                })
                .map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div key={order.id} className="bg-white border border-fergbutcher-gold-300 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
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
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-fergbutcher-green-100 to-fergbutcher-gold-100 text-fergbutcher-green-800 border border-fergbutcher-green-200">
                                  <Gift className="h-3 w-3 mr-1" />
                                  Christmas
                                </span>
                              )}
                            </div>
                            {customer?.phone && (
                              <p className="text-sm text-fergbutcher-green-400">{customer.phone}</p>
                            )}
                            {customer?.email && (
                              <p className="text-sm text-fergbutcher-green-400">{customer.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {order.collectionTime && (
                            <div className="flex items-center space-x-1 text-sm text-fergbutcher-green-400">
                              <Clock className="h-4 w-4" />
                              <span>{order.collectionTime}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingOrder(order);
                            }}
                            className="p-2 text-fergbutcher-gold-400 hover:text-fergbutcher-green-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
                            title="View Full Order Details"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(order.status, 'sm')}
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(order.status)}`}>
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
                            <div key={index} className="flex items-center justify-between p-3 bg-fergbutcher-gold-50 rounded-lg">
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
              <Package className="h-16 w-16 text-fergbutcher-gold-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-fergbutcher-black-900 mb-2">No Orders Scheduled</h3>
              <p className="text-fergbutcher-green-400">
                There are no orders scheduled for collection on {formatDate(date)}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {orders.length > 0 && (
          <div className="px-6 py-4 border-t border-fergbutcher-gold-300 bg-fergbutcher-gold-50">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded-full ${STATUS_DOT.pending}`}></div>
                  <span className="text-fergbutcher-green-400">
                    {orders.filter(o => o.status === 'pending').length} Pending
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded-full ${STATUS_DOT.confirmed}`}></div>
                  <span className="text-fergbutcher-green-400">
                    {orders.filter(o => o.status === 'confirmed').length} Confirmed
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded-full ${STATUS_DOT.prepared}`}></div>
                  <span className="text-fergbutcher-green-400">
                    {orders.filter(o => o.status === 'prepared').length} Prepared
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded-full ${STATUS_DOT.collected}`}></div>
                  <span className="text-fergbutcher-green-400">
                    {orders.filter(o => o.status === 'collected').length} Collected
                  </span>
                </div>
              </div>
              <span className="text-fergbutcher-green-400">
                Total: {orders.length} order{orders.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
    {deleteConfirmModal}
    </>
  );
};

export default DayOrdersModal;
