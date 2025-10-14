import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, UserPlus, Gift, Package } from 'lucide-react';
import { Order, ChristmasOrderItem, Customer, ChristmasProduct } from '../types';
import { useChristmasProducts } from '../hooks/useChristmasProducts';

interface ChristmasOrderFormProps {
  order?: Order;
  customers: Customer[];
  onAddCustomer?: (customerData: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  onSubmit: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ChristmasOrderForm: React.FC<ChristmasOrderFormProps> = ({
  order,
  customers,
  onAddCustomer,
  onSubmit,
  onCancel,
  isLoading = false,
  showCloseButton = false
}) => {
  const { products: christmasProducts, loading: productsLoading, error: productsError } = useChristmasProducts();
  
  const [formData, setFormData] = useState({
    customerId: '',
    collectionDate: '',
    collectionTime: '',
    additionalNotes: '',
    status: 'pending' as Order['status']
  });

  // Christmas product quantities (productId -> quantity)
  const [christmasQuantities, setChristmasQuantities] = useState<Record<string, number>>({});
  
  // Additional (non-Christmas) items
  const [additionalItems, setAdditionalItems] = useState<Omit<ChristmasOrderItem, 'id'>[]>([
    { description: '', quantity: 0, unit: '', isChristmasProduct: false }
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
    if (order && order.orderType === 'christmas') {
      setFormData({
        customerId: order.customerId,
        collectionDate: order.collectionDate,
        collectionTime: order.collectionTime || '',
        additionalNotes: order.additionalNotes || '',
        status: order.status
      });

      // Separate Christmas items from additional items
      const christmasQty: Record<string, number> = {};
      const additionalItemsList: Omit<ChristmasOrderItem, 'id'>[] = [];

      order.items.forEach((item: ChristmasOrderItem) => {
        if (item.isChristmasProduct && item.christmasProductId) {
          christmasQty[item.christmasProductId] = item.quantity;
        } else {
          additionalItemsList.push({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            isChristmasProduct: false
          });
        }
      });

      setChristmasQuantities(christmasQty);
      if (additionalItemsList.length > 0) {
        setAdditionalItems(additionalItemsList);
      }
    }
  }, [order]);

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

    // Check if at least one Christmas product or additional item is selected
    const hasChristmasItems = Object.values(christmasQuantities).some(qty => qty > 0);
    const hasAdditionalItems = additionalItems.some(item => 
      item.description.trim() && item.quantity > 0 && item.unit
    );

    if (!hasChristmasItems && !hasAdditionalItems) {
      newErrors.items = 'Please select at least one Christmas product or add additional items';
    }

    // Validate additional items
    additionalItems.forEach((item, index) => {
      if (item.description.trim() && (!item.quantity || item.quantity <= 0)) {
        newErrors[`additional_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.description.trim() && !item.unit) {
        newErrors[`additional_${index}_unit`] = 'Unit is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const allItems: ChristmasOrderItem[] = [];

      // Add Christmas product items
      Object.entries(christmasQuantities).forEach(([productId, quantity]) => {
        if (quantity > 0) {
          const product = christmasProducts.find(p => p.id === productId);
          if (product) {
            allItems.push({
              id: `christmas_${productId}_${Date.now()}`,
              description: product.name,
              quantity,
              unit: product.unit,
              isChristmasProduct: true,
              christmasProductId: productId
            });
          }
        }
      });

      // Add additional items
      const validAdditionalItems = additionalItems
        .filter(item => item.description.trim() && item.quantity > 0 && item.unit)
        .map((item, index) => ({
          id: `additional_${Date.now()}_${index}`,
          description: item.description.trim(),
          quantity: item.quantity,
          unit: item.unit,
          isChristmasProduct: false
        }));

      allItems.push(...validAdditionalItems);

      onSubmit({
        customerId: formData.customerId,
        items: allItems,
        orderType: 'christmas',
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

  const handleChristmasQuantityChange = (productId: string, quantity: number) => {
    setChristmasQuantities(prev => ({
      ...prev,
      [productId]: quantity
    }));
    
    // Clear items error if user adds a Christmas product
    if (quantity > 0 && errors.items) {
      setErrors(prev => ({ ...prev, items: '' }));
    }
  };

  const handleAdditionalItemChange = (index: number, field: keyof Omit<ChristmasOrderItem, 'id'>, value: string | number) => {
    setAdditionalItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
    
    // Clear related errors
    if (errors[`additional_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`additional_${index}_${field}`]: '' }));
    }
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: '' }));
    }
  };

  const addAdditionalItem = () => {
    setAdditionalItems(prev => [...prev, { description: '', quantity: 0, unit: '', isChristmasProduct: false }]);
  };

  const removeAdditionalItem = (index: number) => {
    if (additionalItems.length > 1) {
      setAdditionalItems(prev => prev.filter((_, i) => i !== index));
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

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-fergbutcher-brown-600">Loading Christmas products...</div>
      </div>
    );
  }

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
      {/* Christmas Header */}
      <div className="bg-gradient-to-r from-fergbutcher-green-50 to-fergbutcher-yellow-50 border border-fergbutcher-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Gift className="h-6 w-6 text-fergbutcher-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-fergbutcher-black-900">Christmas Order</h3>
            <p className="text-sm text-fergbutcher-brown-600">
              Select from our Christmas products or add custom items
            </p>
          </div>
        </div>
      </div>

      {/* Products Error */}
      {productsError && (
        <div className="bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-fergbutcher-yellow-600 mt-0.5" />
            <div>
              <p className="text-fergbutcher-yellow-800 font-medium">Christmas Products Warning</p>
              <p className="text-fergbutcher-yellow-700 text-sm mt-1">
                {productsError}. Using default Christmas products.
              </p>
            </div>
          </div>
        </div>
      )}

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

        {/* Christmas Products */}
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-3">
            Christmas Products
          </label>
          <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {christmasProducts.map((product) => (
                <div key={product.id} className="bg-white border border-fergbutcher-brown-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-fergbutcher-black-900">{product.name}</h4>
                      {product.description && (
                        <p className="text-xs text-fergbutcher-brown-600 mt-1">{product.description}</p>
                      )}
                    </div>
                    <div className="ml-3 flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={christmasQuantities[product.id] || ''}
                        onChange={(e) => handleChristmasQuantityChange(product.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-fergbutcher-brown-300 rounded text-sm focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                        placeholder="0"
                        disabled={isLoading}
                      />
                      <span className="text-xs text-fergbutcher-brown-600 min-w-0">
                        {product.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Items */}
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
            Additional Items
          </label>
          <div className="space-y-4">
            {additionalItems.map((item, index) => (
              <div key={index} className="border border-fergbutcher-brown-200 rounded-lg p-4">
                <div className="grid grid-cols-1 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-fergbutcher-brown-600 mb-1">
                      Item Description
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleAdditionalItemChange(index, 'description', e.target.value)}
                      placeholder="e.g., Custom Christmas pudding"
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
                        onChange={(e) => handleAdditionalItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 2.5"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm ${
                          errors[`additional_${index}_quantity`] ? 'border-red-500' : 'border-fergbutcher-brown-300'
                        }`}
                        disabled={isLoading}
                      />
                      {errors[`additional_${index}_quantity`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`additional_${index}_quantity`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fergbutcher-brown-600 mb-1">
                        Unit
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleAdditionalItemChange(index, 'unit', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm ${
                          errors[`additional_${index}_unit`] ? 'border-red-500' : 'border-fergbutcher-brown-300'
                        }`}
                        disabled={isLoading}
                      >
                        <option value="">Select unit</option>
                        {unitOptions.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                      {errors[`additional_${index}_unit`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`additional_${index}_unit`]}</p>
                      )}
                    </div>
                  </div>
                </div>
                {additionalItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAdditionalItem(index)}
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
              onClick={addAdditionalItem}
              className="w-full border-2 border-dashed border-fergbutcher-green-300 text-fergbutcher-green-600 px-4 py-3 rounded-lg hover:border-fergbutcher-green-400 hover:bg-fergbutcher-green-50 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4" />
              <span>Add Additional Item</span>
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
            className="px-4 py-2 bg-fergbutcher-green-600 text-white rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            disabled={isLoading}
          >
            <Gift className="h-4 w-4" />
            <span>{isLoading ? 'Saving...' : order ? 'Update Christmas Order' : 'Create Christmas Order'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChristmasOrderForm;