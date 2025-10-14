import React from 'react';
import { User, Calendar, Clock, Package, FileText, CreditCard as Edit, Trash2, CheckCircle, XCircle, AlertTriangle, Copy, Mail, Send, Gift, RefreshCw } from 'lucide-react';
import { Order, Customer } from '../types';
import StaffComments from './StaffComments';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { useStaffNotes } from '../hooks/useStaffNotes';
import { generateEmailData, populateTemplate, openEmailClient } from '../utils/emailUtils';

interface OrderDetailProps {
  order: Order;
  customer?: Customer;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onStatusChange: (status: Order['status']) => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({
  order,
  customer,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange
}) => {
  const { templates, getTemplate } = useEmailTemplates();
  const { addStaffNote } = useStaffNotes();

  const handleSendEmail = (templateId: string) => {
    if (!customer) {
      alert('Customer information not available');
      return;
    }

    const template = getTemplate(templateId);
    if (!template) {
      alert('Email template not found');
      return;
    }

    const emailData = generateEmailData(order, customer);
    const populatedSubject = populateTemplate(template.subject, emailData);
    const populatedBody = populateTemplate(template.body, emailData);

    // Create staff note to track email sending
    const emailTypeNames = {
      'order-received': 'Order Received',
      'order-confirmed': 'Order Confirmed', 
      'collection-reminder': 'Collection Reminder'
    };
    
    const emailTypeName = emailTypeNames[templateId as keyof typeof emailTypeNames] || templateId;
    addStaffNote(
      order.id, 
      'System', 
      `📧 ${emailTypeName} email sent to ${customer.email}`
    );

    openEmailClient(customer.email, populatedSubject, populatedBody);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-fergbutcher-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-fergbutcher-yellow-500" />;
      case 'collected':
        return <Package className="h-5 w-5 text-fergbutcher-brown-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-fergbutcher-black-500" />;
      default:
        return <Clock className="h-5 w-5 text-fergbutcher-brown-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-fergbutcher-green-100 text-fergbutcher-green-800 border-fergbutcher-green-200';
      case 'pending':
        return 'bg-fergbutcher-yellow-100 text-fergbutcher-yellow-800 border-fergbutcher-yellow-200';
      case 'collected':
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800 border-fergbutcher-brown-200';
      case 'cancelled':
        return 'bg-fergbutcher-black-100 text-fergbutcher-black-800 border-fergbutcher-black-200';
      default:
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800 border-fergbutcher-brown-200';
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'collected';
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-fergbutcher-green-100 p-3 rounded-full">
              {order.orderType === 'christmas' ? (
                <Gift className="h-8 w-8 text-fergbutcher-green-600" />
              ) : (
                <Package className="h-8 w-8 text-fergbutcher-green-600" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-fergbutcher-black-900">
                  Order #{order.id}
                </h2>
                {order.orderType === 'christmas' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-fergbutcher-green-100 to-fergbutcher-yellow-100 text-fergbutcher-green-800 border border-fergbutcher-green-200">
                    <Gift className="h-4 w-4 mr-1" />
                    Christmas Order
                  </span>
                )}
                {order.isRecurring && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-fergbutcher-blue-100 text-fergbutcher-blue-800 border border-fergbutcher-blue-200">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Recurring Order
                  </span>
                )}
                {order.isRecurring && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-fergbutcher-blue-100 text-fergbutcher-blue-800 border border-fergbutcher-blue-200">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Recurring Order
                  </span>
                )}
              </div>
              <p className="text-fergbutcher-brown-600">
                Created {new Date(order.createdAt).toLocaleDateString('en-NZ')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-green-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
              title="Edit Order"
            >
              <Edit className="h-5 w-5" />
            </button>
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-blue-600 hover:bg-fergbutcher-blue-100 rounded-lg transition-colors"
                title="Duplicate Order (Edit Before Creating)"
              >
                <Copy className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-2 text-fergbutcher-brown-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete Order"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(order.status)}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          {nextStatus && (
            <button
              onClick={() => onStatusChange(nextStatus)}
              className="px-3 py-1 bg-fergbutcher-green-600 text-white text-sm rounded-lg hover:bg-fergbutcher-green-700 transition-colors"
            >
              Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
            </button>
          )}
        </div>
      </div>

      {/* Customer Information */}
      {customer && (
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Customer</h3>
          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-green-100 p-2 rounded-lg">
              <User className="h-4 w-4 text-fergbutcher-green-600" />
            </div>
            <div>
              <p className="font-medium text-fergbutcher-black-900">
                {customer.firstName} {customer.lastName}
              </p>
              <p className="text-sm text-fergbutcher-brown-600">{customer.email}</p>
              {customer.phone && (
                <p className="text-sm text-fergbutcher-brown-600">{customer.phone}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collection Details */}
      <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Collection Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-brown-100 p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-fergbutcher-brown-600" />
            </div>
            <div>
              <p className="text-sm text-fergbutcher-brown-600">Collection Date</p>
              <p className="font-medium text-fergbutcher-black-900">
                {new Date(order.collectionDate).toLocaleDateString('en-NZ', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {order.collectionTime && (
            <div className="flex items-center space-x-3">
              <div className="bg-fergbutcher-yellow-100 p-2 rounded-lg">
                <Clock className="h-4 w-4 text-fergbutcher-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-fergbutcher-brown-600">Collection Time</p>
                <p className="font-medium text-fergbutcher-black-900">{order.collectionTime}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Order Items</h3>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={item.id} className="flex items-start justify-between p-3 bg-fergbutcher-green-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-fergbutcher-black-900">{item.description}</p>
              </div>
              <div className="text-right ml-4">
                <p className="font-semibold text-fergbutcher-black-900">
                  {item.quantity.toLocaleString('en-NZ')} {item.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      {order.additionalNotes && (
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Additional Notes</h3>
          <div className="flex items-start space-x-3">
            <div className="bg-fergbutcher-black-100 p-2 rounded-lg">
              <FileText className="h-4 w-4 text-fergbutcher-black-600" />
            </div>
            <p className="text-fergbutcher-brown-700">{order.additionalNotes}</p>
          </div>
        </div>
      )}

      {/* Email Customer */}
      {customer && (
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
            <Mail className="h-5 w-5 text-fergbutcher-green-600" />
            <span>Email Customer</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handleSendEmail('order-received')}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-fergbutcher-blue-100 text-fergbutcher-blue-700 rounded-lg hover:bg-fergbutcher-blue-200 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Order Received</span>
            </button>
            <button
              onClick={() => handleSendEmail('order-confirmed')}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-fergbutcher-green-100 text-fergbutcher-green-700 rounded-lg hover:bg-fergbutcher-green-200 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Order Confirmed</span>
            </button>
            <button
              onClick={() => handleSendEmail('collection-reminder')}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-fergbutcher-yellow-100 text-fergbutcher-yellow-700 rounded-lg hover:bg-fergbutcher-yellow-200 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Collection Reminder</span>
            </button>
          </div>
          <p className="text-xs text-fergbutcher-brown-500 mt-2">
            Click a button to open your email client with a pre-filled message to {customer.email}
          </p>
        </div>
      )}

      {/* Order Timeline */}
      <div className="px-6 py-4">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Order Timeline</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-fergbutcher-brown-600">Created</span>
            <span className="font-medium text-fergbutcher-black-900">
              {new Date(order.createdAt).toLocaleDateString('en-NZ')} at {new Date(order.createdAt).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {order.updatedAt !== order.createdAt && (
            <div className="flex justify-between items-center">
              <span className="text-fergbutcher-brown-600">Last Updated</span>
              <span className="font-medium text-fergbutcher-black-900">
                {new Date(order.updatedAt).toLocaleDateString('en-NZ')} at {new Date(order.updatedAt).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Staff Comments */}
      <div className="px-6 py-4 border-t border-fergbutcher-brown-200">
        <StaffComments orderId={order.id} />
      </div>
    </div>
  );
};

export default OrderDetail;