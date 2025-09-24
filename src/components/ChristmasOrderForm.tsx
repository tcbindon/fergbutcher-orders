import React, { useState } from 'react';
import { Gift, Plus, X } from 'lucide-react';
import { Customer, Order } from '../types';

interface ChristmasOrderFormProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onSubmit: (order: Omit<Order, 'id'>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const christmasProducts = [
  { id: 'turkey', name: 'Turkey', price: 25.00, unit: 'kg' },
  { id: 'ham', name: 'Christmas Ham', price: 18.50, unit: 'kg' },
  { id: 'beef-roast', name: 'Beef Roast', price: 32.00, unit: 'kg' },
  { id: 'lamb-leg', name: 'Leg of Lamb', price: 28.00, unit: 'kg' },
  { id: 'pork-belly', name: 'Pork Belly', price: 15.00, unit: 'kg' },
  { id: 'chicken', name: 'Free Range Chicken', price: 12.00, unit: 'each' },
  { id: 'sausages', name: 'Christmas Sausages', price: 16.00, unit: 'kg' },
  { id: 'bacon', name: 'Bacon', price: 20.00, unit: 'kg' },
  { id: 'pudding', name: 'Christmas Pudding', price: 35.00, unit: 'each' },
  { id: 'mince-pies', name: 'Mince Pies (dozen)', price: 8.00, unit: 'each' }
];

export default function ChristmasOrderForm({ 
  customers, 
  onAddCustomer, 
  onSubmit, 
  onCancel, 
  isLoading 
}: ChristmasOrderFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [collectionDate, setCollectionDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let customerId = selectedCustomer;
    
    if (showNewCustomerForm) {
      if (!newCustomer.firstName || !newCustomer.lastName) {
        alert('Please fill in customer name');
        return;
      }
      
      const customer = {
        ...newCustomer,
        createdAt: new Date().toISOString()
      };
      
      onAddCustomer(customer);
      customerId = `temp-${Date.now()}`;
    }
    
    if (!customerId) {
      alert('Please select or add a customer');
      return;
    }
    
    const orderItems = Object.entries(quantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([productId, quantity]) => {
        const product = christmasProducts.find(p => p.id === productId)!;
        return {
          productId,
          productName: product.name,
          quantity,
          unit: product.unit,
          pricePerUnit: product.price,
          total: quantity * product.price
        };
      });
    
    if (orderItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    
    const total = orderItems.reduce((sum, item) => sum + item.total, 0);
    
    const order: Omit<Order, 'id'> = {
      customerId,
      customerName: showNewCustomerForm 
        ? `${newCustomer.firstName} ${newCustomer.lastName}`
        : customers.find(c => c.id === customerId)?.firstName + ' ' + customers.find(c => c.id === customerId)?.lastName || '',
      items: orderItems,
      total,
      status: 'pending',
      collectionDate: collectionDate || undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    onSubmit(order);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Gift className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Christmas Order</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer
            </label>
            <div className="space-y-3">
              <select
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(e.target.value);
                  setShowNewCustomerForm(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={showNewCustomerForm}
              >
                <option value="">Select existing customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.firstName} {customer.lastName} - {customer.phone}
                  </option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={() => {
                  setShowNewCustomerForm(!showNewCustomerForm);
                  setSelectedCustomer('');
                }}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
              >
                <Plus className="w-4 h-4" />
                <span>{showNewCustomerForm ? 'Cancel' : 'Add New Customer'}</span>
              </button>
            </div>
          </div>

          {/* New Customer Form */}
          {showNewCustomerForm && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-medium text-gray-900">New Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Christmas Products */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Christmas Products</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {christmasProducts.map((product) => (
                <div key={product.id} className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-600">
                        ${product.price.toFixed(2)} per {product.unit}
                      </p>
                    </div>
                    <Gift className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">
                      Quantity ({product.unit}):
                    </label>
                    <div className="flex-1">
                      <input
                        type="number"
                        step={product.unit === 'each' ? '1' : '0.1'}
                        min="0"
                        onInput={(e) => {
                          // Prevent decimals for 'each' units
                          if (product.unit === 'each') {
                            const target = e.target as HTMLInputElement;
                            target.value = target.value.replace(/[.,].*$/, '');
                          }
                        }}
                        value={quantities[product.id] || ''}
                        onChange={(e) => {
                          let value = parseFloat(e.target.value) || 0;
                          // Round to integer for 'each' units
                          if (product.unit === 'each') {
                            value = Math.floor(value);
                          }
                          setQuantities(prev => ({
                            ...prev,
                            [product.id]: value
                          }));
                        }}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-center"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {quantities[product.id] > 0 && (
                    <div className="mt-2 text-sm font-medium text-red-700">
                      Subtotal: ${(quantities[product.id] * product.price).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Collection Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Date
            </label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Any special requests or notes..."
            />
          </div>

          {/* Order Total */}
          {Object.values(quantities).some(q => q > 0) && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Order Total:</span>
                <span className="text-xl font-bold text-red-600">
                  ${Object.entries(quantities)
                    .filter(([_, quantity]) => quantity > 0)
                    .reduce((total, [productId, quantity]) => {
                      const product = christmasProducts.find(p => p.id === productId)!;
                      return total + (quantity * product.price);
                    }, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  <span>Create Christmas Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}