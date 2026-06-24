import React, { useState } from 'react';
import { Phone, Clock, CheckCircle, Package, XCircle, Printer, ClipboardList, AlertTriangle } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import PrintSchedule from './PrintSchedule';
import { Order } from '../types';
import { getStatusBadge, getStatusIcon } from '../utils/statusColors';

interface TodayChecklistProps {}

const STATUS_SEQUENCE: Order['status'][] = ['pending', 'confirmed', 'prepared', 'collected'];

function getNextStatus(current: Order['status']): Order['status'] | null {
  const idx = STATUS_SEQUENCE.indexOf(current);
  if (idx === -1 || idx >= STATUS_SEQUENCE.length - 1) return null;
  return STATUS_SEQUENCE[idx + 1];
}

const TodayChecklist: React.FC<TodayChecklistProps> = () => {
  const { orders, updateOrder, ordersLoading: loading, customers } = useAppData();
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

  const handleAdvanceStatus = (order: Order) => {
    const next = getNextStatus(order.status);
    if (next) updateOrder(order.id, { status: next }, customers);
  };

  const renderCard = (order: Order, done = false) => {
    const customer = customers.find(c => c.id === order.customerId);
    const next = getNextStatus(order.status);

    return (
      <div
        key={order.id}
        className={`rounded-xl border-2 p-4 transition-all ${done ? 'opacity-60 bg-fergbutcher-green-50 border-fergbutcher-green-200' : 'bg-white border-fergbutcher-gold-300 hover:border-fergbutcher-green-300'}`}
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
              <div className="bg-fergbutcher-gold-100 rounded-lg py-2 px-1">
                <p className="text-xs text-fergbutcher-gold-600 leading-tight">No time</p>
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
                <p key={idx} className="text-sm text-fergbutcher-gold-700">
                  {item.description} — <span className="font-semibold">{item.quantity} {item.unit}</span>
                </p>
              ))}
            </div>
            {order.additionalNotes && (
              <div className="mt-2 flex items-start space-x-1 text-fergbutcher-yellow-700 bg-fergbutcher-yellow-50 rounded px-2 py-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p className="text-xs">{order.additionalNotes}</p>
              </div>
            )}
            {customer?.notes && (
              <div className="mt-1 flex items-start space-x-1 text-fergbutcher-yellow-700 bg-fergbutcher-yellow-50 rounded px-2 py-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p className="text-xs"><strong>Preference:</strong> {customer.notes}</p>
              </div>
            )}
          </div>

          {/* Status & Advance */}
          <div className="flex-shrink-0 flex flex-col items-end space-y-2">
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(order.status)}`}>
              {getStatusIcon(order.status, 'sm')}
              <span className="capitalize">{order.status}</span>
            </span>
            {next && !done && (
              <button
                onClick={() => handleAdvanceStatus(order)}
                className="bg-fergbutcher-green-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors whitespace-nowrap min-h-[44px] flex items-center"
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
        <div className="text-fergbutcher-green-400">Loading checklist...</div>
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
          <p className="text-fergbutcher-green-400">
            {new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })} —{' '}
            {todaysOrders.length} order{todaysOrders.length !== 1 ? 's' : ''},{' '}
            {doneOrders.length} collected
          </p>
        </div>
        <button
          onClick={() => setShowPrint(true)}
          className="flex items-center space-x-2 bg-fergbutcher-gold-100 text-fergbutcher-gold-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors text-sm font-medium"
        >
          <Printer className="h-4 w-4" />
          <span>Print Today's Orders</span>
        </button>
      </div>

      {todaysOrders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-fergbutcher-gold-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fergbutcher-black-900 mb-2">No orders today</h3>
          <p className="text-fergbutcher-green-400">No collections scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-fergbutcher-green-400 uppercase tracking-wide">
                Outstanding — {activeOrders.length}
              </h2>
              {activeOrders.map(o => renderCard(o))}
            </div>
          )}

          {/* Done orders */}
          {doneOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-fergbutcher-green-600 uppercase tracking-wide">
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
