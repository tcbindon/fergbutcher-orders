import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, UserPlus } from 'lucide-react';
import { Order, OrderItem, Customer } from '../types';

interface OrderFormProps {
  order?: Order;
  customers: Customer[];
  onNewCustomerClick?: () => void;
  initialCustomerId?: string;
  onSubmit: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: any;
  showCloseButton?: boolean;
}

const OrderForm: React.FC<OrderFormProps> = ({
  order,
  customers,
  onNewCustomerClick,
  initialCustomerId,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  showCloseButton = false
}) => {
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSearchResults, setShowCustomerSearchResults] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

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

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!customerSearchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const searchTerm = customerSearchTerm.toLowerCase();
      setFilteredCustomers(customers.filter(customer =>
        customer.firstName.toLowerCase().includes(searchTerm) ||
        customer.lastName.toLowerCase().includes(searchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
        (customer.company && customer.company.toLowerCase().includes(searchTerm)) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm))
      ));
    }
  }, [customerSearchTerm, customers]);

  const handleCustomerSearch = (value: string) => {
    setCustomerSearchTerm(value);
    setShowCustomerSearchResults(true);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({ ...prev, customerId: customer.id }));
    setCustomerSearchTerm(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerSearchResults(false);
    if (errors.customerId) {
      setErrors(prev => ({ ...prev, customerId: '' }));
    }
  };

  useEffect(() => {
    if (!initialCustomerId) return;
    const customer = customers.find(c => c.id === initialCustomerId);
    if (customer) {
      setFormData(prev => ({ ...prev, customerId: customer.id }));
      setCustomerSearchTerm(`${customer.firstName} ${customer.lastName}`);
      setShowCustomerSearchResults(false);
      setErrors(prev => ({ ...prev, customerId: '' }));
    }
  }, [initialCustomerId, customers]);

  const unitOptions = ['Kilos', 'Grams', 'Packets', 'Pieces', 'Each'];

  useEffect(() => {
    if (order || initialData) {
      const sourceData = order || initialData;
      if (sourceData.customerId) {
        const selectedCustomer = customers.find(c => c.id === sourceData.customerId);
        if (selectedCustomer) {
          setCustomerSearchTerm(`${selectedCustomer.firstName} ${selectedCustomer.lastName}`);
        }
      }
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
  }, [order, initialData, customers]);

  const dateRequired = ['confirmed', 'prepared', 'collected'].includes(formData.status);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) {
      newErrors.customerId = 'Please select or add a customer';
    }

    if (dateRequired && !formData.collectionDate) {
      newErrors.collectionDate = 'Collection date is required when confirming an order';
    } else if (formData.collectionDate) {
      // Only block past dates on new orders — when editing, the existing date
      // may legitimately be in the past (e.g. a recurring occurrence from last week)
      const isNewOrder = !order;
      const dateChanged = formData.collectionDate !== (order?.collectionDate ?? '');
      if (isNewOrder || dateChanged) {
        const selectedDate = new Date(formData.collectionDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          newErrors.collectionDate = 'Collection date cannot be in the past';
        }
      }
    }

    const validItems = items.filter(item =>
      item.description.trim() && item.quantity > 0 && item.unit
    );
    if (validItems.length === 0) {
      newErrors.items = 'At least one valid item is required';
    }

    if (formData.isRecurring) {
      if (!formData.collectionDate) {
        newErrors.collectionDate = 'A start date is required for recurring orders';
      }
      // When creating a new recurring order, pattern is required.
      // When editing, pattern is already set on the series — don't block saves.
      if (!order && !formData.recurrencePattern) {
        newErrors.recurrencePattern = 'Please select a recurrence pattern';
      }
      if (!formData.recurrenceEndDate) {
        newErrors.recurrenceEndDate = 'Please select an end date for recurring orders';
      } else if (!order && formData.collectionDate) {
        // When creating: end date must be after the first collection date.
        // When editing a child occurrence, skip — the end date is series-level
        // and may legitimately be before this occurrence's date when shortening.
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
        collectionDate: formData.collectionDate || null,
        collectionTime: formData.collectionTime || undefined,
        additionalNotes: formData.additionalNotes || undefined,
        status: formData.status,
        orderType: formData.orderType,
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring ? formData.recurrencePattern as 'weekly' | 'fortnightly' : null,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : null,
        parentOrderId: order?.parentOrderId ?? null
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

  const getMinDate = () => new Date().toISOString().split('T')[0];

  return (
    <div className="relative space-y-6">
      {showCloseButton && (
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-0 right-0 -mt-2 -mr-2 p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600 hover:bg-fergbutcher-brown-100 rounded-full transition-colors z-10"
          disabled={isLoading}
          title="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* Status — always shown at top of form */}
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
            Order Status *
          </label>
          <div className="flex gap-2">
            {(['pending', 'confirmed'] as Order['status'][]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleChange('status', s)}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.status === s
                    ? s === 'confirmed'
                      ? 'border-fergbutcher-green-500 bg-fergbutcher-green-50 text-fergbutcher-green-700'
                      : 'border-fergbutcher-gold-400 bg-fergbutcher-gold-50 text-fergbutcher-gold-700'
                    : 'border-fergbutcher-brown-200 bg-white text-fergbutcher-brown-500 hover:border-fergbutcher-brown-300'
                }`}
              >
                {s === 'pending' ? 'Pending (request)' : 'Confirmed'}
              </button>
            ))}
          </div>
          {/* Show full status list only when editing */}
          {order && !['pending', 'confirmed'].includes(formData.status) && (
            <div className="mt-2">
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
                disabled={isLoading}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="prepared">Prepared</option>
                <option value="collected">Collected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
          {order && ['pending', 'confirmed'].includes(formData.status) && (
            <div className="mt-2">
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
                disabled={isLoading}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="prepared">Prepared</option>
                <option value="collected">Collected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
          <p className="text-xs text-fergbutcher-brown-500 mt-1">
            {formData.status === 'pending'
              ? 'Pending orders can be saved without a collection date.'
              : 'Confirmed orders require a collection date.'}
          </p>
        </div>

        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
            Customer *
          </label>
          <div className="space-y-3">
            <div className="flex space-x-2 relative">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowCustomerSearchResults(false), 200)}
                  placeholder="Search customers by name, email, or company..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
                    errors.customerId ? 'border-red-500' : 'border-fergbutcher-brown-300'
                  }`}
                  disabled={isLoading}
                />

                {showCustomerSearchResults && (customerSearchTerm.trim() || !formData.customerId) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-fergbutcher-brown-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.slice(0, 10).map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-4 py-3 hover:bg-fergbutcher-green-50 cursor-pointer border-b border-fergbutcher-brown-100 last:border-b-0"
                        >
                          <div className="font-medium text-fergbutcher-black-900">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-fergbutcher-brown-600">
                            {customer.email}
                            {customer.company && ` • ${customer.company}`}
                          </div>
                        </div>
                      ))
                    ) : customerSearchTerm.trim() ? (
                      <div className="px-4 py-3 text-fergbutcher-brown-500 text-sm">
                        No customers found matching "{customerSearchTerm}"
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-fergbutcher-brown-500 text-sm">
                        Start typing to search customers...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {onNewCustomerClick && (
                <button
                  type="button"
                  onClick={onNewCustomerClick}
                  className="px-3 py-2 bg-fergbutcher-green-100 text-fergbutcher-green-700 rounded-lg hover:bg-fergbutcher-green-200 transition-colors flex items-center space-x-1"
                  disabled={isLoading}
                  title="Add New Customer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
              )}
            </div>

            {formData.customerId && (
              <div className="space-y-2">
                <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-3">
                  {(() => {
                    const selectedCustomer = customers.find(c => c.id === formData.customerId);
                    return selectedCustomer ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-fergbutcher-green-800">
                            Selected: {selectedCustomer.firstName} {selectedCustomer.lastName}
                          </div>
                          <div className="text-sm text-fergbutcher-green-700">
                            {selectedCustomer.email}
                            {selectedCustomer.phone && ` • ${selectedCustomer.phone}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, customerId: '' }));
                            setCustomerSearchTerm('');
                          }}
                          className="text-fergbutcher-green-600 hover:text-fergbutcher-green-800 text-sm"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
                {(() => {
                  const selectedCustomer = customers.find(c => c.id === formData.customerId);
                  return selectedCustomer?.notes ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-800 mb-1">Standing Preferences</p>
                      <p className="text-sm text-amber-700">{selectedCustomer.notes}</p>
                    </div>
                  ) : null;
                })()}
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

        {/* Recurring Order Settings */}
        <div className="border border-fergbutcher-green-200 rounded-lg p-4 bg-fergbutcher-green-50">
          <div className="flex items-center space-x-2 mb-4">
            <RefreshCw className="h-5 w-5 text-fergbutcher-green-600" />
            <h3 className="text-lg font-semibold text-fergbutcher-black-900">Recurring Order Settings</h3>
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
                    min={!order ? (formData.collectionDate || getMinDate()) : undefined}
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

            {formData.isRecurring && (
              <div className="bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg p-3 ml-6">
                <p className="text-xs text-fergbutcher-yellow-700">
                  <strong>Note:</strong> This will create multiple individual orders, one for each {formData.recurrencePattern} collection date until the end date. Each order can be managed separately.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collection Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Collection Date {dateRequired ? '*' : <span className="font-normal text-fergbutcher-brown-400">(optional)</span>}
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
    </div>
  );
};

export default OrderForm;
