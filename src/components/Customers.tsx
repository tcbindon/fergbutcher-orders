import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Eye, 
  Mail, 
  Phone, 
  Building,
  User,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import CustomerForm from './CustomerForm';
import CustomerDetail from './CustomerDetail';
import { Customer, Order } from '../types';

const Customers: React.FC = () => {
  const { 
    customers, 
    loading, 
    error, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    searchCustomers 
  } = useCustomers();
  
  const { orders, getOrdersByCustomerId, addOrder } = useOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [viewingOrderHistory, setViewingOrderHistory] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = searchCustomers(searchTerm);

  const getCustomerOrderCount = (customerId: string) => {
    return getOrdersByCustomerId(customerId).length;
  };

  const getCustomerOrders = (customerId: string) => {
    return getOrdersByCustomerId(customerId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

  const handleAddCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    setIsSubmitting(true);
    try {
      const newCustomer = addCustomer(customerData);
      if (newCustomer) {
        setShowAddModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!editingCustomer) return;
    
    setIsSubmitting(true);
    try {
      const success = updateCustomer(editingCustomer.id, customerData);
      if (success) {
        setEditingCustomer(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = () => {
    if (!deletingCustomer) return;
    
    const success = deleteCustomer(deletingCustomer.id);
    if (success) {
      setDeletingCustomer(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fergbutcher-brown-600">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-fergbutcher-black-900">Customers</h1>
          <p className="text-fergbutcher-brown-600">Manage your customer database</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List - Full Width */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fergbutcher-brown-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search customers by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Customer List */}
          <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h2 className="text-lg font-semibold text-fergbutcher-black-900">
                All Customers ({filteredCustomers.length.toLocaleString('en-NZ')})
              </h2>
            </div>
            <div className="divide-y divide-fergbutcher-brown-200 max-h-96 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="p-6 hover:bg-fergbutcher-green-50 transition-colors cursor-pointer"
                    onClick={() => setViewingCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-fergbutcher-green-100 p-3 rounded-full">
                          <User className="h-6 w-6 text-fergbutcher-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-fergbutcher-black-900">
                            {customer.firstName} {customer.lastName}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1 text-fergbutcher-brown-600">
                              <Mail className="h-4 w-4" />
                              <span className="text-sm">{customer.email}</span>
                            </div>
                            {customer.phone && (
                              <div className="flex items-center space-x-1 text-fergbutcher-brown-600">
                                <Phone className="h-4 w-4" />
                                <span className="text-sm">{customer.phone}</span>
                              </div>
                            )}
                            {customer.company && (
                              <div className="flex items-center space-x-1 text-fergbutcher-brown-600">
                                <Building className="h-4 w-4" />
                                <span className="text-sm">{customer.company}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCustomer(customer);
                          }}
                          className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
                          title="Edit Customer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCustomer(customer);
                          }}
                          className="p-2 text-fergbutcher-brown-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <User className="h-12 w-12 text-fergbutcher-brown-300 mx-auto mb-4" />
                  <p className="text-fergbutcher-brown-500">
                    {searchTerm ? 'No customers found matching your search.' : 'No customers yet.'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 text-fergbutcher-green-600 hover:text-fergbutcher-green-700 font-medium"
                    >
                      Add your first customer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Customer Details Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Customer Details</h3>
              <button
                onClick={() => setViewingCustomer(null)}
                className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <CustomerDetail
                customer={viewingCustomer}
                onEdit={() => {
                  setEditingCustomer(viewingCustomer);
                  setViewingCustomer(null);
                }}
                onDelete={() => {
                  setDeletingCustomer(viewingCustomer);
                  setViewingCustomer(null);
                }}
                orderCount={getCustomerOrderCount(viewingCustomer.id)}
                onViewOrderHistory={() => {
                  setViewingOrderHistory(viewingCustomer);
                  setViewingCustomer(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Order History Modal */}
      {viewingOrderHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900">
                  Order History - {viewingOrderHistory.firstName} {viewingOrderHistory.lastName}
                </h3>
                <p className="text-fergbutcher-brown-600">
                  {getCustomerOrders(viewingOrderHistory.id).length} total orders
                </p>
              </div>
              <button
                onClick={() => setViewingOrderHistory(null)}
                className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {getCustomerOrders(viewingOrderHistory.id).length > 0 ? (
                <div className="space-y-4">
                  {getCustomerOrders(viewingOrderHistory.id).map((order) => (
                    <div key={order.id} className="bg-white border border-fergbutcher-brown-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-fergbutcher-black-900">
                            Order #{order.id}
                          </h4>
                          <p className="text-sm text-fergbutcher-brown-600">
                            Created {new Date(order.createdAt).toLocaleDateString('en-NZ')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-fergbutcher-black-900">
                              Collection: {new Date(order.collectionDate).toLocaleDateString('en-NZ')}
                            </p>
                            {order.collectionTime && (
                              <p className="text-sm text-fergbutcher-brown-600">
                                Time: {order.collectionTime}
                              </p>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="font-medium text-fergbutcher-black-900 mb-2">Items:</h5>
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
                  <ShoppingCart className="h-16 w-16 text-fergbutcher-brown-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-fergbutcher-black-900 mb-2">No Orders Yet</h3>
                  <p className="text-fergbutcher-brown-600">
                    This customer hasn't placed any orders yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Add New Customer</h3>
            </div>
            <div className="p-6">
              <CustomerForm
                onSubmit={handleAddCustomer}
                onCancel={() => setShowAddModal(false)}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Edit Customer</h3>
            </div>
            <div className="p-6">
              <CustomerForm
                customer={editingCustomer}
                onSubmit={handleUpdateCustomer}
                onCancel={() => setEditingCustomer(null)}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Delete Customer</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-fergbutcher-black-900 font-medium">
                    Are you sure you want to delete {deletingCustomer.firstName} {deletingCustomer.lastName}?
                  </p>
                  <p className="text-fergbutcher-brown-600 text-sm mt-1">
                    This action cannot be undone. All associated data will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingCustomer(null)}
                  className="px-4 py-2 text-fergbutcher-brown-700 bg-fergbutcher-brown-100 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCustomer}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;