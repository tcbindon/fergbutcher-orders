import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Order, OrderItem, Customer } from '../types';

interface OrderFormProps {
  order?: Order;
  customers: Customer[];
  onSubmit: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: any; // For pre-populating when duplicating
}

const OrderForm: React.FC<OrderFormProps> = ({
  order,
  customers,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData
}) => {
  const [formData, setFormData] = useState({
    customerId: '',
    collectionDate: '',
    collectionTime: '',
    additionalNotes: '',
    status: 'pending' as Order['status']
  });

  const [items, setItems] = useState<Omit<OrderItem, 'id'>[]>([
    { description: '', quantity: 0, unit: '' }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const unitOptions = [
    'kg', 'g', 'pieces', 'steaks', 'chops', 'portions', 
    'whole', 'half', 'quarter', 'fillets', 'rashers'
  ];

  useEffect(() => {
    if (order || initialData) {
      const sourceData = order || initialData;
      setFormData({
        customerId: sourceData.customerId,
        collectionDate: sourceData.collectionDate,
        collectionTime: sourceData.collectionTime || '',
        additionalNotes: sourceData.additionalNotes || '',
        status: sourceData.status || 'pending'
      });
      setItems(sourceData.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit
      })));
    }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) {
      newErrors.customerId = 'Please select a customer';
    }

    if (!formData.collectionDate) {
      newErrors.collectionDate = 'Collection date is required';
    } else {
      const selectedDate = new Date(formData.collectionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.collectionDate = 'Collection date cannot be in the past';
      }
    }

    // Validate items
    const validItems = items.filter(item => 
      item.description.trim() && item.quantity > 0 && item.unit
    );

    if (validItems.length === 0) {
      newErrors.items = 'At least one valid item is required';
    }

    items.forEach((item, index) => {
      if (item.description.trim() && (!item.quantity || item.quantity <= 0)) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.description.trim() && !item.unit) {
        newErrors[`item_${index}_unit`] = 'Unit is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const validItems = items
        .filter(item => item.description.trim() && item.quantity > 0 && item.unit)
        .map((item, index) => ({
          id: `${Date.now()}_${index}`,
          description: item.description.trim(),
          quantity: item.quantity,
          unit: item.unit
        }));

      onSubmit({
        customerId: formData.customerId,
        items: validItems,
        collectionDate: formData.collectionDate,
        collectionTime: formData.collectionTime || undefined,
        additionalNotes: formData.additionalNotes || undefined,
        status: formData.status
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleItemChange = (index: number, field: keyof Omit<OrderItem, 'id'>, value: string | number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
    
    // Clear related errors
    if (errors[`item_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`item_${index}_${field}`]: '' }));
    }
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: '' }));
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 0, unit: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
          Customer *
        </label>
        <select
          value={formData.customerId}
          onChange={(e) => handleChange('customerId', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
            errors.customerId ? 'border-red-500' : 'border-fergbutcher-brown-300'
          }`}
          disabled={isLoading}
        >
          <option value="">Select a customer</option>
          {customers.map(customer => (
            <option key={customer.id} value={customer.id}>
              {customer.firstName} {customer.lastName} ({customer.email})
            </option>
          ))}
        </select>
        {errors.customerId && (
          <p className="text-red-500 text-xs mt-1">{errors.customerId}</p>
        )}
      </div>

      {/* Order Items */}
      <div>
        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
          Order Items *
        </label>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border border-fergbutcher-brown-200 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-fergbutcher-brown-600 mb-1">
                    Item Description
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="e.g., Ribeye Steak - 2cm thick, well-marbled"
                    className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
                    disabled={isLoading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-fergbutcher-brown-600 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 2.5"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm ${
                        errors[`item_${index}_quantity`] ? 'border-red-500' : 'border-fergbutcher-brown-300'
                      }`}
                      disabled={isLoading}
                    />
                    {errors[`item_${index}_quantity`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_quantity`]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fergbutcher-brown-600 mb-1">
                      Unit
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm ${
                        errors[`item_${index}_unit`] ? 'border-red-500' : 'border-fergbutcher-brown-300'
                      }`}
                      disabled={isLoading}
                    >
                      <option value="">Select unit</option>
                      {unitOptions.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    {errors[`item_${index}_unit`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_unit`]}</p>
                    )}
                  </div>
                </div>
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded flex items-center space-x-1"
                  disabled={isLoading}
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove Item</span>
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addItem}
            className="w-full border-2 border-dashed border-fergbutcher-green-300 text-fergbutcher-green-600 px-4 py-3 rounded-lg hover:border-fergbutcher-green-400 hover:bg-fergbutcher-green-50 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4" />
            <span>Add Another Item</span>
          </button>
        </div>
        
        {errors.items && (
          <p className="text-red-500 text-xs mt-1">{errors.items}</p>
        )}
        
        <div className="mt-3 p-3 bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg">
          <p className="text-xs text-fergbutcher-yellow-700">
            <strong>Tip:</strong> Be as specific as possible with descriptions (e.g., "Ribeye Steak - 2cm thick, well-marbled" rather than just "Steak")
          </p>
        </div>
      </div>

      {/* Collection Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
            Collection Date *
          </label>
          <input
            type="date"
            value={formData.collectionDate}
            onChange={(e) => handleChange('collectionDate', e.target.value)}
            min={getMinDate()}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
              errors.collectionDate ? 'border-red-500' : 'border-fergbutcher-brown-300'
            }`}
            disabled={isLoading}
          />
          {errors.collectionDate && (
            <p className="text-red-500 text-xs mt-1">{errors.collectionDate}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
            Collection Time
          </label>
          <input
            type="time"
            value={formData.collectionTime}
            onChange={(e) => handleChange('collectionTime', e.target.value)}
            className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Status (for editing existing orders) */}
      {order && (
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="collected">Collected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
          Additional Notes
        </label>
        <textarea
          rows={3}
          value={formData.additionalNotes}
          onChange={(e) => handleChange('additionalNotes', e.target.value)}
          className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
          placeholder="Any special instructions, preparation notes, or customer preferences..."
          disabled={isLoading}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-fergbutcher-brown-700 bg-fergbutcher-brown-100 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-fergbutcher-green-600 text-white rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : order ? 'Update Order' : 'Create Order'}
        </button>
      </div>
    </form>
  );
};

export default OrderForm;