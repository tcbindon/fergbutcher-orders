import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, UserPlus, RefreshCw } from 'lucide-react';
import { Order, OrderItem, Customer } from '../types';

interface OrderFormProps {
  order?: Order;
  customers: Customer[];
  onAddCustomer?: (customerData: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  onSubmit: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: any; // For pre-populating when duplicating
}

const OrderForm: React.FC<OrderFormProps> = ({
  order,
  customers,
  onAddCustomer,
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
    status: 'pending' as Order['status'],
    orderType: 'standard' as Order['orderType'],
    isRecurring: false,
    recurrencePattern: null as 'weekly' | 'fortnightly' | null,
    recurrenceEndDate: null as string | null
  });

  const [items, setItems] = useState<Omit<OrderItem, 'id'>[]>([
    { description: '', quantity: 0, unit: '' }
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

  const unitOptions = [
    'Kilos', 'Grams', 'Packets', 'Pieces', 'ml', 'Litre'
  ];

  useEffect(() => {
    if (order || initialData) {
      const sourceData = order || initialData;
      setFormData({
        customerId: sourceData.customerId,
        collectionDate: sourceData.collectionDate,
        collectionTime: sourceData.collectionTime || '',
        additionalNotes: sourceData.additionalNotes || '',
        status: sourceData.status || 'pending',
        orderType: sourceData.orderType || 'standard',
        isRecurring: sourceData.isRecurring || false,
        recurrencePattern: sourceData.recurrencePattern || null,
        recurrenceEndDate: sourceData.recurrenceEndDate || null
      });
      setItems(sourceData.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit
      })));
    }
  }, [order, initialData]);

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

    // Validate recurrence settings
    if (formData.isRecurring) {
      if (!formData.recurrencePattern) {
        newErrors.recurrencePattern = 'Please select a recurrence pattern';
      }
      if (!formData.recurrenceEndDate) {
        newErrors.recurrenceEndDate = 'Please select an end date for the recurring order';
      } else {
        const endDate = new Date(formData.recurrenceEndDate);
        const collectionDate = new Date(formData.collectionDate);
        if (endDate <= collectionDate) {
          newErrors.recurrenceEndDate = 'End date must be after the first collection date';
        }
      }
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
        status: formData.status,
        orderType: formData.orderType,
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring ? formData.recurrencePattern : null,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : null,
        parentOrderId: null
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

  const handleAddNewCustomer = async () => {
    if (!onAddCustomer) return;
    
    // Validate new customer data
    if (!newCustomerData.firstName.trim() || !newCustomerData.lastName.trim() || !newCustomerData.email.trim()) {
      alert('Please fill in first name, last name, and email for the new customer.');
      return;
    }

    // Check email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerData.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Check if customer already exists
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
        // Select the new customer and close the form
        setFormData(prev => ({ ...prev, customerId: newCustomer.id }));
        setShowNewCustomerForm(false);
        setNewCustomerData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: ''
        });
        // Clear customer selection error if it exists
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

      {/* Recurring Order Settings */}
      <div className="border border-fergbutcher-green-200 rounded-lg p-4 bg-fergbutcher-green-50">
        <div className="flex items-center space-x-3 mb-4">
          <RefreshCw className="h-5 w-5 text-fergbutcher-green-600" />
          <h4 className="font-medium text-fergbutcher-black-900">Recurring Order Settings</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => {
                handleChange('isRecurring', e.target.checked.toString());
                if (!e.target.checked) {
                  handleChange('recurrencePattern', '');
                  handleChange('recurrenceEndDate', '');
                }
              }}
              className="rounded border-fergbutcher-brown-300 text-fergbutcher-green-600 focus:ring-fergbutcher-green-500"
              disabled={isLoading}
            />
            <label htmlFor="isRecurring" className="text-sm font-medium text-fergbutcher-brown-700">
              Make this a recurring order
            </label>
          </div>

          {formData.isRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <div>
                <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
                  Recurrence Pattern *
                </label>
                <select
                  value={formData.recurrencePattern || ''}
                  onChange={(e) => handleChange('recurrencePattern', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
                    errors.recurrencePattern ? 'border-red-500' : 'border-fergbutcher-brown-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">Select pattern</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                </select>
                {errors.recurrencePattern && (
                  <p className="text-red-500 text-xs mt-1">{errors.recurrencePattern}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
                  Recurrence End Date *
                </label>
                <input
                  type="date"
                  value={formData.recurrenceEndDate || ''}
                  onChange={(e) => handleChange('recurrenceEndDate', e.target.value)}
                  min={formData.collectionDate || getMinDate()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
                    errors.recurrenceEndDate ? 'border-red-500' : 'border-fergbutcher-brown-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.recurrenceEndDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.recurrenceEndDate}</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {formData.isRecurring && (
          <div className="mt-3 p-3 bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg">
            <p className="text-xs text-fergbutcher-yellow-700">
              <strong>Note:</strong> This will create multiple individual orders based on your selected pattern and end date. Each order can be managed separately.
            </p>
          </div>
        )}
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