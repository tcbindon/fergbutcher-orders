import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, UserPlus, Gift, RefreshCw } from 'lucide-react';
import { Order, OrderItem, Customer, ChristmasProduct } from '../types';
import { useChristmasProducts } from '../hooks/useChristmasProducts';

interface ChristmasOrderFormProps {
  order?: Order;
  customers: Customer[];
  onAddCustomer?: (customerData: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  onSubmit: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: any;
}

interface ChristmasOrderItem extends Omit<OrderItem, 'id'> {
  productId?: string;
  isCustom: boolean;
}

const ChristmasOrderForm: React.FC<ChristmasOrderFormProps> = ({
  order,
  customers,
  onAddCustomer,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData
}) => {
  const { 
    products, 
    loading: productsLoading, 
    error: productsError, 
    refreshProducts,
    isUsingFallback 
  } = useChristmasProducts();

  const [formData, setFormData] = useState({
    customerId: '',
    collectionDate: '',
    collectionTime: '',
    additionalNotes: '',
    status: 'pending' as Order['status']
  });

  const [items, setItems] = useState<ChristmasOrderItem[]>([
    { description: '', quantity: 0, unit: '', isCustom: false }
  ]);

  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: ''
  });
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      
      // Convert existing items to Christmas order items
      const christmasItems = sourceData.items.map((item: any) => {
        const christmasProduct = products.find(p => p.name === item.description);
        return {
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          productId: christmasProduct?.id,
          isCustom: !christmasProduct
        };
      });
      
      setItems(christmasItems.length > 0 ? christmasItems : [{ description: '', quantity: 0, unit: '', isCustom: false }]);
    }
  }, [order, initialData, products]);

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

  const handleItemChange = (index: number, field: keyof ChristmasOrderItem, value: string | number | boolean) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // If selecting a Christmas product, auto-fill details
        if (field === 'productId' && typeof value === 'string' && value) {
          const product = products.find(p => p.id === value);
          if (product) {
            updatedItem.description = product.name;
            updatedItem.unit = product.unit;
            updatedItem.isCustom = false;
          }
        }
        
        // If switching to custom, clear product ID
        if (field === 'isCustom' && value === true) {
          updatedItem.productId = undefined;
        }
        
        return updatedItem;
      }
      return item;
    }));
    
    // Clear related errors
    if (errors[`item_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`item_${index}_${field}`]: '' }));
    }
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: '' }));
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 0, unit: '', isCustom: false }]);
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

  const handleAddNewCustomer = async () => {
    if (!onAddCustomer) return;
    
    if (!newCustomerData.firstName.trim() || !newCustomerData.lastName.trim() || !newCustomerData.email.trim()) {
      alert('Please fill in first name, last name, and email for the new customer.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerData.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    const existingCustomer = customers.find(c => 
      c.email.toLowerCase() === newCustomerData.email.toLowerCase()
    );
    if (existingCustomer) {
      alert('A customer with this email already exists.');
      return;
    }

    setIsAddingCustomer(true);
    try {
      const newCustomer = await onAddCustomer({
        firstName: newCustomerData.firstName.trim(),
        lastName: newCustomerData.lastName.trim(),
        email: newCustomerData.email.trim().toLowerCase(),
        phone: newCustomerData.phone.trim() || undefined,
        company: newCustomerData.company.trim() || undefined
      });

      if (newCustomer) {
        setFormData(prev => ({ ...prev, customerId: newCustomer.id }));
        setShowNewCustomerForm(false);
        setNewCustomerData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: ''
        });
        if (errors.customerId) {
          setErrors(prev => ({ ...prev, customerId: '' }));
        }
      }
    } finally {
      setIsAddingCustomer(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Christmas Header */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Gift className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">Christmas Order</h3>
            <p className="text-sm text-red-700">
              {isUsingFallback ? 
                'Using offline Christmas products (Google Sheets not connected)' : 
                `${products.length} Christmas products available`
              }
            </p>
          </div>
          {!isUsingFallback && (
            <button
              type="button"
              onClick={refreshProducts}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
              title="Refresh Christmas Products"
              disabled={productsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${productsLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Products Error */}
      {productsError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">{productsError}</p>
          </div>
        </div>
      )}

      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
          Customer *
        </label>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <select
              value={formData.customerId}
              onChange={(e) => handleChange('customerId', e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
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
            {onAddCustomer && (
              <button
                type="button"
                onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                className="px-3 py-2 bg-fergbutcher-green-100 text-fergbutcher-green-700 rounded-lg hover:bg-fergbutcher-green-200 transition-colors flex items-center space-x-1"
                disabled={isLoading}
                title="Add New Customer"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            )}
          </div>
          
          {/* New Customer Form */}
          {showNewCustomerForm && (
            <div className="border border-fergbutcher-green-200 rounded-lg p-4 bg-fergbutcher-green-50">
              <h4 className="font-medium text-fergbutcher-black-900 mb-3">Add New Customer</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-fergbutcher-brown-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.firstName}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
                    placeholder="First name"
                    disabled={isLoading || isAddingCustomer}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fergbutcher-brown-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.lastName}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
                    placeholder="Last name"
                    disabled={isLoading || isAddingCustomer}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-fergbutcher-brown-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
                    placeholder="Email address"
                    disabled={isLoading || isAddingCustomer}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fergbutcher-brown-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
                    placeholder="Phone number"
                    disabled={isLoading || isAddingCustomer}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fergbutcher-brown-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.company}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
                    placeholder="Company name"
                    disabled={isLoading || isAddingCustomer}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCustomerForm(false);
                    setNewCustomerData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      company: ''
                    });
                  }}
                  className="px-3 py-1 text-xs text-fergbutcher-brown-700 bg-fergbutcher-brown-100 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
                  disabled={isLoading || isAddingCustomer}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNewCustomer}
                  className="px-3 py-1 text-xs bg-fergbutcher-green-600 text-white rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50"
                  disabled={isLoading || isAddingCustomer || !newCustomerData.firstName.trim() || !newCustomerData.lastName.trim() || !newCustomerData.email.trim()}
                >
                  {isAddingCustomer ? 'Adding...' : 'Add Customer'}
                </button>
              </div>
            </div>
          )}
        </div>
        {errors.customerId && (
          <p className="text-red-500 text-xs mt-1">{errors.customerId}</p>
        )}
      </div>

      {/* Christmas Order Items */}
      <div>
        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
          Christmas Items *
        </label>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="space-y-3">
                {/* Product Selection */}
                <div className="flex items-center space-x-2 mb-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={`item-type-${index}`}
                      checked={!item.isCustom}
                      onChange={() => handleItemChange(index, 'isCustom', false)}
                      className="text-red-600 focus:ring-red-500"
                      disabled={isLoading}
                    />
                    <span className="text-sm font-medium text-red-900">Christmas Product</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={`item-type-${index}`}
                      checked={item.isCustom}
                      onChange={() => handleItemChange(index, 'isCustom', true)}
                      className="text-red-600 focus:ring-red-500"
                      disabled={isLoading}
                    />
                    <span className="text-sm font-medium text-red-900">Custom Item</span>
                  </label>
                </div>

                {!item.isCustom ? (
                  /* Christmas Product Selection */
                  <div>
                    <label className="block text-xs font-medium text-fergbutcher-brown-600 mb-1">
                      Select Christmas Product
                    </label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      disabled={isLoading || productsLoading}
                    >
                      <option value="">Select a Christmas product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.unit}) - {product.description}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Custom Item Input */
                  <div>
                    <label className="block text-xs font-medium text-fergbutcher-brown-600 mb-1">
                      Custom Item Description
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="e.g., Special Christmas cake"
                      className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Quantity and Unit */}
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
                      placeholder="e.g., 1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${
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
                    {item.isCustom ? (
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${
                          errors[`item_${index}_unit`] ? 'border-red-500' : 'border-fergbutcher-brown-300'
                        }`}
                        disabled={isLoading}
                      >
                        <option value="">Select unit</option>
                        <option value="kg">kg</option>
                        <option value="each">each</option>
                        <option value="portion">portion</option>
                        <option value="service">service</option>
                        <option value="dozen">dozen</option>
                        <option value="jar">jar</option>
                        <option value="litre">litre</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={item.unit}
                        readOnly
                        className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg bg-gray-50 text-sm"
                        placeholder="Auto-filled"
                      />
                    )}
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
                  className="mt-3 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded flex items-center space-x-1"
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
            className="w-full border-2 border-dashed border-red-300 text-red-600 px-4 py-3 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4" />
            <span>Add Another Christmas Item</span>
          </button>
        </div>
        
        {errors.items && (
          <p className="text-red-500 text-xs mt-1">{errors.items}</p>
        )}
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
          placeholder="Any special Christmas preparation instructions or customer preferences..."
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
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          disabled={isLoading}
        >
          <Gift className="h-4 w-4" />
          <span>{isLoading ? 'Saving...' : order ? 'Update Christmas Order' : 'Create Christmas Order'}</span>
        </button>
      </div>
    </form>
  );
};

export default ChristmasOrderForm;