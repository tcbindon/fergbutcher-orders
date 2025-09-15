import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  Edit,
  Trash2,
  ShoppingCart
} from 'lucide-react';
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
    <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-fergbutcher-green-100 p-3 rounded-full">
              <User className="h-8 w-8 text-fergbutcher-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-fergbutcher-black-900">
                {customer.firstName} {customer.lastName}
              </h2>
              <p className="text-fergbutcher-brown-600">
                Customer since {new Date(customer.createdAt).toLocaleDateString('en-NZ')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-green-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
              title="Edit Customer"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-fergbutcher-brown-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete Customer"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-green-100 p-2 rounded-lg">
              <Mail className="h-4 w-4 text-fergbutcher-green-600" />
            </div>
            <div>
              <p className="text-sm text-fergbutcher-brown-600">Email</p>
              <p className="font-medium text-fergbutcher-black-900">{customer.email}</p>
            </div>
          </div>

          {customer.phone && (
            <div className="flex items-center space-x-3">
              <div className="bg-fergbutcher-brown-100 p-2 rounded-lg">
                <Phone className="h-4 w-4 text-fergbutcher-brown-600" />
              </div>
              <div>
                <p className="text-sm text-fergbutcher-brown-600">Mobile</p>
                <p className="font-medium text-fergbutcher-black-900">{customer.phone}</p>
              </div>
            </div>
          )}

          {customer.company && (
            <div className="flex items-center space-x-3">
              <div className="bg-fergbutcher-yellow-100 p-2 rounded-lg">
                <Building className="h-4 w-4 text-fergbutcher-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-fergbutcher-brown-600">Company</p>
                <p className="font-medium text-fergbutcher-black-900">{customer.company}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-black-100 p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-fergbutcher-black-600" />
            </div>
            <div>
              <p className="text-sm text-fergbutcher-brown-600">Customer Since</p>
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
      <div className="px-6 py-4 bg-fergbutcher-green-50 border-t border-fergbutcher-brown-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-green-100 p-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-fergbutcher-green-600" />
            </div>
            <div>
              <p className="text-sm text-fergbutcher-brown-600">Total Orders</p>
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