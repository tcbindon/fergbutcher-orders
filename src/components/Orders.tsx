import React, { useState, useMemo } from 'react';
import { Plus, Search, Gift, Calendar, Clock, User, Package, Filter } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { Order, OrderStatus } from '../types';
import OrderForm from './OrderForm';
import OrderDetail from './OrderDetail';
import ChristmasOrderForm from './ChristmasOrderForm';

const Orders: React.FC = () => {
  const { orders, addOrder, updateOrder, deleteOrder } = useOrders();
  const { customers } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showChristmasForm, setShowChristmasForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const customer = customers.find(c => c.id === order.customerId);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : '';
      
      const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.items.some(item => 
                             item.product.toLowerCase().includes(searchTerm.toLowerCase())
                           );
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, customers, searchTerm, statusFilter]);

  const handleAddOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => {
    addOrder(orderData);
    setShowOrderForm(false);
    setShowChristmasForm(false);
  };

  const handleUpdateOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => {
    if (editingOrder) {
      updateOrder(editingOrder.id, orderData);
      setEditingOrder(null);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId);
    setSelectedOrder(null);
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
      confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Confirmed' },
      ready: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Ready' },
      collected: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Collected' },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelled' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isChristmasOrder = (order: Order) => {
    const christmasProducts = [
      'whole turkey', 'turkey breast', 'duck', 'goose',
      'beef wellington', 'roasting joint', 'beef tenderloin',
      'leg of lamb', 'rack of lamb', 'lamb shoulder',
      'glazed ham', 'pork belly', 'leg of pork',
      'chipolatas', 'bacon', 'stuffing'
    ];
    
    return order.items.some(item => 
      christmasProducts.some(product => 
        item.product.toLowerCase().includes(product)
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage customer orders and track their status</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChristmasForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Gift className="w-4 h-4" />
            Christmas Order
          </button>
          <button
            onClick={() => setShowOrderForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search orders by customer or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="ready">Ready</option>
            <option value="collected">Collected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first order'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowOrderForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Order
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collection
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer';
                  
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            #{order.orderNumber}
                          </span>
                          {isChristmasOrder(order) && (
                            <Gift className="w-4 h-4 text-red-500" title="Christmas Order" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.items.slice(0, 2).map((item, index) => (
                            <div key={index}>
                              {item.quantity} × {item.product}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-gray-500">
                              +{order.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(order.collectionDate)}</span>
                          <Clock className="w-4 h-4 text-gray-400 ml-2" />
                          <span>{formatTime(order.collectionTime)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        £{order.total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showOrderForm && (
        <OrderForm
          onSubmit={handleAddOrder}
          onCancel={() => setShowOrderForm(false)}
        />
      )}

      {showChristmasForm && (
        <ChristmasOrderForm
          onSubmit={handleAddOrder}
          onCancel={() => setShowChristmasForm(false)}
        />
      )}

      {editingOrder && (
        <OrderForm
          order={editingOrder}
          onSubmit={handleUpdateOrder}
          onCancel={() => setEditingOrder(null)}
        />
      )}

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={(order) => {
            setSelectedOrder(null);
            setEditingOrder(order);
          }}
          onDelete={handleDeleteOrder}
        />
      )}
    </div>
  );
};

export default Orders;