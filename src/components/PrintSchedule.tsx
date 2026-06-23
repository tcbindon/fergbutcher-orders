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

  const renderOrderRow = (order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    const itemsText = order.items
      .map(item => `${item.description} — ${item.quantity.toLocaleString('en-NZ')} ${item.unit}`)
      .join('  ·  ');
    return (
      <tr key={order.id} className="break-inside-avoid border-b border-gray-100 last:border-b-0">
        <td className="py-1 pr-2 align-top w-[30%]">
          <div className="font-semibold text-gray-900 text-[10px] leading-snug">
            {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-gray-500 mt-0.5">
            {customer?.phone && <span>{customer.phone}</span>}
            {order.collectionTime && <span className="font-medium text-gray-700">@ {order.collectionTime}</span>}
            {order.orderType === 'christmas' && (
              <span className="flex items-center gap-0.5 text-gray-400">
                <Gift className="h-2 w-2" /> Xmas
              </span>
            )}
          </div>
        </td>
        <td className="py-1 pr-2 align-top">
          <div className="text-[10px] text-gray-800 leading-snug">{itemsText}</div>
          {order.additionalNotes && (
            <div className="text-[9px] text-gray-400 italic mt-0.5">{order.additionalNotes}</div>
          )}
        </td>
        <td className={`py-1 align-top text-right text-[9px] font-bold uppercase whitespace-nowrap w-[10%] ${getStatusColor(order.status)}`}>
          {order.status}
        </td>
        <td className="py-1 pl-2 align-top w-[8%]">
          <div className="border border-gray-300 rounded h-4 w-4 ml-auto" />
        </td>
      </tr>
    );
  };

  const renderSection = (sectionOrders: Order[], label: string, showClockIcon = false) => (
    <div className="mb-2">
      <div className="flex items-center gap-1 mb-0.5 pb-0.5 border-b border-gray-300">
        {showClockIcon && <Clock className="h-2.5 w-2.5 text-gray-500" />}
        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
          {label} ({sectionOrders.length})
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-[8px] text-gray-400 uppercase tracking-wide">
            <th className="text-left font-medium pb-0.5 pr-2">Customer</th>
            <th className="text-left font-medium pb-0.5 pr-2">Items</th>
            <th className="text-right font-medium pb-0.5">Status</th>
            <th className="text-right font-medium pb-0.5 pl-2">Done</th>
          </tr>
        </thead>
        <tbody>
          {sectionOrders.map(renderOrderRow)}
        </tbody>
      </table>
    </div>
  );

  const printContent = (
    <div className="p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-gray-900">
        <div className="flex items-center gap-2">
          <img src="/Fergbutcher_vector-01.png" alt="Fergbutcher" className="h-7 w-auto" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Fergbutcher</h1>
            <p className="text-[9px] text-gray-500 leading-tight">Collection Schedule</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-xs font-semibold text-gray-900">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>{formatDate(date)}</span>
          </div>
          <p className="text-[9px] text-gray-500 mt-0.5">
            {totalOrders} order{totalOrders !== 1 ? 's' : ''} for collection
          </p>
        </div>
      </div>

      {totalOrders > 0 ? (
        <>
          {timedOrders.length > 0 && renderSection(timedOrders, 'Scheduled Times', true)}
          {untimedOrders.length > 0 && renderSection(untimedOrders, 'No Specified Time')}
        </>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">
          No orders scheduled for {formatDate(date)}.
        </p>
      )}

      <div className="mt-3 pt-1.5 border-t border-gray-200 text-[8px] text-gray-400 text-center">
        Printed {new Date().toLocaleString('en-NZ')} | Fergbutcher Pre-Order Management System
      </div>
    </div>
  );

  return createPortal(
    <div className="print-portal">
      {/* Screen: modal overlay */}
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

      {/* Print output */}
      <div className="hidden print:block">
        {printContent}
      </div>
    </div>,
    document.body
  );
};

export default PrintSchedule;
