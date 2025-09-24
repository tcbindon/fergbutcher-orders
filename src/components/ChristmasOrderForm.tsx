import React, { useState } from 'react';
import { Gift, Plus, Minus, ShoppingCart, User, Mail, Phone, Building } from 'lucide-react';

interface ChristmasProduct {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: 'poultry' | 'beef' | 'lamb' | 'pork' | 'sides';
  popular?: boolean;
}

interface ChristmasOrderFormProps {
  onSubmit: (orderData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const christmasProducts: ChristmasProduct[] = [
  // Poultry
  { id: 'turkey-whole', name: 'Whole Turkey', description: 'Free-range whole turkey, oven-ready', unit: 'each', category: 'poultry', popular: true },
  { id: 'turkey-breast', name: 'Turkey Breast', description: 'Boneless turkey breast, skin-on', unit: 'kg', category: 'poultry' },
  { id: 'turkey-legs', name: 'Turkey Legs', description: 'Fresh turkey legs, perfect for slow cooking', unit: 'each', category: 'poultry' },
  { id: 'duck-whole', name: 'Whole Duck', description: 'Free-range whole duck, oven-ready', unit: 'each', category: 'poultry' },
  { id: 'goose-whole', name: 'Whole Goose', description: 'Premium free-range goose', unit: 'each', category: 'poultry' },
  
  // Beef
  { id: 'beef-wellington', name: 'Beef Wellington', description: 'Premium beef fillet wrapped in pastry', unit: 'kg', category: 'beef', popular: true },
  { id: 'beef-roast', name: 'Beef Roasting Joint', description: 'Prime rib roast, perfect for Christmas dinner', unit: 'kg', category: 'beef', popular: true },
  { id: 'beef-tenderloin', name: 'Beef Tenderloin', description: 'Whole beef tenderloin, trimmed', unit: 'kg', category: 'beef' },
  
  // Lamb
  { id: 'lamb-leg', name: 'Leg of Lamb', description: 'Bone-in leg of lamb, French-trimmed', unit: 'kg', category: 'lamb', popular: true },
  { id: 'lamb-rack', name: 'Rack of Lamb', description: 'French-trimmed rack of lamb', unit: 'kg', category: 'lamb' },
  { id: 'lamb-shoulder', name: 'Lamb Shoulder', description: 'Bone-in lamb shoulder, slow-roast ready', unit: 'kg', category: 'lamb' },
  
  // Pork
  { id: 'ham-glazed', name: 'Glazed Ham', description: 'Honey-glazed ham, fully cooked', unit: 'kg', category: 'pork', popular: true },
  { id: 'pork-belly', name: 'Pork Belly', description: 'Skin-on pork belly, scored for crackling', unit: 'kg', category: 'pork' },
  { id: 'pork-leg', name: 'Leg of Pork', description: 'Bone-in leg of pork, skin-on', unit: 'kg', category: 'pork' },
  
  // Sides & Extras
  { id: 'sausages-chipolata', name: 'Chipolata Sausages', description: 'Traditional pork chipolatas', unit: 'kg', category: 'sides' },
  { id: 'bacon-streaky', name: 'Streaky Bacon', description: 'Dry-cured streaky bacon', unit: 'kg', category: 'sides' },
  { id: 'stuffing-mix', name: 'Christmas Stuffing', description: 'Traditional sage and onion stuffing', unit: 'portions', category: 'sides' },
];

const ChristmasOrderForm: React.FC<ChristmasOrderFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [collectionDate, setCollectionDate] = useState('');
  const [collectionTime, setCollectionTime] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = {
    poultry: { name: 'Poultry', icon: '🦃', color: 'bg-red-50 border-red-200' },
    beef: { name: 'Beef', icon: '🥩', color: 'bg-fergbutcher-brown-50 border-fergbutcher-brown-200' },
    lamb: { name: 'Lamb', icon: '🐑', color: 'bg-fergbutcher-green-50 border-fergbutcher-green-200' },
    pork: { name: 'Pork', icon: '🐷', color: 'bg-pink-50 border-pink-200' },
    sides: { name: 'Sides & Extras', icon: '🥓', color: 'bg-yellow-50 border-yellow-200' }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerData.name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    if (!customerData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!collectionDate) {
      newErrors.collectionDate = 'Collection date is required';
    }

    const hasItems = Object.values(quantities).some(qty => qty > 0);
    if (!hasItems) {
      newErrors.items = 'Please select at least one item';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const selectedItems = christmasProducts
        .filter(product => quantities[product.id] > 0)
        .map(product => ({
          id: `christmas_${product.id}`,
          description: `${product.name} - ${product.description}`,
          quantity: quantities[product.id],
          unit: product.unit
        }));

      onSubmit({
        type: 'christmas',
        customer: customerData,
        items: selectedItems,
        collectionDate,
        collectionTime: collectionTime || undefined,
        additionalNotes: notes || undefined,
        status: 'pending'
      });
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    const product = christmasProducts.find(p => p.id === productId);
    setQuantities(prev => {
      let newValue = (prev[productId] || 0) + change;
      
      // Ensure whole numbers for 'each' units
      if (product?.unit === 'each') {
        newValue = Math.max(0, Math.floor(newValue));
      } else {
        newValue = Math.max(0, Math.round(newValue * 10) / 10);
      }
      
      return {
        ...prev,
        [productId]: newValue
      };
    });
  };

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Gift className="h-8 w-8 text-red-600" />
          <h2 className="text-2xl font-bold text-fergbutcher-black-900">Christmas Order Form</h2>
          <Gift className="h-8 w-8 text-red-600" />
        </div>
        <p className="text-fergbutcher-brown-600">
          Order your premium Christmas meats for the perfect festive feast
        </p>
      </div>

      {/* Customer Information */}
      <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4 flex items-center space-x-2">
          <User className="h-5 w-5 text-fergbutcher-green-600" />
          <span>Customer Information</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={customerData.name}
              onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-fergbutcher-brown-300'
              }`}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={customerData.email}
              onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-fergbutcher-brown-300'
              }`}
              placeholder="your.email@example.com"
              disabled={isLoading}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={customerData.phone}
              onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
              placeholder="+64 21 123 4567"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Company (Optional)
            </label>
            <input
              type="text"
              value={customerData.company}
              onChange={(e) => setCustomerData(prev => ({ ...prev, company: e.target.value }))}
              className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
              placeholder="Company name"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div>
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-6 flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5 text-fergbutcher-green-600" />
          <span>Select Your Christmas Products</span>
          {getTotalItems() > 0 && (
            <span className="bg-fergbutcher-green-600 text-white px-2 py-1 rounded-full text-sm">
              {getTotalItems()} items
            </span>
          )}
        </h3>

        {Object.entries(categories).map(([categoryKey, category]) => {
          const categoryProducts = christmasProducts.filter(p => p.category === categoryKey);
          
          return (
            <div key={categoryKey} className={`mb-8 border rounded-lg p-6 ${category.color}`}>
              <h4 className="text-lg font-semibold text-fergbutcher-black-900 mb-4 flex items-center space-x-2">
                <span className="text-2xl">{category.icon}</span>
                <span>{category.name}</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryProducts.map((product) => (
                  <div key={product.id} className="bg-white border border-fergbutcher-brown-200 rounded-lg p-4 relative">
                    {product.popular && (
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                        Popular
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <h5 className="font-semibold text-fergbutcher-black-900">{product.name}</h5>
                      <p className="text-sm text-fergbutcher-brown-600 mt-1">{product.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, -1)}
                          disabled={!quantities[product.id] || quantities[product.id] <= 0 || isLoading}
                          className="w-8 h-8 rounded-full bg-fergbutcher-brown-100 text-fergbutcher-brown-600 hover:bg-fergbutcher-brown-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        
                        <div className="flex flex-col items-center">
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
                            className="w-16 px-2 py-1 border border-fergbutcher-brown-300 rounded text-center text-sm"
                            disabled={isLoading}
                          />
                          <span className="text-xs text-fergbutcher-brown-500 mt-1">{product.unit}</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, product.unit === 'each' ? 1 : 0.5)}
                          disabled={isLoading}
                          className="w-8 h-8 rounded-full bg-fergbutcher-green-100 text-fergbutcher-green-600 hover:bg-fergbutcher-green-200 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {errors.items && (
          <p className="text-red-500 text-sm mt-2">{errors.items}</p>
        )}
      </div>

      {/* Collection Details */}
      <div className="bg-fergbutcher-brown-50 border border-fergbutcher-brown-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Collection Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Collection Date *
            </label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              min={getMinDate()}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
                errors.collectionDate ? 'border-red-500' : 'border-fergbutcher-brown-300'
              }`}
              disabled={isLoading}
            />
            {errors.collectionDate && <p className="text-red-500 text-xs mt-1">{errors.collectionDate}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Preferred Collection Time
            </label>
            <input
              type="time"
              value={collectionTime}
              onChange={(e) => setCollectionTime(e.target.value)}
              className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
            Special Instructions
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
            placeholder="Any special preparation requests, cooking instructions, or dietary requirements..."
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-fergbutcher-brown-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-fergbutcher-brown-700 bg-fergbutcher-brown-100 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          disabled={isLoading}
        >
          <Gift className="h-5 w-5" />
          <span>{isLoading ? 'Submitting...' : 'Submit Christmas Order'}</span>
        </button>
      </div>
    </form>
  );
};

export default ChristmasOrderForm;