import React, { useState } from 'react';
import { Phone, Clock, CheckCircle, Package, XCircle, Printer, ClipboardList, AlertTriangle } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import PrintSchedule from './PrintSchedule';
import { Order } from '../types';

interface TodayChecklistProps {
  staffName?: string;
}

const STATUS_SEQUENCE: Order['status'][] = ['pending', 'confirmed', 'prepared', 'collected'];

function getNextStatus(current: Order['status']): Order['status'] | null {
  const idx = STATUS_SEQUENCE.indexOf(current);
  if (idx === -1 || idx >= STATUS_SEQUENCE.length - 1) return null;
  return STATUS_SEQUENCE[idx + 1];
}

const TodayChecklist: React.FC<TodayChecklistProps> = ({ staffName }) => {
  const { orders, updateOrder, loading } = useOrders();
  const { customers } = useCustomers();
  const [showPrint, setShowPrint] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const todaysOrders = orders
    .filter(o => o.collectionDate === today && o.status !== 'cancelled')
    .sort((a, b) => {
      if (a.collectionTime && b.collectionTime) return a.collectionTime.localeCompare(b.collectionTime);
      if (a.collectionTime && !b.collectionTime) return -1;
      if (!a.collectionTime && b.collectionTime) return 1;
      const priority: Record<string, number> = { pending: 1, confirmed: 2, prepared: 3, collected: 4 };
      return (priority[a.status] ?? 5) - (priority[b.status] ?? 5);
    });

  const activeOrders = todaysOrders.filter(o => o.status !== 'collected');
  const doneOrders = todaysOrders.filter(o => o.status === 'collected');

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'confirmed': return 'bg-sky-50 border-sky-200 text-sky-800';
      case 'prepared': return 'bg-teal-50 border-teal-200 text-teal-800';
      case 'collected': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-sky-500" />;
      case 'prepared': return <CheckCircle className="h-4 w-4 text-teal-500" />;
      case 'collected': return <Package className="h-4 w-4 text-green-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleAdvanceStatus = (order: Order) => {
    const next = getNextStatus(order.status);
    if (next) updateOrder(order.id, { status: next });
  };

  const renderCard = (order: Order, done = false) => {
    const customer = customers.find(c => c.id === order.customerId);
    const next = getNextStatus(order.status);

    return (
      <div
        key={order.id}
        className={`rounded-xl border-2 p-4 transition-all ${done ? 'opacity-60 bg-green-50 border-green-200' : 'bg-white border-fergbutcher-brown-200 hover:border-fergbutcher-green-300'}`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Time */}
          <div className="flex-shrink-0 w-16 text-center">
            {order.collectionTime ? (
              <div className="bg-fergbutcher-green-100 rounded-lg py-2 px-1">
                <p className="text-xs font-medium text-fergbutcher-green-700 leading-tight">TIME</p>
                <p className="text-sm font-bold text-fergbutcher-green-800 leading-tight">{order.collectionTime}</p>
              </div>
            ) : (
              <div className="bg-fergbutcher-brown-50 rounded-lg py-2 px-1">
                <p className="text-xs text-fergbutcher-brown-400 leading-tight">No time</p>
              </div>
            )}
          </div>

          {/* Customer & Items */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-bold text-fergbutcher-black-900 text-lg leading-tight truncate">
                {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
              </h3>
            </div>
            {customer?.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center space-x-1 text-fergbutcher-green-600 hover:underline text-sm mb-2"
              >
                <Phone className="h-3 w-3" />
                <span>{customer.phone}</span>
              </a>
            )}
            <div className="space-y-1">
              {order.items.map((item, idx) => (
                <p key={idx} className="text-sm text-fergbutcher-brown-700">
                  {item.description} — <span className="font-semibold">{item.quantity} {item.unit}</span>
                </p>
              ))}
            </div>
            {order.additionalNotes && (
              <div className="mt-2 flex items-start space-x-1 text-amber-700 bg-amber-50 rounded px-2 py-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p className="text-xs">{order.additionalNotes}</p>
              </div>
            )}
            {customer?.notes && (
              <div className="mt-1 flex items-start space-x-1 text-amber-700 bg-amber-50 rounded px-2 py-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p className="text-xs"><strong>Preference:</strong> {customer.notes}</p>
              </div>
            )}
          </div>

          {/* Status & Advance */}
          <div className="flex-shrink-0 flex flex-col items-end space-y-2">
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="capitalize">{order.status}</span>
            </span>
            {next && !done && (
              <button
                onClick={() => handleAdvanceStatus(order)}
                className="bg-fergbutcher-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-fergbutcher-green-700 transition-colors whitespace-nowrap"
              >
                Mark {next}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fergbutcher-brown-600">Loading checklist...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fergbutcher-black-900 flex items-center space-x-3">
            <ClipboardList className="h-7 w-7 text-fergbutcher-green-600" />
            <span>Today's Checklist</span>
          </h1>
          <p className="text-fergbutcher-brown-600">
            {new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })} —{' '}
            {todaysOrders.length} order{todaysOrders.length !== 1 ? 's' : ''},{' '}
            {doneOrders.length} collected
          </p>
        </div>
        <button
          onClick={() => setShowPrint(true)}
          className="flex items-center space-x-2 bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors text-sm font-medium"
        >
          <Printer className="h-4 w-4" />
          <span>Print Today's Orders</span>
        </button>
      </div>

      {todaysOrders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-fergbutcher-brown-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fergbutcher-black-900 mb-2">No orders today</h3>
          <p className="text-fergbutcher-brown-500">No collections scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-fergbutcher-brown-600 uppercase tracking-wide">
                Outstanding — {activeOrders.length}
              </h2>
              {activeOrders.map(o => renderCard(o))}
            </div>
          )}

          {/* Done orders */}
          {doneOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
                Done — {doneOrders.length}
              </h2>
              {doneOrders.map(o => renderCard(o, true))}
            </div>
          )}
        </div>
      )}

      {showPrint && (
        <PrintSchedule
          date={today}
          orders={orders}
          customers={customers}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
};

export default TodayChecklist;
