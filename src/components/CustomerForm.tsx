import React, { useState, useEffect } from 'react';
import { Customer } from '../types';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (customerData: Omit<Customer, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || '',
        company: customer.company || ''
      });
    }
  }, [customer]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^(\+64|0)[2-9]\d{7,9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid NZ mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
              errors.firstName ? 'border-red-500' : 'border-fergbutcher-brown-300'
            }`}
            placeholder="Enter first name"
            disabled={isLoading}
          />
          {errors.firstName && (
            <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
              errors.lastName ? 'border-red-500' : 'border-fergbutcher-brown-300'
            }`}
            placeholder="Enter last name"
            disabled={isLoading}
          />
          {errors.lastName && (
            <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
            errors.email ? 'border-red-500' : 'border-fergbutcher-brown-300'
          }`}
          placeholder="Enter email address"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
          Mobile Number
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent ${
            errors.phone ? 'border-red-500' : 'border-fergbutcher-brown-300'
          }`}
          placeholder="e.g., +64 21 123 4567"
          disabled={isLoading}
        />
        {errors.phone && (
          <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
          Company
        </label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => handleChange('company', e.target.value)}
          className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
          placeholder="Enter company name"
          disabled={isLoading}
        />
      </div>

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
          {isLoading ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;