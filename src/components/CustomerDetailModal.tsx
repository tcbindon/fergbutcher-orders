import React, { useState } from 'react';
import { ArrowLeft, Copy, MessageSquare, Package } from 'lucide-react';
import { Customer, Order } from '../types';
import CustomerDetail from './CustomerDetail';
import OrderDetail from './OrderDetail';
import { getStatusBadge } from '../utils/statusColors';

interface CustomerDetailModalProps {
  customer: Customer;
  orders: Order[];
  onClose: () => void;
  onEditCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customer: Customer) => void;
  onDuplicateOrder?: (orderId: string) => void;
  onEditOrder?: (order: Order) => void;
  onStatusChange?: (orderId: string, status: Order['status']) => void;
}

type View = 'details' | 'history' | 'order';

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  orders,
  onClose,
  onEditCustomer,
  onDeleteCustomer,
  onDuplicateOrder,
  onEditOrder,
  onStatusChange,
}) => {
  const [view, setView] = useState<View>('details');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const customerOrders = orders
    .filter((o) => o.customerId === customer.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const renderHeader = (title: string, subtitle?: string, onBack?: () => void) => (
    <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
      <div className="flex items-center space-x-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center space-x-1 text-fergbutcher-gold-500 hover:text-fergbutcher-green-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>
        )}
        <div>
          <h3 className="text-lg font-semibold text-fergbutcher-black-900">{title}</h3>
          {subtitle && <p className="text-sm text-fergbutcher-green-400">{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-fergbutcher-gold-500 hover:text-fergbutcher-black-900"
      >
        ✕
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {view === 'details' && (
          <>
            {renderHeader('Customer Details')}
            <div className="p-6">
              <CustomerDetail
                customer={customer}
                onEdit={() => onEditCustomer?.(customer)}
                onDelete={() => onDeleteCustomer?.(customer)}
                orderCount={customerOrders.length}
                onViewOrderHistory={() => setView('history')}
              />
            </div>
          </>
        )}

        {view === 'history' && (
          <>
            {renderHeader(
              `Order History — ${customer.firstName} ${customer.lastName}`,
              `${customerOrders.length} total order${customerOrders.length !== 1 ? 's' : ''}`,
              () => setView('details')
            )}
            <div className="p-6">
              {customerOrders.length > 0 ? (
                <div className="space-y-4">
                  {customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-fergbutcher-gold-300 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedOrder(order);
                        setView('order');
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-fergbutcher-black-900">
                            Order #{order.id}
                          </h4>
                          <p className="text-sm text-fergbutcher-green-400">
                            Created {new Date(order.createdAt).toLocaleDateString('en-NZ')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-fergbutcher-black-900">
                              Collection: {order.collectionDate ? new Date(order.collectionDate).toLocaleDateString('en-NZ') : 'No date set'}
                            </p>
                            {order.collectionTime && (
                              <p className="text-sm text-fergbutcher-green-400">Time: {order.collectionTime}</p>
                            )}
                          </div>
                          {onDuplicateOrder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateOrder(order.id);
                              }}
                              className="p-2 text-fergbutcher-gold-400 hover:text-fergbutcher-green-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
                              title="Duplicate Order"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="mb-4">
                        <h5 className="font-medium text-fergbutcher-black-900 mb-2">Items:</h5>
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
                      {order.additionalNotes && (
                        <div className="bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-fergbutcher-yellow-800 mb-1">Notes:</p>
                          <p className="text-sm text-fergbutcher-yellow-700">{order.additionalNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-fergbutcher-gold-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-fergbutcher-black-900 mb-2">No Orders Yet</h3>
                  <p className="text-fergbutcher-green-400">This customer hasn't placed any orders yet.</p>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'order' && selectedOrder && (
          <>
            {renderHeader(
              `Order #${selectedOrder.id}`,
              undefined,
              () => setView('history')
            )}
            <div className="p-6">
              <OrderDetail
                order={selectedOrder}
                customer={customer}
                onEdit={() => onEditOrder?.(selectedOrder)}
                onDelete={() => {}}
                onDuplicate={onDuplicateOrder ? () => onDuplicateOrder(selectedOrder.id) : undefined}
                onStatusChange={(status) => onStatusChange?.(selectedOrder.id, status)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailModal;
