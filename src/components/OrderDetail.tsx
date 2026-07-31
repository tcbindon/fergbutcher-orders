import React, { useState } from 'react';
import { User, Calendar, Clock, Package, FileText, Pencil, Copy, Mail, Send, Gift, RefreshCw, Loader2 } from 'lucide-react';
import { Order, Customer } from '../types';
import OrderTimeline from './OrderTimeline';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { useStaffNotes } from '../hooks/useStaffNotes';
import { generateEmailData, populateTemplate, openEmailClient } from '../utils/emailUtils';
import { sendTemplateEmail, emailSettings } from '../services/emailService';
import { getStatusBadge, getStatusIcon as statusIcon } from '../utils/statusColors';
import { toast } from './Toast';

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
  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);
  const [fromAddress, setFromAddress] = useState<string>('');

  const handleSendEmail = async (templateId: string) => {
    if (!customer) { toast.error('Customer information not available'); return; }
    const template = getTemplate(templateId);
    if (!template) { toast.error('Email template not found'); return; }
    const emailTypeNames = { 'order-received': 'Order Received', 'order-confirmed': 'Order Confirmed', 'collection-reminder': 'Collection Reminder' };
    const emailTypeName = emailTypeNames[templateId as keyof typeof emailTypeNames] || templateId;

    setSendingTemplate(templateId);
    try {
      const result = await sendTemplateEmail(template, order, customer, 'Staff');
      if (result.success) {
        toast.success(`${emailTypeName} email sent to ${customer.email}`);
        addStaffNote(order.id, 'System', `📧 ${emailTypeName} email sent to ${customer.email ?? 'customer'}`);
      } else {
        toast.error(`Failed to send: ${result.error}`);
      }
    } catch (err) {
      toast.error('Unexpected error sending email');
    } finally {
      setSendingTemplate(null);
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    emailSettings.get().then(s => {
      if (!cancelled && s) setFromAddress(s.fromAddress);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    switch (currentStatus) {
      case 'pending': return 'confirmed';
      case 'confirmed': return 'prepared';
      case 'prepared': return 'collected';
      default: return null;
    }
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-fergbutcher-gold-300 sticky top-0 bg-white z-10 rounded-t-xl">
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
                <h2 className="text-xl font-bold text-fergbutcher-black-900">Order #{order.id}</h2>
                {order.orderType === 'christmas' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-fergbutcher-green-100 to-fergbutcher-gold-100 text-fergbutcher-green-700 border border-fergbutcher-green-200">
                    <Gift className="h-4 w-4 mr-1" />
                    Christmas Order
                  </span>
                )}
                {order.isRecurring && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-fergbutcher-gold-100 text-fergbutcher-gold-700 border border-fergbutcher-gold-300">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Recurring Order
                  </span>
                )}
              </div>
              <p className="text-fergbutcher-green-400">
                Created {new Date(order.createdAt).toLocaleDateString('en-NZ')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onEdit} className="p-2 text-fergbutcher-gold-500 hover:text-fergbutcher-green-600 hover:bg-fergbutcher-green-100 rounded-lg transition-colors" title="Edit Order">
              <Pencil className="h-5 w-5" />
            </button>
            {onDuplicate && (
              <button onClick={onDuplicate} className="p-2 text-fergbutcher-gold-500 hover:text-fergbutcher-gold-700 hover:bg-fergbutcher-gold-100 rounded-lg transition-colors" title="Duplicate Order">
                <Copy className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {statusIcon(order.status, 'md')}
            <span className="text-sm font-medium text-fergbutcher-black-900">Order Status:</span>
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
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-fergbutcher-black-900">Change Status:</label>
          <div className="relative">
            <select
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value as Order['status'])}
              className={`appearance-none pr-8 pl-3 py-2 rounded-lg text-sm font-medium border cursor-pointer focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent ${getStatusBadge(order.status)}`}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="prepared">Prepared</option>
              <option value="collected">Collected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-current opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      {customer && (
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Customer</h3>
          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-green-100 p-2 rounded-lg">
              <User className="h-4 w-4 text-fergbutcher-green-600" />
            </div>
            <div>
              <p className="font-medium text-fergbutcher-black-900">{customer.firstName} {customer.lastName}</p>
              {customer.email && <p className="text-sm text-fergbutcher-green-400">{customer.email}</p>}
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="text-sm text-fergbutcher-green-600 hover:underline">
                  {customer.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collection Details */}
      <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Collection Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-fergbutcher-gold-100 p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-fergbutcher-gold-700" />
            </div>
            <div>
              <p className="text-sm text-fergbutcher-green-400">Collection Date</p>
              <p className="font-medium text-fergbutcher-black-900">
                {order.collectionDate
                  ? new Date(order.collectionDate).toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  : <span className="italic text-fergbutcher-brown-400">No date set</span>}
              </p>
            </div>
          </div>
          {order.collectionTime && (
            <div className="flex items-center space-x-3">
              <div className="bg-fergbutcher-gold-100 p-2 rounded-lg">
                <Clock className="h-4 w-4 text-fergbutcher-gold-700" />
              </div>
              <div>
                <p className="text-sm text-fergbutcher-green-400">Collection Time</p>
                <p className="font-medium text-fergbutcher-black-900">{order.collectionTime}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Order Items</h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between p-3 bg-fergbutcher-gold-50 rounded-lg border border-fergbutcher-gold-200">
              <p className="font-medium text-fergbutcher-black-900">{item.description}</p>
              <p className="font-semibold text-fergbutcher-black-900 ml-4">
                {item.quantity.toLocaleString('en-NZ')} {item.unit}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      {order.additionalNotes && (
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3">Additional Notes</h3>
          <div className="flex items-start space-x-3">
            <div className="bg-fergbutcher-gold-100 p-2 rounded-lg">
              <FileText className="h-4 w-4 text-fergbutcher-gold-700" />
            </div>
            <p className="text-fergbutcher-black-900">{order.additionalNotes}</p>
          </div>
        </div>
      )}

      {/* Email Customer */}
      {customer && customer.email && (
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
            <Mail className="h-5 w-5 text-fergbutcher-green-600" />
            <span>Email Customer</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handleSendEmail('order-received')}
              disabled={sendingTemplate === 'order-received'}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-fergbutcher-gold-100 text-fergbutcher-gold-700 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors disabled:opacity-50"
            >
              {sendingTemplate === 'order-received' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Order Received</span>
            </button>
            <button
              onClick={() => handleSendEmail('order-confirmed')}
              disabled={sendingTemplate === 'order-confirmed'}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-fergbutcher-green-100 text-fergbutcher-green-600 rounded-lg hover:bg-fergbutcher-green-200 transition-colors disabled:opacity-50"
            >
              {sendingTemplate === 'order-confirmed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Order Confirmed</span>
            </button>
            <button
              onClick={() => handleSendEmail('collection-reminder')}
              disabled={sendingTemplate === 'collection-reminder'}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-fergbutcher-yellow-100 text-fergbutcher-yellow-700 rounded-lg hover:bg-fergbutcher-yellow-200 transition-colors disabled:opacity-50"
            >
              {sendingTemplate === 'collection-reminder' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Collection Reminder</span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-fergbutcher-green-400">
              Sends directly from {customer.email ? (fromAddress || 'orders@fergbutcher.com') : '—'} to {customer.email}
            </p>
            <button
              onClick={() => {
                if (!customer) return;
                const template = getTemplate('order-received');
                if (!template) return;
                const emailData = generateEmailData(order, customer);
                openEmailClient(customer.email, populateTemplate(template.subject, emailData), populateTemplate(template.body, emailData));
              }}
              className="text-xs text-fergbutcher-green-600 hover:underline"
            >
              Open in email client instead
            </button>
          </div>
        </div>
      )}

      {/* Unified Order Timeline (system events, staff comments, email history) */}
      <div className="px-6 py-4 border-t border-fergbutcher-gold-300">
        <OrderTimeline order={order} />
      </div>
    </div>
  );
};

export default OrderDetail;
