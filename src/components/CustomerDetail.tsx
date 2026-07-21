import React from 'react';
import { User, Mail, Phone, Building, Calendar, Pencil, Trash2, ShoppingCart, FileText } from 'lucide-react';
import { Customer } from '../types';

interface CustomerDetailProps {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
  orderCount?: number;
  onViewOrderHistory?: () => void;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customer,
  onEdit,
  onDelete,
  orderCount = 0,
  onViewOrderHistory
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-fergbutcher-green-100 p-3 rounded-full">
              <User className="h-8 w-8 text-fergbutcher-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-fergbutcher-black-900">
                {customer.firstName} {customer.lastName}
              </h2>
              <p className="text-fergbutcher-green-400">
                Customer since {new Date(customer.createdAt).toLocaleDateString('en-NZ')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-fergbutcher-gold-400 hover:text-fergbutcher-green-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
              title="Edit Customer"
            >
              <Pencil className="h-5 w-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-fergbutcher-gold-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete Customer"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Standing Preferences */}
      {customer.notes && (
        <div className="px-6 py-4 bg-fergbutcher-yellow-50 border-b border-fergbutcher-yellow-200">
          <div className="flex items-start space-x-3">
            <div className="bg-fergbutcher-yellow-100 p-2 rounded-lg mt-0.5">
              <FileText className="h-4 w-4 text-fergbutcher-yellow-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fergbutcher-yellow-800 mb-1">Standing Preferences</p>
              <p className="text-sm text-fergbutcher-yellow-700">{customer.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customer.email && (
            <div className="flex items-center space-x-3">
              <div className="bg-fergbutcher-green-100 p-2 rounded-lg">
                <Mail className="h-4 w-4 text-fergbutcher-green-600" />
              </div>
              <div>
                <p className="text-sm text-fergbutcher-green-400">Email</p>
                <p className="font-medium text-fergbutcher-black-900">{customer.email}</p>
              </div>
            </div>
          )}

          {customer.phone && (
            <div className="flex items-center space-x-3">
              <div className="bg-fergbutcher-gold-100 p-2 rounded-lg">
                <Phone className="h-4 w-4 text-fergbutcher-gold-700" />
              </div>
              <div>
                <p className="text-sm text-fergbutcher-green-400">Mobile</p>
                <a
                  href={`tel:${customer.phone}`}
                  className="font-medium text-fergbutcher-green-700 hover:text-fergbutcher-green-800 hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
            </div>
          )}

          {customer.company && (
            <div className="flex items-center space-x-3">
              <div className="bg-fergbutcher-gold-100 p-2 rounded-lg">
                <Building className="h-4 w-4 text-fergbutcher-gold-700" />
              </div>
              <div>
                <p className="text-sm text-fergbutcher-green-400">Company</p>
                <p className="font-medium text-fergbutcher-black-900">{customer.company}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-gold-100 p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-fergbutcher-gold-700" />
            </div>
            <div>
              <p className="text-sm text-fergbutcher-green-400">Customer Since</p>
              <p className="font-medium text-fergbutcher-black-900">
                {new Date(customer.createdAt).toLocaleDateString('en-NZ', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="px-6 py-4 bg-fergbutcher-gold-50 border-t border-fergbutcher-gold-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-green-100 p-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-fergbutcher-green-600" />
            </div>
            <div>
              <p className="text-sm text-fergbutcher-green-400">Total Orders</p>
              <p className="font-bold text-fergbutcher-black-900">{orderCount.toLocaleString('en-NZ')}</p>
            </div>
          </div>
          <button className="text-sm text-fergbutcher-green-600 hover:text-fergbutcher-green-700 font-medium">
            <span onClick={onViewOrderHistory} className="cursor-pointer">
              View Order History →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
