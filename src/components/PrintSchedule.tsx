import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Calendar, Clock, Gift } from 'lucide-react';
import { Order, Customer } from '../types';

interface PrintScheduleProps {
  date: string;
  orders: Order[];
  customers: Customer[];
  onClose: () => void;
}

const PrintSchedule: React.FC<PrintScheduleProps> = ({ date, orders, customers, onClose }) => {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NZ', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':   return 'text-amber-600';
      case 'confirmed': return 'text-sky-700';
      case 'prepared':  return 'text-teal-600';
      case 'collected': return 'text-green-700';
      case 'cancelled': return 'text-rose-500';
      default:          return 'text-gray-600';
    }
  };

  const dayOrders = orders.filter(o => o.collectionDate === date);

  const timedOrders = dayOrders
    .filter(o => o.collectionTime)
    .sort((a, b) => (a.collectionTime ?? '').localeCompare(b.collectionTime ?? ''));

  const untimedOrders = dayOrders
    .filter(o => !o.collectionTime)
    .sort((a, b) => {
      const p: Record<string, number> = { confirmed: 1, prepared: 2, pending: 3, collected: 4, cancelled: 5 };
      return (p[a.status] ?? 99) - (p[b.status] ?? 99);
    });

  const totalOrders = timedOrders.length + untimedOrders.length;

  const renderOrderCard = (order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    return (
      <div key={order.id} className="border border-gray-200 rounded break-inside-avoid mb-2 last:mb-0">
        <div className="px-3 py-2">
          {/* Name row */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
              <span className="font-semibold text-gray-900 text-sm leading-snug">
                {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
              </span>
              {customer?.phone && (
                <span className="text-xs text-gray-500">{customer.phone}</span>
              )}
              {order.collectionTime && (
                <span className="text-xs font-medium text-gray-700">
                  @ {order.collectionTime}
                </span>
              )}
              {order.orderType === 'christmas' && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <Gift className="h-2.5 w-2.5" />
                  <span>Christmas</span>
                </span>
              )}
            </div>
            <span className={`text-xs font-bold uppercase flex-shrink-0 ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
          {/* Items row */}
          <div className="flex flex-wrap gap-x-4 mt-0.5">
            {order.items.map((item, idx) => (
              <span key={idx} className="text-xs text-gray-800">
                {item.description} — <strong>{item.quantity.toLocaleString('en-NZ')} {item.unit}</strong>
              </span>
            ))}
          </div>
          {/* Notes */}
          {order.additionalNotes && (
            <p className="text-xs text-gray-500 italic mt-1 pt-1 border-t border-gray-100">
              {order.additionalNotes}
            </p>
          )}
        </div>
      </div>
    );
  };

  const printContent = (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-gray-900">
        <div className="flex items-center gap-2.5">
          <img src="/Fergbutcher_vector-01.png" alt="Fergbutcher" className="h-9 w-auto" />
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Fergbutcher</h1>
            <p className="text-xs text-gray-500 leading-tight">Collection Schedule</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-gray-900">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{formatDate(date)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalOrders} order{totalOrders !== 1 ? 's' : ''} for collection
          </p>
        </div>
      </div>

      {totalOrders > 0 ? (
        <div>
          {timedOrders.length > 0 && (
            <div className="mb-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Scheduled Times ({timedOrders.length})
              </h2>
              {timedOrders.map(renderOrderCard)}
            </div>
          )}
          {untimedOrders.length > 0 && (
            <div>
              {timedOrders.length > 0 && <div className="border-t border-gray-300 mt-3 mb-3" />}
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                No Specified Time ({untimedOrders.length})
              </h2>
              {untimedOrders.map(renderOrderCard)}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-6">
          No orders scheduled for {formatDate(date)}.
        </p>
      )}

      <div className="mt-4 pt-2 border-t border-gray-200 text-xs text-gray-400 text-center">
        Printed {new Date().toLocaleString('en-NZ')} | Fergbutcher Pre-Order Management System
      </div>
    </div>
  );

  return createPortal(
    <div className="print-portal">
      {/* Screen: modal overlay — hidden when printing */}
      <div className="print:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">Print Collection Schedule</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {printContent}
          </div>
        </div>
      </div>

      {/* Print: clean output — hidden on screen, shown when printing */}
      <div className="hidden print:block">
        {printContent}
      </div>
    </div>,
    document.body
  );
};

export default PrintSchedule;
