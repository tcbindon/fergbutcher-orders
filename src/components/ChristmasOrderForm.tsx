import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Gift, Calendar, User, Phone, Mail, MapPin } from 'lucide-react';
import { Order, Customer, ChristmasProduct } from '../types';
import { useChristmasProducts } from '../hooks/useChristmasProducts';

interface ChristmasOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Omit<Order, 'id' | 'orderNumber'>) => void;
  customers: Customer[];
  editingOrder?: Order | null;
}

export default function ChristmasOrderForm({
  isOpen,
  onClose,
  onSubmit,
  customers,
  editingOrder
}: ChristmasOrderFormProps) {
  const { christmasProducts } = useChristmasProducts();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [collectionDate, setCollectionDate] = useState('');
  const [collectionTime, setCollectionTime] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: number }>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'ready' | 'collected'>('pending');

  useEffect(() => {
    if (editingOrder) {
      const customer = customers.find(c => c.id === editingOrder.customerId);
      setSelectedCustomer(customer || null);
      setCollectionDate(editingOrder.collectionDate);
      setCollectionTime(editingOrder.collectionTime || '');
      setSpecialInstructions(editingOrder.specialInstructions || '');
      setStatus(editingOrder.status);
      
      // Parse existing items into selectedProducts format
      const products: { [key: string]: number } = {};
      editingOrder.items.forEach(item => {
        const product = christmasProducts.find(p => p.name === item.name);
        if (product) {
          products[product.id] = item.quantity;
        }
      });
      setSelectedProducts(products);
    } else {
      // Reset form for new order
      setSelectedCustomer(null);
      setCollectionDate('');
      setCollectionTime('');
      setSelectedProducts({});
      setSpecialInstructions('');
      setStatus('pending');
    }
  }, [editingOrder, customers, christmasProducts]);

  const handleProductQuantityChange = (productId: string, change: number) => {
    setSelectedProducts(prev => {
      const currentQuantity = prev[productId] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);
      
      if (newQuantity === 0) {
        const { [productId]: removed, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [productId]: newQuantity };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || !collectionDate) {
      alert('Please select a customer and collection date');
      return;
    }

    const items = Object.entries(selectedProducts).map(([productId, quantity]) => {
      const product = christmasProducts.find(p => p.id === productId);
      return {
        name: product?.name || '',
        quantity,
        price: product?.price || 0,
        unit: product?.unit || 'each'
      };
    });

    if (items.length === 0) {
      alert('Please select at least one product');
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData: Omit<Order, 'id' | 'orderNumber'> = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerEmail: selectedCustomer.email,
      customerPhone: selectedCustomer.phone,
      collectionDate,
      collectionTime,
      items,
      totalAmount,
      status,
      specialInstructions,
      isChristmasOrder: true,
      createdAt: editingOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(orderData);
    onClose();
  };

  const getTotalAmount = () => {
    return Object.entries(selectedProducts).reduce((sum, [productId, quantity]) => {
      const product = christmasProducts.find(p => p.id === productId);
      return sum + ((product?.price || 0) * quantity);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Gift className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {editingOrder ? 'Edit Christmas Order' : 'New Christmas Order'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Customer
              </label>
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customer = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(customer || null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="ready">Ready</option>
                <option value="collected">Collected</option>
              </select>
            </div>
          </div>

          {/* Customer Details Display */}
          {selectedCustomer && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  {selectedCustomer.phone}
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {selectedCustomer.email}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {selectedCustomer.address}
                </div>
              </div>
            </div>
          )}

          {/* Collection Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Collection Date
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collection Time (Optional)
              </label>
              <input
                type="time"
                value={collectionTime}
                onChange={(e) => setCollectionTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Christmas Products */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Gift className="w-5 h-5 mr-2 text-red-600" />
              Christmas Products
            </h3>
            <div className="space-y-3">
              {christmasProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600">{product.description}</p>
                    <p className="text-sm font-medium text-green-600">
                      £{product.price.toFixed(2)} per {product.unit}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleProductQuantityChange(product.id, -1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                      disabled={!selectedProducts[product.id]}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">
                      {selectedProducts[product.id] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleProductQuantityChange(product.id, 1)}
                      className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Any special requirements or notes..."
            />
          </div>

          {/* Order Summary */}
          {Object.keys(selectedProducts).length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
              <div className="space-y-2">
                {Object.entries(selectedProducts).map(([productId, quantity]) => {
                  const product = christmasProducts.find(p => p.id === productId);
                  if (!product) return null;
                  return (
                    <div key={productId} className="flex justify-between text-sm">
                      <span>{product.name} × {quantity}</span>
                      <span>£{(product.price * quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-red-200 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total Amount</span>
                    <span>£{getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center"
            >
              <Gift className="w-4 h-4 mr-2" />
              {editingOrder ? 'Update Order' : 'Create Christmas Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}