import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Gift, Package, Clock, User, Phone, Mail, MapPin } from 'lucide-react';
import { Order, Customer } from '../types';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import OrderForm from './OrderForm';
import ChristmasOrderForm from './ChristmasOrderForm';
import OrderDetail from './OrderDetail';

const Orders: React.FC = () => {
  const { orders, addOrder, updateOrder, deleteOrder, isLoading } = useOrders();
  const { customers, addCustomer } = useCustomers();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showChristmasOrderModal, setShowChristmasOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = orders.filter(order => {
    const customer = customers.find(c => c.id === order.customerId);
    const customerName = customer ? `${customer.firstName} ${customer.lastName}`.toLowerCase() : '';
    const matchesSearch = customerName.includes(searchTerm.toLowerCase()) ||
                         order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddOrder = async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addOrder(orderData);
      setShowOrderModal(false);
      setShowChristmasOrderModal(false);
    } catch (error) {
      console.error('Failed to add order:', error);
    }
  };

  const handleUpdateOrder = async (orderId: string, orderData: Partial<Order>) => {
    try {
      await updateOrder(orderId, orderData);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder(orderId);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      collected: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const isChristmasOrder = (order: Order) => {
    return order.items.some(item => 
      item.name.toLowerCase().includes('christmas') ||
      item.name.toLowerCase().includes('turkey') ||
      item.name.toLowerCase().includes('ham') ||
      item.name.toLowerCase().includes('goose')
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage customer orders and collection schedules</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOrderModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </button>
          <button
            onClick={() => setShowChristmasOrderModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Gift className="w-4 h-4" />
            Christmas Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search orders by customer or items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="ready">Ready</option>
          <option value="collected">Collected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first order.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowOrderModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Order
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
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            #{order.orderNumber}
                          </span>
                          {isChristmasOrder(order) && (
                            <Gift className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-red-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                            </div>
                            {customer?.phone && (
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{item.name}</span>
                              <span className="text-gray-500">×{item.quantity}</span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-xs text-gray-500 mt-1">
                              +{order.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(order.collectionDate)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTime(order.collectionDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        £{total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Form Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Create New Order</h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <OrderForm
              customers={customers}
              onAddCustomer={addCustomer}
              onSubmit={handleAddOrder}
              onCancel={() => setShowOrderModal(false)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Christmas Order Form Modal */}
      {showChristmasOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Create Christmas Order</h2>
                </div>
                <button
                  onClick={() => setShowChristmasOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <ChristmasOrderForm
              customers={customers}
              onAddCustomer={addCustomer}
              onSubmit={handleAddOrder}
              onCancel={() => setShowChristmasOrderModal(false)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          customer={customers.find(c => c.id === selectedOrder.customerId)}
          onUpdate={handleUpdateOrder}
          onDelete={handleDeleteOrder}
          onClose={() => setSelectedOrder(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default Orders;